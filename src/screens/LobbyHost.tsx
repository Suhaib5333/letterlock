import { motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QrCode } from '../components/QrCode';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  generatePlayerId,
  generateRoomCode,
  openRoom,
  type LobbyHandle,
  type PlayerTeam,
  type PresencePlayer,
} from '../lib/lobby';
import { play } from '../services/audio';
import { colorById } from '../state/palette';
import { useStore } from '../state/store';

/**
 * Host the online lobby: mint a room code, show the QR + code + roster,
 * assign teams, and start the match. Once the match starts we navigate to
 * Setup (same engine as Couch Mode) — the host's device is authoritative.
 *
 * The Realtime channel stays open across screens via window.__lobby so
 * Game.tsx can reach in and broadcast question_served / adjudicated events
 * to the player phones during the live match.
 */
declare global {
  interface Window {
    __lobby?: LobbyHandle;
  }
}

/** Keep the room code stable across StrictMode remounts / re-renders within a
 *  session, so the QR + channel never orphan under a regenerated code. */
function useSessionRoomCode(): string {
  return useState(() => {
    try {
      const existing = sessionStorage.getItem('letterlock.lobby.code');
      if (existing && existing.length === 6) return existing;
      const fresh = generateRoomCode();
      sessionStorage.setItem('letterlock.lobby.code', fresh);
      return fresh;
    } catch {
      return generateRoomCode();
    }
  })[0];
}

