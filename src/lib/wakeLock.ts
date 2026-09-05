/**
 * Screen Wake Lock for the BROWSER build (LAUNCH_PLAN.md Phase 1b): a host
 * reading questions aloud does not touch the screen for minutes, and phones dim
 * or lock mid-match. Inside the Capacitor apps `native.ts` already holds a
 * keep-awake lock, so this module is only ever called when `!isNative`.
 *
 * Browser support: Chrome / Edge / Android WebView, Safari 16.4+. Where the API is
 * missing (`navigator.wakeLock` undefined) every call is a silent no-op. The lock
 * is released by the OS whenever the tab is hidden, so it is re-requested on
 * `visibilitychange` while a match is on screen.
 */

type Sentinel = { release: () => Promise<void>; addEventListener: (t: 'release', cb: () => void) => void };
type WakeLockNav = Navigator & { wakeLock?: { request: (type: 'screen') => Promise<Sentinel> } };

let wanted = false;
let sentinel: Sentinel | null = null;
let listening = false;

async function acquire(): Promise<void> {
  const wl = (navigator as WakeLockNav).wakeLock;
  if (!wanted || sentinel || !wl || document.visibilityState !== 'visible') return;
  try {
    const s = await wl.request('screen');
    // The request may resolve after the match ended; do not keep a stray lock.
    if (!wanted) {
      s.release().catch(() => {});
      return;
    }
    sentinel = s;
    s.addEventListener('release', () => {
      sentinel = null;
    });
  } catch {
    /* denied (low battery, permissions policy): the game plays on regardless */
  }
}

function onVisibility() {
  if (document.visibilityState === 'visible') void acquire();
}

/** Keep the screen awake until `releaseWakeLock()` (re-acquires after the tab returns). */
export function requestWakeLock(): void {
  wanted = true;
  if (!listening) {
    document.addEventListener('visibilitychange', onVisibility);
    listening = true;
  }
  void acquire();
}

/** Let the screen sleep again (leaving the board, exiting the match). */
export function releaseWakeLock(): void {
  wanted = false;
  if (listening) {
    document.removeEventListener('visibilitychange', onVisibility);
    listening = false;
  }
  const s = sentinel;
  sentinel = null;
  s?.release().catch(() => {});
}

/** True while a lock is currently held (for tests / diagnostics). */
export function wakeLockHeld(): boolean {
  return sentinel !== null;
}
