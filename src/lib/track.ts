/**
 * Phase 7b analytics client. Buffers events and flushes them to our own API
 * (POST /events) — no third-party SDK, so no extra consent disclosure and no
 * extra store privacy label.
 *
 * ponytail: a 5s timer plus a pagehide flush. No retry queue, no persistence —
 * a lost batch costs one row in a counts report, not a user-visible bug. If a
 * metric ever has to be exact (a purchase, say), record it server-side instead.
 */
import { apiBase } from './appConfig';
import { ACCESS_KEY } from './api';

const ANON_KEY = 'll_anon';
const FLUSH_MS = 5000;
const MAX_BATCH = 50;

let buffer: { name: string; props?: Record<string, unknown> }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function anonId(): string {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? String(Math.random()).slice(2)).slice(0, 40);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage';
  }
}

export function flushEvents(): void {
  const base = apiBase();
  if (!base || buffer.length === 0) return;
  const body = JSON.stringify({ anonId: anonId(), events: buffer.slice(0, MAX_BATCH) });
  buffer = [];
  if (timer) { clearTimeout(timer); timer = null; }
  let token: string | null = null;
  try { token = localStorage.getItem(ACCESS_KEY); } catch { /* private mode */ }
  // keepalive so a flush started during pagehide still goes out.
  void fetch(`${base}/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body,
    keepalive: true,
  }).catch(() => { /* analytics must never break the game */ });
}

export function track(name: string, props?: Record<string, unknown>): void {
  if (!apiBase()) return;
  buffer.push({ name: name.slice(0, 40), ...(props ? { props } : {}) });
  if (buffer.length >= MAX_BATCH) return flushEvents();
  timer ??= setTimeout(flushEvents, FLUSH_MS);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushEvents);
}
