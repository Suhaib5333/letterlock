import { APP_VERSION, compareVersions, fetchAppConfig, type LatestBundle } from './appConfig';
import { isNative } from './platform';

/**
 * Over-the-air web-bundle updates (LAUNCH_PLAN Phase 3c, D7) with
 * @capgo/capacitor-updater in MANUAL mode (capacitor.config.ts
 * `CapacitorUpdater.autoUpdate: false`), pulling from our own API:
 *
 *   GET /app-config -> { latestBundle: { version, url, sha256, minNative } }
 *
 * Flow (apps only; the web build never calls the plugin):
 *   1. `notifyAppReady()` first thing, every launch. If a freshly installed
 *      bundle never gets to call it (broken JS) the native side rolls back to
 *      the last good bundle after `appReadyTimeout` (10 s). That is the whole
 *      safety net and it needs no code here.
 *   2. On launch and on every resume (`appStateChange` active) read the config
 *      and, when `decideOta()` says install: `download()` with the sha256
 *      checksum (the plugin refuses a mismatch), then `set()` (reload now) if
 *      no match is on screen, else `next()` (applies on the next background /
 *      restart) so a live game is never yanked away.
 *
 * Bundles are cut by `.github/workflows/ota-release.yml` on an `ota-v*` tag.
 */

export type OtaDecision =
  | { action: 'install' }
  | { action: 'skip'; reason: 'none' | 'invalid' | 'not-newer' | 'native-too-old' };

const SEMVER = /^\d+\.\d+\.\d+$/;
const SHA256 = /^[a-f0-9]{64}$/i;

/** Pure decision: is `latest` a valid, newer bundle this native shell may run? */
export function decideOta(
  latest: LatestBundle | null | undefined,
  runningVersion: string,
  nativeVersion: string,
): OtaDecision {
  if (!latest) return { action: 'skip', reason: 'none' };
  if (
    !SEMVER.test(latest.version ?? '') ||
    !/^https:\/\/[^\s]+$/.test(latest.url ?? '') ||
    !SHA256.test(latest.sha256 ?? '')
  ) {
    return { action: 'skip', reason: 'invalid' };
  }
  if (compareVersions(latest.version, runningVersion) <= 0) return { action: 'skip', reason: 'not-newer' };
  if (latest.minNative && (!SEMVER.test(latest.minNative) || compareVersions(nativeVersion, latest.minNative) < 0)) {
    return { action: 'skip', reason: 'native-too-old' };
  }
  return { action: 'install' };
}

/**
 * The web version actually running: the builtin bundle reports id 'builtin'
 * (its version is the one Vite baked in), a downloaded bundle reports the
 * version the release workflow passed to `download()`.
 */
export function runningBundleVersion(bundleId: string, bundleVersion: string, builtin: string = APP_VERSION): string {
  if (bundleId === 'builtin' || !SEMVER.test(bundleVersion)) return builtin;
  return compareVersions(bundleVersion, builtin) >= 0 ? bundleVersion : builtin;
}

type Updater = typeof import('@capgo/capacitor-updater').CapacitorUpdater;

let started = false;
let checking = false;

export async function initOta(): Promise<void> {
  if (!isNative || started) return;
  started = true;
  try {
    const [{ CapacitorUpdater }, { App }] = await Promise.all([
      import('@capgo/capacitor-updater'),
      import('@capacitor/app'),
    ]);
    // Before anything else, and never conditional: this is what prevents rollback.
    CapacitorUpdater.notifyAppReady().catch(() => {});
    const check = () => void checkForUpdate(CapacitorUpdater).catch(() => {});
    check();
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) check();
    }).catch(() => {});
  } catch {
    /* plugin missing in this shell: nothing to do */
  }
}

/** A match (board or phone controller) is on screen: do not reload under the player. */
function matchInProgress(): boolean {
  return !!document.querySelector('[data-testid="game-screen"], [data-testid="question-card"], [data-testid="controller"]');
}

async function checkForUpdate(updater: Updater): Promise<void> {
  if (checking) return;
  checking = true;
  try {
    const cfg = await fetchAppConfig();
    const { bundle, native } = await updater.current();
    const running = runningBundleVersion(bundle.id, bundle.version);
    const decision = decideOta(cfg?.latestBundle, running, native);
    if (decision.action !== 'install') return;
    const latest = cfg!.latestBundle!;
    // A previous check may already have downloaded it (e.g. queued with next()).
    const { bundles } = await updater.list();
    let target = bundles.find((b) => b.version === latest.version && b.status !== 'error');
    if (!target) {
      target = await updater.download({ url: latest.url, version: latest.version, checksum: latest.sha256 });
    }
    if (matchInProgress()) await updater.next({ id: target.id });
    else await updater.set({ id: target.id }); // reloads into the new bundle
  } finally {
    checking = false;
  }
}
