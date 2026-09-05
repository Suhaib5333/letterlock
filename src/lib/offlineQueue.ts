import { isOnline } from './online';

/**
 * Tiny localStorage queue for server writes that must not be lost when the
 * device is offline (LAUNCH_PLAN Phase 1): `award_xp` and `submit_score`. Each
 * kind registers its own runner (the module that owns the Supabase call), so this
 * file stays dependency-free. Jobs are flushed on the window `online` event and
 * once at startup; a job that fails again for network reasons is re-queued.
 */
export interface QueuedJob {
  kind: string;
  payload: unknown;
  at: number;
}

const KEY = 'letterlock.offlineQueue';
const MAX_JOBS = 200;
type Runner = (payload: unknown) => Promise<void>;
const runners = new Map<string, Runner>();

function read(): QueuedJob[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as QueuedJob[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(jobs: QueuedJob[]): void {
  try {
    if (jobs.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(jobs.slice(-MAX_JOBS)));
  } catch {
    /* storage full / disabled: drop silently, never block play */
  }
}

/** Queue a job for later. Returns the queue length. */
export function enqueue(kind: string, payload: unknown): number {
  const jobs = read();
  jobs.push({ kind, payload, at: Date.now() });
  write(jobs);
  return jobs.length;
}

/** Register the function that performs jobs of `kind` once the network is back. */
export function registerRunner(kind: string, run: Runner): void {
  runners.set(kind, run);
}

/** True for the fetch/transport failures that mean "try again later", not "rejected". */
export function isNetworkError(err: unknown): boolean {
  const msg = typeof err === 'string' ? err : ((err as { message?: string } | null)?.message ?? '');
  return /failed to fetch|networkerror|network request failed|load failed|fetch failed|timed? ?out|ECONN|ENOTFOUND/i.test(msg);
}

export function queuedCount(): number {
  return read().length;
}

let flushing = false;
/** Run every queued job whose runner is registered. Safe to call repeatedly. */
export async function flushQueue(): Promise<void> {
  if (flushing || !isOnline()) return;
  const jobs = read();
  if (jobs.length === 0) return;
  flushing = true;
  const keep: QueuedJob[] = [];
  try {
    for (const job of jobs) {
      const run = runners.get(job.kind);
      if (!run) {
        keep.push(job); // owner module not loaded yet: try next time
        continue;
      }
      try {
        await run(job.payload);
      } catch (err) {
        if (isNetworkError(err)) keep.push(job);
        // A non-network failure (auth gone, server rejected) is dropped: retrying
        // would never succeed and the value is a nicety, not a payment.
      }
    }
  } finally {
    write(keep);
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue());
  // Startup flush: give the owner modules a tick to register their runners.
  setTimeout(() => void flushQueue(), 1500);
}
