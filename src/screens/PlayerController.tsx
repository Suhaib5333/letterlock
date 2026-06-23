import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MiniBoard } from '../components/MiniBoard';
import { LevelUpOverlay } from '../components/LevelUpOverlay';
import { XP } from '../core/progression';
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

export function PlayerController() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const room = (params.get('room') ?? '').toUpperCase();
  const initialName = (params.get('name') ?? '').slice(0, 20);

  const [name, setName] = useState(initialName);
  // Kahoot-style: scanning the QR lands here with no name → type it, then Join.
  // Arriving from the in-app Join form (which already has a name) auto-joins.
  const [joined, setJoined] = useState(() => !!initialName.trim());
  const [nameDraft, setNameDraft] = useState(initialName);
  const [team, setTeam] = useState<PlayerTeam | null>(null);
  const [labels, setLabels] = useState<{ A: string; B: string }>({ A: 'Team A', B: 'Team B' });
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
  // Synced answer countdown: { total seconds, startedAt ms }. Drives the phone bar.
  const [timerState, setTimerState] = useState<{ total: number; startedAt: number } | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const handleRef = useRef<LobbyHandle | null>(null);
  // Refs so the channel's once-registered callbacks always read fresh values
  // (avoids the stale-closure bug where adjudicated feedback compared an old team).
  const teamRef = useRef<PlayerTeam | null>(team);
  const servedRef = useRef<ServedPrompt | null>(served);
  const sawHostRef = useRef(false);
  useEffect(() => {
    teamRef.current = team;
  }, [team]);
  useEffect(() => {
    servedRef.current = served;
  }, [served]);

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
      setError('Online mode needs Supabase configuration.');
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
            // Adopt a team from presence only as an UPGRADE (null → A/B). Explicit
            // un-assignment arrives via the team_assigned event; presence is
            // eventually-consistent and must never spuriously revert us to null.
            const me = players.find((p) => p.id === playerId);
            if (me && me.team && me.team !== teamRef.current) {
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
    const id = setInterval(() => setNow(performance.now()), 250);
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
          // Re-track our own presence with the new team (or null = back to pool).
          const h = handleRef.current;
          if (h) h.channel.track({ ...h.self, team: event.team }).catch(() => {});
        }
        break;
      case 'team_labels':
        setLabels({ A: event.A, B: event.B });
        if (event.aColor && event.bColor) setColors({ A: event.aColor, B: event.bColor });
        break;
      case 'board_state':
        setBoardSnap({ owners: event.owners, size: event.size, turn: event.turn, winner: event.winner });
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
        setPhase('question');
        setTimerState(event.timerSeconds ? { total: event.timerSeconds, startedAt: performance.now() } : null);
        break;
      case 'steal_open':
        // The picking team's time is up — the other team may now answer.
        setStealOpen(true);
        if (event.stealSeconds) setTimerState({ total: event.stealSeconds, startedAt: performance.now() });
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
      case 'game_over':
        setWinner(event.winner);
        setPhase('done');
        // Signed-in players on their phones earn XP for a win + see their own
        // rank-up celebration (guests/anonymous controllers no-op cleanly).
        if (event.winner && event.winner === teamRef.current) {
          awardXp(XP.WIN)
            .then((r) => {
              if (r?.leveled_up) setLevelUp({ level: r.level, prestige: r.prestige });
            })
            .catch(() => {});
        }
        break;
      case 'host_left':
        setError('The host left and the game has ended.');
        setStatus('error');
        break;
      case 'match_started':
        setServed(null);
        setFeedback(null);
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

  const teamLabel = team === 'A' ? labels.A : team === 'B' ? labels.B : 'Unassigned';
  // Answer-gating: only the picking team answers first; the other team waits for
  // the steal window; and only the first player from a team may answer.
  const isPicker = team !== null && pickerTeam !== null && team === pickerTeam;
  const lockReason: null | 'teammate' | 'waiting-picker' =
    teammateAnswered ? 'teammate' : !isPicker && !stealOpen && pickerTeam !== null ? 'waiting-picker' : null;
  const canAnswerNow = !!team && lockReason === null;
  const pickerLabel = pickerTeam === 'A' ? labels.A : pickerTeam === 'B' ? labels.B : 'the other team';
  const remaining = timerState
    ? Math.max(0, timerState.total - (now - timerState.startedAt) / 1000)
    : null;
  const timerPct = timerState ? Math.max(0, Math.min(1, (remaining ?? 0) / timerState.total)) : 0;

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
      </header>

      {!joined && (
        <div className="controller-join" data-testid="controller-join">
          <h2>Join the game</h2>
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
            <>
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
            </>
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
    </div>
  );
}
