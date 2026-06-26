import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniBoard } from '../components/MiniBoard';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { AuthModal } from '../components/AuthModal';
import { teamXpForResult } from '../core/progression';
import { linkRoomMember, unlinkRoomMember } from '../lib/couchXp';
import { useAuth } from '../lib/auth';
import { awardXp } from '../lib/progressionClient';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  generatePlayerId,
  openRoom,
  type LobbyEvent,
  type LobbyHandle,
  type PlayerTeam,
  type PresencePlayer,
} from '../lib/lobby';

/**
 * The phone-as-controller page. Mounted when the URL carries `?view=controller`.
 * Lives entirely outside the Couch-Mode store — its own minimal state + a
 * direct Realtime channel to the host.
 *
 * Flow:
 *   1. Connect to lobby:<CODE>, track presence as a player.
 *   2. Show "Waiting…" until match starts.
 *   3. On `question_served` show prompt + answer input.
 *   4. Submit → broadcast `answer_submitted` to the host. Host adjudicates.
 *   5. On `adjudicated` / `answer_revealed` / `game_over` show feedback.
 */

type Phase = 'waiting' | 'lobby' | 'ready' | 'question' | 'submitted' | 'reveal' | 'done';

interface ServedPrompt {
  cell: number;
  letter: string;
  prompt: string;
  picker?: PlayerTeam; // the team that answers FIRST (their window is open first)
  hideLetter?: boolean;
  audio?: string;
  video?: string;
  image?: string;
  youtube?: string;
}

const STORAGE_KEY = 'letterlock.controller.v1';

interface ControllerSave {
  playerId: string;
  name: string;
  room: string;
  team?: PlayerTeam | null;
  // The board cell this player has ALREADY answered. Persisted so a refresh /
  // reconnect during the same question shows a locked "answer sent" state rather
  // than letting them submit a second answer. Cleared when a new cell is served.
  answeredCell?: number | null;
}

function loadSave(room: string): ControllerSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ControllerSave;
    return parsed.room === room ? parsed : null;
  } catch {
    return null;
  }
}

function persistSave(save: ControllerSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    /* ignore */
  }
}

/**
 * Build the phone's synced-timer state from a host broadcast. `deadline` is the
 * host-clock end instant; we measure the host↔local clock offset from `hostNow`
 * so the countdown ends at the same wall-clock moment on every device. Returns
 * null when there's no timer (deadline/seconds absent).
 */
function buildTimer(
  deadline?: number,
  hostNow?: number,
  totalSeconds?: number,
): { deadline: number; offset: number; total: number } | null {
  if (!deadline || !totalSeconds) return null;
  const offset = (hostNow ?? Date.now()) - Date.now();
  return { deadline, offset, total: totalSeconds };
}

