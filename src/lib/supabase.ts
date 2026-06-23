import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Singleton Supabase client. We DON'T crash if env vars are missing — the app
 * is fully playable offline (Couch Mode), so a missing client just disables
 * the online-only features (auth, leaderboard, lobby). UI components check
 * `isSupabaseConfigured()` before showing those buttons.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // pick up the #access_token=… on OAuth callback
        },
        realtime: { params: { eventsPerSecond: 20 } }, // plenty for buzz / pick / answer
      })
    : null;

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

export type UserRole = 'player' | 'moderator' | 'admin';

export type Profile = {
  id: string; // matches auth.users.id
  username: string; // unique, lowercase, 3-20 chars
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole; // populated by migration 0002 (default 'player')
  banned_at: string | null; // ISO timestamp when a user is banned
  created_at: string;
  // Progression (migration 0007). Older rows default via column defaults.
  xp: number; // xp within the current prestige
  level: number; // 1..10
  prestige: number; // 0..10
  total_xp: number; // lifetime
  full_access: boolean; // admin override — unlock everything
};

export type AdminUserRow = {
  id: string;
  username: string;
  display_name: string | null;
  email: string | null;
  role: UserRole;
  banned_at: string | null;
  created_at: string;
};

export type CustomPack = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  emoji: string;
  difficulty: 'kids' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';
  body: { letters: Record<string, { q: string; a: string; id?: string }[]> };
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaderboardRow = {
  id: string;
  user_id: string;
  username: string;
  pack_id: string;
  score: number; // games won this match
  moves: number; // total moves it took to win
  duration_ms: number;
  played_at: string;
};