export function LobbyHost() {
  const { state, dispatch } = useStore();
  const code = useSessionRoomCode();
  const [roster, setRoster] = useState<PresencePlayer[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const handleRef = useRef<LobbyHandle | null>(null);

  const joinUrl = useMemo(() => {
    const u = new URL(window.location.href);
    // `view=controller` is REQUIRED — without it the link loads the full game
    // app (Home) instead of the phone controller (see main.tsx routing).
    u.search = `?room=${code}&view=controller`;
    u.hash = '';
    return u.toString();
  }, [code]);

  // Open the channel as host on mount; clean up on unmount.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setStatus('error');
      setError('Online mode needs Supabase — VITE_SUPABASE_URL/ANON_KEY missing.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const self: PresencePlayer = {
          id: generatePlayerId(),
          name: 'Host',
          team: null,
          role: 'host',
          joinedAt: Date.now(),
        };
        const h = await openRoom(code, self, {
          onRoster: (players) => {
            if (cancelled) return;
            setRoster(players);
          },
        });
        if (cancelled) {
          await h.leave();
          return;
        }
        handleRef.current = h;
        window.__lobby = h;
        setStatus('open');
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      // We deliberately do NOT close the channel on unmount when starting the
      // match — Setup/Game keep using it. The cleanup happens via EXIT_HOME.
    };
  }, [code]);

  const players = roster.filter((p) => p.role === 'player');
  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const unassigned = players.filter((p) => p.team === null);

  const assign = useCallback(
    (playerId: string, team: PlayerTeam | null) => {
      const h = handleRef.current;
      if (!h) return;
      play('tap');
      // Host updates the roster locally via track + broadcasts intent for
      // immediate UI on the player too (presence sync is eventually consistent
      // but takes a beat).
      const player = players.find((p) => p.id === playerId);
      if (!player) return;
      // Optimistic local update so the host UI feels instant
      setRoster((rs) => rs.map((p) => (p.id === playerId ? { ...p, team } : p)));
      // Player respects the broadcast and re-tracks their own presence with the
      // new team (or back to the pool when team === null) — see PlayerController.
      h.broadcast({ type: 'team_assigned', playerId, team }).catch(() => {});
    },
    [players],
  );

  const startMatch = useCallback(() => {
    const h = handleRef.current;
    if (!h) return;
    play('pick');
    h.broadcast({ type: 'match_started' }).catch(() => {});
    // Hand off to the existing Couch-Mode flow — Setup → Game. The host's
    // screen is the source of truth; player phones just see prompts.
    dispatch({ type: 'SET_SCREEN', screen: 'setup' });
  }, [dispatch]);

  const exit = useCallback(async () => {
    const h = handleRef.current;
    if (h) {
      try {
        await h.leave();
      } catch {
        /* ignore */
      }
      window.__lobby = undefined;
      handleRef.current = null;
    }
    try {
      sessionStorage.removeItem('letterlock.lobby.code');
    } catch {
      /* ignore */
    }
    dispatch({ type: 'SET_SCREEN', screen: 'home' });
  }, [dispatch]);

  const colorA = colorById(state.setup.colorA);
  const colorB = colorById(state.setup.colorB);

  return (
    <div className="lobby" data-testid="lobby-host">
      <header className="sub-head">
        <button className="btn btn-ghost" data-testid="lobby-back" onClick={exit}>
          ‹ Leave
        </button>
        <div className="sub-head-title">
          <h1>Online lobby</h1>
          <span className="mode-badge" data-testid="mode-badge">🛜 Online Mode</span>
        </div>
        <div />
      </header>

      {status === 'error' && (
        <div className="lobby-error" data-testid="lobby-error">
          <strong>Couldn't open the lobby.</strong>
          <p>{error}</p>
        </div>
      )}

      <div className="lobby-body">
        <section className="lobby-code-card">
          <div className="lobby-code-label">Room code</div>
          <div
            className="lobby-code"
            data-testid="lobby-code"
            aria-label={`Room code ${code.split('').join(' ')}`}
          >
            {code.split('').map((ch, i) => (
              <span key={i} className="lobby-code-ch">{ch}</span>
            ))}
          </div>
          <button
            className="btn btn-ghost lobby-copy"
            data-testid="lobby-copy"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? '✓ Copied' : '⧉ Copy code'}
          </button>
          <div className="lobby-qr">
            <QrCode value={joinUrl} size={180} />
          </div>
          <div className="lobby-qr-hint">Scan to join — or open <code>{joinUrl}</code></div>
        </section>

        <section className="lobby-roster" data-testid="lobby-roster">
          <header className="lobby-roster-head">
            <span>Players</span>
            <span className="lobby-roster-count" data-testid="lobby-count">
              {players.length} connected
            </span>
          </header>

          {players.length === 0 ? (
            <motion.p
              className="lobby-empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Waiting for players — share the code or QR. They'll appear here.
            </motion.p>
          ) : (
            <div className="lobby-teams">
              <TeamColumn
                label={colorA.name}
                colorVar="--team-a"
                team="A"
                players={teamA}
                onAssign={assign}
              />
              <TeamColumn
                label={colorB.name}
                colorVar="--team-b"
                team="B"
                players={teamB}
                onAssign={assign}
              />
              {unassigned.length > 0 && (
                <div className="lobby-unassigned">
                  <header>Unassigned</header>
                  <ul>
                    {unassigned.map((p) => (
                      <li key={p.id} data-testid={`lobby-player-${p.id}`}>
                        <span className="lobby-name">{p.name}</span>
                        <div className="lobby-assign">
                          <button onClick={() => assign(p.id, 'A')}>→ {colorA.name}</button>
                          <button onClick={() => assign(p.id, 'B')}>→ {colorB.name}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <button
        className="btn btn-primary btn-lg block lobby-start"
        data-testid="lobby-start"
        disabled={status !== 'open'}
        onClick={startMatch}
      >
        {status === 'open' ? 'Continue to setup ▸' : 'Connecting…'}
      </button>
    </div>
  );
}

function TeamColumn({
  label,
  colorVar,
  team,
  players,
  onAssign,
}: {
  label: string;
  colorVar: '--team-a' | '--team-b';
  team: PlayerTeam;
  players: PresencePlayer[];
  onAssign: (id: string, team: PlayerTeam | null) => void;
}) {
  return (
    <div
      className="lobby-team"
      data-team={team}
      style={{ borderColor: `var(${colorVar})` }}
      data-testid={`lobby-team-${team}`}
    >
      <header style={{ color: `var(${colorVar})` }}>{label}</header>
      {players.length === 0 ? (
        <p className="lobby-empty-team">No one yet</p>
      ) : (
        <ul>
          {players.map((p) => (
            <li key={p.id} data-testid={`lobby-player-${p.id}`}>
              <span className="lobby-name">{p.name}</span>
              <button className="lobby-kick" onClick={() => onAssign(p.id, null)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