export function PlayerController() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const room = (params.get('room') ?? '').toUpperCase();
  const initialName = (params.get('name') ?? '').slice(0, 20);
  // A signed-in phone uses its ACCOUNT username automatically — no name entry.
  const { user, profile, loading: authLoading, profileChecked } = useAuth();
  const accountName = profile?.username ?? null;
  // While the session/profile is still resolving we must NOT flash the name-entry
  // screen at a signed-in player — wait until the profile fetch has RESOLVED.
  const authResolving = authLoading || (!!user && !profileChecked);
  // The sign-in dialog (full Google / email-OTP / username flow). Offered to
  // signed-out players on the QR-join screen so they don't forfeit their XP.
  const [authOpen, setAuthOpen] = useState(false);
  // First-time login (incl. a Google round-trip back to the controller) must
  // always claim a username: once the profile fetch RESOLVES with no profile,
  // force the dialog open (AuthModal shows the mandatory "Choose a username").
  const needsUsername = !!user && profileChecked && !profile;
  const autoOpenedAuthRef = useRef(false);
  useEffect(() => {
    if (needsUsername) {
      autoOpenedAuthRef.current = true;
      setAuthOpen(true);
    } else if (autoOpenedAuthRef.current) {
      // A transient null-profile that resolved into a real profile → close the
      // auto-opened dialog so it never lingers as a "Signed in as…" popup.
      autoOpenedAuthRef.current = false;
      setAuthOpen(false);
    }
  }, [needsUsername]);

  // A saved session in THIS room means we've already joined before — a refresh,
  // browser-back, or accidental tab-close should drop the player straight back
  // into the match (with their name + team), never the name screen again.
  const restored = useMemo(() => loadSave(room), [room]);
  const firstName = initialName || restored?.name || '';

  const [name, setName] = useState(firstName);
  // Kahoot-style: scanning the QR lands here with no name → type it, then Join.
  // Arriving from the in-app Join form (which already has a name) auto-joins.
  // A signed-in user skips the name step entirely (handled in an effect below).
  // A restored session re-joins automatically.
  const [joined, setJoined] = useState(() => !!firstName.trim() || !!restored);
  const [nameDraft, setNameDraft] = useState(firstName);
  const [team, setTeam] = useState<PlayerTeam | null>(null);
  const [labels, setLabels] = useState<{ A: string; B: string }>({ A: 'Team A', B: 'Team B' });
  const [category, setCategory] = useState<string | null>(null);
  // 'party' = answer on the phone; 'couch' = passive, watch the big screen and
  // earn XP for your team. Defaults to party (back-compat with older hosts).
  const [mode, setMode] = useState<'party' | 'couch'>('party');
  const [phase, setPhase] = useState<Phase>('waiting');
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [served, setServed] = useState<ServedPrompt | null>(null);
  const [teammateAnswered, setTeammateAnswered] = useState(false);
  // Sequential windows: the picker answers first; once their window closes the
  // host opens the "steal" window and the OTHER team may answer. True once the
  // steal window is open for the current question.
  const [stealOpen, setStealOpen] = useState(false);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [winner, setWinner] = useState<PlayerTeam | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; prestige: number } | null>(null);
  const [colors, setColors] = useState<{ A: string; B: string }>({ A: '#0a84ff', B: '#ff9f0a' });
  const [boardSnap, setBoardSnap] = useState<{
    owners: (PlayerTeam | null)[];
    size: number;
    turn: PlayerTeam | null;
    winner: PlayerTeam | null;
  } | null>(null);
  // Synced answer countdown. `deadline` is the host-clock instant (epoch ms) the
  // timer ends at; `offset` = hostClock − localClock measured at receipt, so
  // every device counts down to the SAME moment despite clock skew / latency.
  // `total` seconds is just for the progress-bar scale.
  const [timerState, setTimerState] = useState<{ deadline: number; offset: number; total: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const handleRef = useRef<LobbyHandle | null>(null);
  // Refs so the channel's once-registered callbacks always read fresh values
  // (avoids the stale-closure bug where adjudicated feedback compared an old team).
  const teamRef = useRef<PlayerTeam | null>(team);
  const servedRef = useRef<ServedPrompt | null>(served);
  const nameRef = useRef(name);
  const modeRef = useRef(mode);
  const sawHostRef = useRef(false);
  // The cell this player has already answered (one answer per question). Seeded
  // from the saved session so a refresh mid-question stays locked.
  const answeredCellRef = useRef<number | null>(restored?.answeredCell ?? null);
  useEffect(() => {
    teamRef.current = team;
  }, [team]);
  useEffect(() => {
    servedRef.current = served;
  }, [served]);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Couch Mode: the moment a signed-in player is linked to a team, persist that
  // membership server-side (idempotent upsert). After this they can CLOSE their
  // phone — the host credits every recorded member's XP at game end. No-ops for
  // guests (no account → no XP) and for Party Mode (phones stay open + score live).
  useEffect(() => {
    if (mode !== 'couch' || !team || !room) return;
    void linkRoomMember(room, team, name || 'Player');
  }, [mode, team, room, name]);

  // Signed-in phones auto-join with their account username — no manual entry.
  useEffect(() => {
    if (joined || !accountName) return;
    setName(accountName);
    setNameDraft(accountName);
    setJoined(true);
  }, [accountName, joined]);

  // Bootstrap channel + presence — only AFTER the player has joined (entered a name).
  useEffect(() => {
    if (!joined) return;
    if (!room || room.length !== 6) {
      setStatus('error');
      setError('Missing or invalid room code in URL.');
      return;
    }
    if (!isSupabaseConfigured()) {
      setStatus('error');
      setError('Party mode needs Supabase configuration.');
      return;
    }

    const existing = loadSave(room);
    const playerId = existing?.playerId ?? generatePlayerId();
    const displayName = (name || existing?.name || initialName || 'Player').trim() || 'Player';
    const savedTeam = existing?.team ?? null;
    if (!name) setName(displayName);
    if (savedTeam) {
      setTeam(savedTeam);
      teamRef.current = savedTeam;
    }
    persistSave({ playerId, name: displayName, room, team: savedTeam, answeredCell: answeredCellRef.current });

    let cancelled = false;
    let notFoundTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const self: PresencePlayer = {
          id: playerId,
          name: displayName,
          team: savedTeam,
          role: 'player',
          joinedAt: Date.now(),
        };
        const h = await openRoom(room, self, {
          onEvent: (event) => onEvent(event, playerId),
          onRoster: (players) => {
            if (players.some((p) => p.role === 'host')) sawHostRef.current = true;
            // Adopt a team from presence ONLY to fill an empty slot (null → A/B).
            // All explicit (re)assignments — including rapid blue↔amber changes —
            // arrive via the ordered team_assigned event; presence is
            // eventually-consistent and out-of-order, so it must never override an
            // assignment we already have (that caused stale-colour flicker).
            const me = players.find((p) => p.id === playerId);
            if (me && me.team && teamRef.current === null) {
              setTeam(me.team);
              teamRef.current = me.team;
              persistSave({ playerId, name: displayName, room, team: me.team, answeredCell: answeredCellRef.current });
            }
          },
        });
        if (cancelled) {
          await h.leave();
          return;
        }
        handleRef.current = h;
        setStatus('open');
        setPhase('lobby');
        // Immediately ask the host to (re)send the live state. THIS is what makes
        // refresh / browser-back / mid-question joins work: the host replies with
        // the current question (+ synced timer, steal window, board, reveal, or
        // match-over), so the player lands exactly where the match is and can type
        // an answer right away — never stranded on "waiting". Re-asked a moment
        // later too, in case the host's answer raced ahead of our subscription.
        h.broadcast({ type: 'request_state', playerId }).catch(() => {});
        setTimeout(() => {
          if (!cancelled) h.broadcast({ type: 'request_state', playerId }).catch(() => {});
        }, 700);
        // A code typed for a room that doesn't exist still "connects" (presence
        // channels are created on demand). If no host ever shows up, surface it.
        notFoundTimer = setTimeout(() => {
          if (!cancelled && !sawHostRef.current) {
            setStatus('error');
            setError("Couldn't find that room. Double-check the code with the host.");
          }
        }, 8000);
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      if (notFoundTimer) clearTimeout(notFoundTimer);
      const h = handleRef.current;
      if (h) h.leave().catch(() => {});
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, joined]);

  // Reconnect after the tab is backgrounded (mobile Safari drops the websocket):
  // on return, re-announce presence + ask the host to resend the current state so
  // answering works again instead of silently hanging.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const h = handleRef.current;
      if (!h) return;
      h.channel.track({ ...h.self, team: teamRef.current }).catch(() => {});
      h.broadcast({ type: 'request_state', playerId: h.self.id }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Tick the synced countdown while a timer is running.
  useEffect(() => {
    if (!timerState) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [timerState]);

  // Stable across the channel's lifetime — reads live values from refs so the
  // once-registered listener never works off a stale `team`/`served`.
  const onEvent = useCallback((event: LobbyEvent, myId: string) => {
    switch (event.type) {
      case 'team_assigned':
        if (event.playerId === myId) {
          setTeam(event.team);
          teamRef.current = event.team;
          // Persist the team so a refresh / reconnect restores it — otherwise the
          // player would come back unassigned and be unable to answer.
          persistSave({ playerId: myId, name: nameRef.current, room, team: event.team, answeredCell: answeredCellRef.current });
          // Re-track our own presence with the new team (or null = back to pool).
          const h = handleRef.current;
          if (h) h.channel.track({ ...h.self, team: event.team }).catch(() => {});
        }
        // Team colours/names ride along with the assignment so colour + team
        // update atomically (no ordering race with a separate team_labels event).
        if (event.aColor && event.bColor) setColors({ A: event.aColor, B: event.bColor });
        if (event.aName && event.bName) setLabels({ A: event.aName, B: event.bName });
        break;
      case 'team_labels':
        setLabels({ A: event.A, B: event.B });
        if (event.aColor && event.bColor) setColors({ A: event.aColor, B: event.bColor });
        if (event.category) setCategory(event.category);
        if (event.mode) {
          setMode(event.mode);
          modeRef.current = event.mode;
        }
        break;
      case 'board_state':
        setBoardSnap({ owners: event.owners, size: event.size, turn: event.turn, winner: event.winner });
        // Receiving live game state means the match is underway — never stay stuck
        // in the lobby if the match_started broadcast was missed.
        setPhase((p) => (p === 'lobby' || p === 'waiting' ? 'ready' : p));
        break;
      case 'question_served':
        setServed({
          cell: event.cell,
          letter: event.letter,
          prompt: event.prompt,
          picker: event.picker,
          hideLetter: event.hideLetter,
          audio: event.audio,
          video: event.video,
          image: event.image,
          youtube: event.youtube,
        });
        setTeammateAnswered(false);
        // A fresh question starts in the picker's window; the steal window is
        // re-opened by the host (re-sent on reconnect via steal_open) if needed.
        if (answeredCellRef.current !== event.cell) setStealOpen(false);
        setAnswer('');
        setFeedback(null);
        setWinner(null);
        setTimerState(buildTimer(event.deadline, event.hostNow, event.timerSeconds));
        // One answer per question: if this is the SAME cell we already answered
        // (a reconnect / host re-broadcast), stay locked on "answer sent" instead
        // of letting the player submit again. A NEW cell clears the lock.
        if (answeredCellRef.current === event.cell) {
          setPhase('submitted');
        } else {
          answeredCellRef.current = null;
          setPhase('question');
        }
        break;
      case 'steal_open':
        // The picker's window closed → the OTHER team may now answer. Open the
        // steal window for this cell and follow the new (steal) timer.
        if (servedRef.current && event.cell === servedRef.current.cell) setStealOpen(true);
        setTimerState(buildTimer(event.deadline, event.hostNow, event.stealSeconds));
        break;
      case 'answer_submitted':
        // Lock out the rest of our team once a teammate has answered (only the
        // first player from each team gets to answer).
        if (event.playerId !== myId && event.team === teamRef.current) {
          setTeammateAnswered(true);
        }
        break;
      case 'answer_revealed':
        setFeedback(`Answer: ${event.answer}`);
        setPhase('reveal');
        break;
      case 'adjudicated':
        if (event.winner === null) {
          setFeedback('No one got it — it stays open!');
        } else if (event.winner === teamRef.current) {
          setFeedback('🏆 Your team got it!');
        } else {
          setFeedback('Other team scored this one.');
        }
        setPhase('reveal');
        break;
      case 'game_won':
        // Each finished GAME (even within a best-of-N series) awards signed-in
        // players XP + a rank-up celebration: the winning team gets the full win,
        // the losing team still gets HALF for playing. Guests / anonymous
        // controllers no-op cleanly, and a draw (no winner) awards nothing. The
        // 'done' screen is driven by game_over (match end), so award here but only
        // transition there.
        // PARTY Mode: the phone is open (it answers) so it credits its own XP
        // live. COUCH Mode: the phone may be closed, so the HOST credits every
        // recorded member server-side (award_room_xp) — this phone must NOT
        // double-award.
        if (event.winner && teamRef.current && modeRef.current !== 'couch') {
          awardXp(teamXpForResult(teamRef.current, event.winner))
            .then((r) => {
              if (r?.leveled_up) setLevelUp({ level: r.level, prestige: r.prestige });
            })
            .catch(() => {});
        }
        setTimerState(null);
        // A finished game clears the per-question answer lock so the NEXT game in
        // a series (which can re-use the same board cell) never starts locked.
        answeredCellRef.current = null;
        persistSave({ playerId: myId, name: nameRef.current, room, team: teamRef.current, answeredCell: null });
        if (!event.matchOver) {
          // More games to come — show a brief between-games beat, not "game over".
          setWinner(event.winner);
          setFeedback(
            event.winner === teamRef.current ? '🏆 Your team won that game!' : 'That game went the other way.',
          );
          setPhase('reveal');
        }
        break;
      case 'game_over':
        // Match is over → final result screen. XP was already granted on game_won
        // (don't double-award here).
        setWinner(event.winner);
        setPhase('done');
        break;
      case 'kicked':
        // The host removed THIS player from the room. Drop our XP membership and
        // disconnect so we stop receiving the match (and no longer earn its XP).
        if (event.playerId === myId) {
          void unlinkRoomMember(room);
          const h = handleRef.current;
          if (h) h.leave().catch(() => {});
          handleRef.current = null;
          setError('The host removed you from the room.');
          setStatus('error');
        }
        break;
      case 'host_left':
        setError('The host left and the game has ended.');
        setStatus('error');
        break;
      case 'match_started':
        setServed(null);
        setFeedback(null);
        setWinner(null);
        setPhase('ready');
        // NOTE: do NOT clear the answer-lock here — match_started is re-broadcast
        // on every reconnect, so clearing it would unlock a player who already
        // answered the current question. The lock is cleared on game_won (a real
        // new game) and naturally when a different cell is served.
        break;
      default:
        break;
    }
  }, []);

  const submit = useCallback(() => {
    const h = handleRef.current;
    const s = servedRef.current;
    const t = teamRef.current;
    if (!h || !s || !t || !answer.trim()) return; // must be on a team to answer
    // One answer per question — ignore a second submit for the same cell (e.g.
    // a double-tap or a refresh-and-resubmit attempt).
    if (answeredCellRef.current === s.cell) {
      setPhase('submitted');
      return;
    }
    answeredCellRef.current = s.cell;
    persistSave({ playerId: h.self.id, name, room, team: t, answeredCell: s.cell });
    h.broadcast({
      type: 'answer_submitted',
      playerId: h.self.id,
      playerName: name,
      team: t,
      answer: answer.trim(),
      cell: s.cell,
    }).catch(() => {});
    setPhase('submitted');
  }, [answer, name, room]);

  const join = useCallback(() => {
    const n = nameDraft.trim().slice(0, 20);
    if (!n) return;
    setName(n);
    setJoined(true);
  }, [nameDraft]);

  // Leave the room and return to the main app home. Used both mid-match (exit any
  // time) and after the game completes. Drops the channel cleanly first.
  const leaveToHome = useCallback(() => {
    // Explicitly leaving = opting out, so drop the XP membership. (Merely CLOSING
    // the tab does NOT call this — that's the whole point: scan once, close, still
    // get XP. unlink no-ops for guests / when not linked.)
    void unlinkRoomMember(room);
    const h = handleRef.current;
    if (h) h.leave().catch(() => {});
    handleRef.current = null;
    // The controller is a standalone route (?view=controller); navigating to the
    // bare path loads the full app (Home).
    window.location.href = window.location.origin + window.location.pathname;
  }, []);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const teamLabel = team === 'A' ? labels.A : team === 'B' ? labels.B : 'Unassigned';
  // Sequential answer-gating: the PICKER answers first (main window); once that
  // closes the host opens the steal window and the OTHER team answers. A team's
  // window is open when it's their turn in the sequence; one answer per team
  // still applies (a teammate answering locks the rest of the team out).
  const picker = served?.picker;
  // Whose window is live right now: picker before the steal opens, the other team after.
  const myWindowOpen = !!team && (picker ? (stealOpen ? team !== picker : team === picker) : true);
  const lockReason: null | 'teammate' | 'waiting' | 'closed' = teammateAnswered
    ? 'teammate'
    : !myWindowOpen
      ? stealOpen
        ? 'closed' // picker whose window already passed
        : 'waiting' // non-picker waiting for their turn
      : null;
  const canAnswerNow = !!team && lockReason === null;
  const pickerLabel = picker === 'A' ? labels.A : picker === 'B' ? labels.B : 'the other team';
  const remaining = timerState
    ? Math.max(0, (timerState.deadline - (now + timerState.offset)) / 1000)
    : null;
  const timerPct =
    timerState && timerState.total > 0
      ? Math.max(0, Math.min(1, (remaining ?? 0) / timerState.total))
      : 0;

  return (
    <div
      className="controller"
      data-testid="controller"
      data-team={team ?? ''}
      data-phase={phase}
    >
      <header className="controller-head">
        <div className="controller-room">
          Room <strong>{room}</strong>
        </div>
        <div className="controller-team" data-testid="controller-team">
          {joined ? teamLabel : ''}
        </div>
        {joined ? (
          <button
            className="controller-leave"
            data-testid="controller-leave"
            aria-label="Leave the game"
            onClick={() => setConfirmLeave(true)}
          >
            Leave
          </button>
        ) : (
          // Before joining there's still always a way out — back to the app home.
          <button
            className="controller-leave"
            data-testid="controller-go-home"
            aria-label="Back to home"
            onClick={leaveToHome}
          >
            Home
          </button>
        )}
      </header>

      {confirmLeave && (
        <div className="controller-leave-confirm" data-testid="controller-leave-confirm" role="dialog" aria-label="Leave game?">
          <div className="controller-leave-card">
            <p>Leave the game and return home?</p>
            <div className="controller-leave-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmLeave(false)}>
                Keep playing
              </button>
              <button className="btn btn-primary" data-testid="controller-leave-confirm-yes" onClick={leaveToHome}>
                Leave ▸
              </button>
            </div>
          </div>
        </div>
      )}

      {/* While auth is still resolving, show a brief loader instead of the name
          form so a signed-in player never sees a name prompt flash before the
          auto-join kicks in. */}
      {!joined && authResolving && (
        <div className="controller-wait" data-testid="controller-auth-resolving">
          <div className="spinner" />
          <p>Connecting…</p>
        </div>
      )}

      {!joined && !authResolving && (
        <div className="controller-join" data-testid="controller-join">
          <h2>Join the game</h2>

          {/* Signed-out players forfeit XP / leaderboard progress. Nudge them to
              sign in (full auth flow) before joining — but still let them play
              as a guest if they'd rather. Signed-in players never see this:
              they auto-join with their account name. */}
          {!user && (
            <div className="controller-xp-notice" data-testid="controller-xp-notice">
              <p className="controller-xp-warn">
                ⚡ Heads up — playing as a guest, you <strong>won't earn XP</strong> or
                climb the leaderboard. Sign in first so your wins actually count.
              </p>
              <button
                className="btn btn-primary btn-lg block"
                data-testid="controller-signin"
                onClick={() => setAuthOpen(true)}
              >
                Sign in to earn XP ▸
              </button>
              <div className="controller-or"><span>or play as a guest</span></div>
            </div>
          )}

          <p>Enter a name so the host can see you.</p>
          <label className="controller-answer">
            <span>Your name</span>
            <input
              type="text"
              data-testid="controller-join-name"
              value={nameDraft}
              maxLength={20}
              placeholder="e.g. Ahmed"
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') join();
              }}
            />
          </label>
          <button
            className="btn btn-primary btn-lg block"
            data-testid="controller-join-submit"
            disabled={!nameDraft.trim()}
            onClick={join}
          >
            Join room ▸
          </button>
        </div>
      )}

      {joined && status === 'error' && (
        <div className="controller-error" data-testid="controller-error">
          <strong>Disconnected</strong>
          <p>{error}</p>
        </div>
      )}

      {joined && status === 'connecting' && (
        <div className="controller-wait">
          <div className="spinner" />
          <p>Connecting to the host…</p>
        </div>
      )}

      {phase === 'lobby' && status === 'open' && (
        <div className="controller-wait" data-testid="controller-lobby">
          <h2>You're in! 🎉</h2>
          <p>Welcome, <strong>{name}</strong>.</p>
          {category && (
            <p className="controller-category" data-testid="controller-category">
              Category: <strong>{category}</strong>
            </p>
          )}
          <p>
            {team
              ? `You're on ${teamLabel}. Waiting for the host to start…`
              : 'Waiting for the host to put you on a team and start the match…'}
          </p>
        </div>
      )}

      {phase === 'ready' && status === 'open' && (
        <div className="controller-wait" data-testid="controller-ready">
          <h2>Match starting! 🎬</h2>
          {category && (
            <p className="controller-category" data-testid="controller-category">
              Category: <strong>{category}</strong>
            </p>
          )}
          <p>
            {mode === 'couch'
              ? "Eyes on the big screen — the host runs the questions. You'll earn XP for your team's results."
              : "Eyes on the big screen — your question will appear here when it's live."}
          </p>
        </div>
      )}

      {phase === 'question' && served && (
        <div className="controller-question" data-testid="controller-question">
          {boardSnap && (
            <MiniBoard owners={boardSnap.owners} size={boardSnap.size} colorA={colors.A} colorB={colors.B} />
          )}
          {/* Clear "whose turn" banner + synced countdown. */}
          <div
            className={`controller-turn ${mode === 'couch' ? 'go' : canAnswerNow ? 'go' : 'wait'}`}
            data-testid="controller-turn"
          >
            {mode === 'couch'
              ? !team
                ? 'Not on a team yet'
                : `👀 Watch the big screen — you're earning XP for ${teamLabel}`
              : !team
                ? 'Not on a team'
                : canAnswerNow
                  ? '✅ Your turn — answer now!'
                  : lockReason === 'waiting'
                    ? `🔒 ${pickerLabel} answers first — you're up next`
                    : lockReason === 'closed'
                      ? '⏳ Other team is answering now'
                      : '🔒 Teammate is answering for your team'}
          </div>
          {remaining !== null && (
            <div className={`controller-timer ${remaining <= 5 ? 'urgent' : ''}`} data-testid="controller-timer">
              <div className="controller-timer-bar" style={{ transform: `scaleX(${timerPct})` }} />
              <span className="controller-timer-num">{Math.ceil(remaining)}s</span>
            </div>
          )}
          {!served.hideLetter && (
            <div className="controller-letter" aria-hidden="true">{served.letter}</div>
          )}
          <div className="controller-prompt">{served.prompt}</div>
          {served.image && (
            <img
              src={served.image}
              alt=""
              className="controller-media"
              onError={(e) => ((e.currentTarget.style.display = 'none'))}
            />
          )}
          {served.audio && <audio controls src={served.audio} className="controller-media" />}
          {served.video && <video controls src={served.video} className="controller-media" />}
          {mode === 'couch' ? (
            // Couch Mode: phones don't answer. The host adjudicates on the shared
            // screen; this phone is just linked so its account earns the team's XP.
            <p className="controller-couch-watch" data-testid="controller-couch-watch">
              {team
                ? `🛋 Sit back and watch the big screen — you'll earn XP whenever ${teamLabel} scores.`
                : "Ask the host to put you on a team so your XP counts."}
            </p>
          ) : !team ? (
            <p className="controller-noteam" data-testid="controller-noteam">
              You're not on a team yet — ask the host to add you, then you can answer.
            </p>
          ) : canAnswerNow ? (
            // Sticky answer bar: input + Submit are always visible, even on short
            // landscape screens where the prompt/media would otherwise push them
            // below the fold. The content above scrolls under it only as a last
            // resort — on normal sizes everything fits with no scroll at all.
            <div className="controller-answer-bar">
              <label className="controller-answer">
                <span>Your answer</span>
                <input
                  type="text"
                  data-testid="controller-input"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                  }}
                  autoFocus
                />
              </label>
              <button
                className="btn btn-primary btn-lg block"
                data-testid="controller-submit"
                disabled={!answer.trim()}
                onClick={submit}
              >
                Submit ▸
              </button>
            </div>
          ) : (
            // Locked — not this team's window yet (or a teammate already answered).
            <p className="controller-locked" data-testid="controller-locked">
              {lockReason === 'waiting'
                ? `${pickerLabel} answers first. Get ready — your window opens next.`
                : lockReason === 'closed'
                  ? "Your team's window has closed — the other team is answering."
                  : 'Your teammate is answering for the team.'}
            </p>
          )}
        </div>
      )}

      {phase === 'submitted' && (
        <div className="controller-wait" data-testid="controller-submitted">
          <div className="spinner" />
          <p>Answer sent — waiting for the host to adjudicate…</p>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="controller-feedback" data-testid="controller-feedback">
          {feedback}
        </div>
      )}

      {phase === 'done' && (
        <div className="controller-done" data-testid="controller-done">
          <h2>🏆 Game over</h2>
          <p>
            Winner:{' '}
            {winner === team
              ? 'Your team!'
              : winner === 'A'
                ? labels.A
                : winner === 'B'
                  ? labels.B
                  : '—'}
          </p>
          <button
            className="btn btn-primary btn-lg block"
            data-testid="controller-home"
            onClick={leaveToHome}
          >
            ▸ Back to home
          </button>
        </div>
      )}

      {levelUp && (
        <LevelUpOverlay
          kind="level"
          level={levelUp.level}
          prestige={levelUp.prestige}
          onDone={() => setLevelUp(null)}
        />
      )}

      {/* Full sign-in flow (Google / email-OTP / username claim). On success the
          auto-join effect picks up the account username and joins automatically. */}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
