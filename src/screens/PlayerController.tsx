import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type Phase = 'waiting' | 'lobby' | 'question' | 'submitted' | 'reveal' | 'done';

interface ServedPrompt {
  cell: number;
  letter: string;
  prompt: string;
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
  const [team, setTeam] = useState<PlayerTeam | null>(null);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [served, setServed] = useState<ServedPrompt | null>(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [winner, setWinner] = useState<PlayerTeam | null>(null);
  const handleRef = useRef<LobbyHandle | null>(null);

  // Bootstrap channel + presence
  useEffect(() => {
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
    const displayName = (existing?.name ?? initialName ?? 'Player').trim() || 'Player';
    if (!name) setName(displayName);
    persistSave({ playerId, name: displayName, room });

    let cancelled = false;

    (async () => {
      try {
        const self: PresencePlayer = {
          id: playerId,
          name: displayName,
          team: null,
          role: 'player',
          joinedAt: Date.now(),
        };
        const h = await openRoom(room, self, {
          onEvent: (event) => onEvent(event, playerId),
          onRoster: (players) => {
            // Track our own team assignment as the host updates it.
            const me = players.find((p) => p.id === playerId);
            if (me && me.team !== team) setTeam(me.team);
          },
        });
        if (cancelled) {
          await h.leave();
          return;
        }
        handleRef.current = h;
        setStatus('open');
        setPhase('lobby');
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      const h = handleRef.current;
      if (h) h.leave().catch(() => {});
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const onEvent = useCallback(
    (event: LobbyEvent, myId: string) => {
      switch (event.type) {
        case 'team_assigned':
          if (event.playerId === myId) {
            setTeam(event.team);
            // Re-track our own presence with the new team
            const h = handleRef.current;
            if (h) {
              h.channel
                .track({ ...h.self, team: event.team })
                .catch(() => {});
            }
          }
          break;
        case 'question_served':
          setServed({
            cell: event.cell,
            letter: event.letter,
            prompt: event.prompt,
            audio: event.audio,
            video: event.video,
            image: event.image,
            youtube: event.youtube,
          });
          setAnswer('');
          setFeedback(null);
          setPhase('question');
          break;
        case 'answer_revealed':
          setFeedback(`Answer: ${event.answer}`);
          setPhase('reveal');
          break;
        case 'adjudicated':
          if (event.winner === null) {
            setFeedback('No one got it — it stays open!');
          } else if (event.winner === team) {
            setFeedback('🏆 Your team got it!');
          } else {
            setFeedback('Other team scored this one.');
          }
          setPhase('reveal');
          break;
        case 'game_over':
          setWinner(event.winner);
          setPhase('done');
          break;
        case 'host_left':
          setError('Host left the room. The game has ended.');
          setStatus('error');
          break;
        case 'match_started':
          setPhase('lobby');
          break;
        default:
          break;
      }
    },
    [team],
  );

  const submit = useCallback(() => {
    const h = handleRef.current;
    if (!h || !served || !answer.trim()) return;
    h.broadcast({
      type: 'answer_submitted',
      playerId: h.self.id,
      playerName: name,
      team: team ?? 'A',
      answer: answer.trim(),
    }).catch(() => {});
    setPhase('submitted');
  }, [answer, name, served, team]);

  const teamLabel =
    team === 'A' ? 'Team A' : team === 'B' ? 'Team B' : 'Unassigned';

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
          {teamLabel}
        </div>
      </header>

      {status === 'error' && (
        <div className="controller-error" data-testid="controller-error">
          <strong>Disconnected</strong>
          <p>{error}</p>
        </div>
      )}

      {status === 'connecting' && (
        <div className="controller-wait">
          <div className="spinner" />
          <p>Connecting to the host…</p>
        </div>
      )}

      {phase === 'lobby' && status === 'open' && (
        <div className="controller-wait" data-testid="controller-lobby">
          <h2>You're in! 🎉</h2>
          <p>Welcome, <strong>{name}</strong>.</p>
          <p>Waiting for the host to start the match…</p>
        </div>
      )}

      {phase === 'question' && served && (
        <div className="controller-question" data-testid="controller-question">
          <div className="controller-letter" aria-hidden="true">{served.letter}</div>
          <div className="controller-prompt">{served.prompt}</div>
          {served.image && <img src={served.image} alt="" className="controller-media" />}
          {served.audio && <audio controls src={served.audio} className="controller-media" />}
          {served.video && <video controls src={served.video} className="controller-media" />}
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
          <p>Winner: {winner === team ? 'Your team!' : `Team ${winner ?? '—'}`}</p>
        </div>
      )}
    </div>
  );
}
