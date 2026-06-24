/**
 * Saved game (Resume), account-aware.
 *
 * Storage depends on who's playing:
 *   • Signed-in users → persisted in Supabase (`saved_games`, ONE row per user)
 *     so "leave and come back → resume your last game" follows the account across
 *     devices/sessions. The local copy is just a fast cache kept in sync.
 *   • Guests → localStorage only (this browser).
 *
 * The account is the source of truth for signed-in users: on sign-in we PULL the
 * remote save and never inherit a previous user's / guest's local save (so two
 * people sharing a browser can't see each other's game).
 *
 * `configureSavedGame(userId|null)` is called by the auth layer when the session
 * resolves or changes (mirrors configureProgress).
 */
import { supabase } from '../lib/supabase';

const PERSIST_KEY = 'letterlock.save.v1';

export interface SavePayload {
  setup?: unknown;
  opts: { packId: string } & Record<string, unknown>;
  series: unknown;
  log: unknown[];
}

let uid: string | null = null;
// Local cache key is namespaced per identity so two people sharing a browser
// (or a signed-in user vs. guest) never see each other's game. Guests use the
// bare key; signed-in users use `<key>.<uid>`.
function localKey(): string {
  return uid ? `${PERSIST_KEY}.${uid}` : PERSIST_KEY;
}
let cache: SavePayload | null = readLocal();
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

/** Subscribe to saved-game changes (e.g. after async remote hydration). */
export function subscribeSavedGame(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** True when there's a resumable game for the current identity. */
export function hasSavedGame(): boolean {
  return cache !== null;
}

export function getSavedGame(): SavePayload | null {
  return cache;
}

function readLocal(): SavePayload | null {
  try {
    const raw = localStorage.getItem(localKey());
    return raw ? (JSON.parse(raw) as SavePayload) : null;
  } catch {
    return null;
  }
}

function writeLocal(p: SavePayload | null): void {
  try {
    if (p) localStorage.setItem(localKey(), JSON.stringify(p));
    else localStorage.removeItem(localKey());
  } catch {
    /* ignore */
  }
}

/**
 * Point the saved-game store at the current identity. `userId` = signed in
 * (the account's saved game is authoritative); `null` = guest (local only).
 */
export async function configureSavedGame(userId: string | null): Promise<void> {
  uid = userId;
  if (!userId || !supabase) {
    // Guest: resume only this browser's local save.
    cache = readLocal();
    notify();
    return;
  }
  // Signed-in: the account's saved game is the source of truth. Pull it; if there
  // is none, the user has no resumable game (don't inherit a local/guest save).
  try {
    const { data, error } = await supabase
      .from('saved_games')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    cache = (data?.state as SavePayload) ?? null;
    writeLocal(cache); // keep this user's local cache consistent with the account
  } catch {
    // Network/RPC failure — fall back to this user's own last local mirror
    // (offline resume) rather than wiping it or leaking another identity's save.
    cache = readLocal();
  }
  notify();
}

// Debounced remote write-through for signed-in users.
let timer: ReturnType<typeof setTimeout> | null = null;
export function saveGame(payload: SavePayload): void {
  cache = payload;
  writeLocal(payload);
  notify();
  if (!uid || !supabase) return;
  const userId = uid;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    if (!supabase) return;
    supabase
      .from('saved_games')
      .upsert(
        { user_id: userId, state: payload, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
      .then(() => {});
  }, 600);
}

/** Drop the saved game everywhere (match finished, exited, or crashed). */
export function clearSave(): void {
  cache = null;
  writeLocal(null);
  notify();
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!uid || !supabase) return;
  const userId = uid;
  supabase.from('saved_games').delete().eq('user_id', userId).then(() => {});
}
