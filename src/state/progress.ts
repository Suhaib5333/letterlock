/**
 * Cross-game question progress (plan section 8 / user request): never repeat a
 * question until the whole pack has been served, then start a fresh cycle.
 *
 * Storage depends on who's playing:
 *   - Signed-in users: persisted through our API (`/progress`, keyed by user +
 *     pack) so the cycle follows their account across devices.
 *   - Guests: in-memory only, RESET every session (nothing is persisted), so a
 *     guest always starts fresh.
 *
 * Reads (usedSet/remaining) are synchronous off an in-memory cache (the reducer
 * needs them mid-turn); writes for signed-in users are flushed async + debounced.
 * `configureProgress(userId|null)` is called by the auth layer when the session
 * resolves or changes.
 */
import { api, getAccessToken, isApiConfigured } from '../lib/api';

type Progress = Record<string, string[]>; // packId -> served question ids in the current cycle

let cache: Progress = {};
let uid: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

/** Subscribe to progress changes (e.g. after async hydration). Returns an unsub. */
export function subscribeProgress(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const remote = () => !!uid && isApiConfigured() && !!getAccessToken();

/**
 * Point the tracker at the current identity. `userId` = signed in (load + persist
 * remotely); `null` = guest (wipe to a fresh in-memory cycle for this session).
 */
export async function configureProgress(userId: string | null): Promise<void> {
  uid = userId;
  if (!remote()) {
    // Guest: start fresh this session.
    cache = {};
    notify();
    return;
  }
  // Signed-in: hydrate from the account, replacing whatever was in memory.
  try {
    const res = await api<{ packs: Record<string, string[]> }>('/progress', { auth: 'user' });
    cache = { ...res.packs };
    notify();
  } catch {
    // Network failure: keep an empty cache rather than leaking another user's.
    cache = {};
    notify();
  }
}

// Debounced per-pack write-through for signed-in users.
const pending = new Map<string, ReturnType<typeof setTimeout>>();
function flushPack(packId: string): void {
  if (!remote()) return;
  const existing = pending.get(packId);
  if (existing) clearTimeout(existing);
  pending.set(
    packId,
    setTimeout(() => {
      pending.delete(packId);
      if (!remote()) return;
      api(`/progress/${encodeURIComponent(packId)}`, { method: 'PUT', body: { served: cache[packId] ?? [] }, auth: 'user' }).catch(() => {});
    }, 600),
  );
}

/** The set of question ids already served for a pack in the current cycle. */
export function usedSet(packId: string): Set<string> {
  return new Set(cache[packId] ?? []);
}

export function usedCount(packId: string): number {
  return (cache[packId] ?? []).length;
}

/** Unique questions still unseen this cycle. */
export function remaining(packId: string, total: number): number {
  return Math.max(0, total - usedCount(packId));
}

/**
 * Record that `ids` were served. When every id in `allIds` has been seen, the
 * cycle is complete: reset so the next serve starts a fresh cycle (re-cycling).
 */
export function markServed(packId: string, ids: string[], allIds: string[]): void {
  const cur = new Set(cache[packId] ?? []);
  for (const id of ids) cur.add(id);
  if (allIds.length > 0 && allIds.every((id) => cur.has(id))) {
    cache[packId] = []; // cycle complete: reset for the next pass
  } else {
    cache[packId] = [...cur];
  }
  flushPack(packId);
  notify();
}

export function resetPack(packId: string): void {
  delete cache[packId];
  flushPack(packId);
  notify();
}
