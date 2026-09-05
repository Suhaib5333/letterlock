import { useEffect, useState } from 'react';
import { isNative } from '../lib/platform';
import { play } from '../services/audio';

/**
 * In-browser fullscreen toggle for the board screen (LAUNCH_PLAN.md Phase 1b,
 * URL-bar layer 3). Uses the Fullscreen API on the document; renders nothing
 * where the API is unavailable (iPhone Safari, which gets the PWA route) and
 * inside the Capacitor apps (no browser chrome to hide). 44x44 target, sits in
 * an empty corner of the board stage so it costs no header height.
 */
export function FullscreenButton() {
  const supported = !isNative && typeof document !== 'undefined' && !!document.fullscreenEnabled;
  const [active, setActive] = useState(() => supported && !!document.fullscreenElement);

  useEffect(() => {
    if (!supported) return;
    const sync = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    play('tap');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  };

  return (
    <button
      type="button"
      className="fs-btn"
      data-testid="fullscreen-btn"
      aria-label={active ? 'Exit fullscreen' : 'Fullscreen'}
      aria-pressed={active}
      title={active ? 'Exit fullscreen' : 'Fullscreen'}
      onClick={toggle}
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {active ? (
          <>
            <path d="M9 4H4v5" />
            <path d="M15 4h5v5" />
            <path d="M9 20H4v-5" />
            <path d="M15 20h5v-5" />
          </>
        ) : (
          <>
            <path d="M4 9V4h5" />
            <path d="M20 9V4h-5" />
            <path d="M4 15v5h5" />
            <path d="M20 15v5h-5" />
          </>
        )}
      </svg>
    </button>
  );
}
