/**
 * Crash reporting (LAUNCH_PLAN Phase 7 "Crashes / errors").
 *
 * Until this existed, an uncaught error reached `console.error` in ErrorBoundary
 * and vanished: nobody could tell whether players were hitting a white screen.
 *
 * Sentry is loaded with a DYNAMIC import, so with no `VITE_SENTRY_DSN` the SDK
 * lands in its own chunk that is never fetched — a build without a DSN pays
 * nothing for it. Nothing here is awaited by rendering, and every path is
 * wrapped: a broken reporter must never be able to break the game.
 *
 * Privacy (both stores' data-safety forms, §9): we send the error and where it
 * happened, never a user id, email, username or answer text. `sendDefaultPii`
 * stays off and no user is ever identified.
 */
let client: typeof import('@sentry/browser') | null = null;
let started = false;

export function crashReportingConfigured(): boolean {
  return !!(import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
}

/** Call once at boot. Safe to call again; a no-op without a DSN. */
export function initCrashReporting(release = 'unknown'): void {
  if (started || !crashReportingConfigured()) return;
  started = true;
  void import('@sentry/browser')
    .then((Sentry) => {
      Sentry.init({
        dsn: (import.meta.env.VITE_SENTRY_DSN as string).trim(),
        release,
        environment: import.meta.env.MODE,
        sendDefaultPii: false,
        // Errors only. Performance tracing and session replay would both carry
        // gameplay content we have not declared on the store privacy forms.
        tracesSampleRate: 0,
      });
      client = Sentry;
    })
    .catch(() => {
      // Offline, blocked by an ad blocker, or the chunk failed to load. The game
      // does not care; reportError falls back to the console.
      started = false;
    });
}

/** Report a caught error. Always logs; also sends when Sentry is configured. */
export function reportError(error: unknown, where: string): void {
  // eslint-disable-next-line no-console
  console.error(`Letterlock error (${where}):`, error);
  try {
    client?.captureException(error, { tags: { where } });
  } catch {
    /* a failing reporter must never take the app down with it */
  }
}
