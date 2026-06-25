/**
 * Online lobby — Kahoot-style room codes over Supabase Realtime.
 *
 * Topology (efficient by design):
 *   - One Realtime channel per room (`lobby:<CODE>`), shared by host + every player.
 *   - `presence` carries the live roster (auto-cleanup on disconnect — no GC code).
 *   - `broadcast` carries discrete events (question_served, answer_submitted, …)
 *     with `self: false` so a sender never receives its own echo.
 *   - The host is authoritative for game state (it's the same engine as Couch
 *     Mode); players are thin controllers that submit answers + receive prompts.
 *     This keeps logic in one place and is robust to player disconnects.
 *
 * No DB rows are written for ephemeral lobby chatter — Realtime channels are
 * memory-only, free, and the entire match lasts minutes. The persistent
 * `leaderboard` table still records the final score the same way Couch Mode
 * does (see Leaderboard.tsx).
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

/** Discrete events broadcast over the channel. */
export type LobbyEvent =
  | {
      type: 'question_served';
      cell: number;
      letter: string;
      // The team whose turn it is — they answer FIRST; the other team is locked
      // until the steal window opens.
      picker?: PlayerTeam;
      // Answer time (seconds, 0 = no timer) so the phone can show a countdown.
      timerSeconds?: number;
      // Synced-timer fields: the absolute host-clock deadline (epoch ms) the timer
      // ends at, plus the host's clock reading when this was sent. The phone
      // computes its clock offset from `hostNow` and shows remaining = deadline −
      // (localNow + offset) — so every device counts down to the SAME instant
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
      // The board cell this answer is for — lets the host bucket submissions per
      // question so stale answers never bleed across turns.
      cell: number;
    }
  | { type: 'adjudicated'; winner: PlayerTeam | null; cell: number }
  // A single GAME finished (one board). In a best-of-N series this fires once per
  // game; players award XP per game on this. `matchOver` marks the final game.
  | { type: 'game_won'; winner: PlayerTeam | null; matchOver: boolean }
  // The MATCH is over (series decided) → players show the final result screen.
  | { type: 'game_over'; winner: PlayerTeam | null }
  // team === null un-assigns the player (host "×" / kick back to the pool). The
  // team colours ride along so the phone updates colour + team atomically (no
  // ordering race with a separate team_labels broadcast).
  | { type: 'team_assigned'; playerId: string; team: PlayerTeam | null; aColor?: string; bColor?: string; aName?: string; bName?: string }
  // The colour-NAMES (+ hex colours) of each team so player phones show the
  // colour instead of a generic "Team A/B" and can tint the live mini-board.
  // `category` carries the chosen question pack's display name (emoji + title) so
  // the lobby tells everyone what they're about to play.
  | { type: 'team_labels'; A: string; B: string; aColor?: string; bColor?: string; category?: string }
  // Live board snapshot so the phone can mirror the hex board + whose turn it is.
  | {
      type: 'board_state';
      owners: (PlayerTeam | null)[];
      size: number;
      turn: PlayerTeam | null;
      winner: PlayerTeam | null;
    }
  // A (re)connecting phone asks the host to resend the current state (used after
  // the tab is backgrounded and the socket goes stale).
  | { type: 'request_state'; playerId: string }
  // Sent by the host when the picking team's time is up → the OTHER team may now
  // answer (steal window). cell scopes it to the current question.
  | { type: 'steal_open'; cell: number; stealSeconds?: number; deadline?: number; hostNow?: number }
  | { type: 'match_started' }
  | { type: 'host_left' };

export interface LobbyHandlers {
  onRoster?: (players: PresencePlayer[]) => void;
  onEvent?: (event: LobbyEvent) => void;
}

export interface LobbyHandle {
  channel: RealtimeChannel;
  code: string;
  self: PresencePlayer;
  broadcast: (event: LobbyEvent) => Promise<void>;
  /** Patch the live handlers (e.g. the host attaches an answer listener once the
   *  match starts, without tearing down + re-subscribing the channel). */
  setHandlers: (patch: LobbyHandlers) => void;
  leave: () => Promise<void>;
}

/**
 * Subscribe to a room channel and join the presence list.
 *
 * Host vs player: identical wiring. The host just additionally listens for
 * answer_submitted and decides what to do; players just additionally listen
 * for question_served and render it.
 */
export async function openRoom(
  code: string,
  self: PresencePlayer,
  handlers: LobbyHandlers = {},
): Promise<LobbyHandle> {
  if (!supabase) throw new Error('Online features require Supabase configuration.');

  // Handlers are mutable so the host can attach an in-match listener later
  // (setHandlers) without re-subscribing the channel.
  const live: LobbyHandlers = { ...handlers };

  // CRITICAL: supabase-js caches a channel per topic. If one already exists for
  // this room (e.g. a React StrictMode double-mount, or a navigate-away-and-back),
  // calling `.on(...)` on it again AFTER it has subscribed throws
  // "cannot add presence callbacks ... after subscribe()". Remove any stale
  // channel for this topic first so we always wire listeners on a fresh one.
  const topic = `lobby:${code}`;
  for (const existing of supabase.getChannels()) {
    if (existing.topic === topic || existing.topic === `realtime:${topic}`) {
      await supabase.removeChannel(existing);
    }
  }

  const channel = supabase.channel(topic, {
    config: { broadcast: { self: false, ack: false }, presence: { key: self.id } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    if (!live.onRoster) return;
    const state = channel.presenceState() as Record<string, PresencePlayer[]>;
    const players: PresencePlayer[] = [];
    for (const [, presences] of Object.entries(state)) {
      // Each presence key may have multiple entries on flaky connections; the
      // newest one wins so a fast rejoin doesn't show a duplicate.
      const newest = presences.reduce((acc, p) => (acc.joinedAt > p.joinedAt ? acc : p));
      players.push(newest);
    }
    players.sort((a, b) => a.joinedAt - b.joinedAt);
    live.onRoster(players);
  });

  channel.on('broadcast', { event: 'lobby' }, (msg) => {
    live.onEvent?.(msg.payload as LobbyEvent);
  });

  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('Realtime subscribe timeout')), 8000);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(t);
        await channel.track(self);
        resolve();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        clearTimeout(t);
        reject(new Error('Realtime channel error: ' + status));
      }
    });
  });

  // A host that closes/refreshes the tab should still tell players it's gone.
  let onUnload: (() => void) | null = null;
  if (self.role === 'host' && typeof window !== 'undefined') {
    onUnload = () => {
      // send() is best-effort during unload; the payload is tiny so it usually lands.
      channel.send({ type: 'broadcast', event: 'lobby', payload: { type: 'host_left' } });
    };
    window.addEventListener('beforeunload', onUnload);
  }

  return {
    channel,
    code,
    self,
    setHandlers: (patch) => {
      Object.assign(live, patch);
    },
    broadcast: async (event) => {
      try {
        await channel.send({ type: 'broadcast', event: 'lobby', payload: event });
      } catch {
        /* channel may be closing — never let a dropped broadcast crash the game */
      }
    },
    leave: async () => {
      try {
        if (onUnload) window.removeEventListener('beforeunload', onUnload);
        if (self.role === 'host') {
          await channel.send({ type: 'broadcast', event: 'lobby', payload: { type: 'host_left' } });
        }
        await channel.untrack();
      } finally {
        await supabase!.removeChannel(channel);
      }
    },
  };
}
