/**
 * Dev/QA URL seams (?__unlockall, ?__devscreens, ?__leveluptest, ?__onlinepanel,
 * ?__crashtest, and the `letterlock.unlockall` localStorage flag) are powerful
 * cheats/inspection tools. None of them grant anything with a SERVER consequence
 * (admin, XP, scores, and other users' data are all enforced server-side via RLS
 * + SECURITY DEFINER RPCs — see the security audit), but a real user still must
 * not be able to flip them by editing the URL.
 *
 * So we gate every seam behind this allowlist: they work ONLY on local dev/test
 * hosts (where Playwright + the device-matrix checker need them) and are inert in
 * production. Allowlist (not blocklist) so an unexpected prod alias never enables
 * them by accident.
 */
export function devSeamsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '[::1]' ||
    h === '' || // file:// / some test runners
    h.endsWith('.local')
  );
}

/** True when the given `?__name` URL param is present AND seams are enabled. */
export function hasDevSeam(name: string): boolean {
  if (!devSeamsEnabled()) return false;
  try {
    return new URLSearchParams(window.location.search).has(name);
  } catch {
    return false;
  }
}

/** Read a `?__name` URL param's value, or null when seams are disabled/absent. */
export function devSeamValue(name: string): string | null {
  if (!devSeamsEnabled()) return null;
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}
