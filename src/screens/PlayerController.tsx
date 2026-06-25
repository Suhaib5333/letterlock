import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniBoard } from '../components/MiniBoard';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { AuthModal } from '../components/AuthModal';
import { XP } from '../core/progression';
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
  const { user, profile, loading: authLoading, profileLoading } = useAuth();
  const accountName = profile?.username ?? null;
  // While the session/profile is still resolving we must NOT flash the name-entry
  // screen at a signed-in player — wait until we know whether they have an account.
  const authResolving = authLoading || (!!user && profileLoading && !profile);
  // The sign-in dialog (full Google / email-OTP / username flow). Offered to
  // signed-out players on the QR-join screen so they don't forfeit their XP.
  const [authOpen, setAuthOpen] = useState(false);

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
  const [phase, setPhase] = useState<Phase>('waiting');
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [served, setServed] = useState<ServedPrompt | null>(null);
  const [pickerTeam, setPickerTeam] = useState<PlayerTeam | null>(null);
  const [stealOpen, setStealOpen] = useState(false);
  const [teammateAnswered, setTeammateAnswered] = useState(false);
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
  const sawHostRef = useRef(false);
  useEffect(() => {
    teamRef.current = team;
  }, [team]);
  useEffect(() => {
    servedRef.current = served;
  }, [served]);
  useEffect(() => {
    nameRef.current = name;
  }, [name]);

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
    persistSave({ playerId, name: displayName, room, team: savedTeam });

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
              persistSave({ playerId, name: displayName, room, team: me.team });
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
          persistSave({ playerId: myId, name: nameRef.current, room, team: event.team });
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
          hideLetter: event.hideLetter,
          audio: event.audio,
          video: event.video,
          image: event.image,
          youtube: event.youtube,
        });
        setPickerTeam(event.picker ?? null);
        setStealOpen(false);
        setTeammateAnswered(false);
        setAnswer('');
        setFeedback(null);
        setWinner(null);
        setPhase('question');
        setTimerState(buildTimer(event.deadline, event.hostNow, event.timerSeconds));
        break;
      case 'steal_open':
        // The picking team's time is up — the other team may now answer.
        setStealOpen(true);
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
        if (event.winner && teamRef.current) {
          const won = event.winner === teamRef.current;
          awardXp(won ? XP.WIN : XP.LOSS)
            .then((r) => {
              if (r?.leveled_up) setLevelUp({ level: r.level, prestige: r.prestige });
            })
            .catch(() => {});
        }
        setTimerState(null);
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
      case 'host_left':
        setError('The host left and the game has ended.');
        setStatus('error');
        break;
      case 'match_started':
        setServed(null);
        setFeedback(null);
        setWinner(null);
        setPhase('ready');
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
    h.broadcast({
      type: 'answer_submitted',
      playerId: h.self.id,
      playerName: name,
      team: t,
      answer: answer.trim(),
      cell: s.cell,
    }).catch(() => {});
    setPhase('submitted');
  }, [answer, name]);

  const join = useCallback(() => {
    const n = nameDraft.trim().slice(0, 20);
    if (!n) return;
    setName(n);
    setJoined(true);
  }, [nameDraft]);

  // Leave the room and return to the main app home. Used both mid-match (exit any
  // time) and after the game completes. Drops the channel cleanly first.
  const leaveToHome = useCallback(() => {
    const h = handleRef.current;
    if (h) h.leave().catch(() => {});
    handleRef.current = null;
    // The controller is a standalone route (?view=controller); navigating to the
    // bare path loads the full app (Home).
    window.location.href = window.location.origin + window.location.pathname;
  }, []);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const teamLabel = team === 'A' ? labels.A : team === 'B' ? labels.B : 'Unassigned';
  // Answer-gating: only the picking team answers first; the other team waits for
  // the steal window; and only the first player from a team may answer.
  const isPicker = team !== null && pickerTeam !== null && team === pickerTeam;
  const lockReason: null | 'teammate' | 'waiting-picker' =
    teammateAnswered ? 'teammate' : !isPicker && !stealOpen && pickerTeam !== null ? 'waiting-picker' : null;
  const canAnswerNow = !!team && lockReason === null;
  const pickerLabel = pickerTeam === 'A' ? labels.A : pickerTeam === 'B' ? labels.B : 'the other team';
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
              placeholder="e.g. Suhaib"
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
          <p>Eyes on the big screen — your question will appear here when it's live.</p>
        </div>
      )}

      {phase === 'question' && served && (
        <div className="controller-question" data-testid="controller-question">
          {boardSnap && (
            <MiniBoard owners={boardSnap.owners} size={boardSnap.size} colorA={colors.A} colorB={colors.B} />
          )}
          {/* Clear "whose turn" banner + synced countdown. */}
          <div
            className={`controller-turn ${canAnswerNow ? 'go' : 'wait'}`}
            data-testid="controller-turn"
          >
            {!team
              ? 'Not on a team'
              : canAnswerNow
                ? stealOpen && !isPicker
                  ? '⚡ STEAL — answer now!'
                  : '✅ Your turn — type your answer!'
                : lockReason === 'teammate'
                  ? '🔒 Teammate is answering'
                  : `⏳ ${pickerLabel} answers first`}
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
          {!team ? (
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
                <span>Your answer{stealOpen && !isPicker ? ' (steal!)' : ''}</span>
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
            // Locked — the turn banner above already explains why; show a hint.
            <p className="controller-locked" data-testid="controller-locked">
              {lockReason === 'teammate'
                ? 'Your teammate is answering for the team.'
                : 'Eyes on the screen — be ready to steal if they miss!'}
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
