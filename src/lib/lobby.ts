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
      // For letterless packs the prompt carries audio/video/image URLs; players
      // see the prompt text + media right on their phone.
      prompt: string;
      audio?: string;
      video?: string;
      image?: string;
      youtube?: string;
    }
  | { type: 'answer_revealed'; answer: string }
  | { type: 'answer_submitted'; playerId: string; playerName: string; team: PlayerTeam; answer: string }
  | { type: 'adjudicated'; winner: PlayerTeam | null; cell: number }
  | { type: 'game_over'; winner: PlayerTeam | null }
  | { type: 'team_assigned'; playerId: string; team: PlayerTeam }
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

  const channel = supabase.channel(`lobby:${code}`, {
    config: { broadcast: { self: false, ack: false }, presence: { key: self.id } },
  });

  channel.on('presence', { event: 'sync' }, () => {
    if (!handlers.onRoster) return;
    const state = channel.presenceState() as Record<string, PresencePlayer[]>;
    const players: PresencePlayer[] = [];
    for (const [, presences] of Object.entries(state)) {
      // Each presence key may have multiple entries on flaky connections; the
      // newest one wins so a fast rejoin doesn't show a duplicate.
      const newest = presences.reduce((acc, p) => (acc.joinedAt > p.joinedAt ? acc : p));
      players.push(newest);
    }
    players.sort((a, b) => a.joinedAt - b.joinedAt);
    handlers.onRoster(players);
  });

  channel.on('broadcast', { event: 'lobby' }, (msg) => {
    handlers.onEvent?.(msg.payload as LobbyEvent);
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

  return {
    channel,
    code,
    self,
    broadcast: async (event) => {
      await channel.send({ type: 'broadcast', event: 'lobby', payload: event });
    },
    leave: async () => {
      try {
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
