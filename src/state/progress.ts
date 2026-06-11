/**
 * Cross-game question progress (plan §8 / user request): never repeat a question
 * until the whole pack has been served, then start a fresh cycle. Persisted in
 * localStorage so it spans games and sessions. The home screen reads
 * {@link remaining} to show how many unique questions are left per pack.
 */
const KEY = 'letterlock.progress.v1';

type Progress = Record<string, string[]>; // packId -> served question ids in the current cycle

let cache: Progress | null = null;

function load(): Progress {
  if (cache) return cache;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(KEY) : null;
    cache = raw ? (JSON.parse(raw) as Progress) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function persist(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

/** The set of question ids already served for a pack in the current cycle. */
export function usedSet(packId: string): Set<string> {
  return new Set(load()[packId] ?? []);
}

export function usedCount(packId: string): number {
  return (load()[packId] ?? []).length;
}

/** Unique questions still unseen this cycle. */
export function remaining(packId: string, total: number): number {
  return Math.max(0, total - usedCount(packId));
}

/**
 * Record that `ids` were served. When every id in `allIds` has been seen, the
 * cycle is complete → reset so the next serve starts a fresh cycle (re-cycling).
 */
export function markServed(packId: string, ids: string[], allIds: string[]): void {
  const p = load();
  const cur = new Set(p[packId] ?? []);
  for (const id of ids) cur.add(id);
  if (allIds.length > 0 && allIds.every((id) => cur.has(id))) {
    p[packId] = []; // cycle complete — reset for the next pass
  } else {
    p[packId] = [...cur];
  }
  persist();
}

export function resetPack(packId: string): void {
  const p = load();
  delete p[packId];
  persist();
}
