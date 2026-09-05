import { useEffect, useState } from 'react';

/** Current connectivity (navigator.onLine). Safe when `navigator` is missing. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

/**
 * React hook mirroring `navigator.onLine` + the window online/offline events.
 * Drives the offline banner, the disabled Create/Join room buttons and the
 * remote-media pack filter (LAUNCH_PLAN Phase 1, "Offline handling").
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(isOnline);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

/**
 * Can online rooms be created/joined right now? False while offline or when the
 * remote config says maintenance. (Supabase configuration is checked separately
 * by the callers, as before.)
 */
export function useOnlineRooms(config: { maintenance?: boolean } | null): {
  ok: boolean;
  reason: 'offline' | 'maintenance' | null;
} {
  const online = useOnline();
  if (!online) return { ok: false, reason: 'offline' };
  if (config?.maintenance) return { ok: false, reason: 'maintenance' };
  return { ok: true, reason: null };
}
