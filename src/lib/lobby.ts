/**
 * Online lobby: Kahoot-style room codes over our Socket.IO gateway
 * (apps/api/src/realtime/realtime.gateway.ts, protocol in apps/api/REALTIME.md).
 *
 * Topology:
 *   - One socket per device. The gateway puts it in `room:<CODE>` on `join_room`
 *     and pushes the live roster as `presence` events (auto-cleanup on disconnect).
 *   - `broadcast` carries the discrete LobbyEvents below (question_served,
 *     answer_submitted, ...). The sender never receives its own echo. Host-only
 *     events are refused by the server unless the socket is the room's host.
 *   - The host is authoritative for game state (same engine as Couch Mode);
 *     players are thin controllers that submit answers + receive prompts.
 *   - Token on the handshake: the signed-in access token, else a 24-hour guest
 *     token (POST /auth/guest) for phones without an account.
 *
 * No DB rows are written for lobby chatter; the persistent leaderboard still
 * records the final score the same way Couch Mode does (Leaderboard.tsx).
 */
import { io, type Socket } from 'socket.io-client';
import { apiBase } from './appConfig';
import { ensureFreshToken, ensureGuestToken, getAccessToken, GUEST_KEY, refreshAccessToken } from './api';

/** Excludes 0/O/1/I/L to keep codes unambiguous when read aloud / typed. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateRoomCode(len = 6): string {
  let out = '';
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/** Players are addressed by a stable client-generated id (no signup needed). */
export function generatePlayerId(): string {
  return 'p_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

export type PlayerTeam = 'A' | 'B';

export interface PresencePlayer {
  id: string;
  name: string;
  team: PlayerTeam | null; // null = unassigned in lobby
  role: 'host' | 'player';
  joinedAt: number;
}

/** Discrete events broadcast in the room. */
export type LobbyEvent =
  | {
      type: 'question_served';
      cell: number;
      letter: string;
      // The team whose turn it is: they answer FIRST; the other team is locked
      // until the steal window opens.
      picker?: PlayerTeam;
      // Answer time (seconds, 0 = no timer) so the phone can show a countdown.
      timerSeconds?: number;
      // Synced-timer fields: the absolute host-clock deadline (epoch ms) the timer
      // ends at, plus the host's clock reading when this was sent. The phone
      // computes its clock offset from `hostNow` and shows remaining = deadline -
      // (localNow + offset), so every device counts down to the SAME instant
      // regardless of clock skew or network latency. Re-sent verbatim on
      // reconnect so a returning phone resumes mid-countdown (not from full).
      deadline?: number;
      hostNow?: number;
      // For letterless packs the prompt carries audio/video/image URLs; players
      // see the prompt text + media right on their phone.
      prompt: string;
      hideLetter?: boolean;
      audio?: string;
      video?: string;
      image?: string;
      youtube?: string;
    }
  | { type: 'answer_revealed'; answer: string }
  | {
      type: 'answer_submitted';
      playerId: string;
      playerName: string;
      team: PlayerTeam;
      answer: string;
      // The board cell this answer is for, so the host buckets submissions per
      // question and stale answers never bleed across turns.
      cell: number;
    }
  | { type: 'adjudicated'; winner: PlayerTeam | null; cell: number }
  // A single GAME finished (one board). In a best-of-N series this fires once per
  // game; players award XP per game on this. `matchOver` marks the final game.
  | { type: 'game_won'; winner: PlayerTeam | null; matchOver: boolean }
  // The MATCH is over (series decided): players show the final result screen.
  | { type: 'game_over'; winner: PlayerTeam | null }
  // team === null un-assigns the player (host "x" / kick back to the pool). The
  // team colours ride along so the phone updates colour + team atomically (no
  // ordering race with a separate team_labels broadcast).
  | { type: 'team_assigned'; playerId: string; team: PlayerTeam | null; aColor?: string; bColor?: string; aName?: string; bName?: string }
  // The colour-NAMES (+ hex colours) of each team so player phones show the
  // colour instead of a generic "Team A/B" and can tint the live mini-board.
  // `category` carries the chosen question pack's display name (emoji + title).
  // `mode` tells the phone how to behave: 'party' = answer questions on the
  // phone; 'couch' = passive "watch the big screen, earn XP for your team" view.
  // Absent = 'party' (back-compat).
  | { type: 'team_labels'; A: string; B: string; aColor?: string; bColor?: string; category?: string; mode?: 'party' | 'couch' }
  // Live board snapshot so the phone can mirror the hex board + whose turn it is.
  | {
      type: 'board_state';
      owners: (PlayerTeam | null)[];
      size: number;
      turn: PlayerTeam | null;
      winner: PlayerTeam | null;
    }
  // A (re)connecting phone asks the host to resend the current state.
  | { type: 'request_state'; playerId: string }
  // Sent by the host when the picking team's time is up: the OTHER team may now
  // answer (steal window). cell scopes it to the current question.
  | { type: 'steal_open'; cell: number; stealSeconds?: number; deadline?: number; hostNow?: number }
  | { type: 'match_started' }
  // Host removed a player from the room (x in the lobby). The targeted phone
  // leaves and drops its XP-membership row.
  | { type: 'kicked'; playerId: string }
  // Sent by the GATEWAY when the host's socket leaves the room (explicit leave,
  // tab closed, or its connection dropped).
  | { type: 'host_left' };

export interface LobbyHandlers {
  onRoster?: (players: PresencePlayer[]) => void;
  onEvent?: (event: LobbyEvent) => void;
}

export interface LobbyHandle {
  socket: Socket;
  code: string;
  self: PresencePlayer;
  broadcast: (event: LobbyEvent) => Promise<void>;
  /** Update my own roster entry (team / name); the gateway re-emits `presence`. */
  updatePresence: (patch: Partial<Pick<PresencePlayer, 'name' | 'team'>>) => Promise<void>;
  /** Patch the live handlers (e.g. the host attaches an answer listener once the
   *  match starts, without tearing down + reconnecting the socket). */
  setHandlers: (patch: LobbyHandlers) => void;
  leave: () => Promise<void>;
}

type JoinAck = { ok: true; code: string; members: PresencePlayer[]; isHost: boolean } | { ok: false; error: string };

const JOIN_ERRORS: Record<string, string> = {
  host_taken: 'Another device is already hosting this room.',
  bad_request: 'Invalid room code.',
};

/** Access token for a signed-in device, else a (cached) guest token. */
async function realtimeToken(name: string): Promise<string> {
  if (getAccessToken()) return (await ensureFreshToken()) ?? '';
  return ensureGuestToken(name);
}

/**
 * A socket against the gateway. `getToken` runs on EVERY (re)connect attempt so
 * a reconnect after a long background never presents an expired token.
 * Starts disconnected: call `.connect()` after wiring the listeners.
 */
export function connectSocket(getToken: () => Promise<string>): Socket {
  const base = apiBase();
  if (!base) throw new Error('Online features are not configured in this build (VITE_API_URL).');
  return io(base, {
    path: '/socket.io',
    autoConnect: false,
    reconnectionDelayMax: 5000,
    auth: (cb) => {
      getToken().then((token) => cb({ token })).catch(() => cb({ token: '' }));
    },
  });
}

/**
 * Connect, join the room and enter the presence roster.
 *
 * Host vs player: identical wiring. The host additionally listens for
 * answer_submitted and decides what to do; players additionally listen for
 * question_served and render it. Every reconnect (network blip, backgrounded
 * tab) re-joins with the same player id, so the roster entry is replaced, not
 * duplicated; a player then asks the host for the live state again.
 */
export async function openRoom(code: string, self: PresencePlayer, handlers: LobbyHandlers = {}): Promise<LobbyHandle> {
  // Handlers are mutable so the host can attach an in-match listener later
  // (setHandlers) without reconnecting.
  const live: LobbyHandlers = { ...handlers };
  // My roster entry as the server knows it (team changes via updatePresence).
  const meta: PresencePlayer = { ...self };
  const socket = connectSocket(() => realtimeToken(self.name));
  let closed = false;
  let tokenRetries = 0;

  socket.on('presence', (msg: { code: string; members: PresencePlayer[] }) => {
    if (msg.code === code) live.onRoster?.(msg.members);
  });
  socket.on('lobby', (msg: { payload: LobbyEvent }) => {
    live.onEvent?.(msg.payload);
  });

  const join = () => new Promise<JoinAck>((resolve) => socket.emit('join_room', { code, meta }, resolve));

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(t);
      if (err) {
        closed = true;
        socket.disconnect();
        reject(err);
      } else resolve();
    };
    const t = setTimeout(() => finish(new Error('Could not reach the game server. Check your connection and try again.')), 12_000);

    socket.on('connect', async () => {
      const ack = await join();
      if (!ack.ok) {
        finish(new Error(JOIN_ERRORS[ack.error] ?? `Could not join the room (${ack.error}).`));
        return;
      }
      live.onRoster?.(ack.members);
      if (!settled) finish();
      // A RE-connect mid-match: ask the host to resend the live question / board.
      else if (self.role === 'player') socket.emit('broadcast', { code, payload: { type: 'request_state', playerId: self.id } });
    });

    // The gateway rejects a bad/expired token by emitting this and disconnecting.
    // socket.io does not auto-reconnect after a server-side disconnect, so refresh
    // the credential and reconnect ourselves (bounded, so a dead account can't loop).
    socket.on('connect_error_reason', async (r: { code?: string }) => {
      if (r?.code !== 'TOKEN_INVALID') return;
      if (closed || tokenRetries++ >= 3) {
        finish(new Error('Your session has expired. Sign in again to play online.'));
        return;
      }
      if (getAccessToken()) await refreshAccessToken();
      else localStorage.removeItem(GUEST_KEY); // a stale guest token: mint a new one on connect
      setTimeout(() => {
        if (!closed) socket.connect();
      }, 300);
    });
    socket.on('disconnect', (reason) => {
      // 'io server disconnect' follows TOKEN_INVALID (handled above) or a server
      // restart; reconnect for the latter after a beat.
      if (reason === 'io server disconnect' && !closed) setTimeout(() => {
        if (!closed && !socket.connected && !socket.active) socket.connect();
      }, 1500);
    });
    socket.connect();
  });

  return {
    socket,
    code,
    self,
    setHandlers: (patch) => {
      Object.assign(live, patch);
    },
    broadcast: async (event) => {
      if (closed) return;
      // Fire-and-forget like the old channel: a dropped broadcast must never crash the game.
      socket.emit('broadcast', { code, payload: event });
    },
    updatePresence: async (patch) => {
      Object.assign(meta, patch);
      if (closed) return;
      socket.emit('update_presence', { code, meta: patch });
    },
    leave: async () => {
      if (closed) return;
      closed = true;
      // The gateway tells the phones `host_left` itself when the host's socket leaves.
      if (socket.connected) socket.emit('leave_room', { code });
      socket.disconnect();
    },
  };
}
