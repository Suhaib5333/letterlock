/**
 * Native shell glue for the Capacitor apps (LAUNCH_PLAN.md Phase 3).
 *
 * Everything in here is a no-op on the web: `initNative()` returns at once when
 * `isNative` is false, and every plugin is loaded with a dynamic import so the
 * browser bundle never even downloads the Capacitor plugin code.
 *
 * What it does inside the apps:
 *   - marks `<html class="is-native">` (theme.css scopes the native polish to it)
 *     and adds `user-scalable=no` to the viewport meta (no pinch-zoom);
 *   - restores mirrored localStorage keys from @capacitor/preferences when the
 *     WebView storage came back empty (iOS can evict it), then mirrors every
 *     later write. Keys: `letterlock.*` (settings, saved game, question
 *     progress, controller seat), `ll_*` (our API tokens) and `sb-*` (Supabase
 *     session until Phase 2 removes it);
 *   - deep links: `https://letterlock.raltech.dev/join/CODE` (App Links / AASA)
 *     -> `history.replaceState('/join/CODE')` + `popstate`, plus a `ll:join`
 *     CustomEvent carrying the code, so the router picks it up;
 *   - Android back button: close the top-most dialog (Escape), else leave the
 *     current screen for Home, else minimise the app. Never a dead end;
 *   - status bar (light icons on our dark ground), splash hide after the first
 *     React paint, keyboard resize mode, keep-awake while a match is live,
 *     portrait lock for the phone controller;
 *   - `navigator.share` and `navigator.vibrate` are routed to the Share and
 *     Haptics plugins, so the existing call sites work unchanged.
 */
import { initAds } from './ads';
import { initOta } from './ota';
import { isNative, platform } from './platform';
import { initPurchases } from './purchases';

type Plugins = {
  App: typeof import('@capacitor/app').App;
  StatusBar: typeof import('@capacitor/status-bar').StatusBar;
  Style: typeof import('@capacitor/status-bar').Style;
  SplashScreen: typeof import('@capacitor/splash-screen').SplashScreen;
  Keyboard: typeof import('@capacitor/keyboard').Keyboard;
  KeyboardResize: typeof import('@capacitor/keyboard').KeyboardResize;
  Preferences: typeof import('@capacitor/preferences').Preferences;
  ScreenOrientation: typeof import('@capacitor/screen-orientation').ScreenOrientation;
  Haptics: typeof import('@capacitor/haptics').Haptics;
  ImpactStyle: typeof import('@capacitor/haptics').ImpactStyle;
  Share: typeof import('@capacitor/share').Share;
  KeepAwake: typeof import('@capacitor-community/keep-awake').KeepAwake;
};

let plugins: Plugins | null = null;
let initialised = false;

/** localStorage keys worth surviving a WebView storage eviction. */
const MIRROR_PREFIXES = ['letterlock.', 'll_', 'sb-'];
const shouldMirror = (key: string) => MIRROR_PREFIXES.some((p) => key.startsWith(p));

// ---------------------------------------------------------------------------
// Hooks the React side registers (store.tsx) so this module can drive it
// without importing React state.
// ---------------------------------------------------------------------------

type ScreenHooks = { getScreen: () => string; goHome: () => void };
let screenHooks: ScreenHooks | null = null;

/** Called by the store so the Android back button knows where the app is. */
export function registerScreenHooks(hooks: ScreenHooks | null) {
  screenHooks = hooks;
}

let matchActive = false;
/**
 * Keep the screen on while a match is in progress (a host reading questions
 * does not touch the screen for minutes). Called from the game store on every
 * screen change; harmless on the web.
 */
export function setMatchActive(active: boolean) {
  if (matchActive === active) return;
  matchActive = active;
  if (!isNative || !plugins) return;
  const { KeepAwake } = plugins;
  (active ? KeepAwake.keepAwake() : KeepAwake.allowSleep()).catch(() => {});
}

/**
 * Haptic tap. Web / PWA: `navigator.vibrate` (Android Chrome only). Apps: the
 * Haptics plugin, which also works inside the iOS WebView where vibrate does
 * nothing. `ms` maps to impact strength (<=15 light, <=40 medium, else heavy).
 */
export function nativeHaptic(ms = 12): boolean {
  if (!isNative || !plugins) return false;
  const { Haptics, ImpactStyle } = plugins;
  const style = ms <= 15 ? ImpactStyle.Light : ms <= 40 ? ImpactStyle.Medium : ImpactStyle.Heavy;
  Haptics.impact({ style }).catch(() => {});
  return true;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

/**
 * Call once from main.tsx BEFORE the first render (it restores persisted
 * settings so the store's initial state sees them). Resolves immediately on
 * the web.
 */
export async function initNative(): Promise<void> {
  if (!isNative || initialised) return;
  initialised = true;

  document.documentElement.classList.add('is-native');
  document.documentElement.dataset.platform = platform;
  lockViewport();

  const [app, statusBar, splash, keyboard, prefs, orientation, haptics, share, keepAwake] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/keyboard'),
    import('@capacitor/preferences'),
    import('@capacitor/screen-orientation'),
    import('@capacitor/haptics'),
    import('@capacitor/share'),
    import('@capacitor-community/keep-awake'),
  ]);
  plugins = {
    App: app.App,
    StatusBar: statusBar.StatusBar,
    Style: statusBar.Style,
    SplashScreen: splash.SplashScreen,
    Keyboard: keyboard.Keyboard,
    KeyboardResize: keyboard.KeyboardResize,
    Preferences: prefs.Preferences,
    ScreenOrientation: orientation.ScreenOrientation,
    Haptics: haptics.Haptics,
    ImpactStyle: haptics.ImpactStyle,
    Share: share.Share,
    KeepAwake: keepAwake.KeepAwake,
  };

  await restoreStorage();
  mirrorStorageWrites();
  patchShare();
  patchVibrate();
  installStatusBar();
  installKeyboard();
  installOrientation();
  installBackButton();
  installDeepLinks();
  if (matchActive) plugins.KeepAwake.keepAwake().catch(() => {});
  // OTA (Phase 3c), ads (Phase 4), Remove Ads (Phase 5): all fire-and-forget, all no-ops when unconfigured.
  void initOta();
  void initAds();
  void initPurchases();
}

/**
 * Call once right after React's first render: hides the native splash so the
 * hand-off to the in-page boot splash has no blank frame.
 */
export function nativeReady(): void {
  if (!isNative || !plugins) return;
  plugins.SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function lockViewport() {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!meta) return;
  const parts = meta.content
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && !/^(user-scalable|maximum-scale)=/.test(s));
  parts.push('maximum-scale=1.0', 'user-scalable=no');
  meta.content = parts.join(', ');
}

async function restoreStorage() {
  const { Preferences } = plugins!;
  try {
    const { keys } = await Preferences.keys();
    const mirrored = keys.filter(shouldMirror);
    if (mirrored.length === 0) return;
    // Only fill gaps: a live localStorage value always wins over the mirror.
    for (const key of mirrored) {
      if (localStorage.getItem(key) !== null) continue;
      const { value } = await Preferences.get({ key });
      if (value !== null) localStorage.setItem(key, value);
    }
  } catch {
    /* storage unavailable; the app still runs with defaults */
  }
}

function mirrorStorageWrites() {
  const { Preferences } = plugins!;
  const proto = Storage.prototype;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  const origClear = proto.clear;
  proto.setItem = function (this: Storage, key: string, value: string) {
    origSet.call(this, key, value);
    if (this === window.localStorage && shouldMirror(key)) {
      Preferences.set({ key, value: String(value) }).catch(() => {});
    }
  };
  proto.removeItem = function (this: Storage, key: string) {
    origRemove.call(this, key);
    if (this === window.localStorage && shouldMirror(key)) {
      Preferences.remove({ key }).catch(() => {});
    }
  };
  proto.clear = function (this: Storage) {
    origClear.call(this);
    if (this === window.localStorage) {
      Preferences.keys()
        .then(({ keys }) => Promise.all(keys.filter(shouldMirror).map((key) => Preferences.remove({ key }))))
        .catch(() => {});
    }
  };
}

function patchShare() {
  const { Share } = plugins!;
  const nativeShare = async (data?: ShareData) => {
    await Share.share({
      title: data?.title,
      text: data?.text,
      url: data?.url,
      dialogTitle: data?.title ?? 'Letterlock',
    });
  };
  try {
    Object.defineProperty(navigator, 'share', { value: nativeShare, configurable: true, writable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true, writable: true });
  } catch {
    /* read-only navigator (should not happen in a WebView) */
  }
}

function patchVibrate() {
  try {
    Object.defineProperty(navigator, 'vibrate', {
      value: (pattern: number | number[]) => {
        const ms = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
        return nativeHaptic(Number(ms) || 12);
      },
      configurable: true,
      writable: true,
    });
  } catch {
    /* ignore */
  }
}

function installStatusBar() {
  const { StatusBar, Style } = plugins!;
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (platform === 'android') {
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#0a0e1f' }).catch(() => {});
  }
}

function installKeyboard() {
  const { Keyboard, KeyboardResize } = plugins!;
  if (platform === 'ios') {
    Keyboard.setResizeMode({ mode: KeyboardResize.Body }).catch(() => {});
    Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  }
}

/** The phone controller is a one-handed portrait surface; the board follows the device. */
function wantsPortrait(): boolean {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'controller' || window.location.pathname.startsWith('/join');
}

function applyOrientation() {
  const { ScreenOrientation } = plugins!;
  (wantsPortrait() ? ScreenOrientation.lock({ orientation: 'portrait' }) : ScreenOrientation.unlock()).catch(
    () => {},
  );
}

function installOrientation() {
  applyOrientation();
  window.addEventListener('popstate', applyOrientation);
}

function topDialog(): HTMLElement | null {
  const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
  return dialogs.length ? dialogs[dialogs.length - 1] : null;
}

function closeTopDialog(dialog: HTMLElement) {
  // Every modal built on useModalDismiss closes on Escape (capture listener on
  // document). The few ad-hoc dialogs (exit confirm, pie prompt) close through
  // their scrim / cancel button, so fall back to those if Escape did nothing.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
  requestAnimationFrame(() => {
    if (!dialog.isConnected) return;
    const cancel = dialog.querySelector<HTMLElement>(
      '[data-testid$="-cancel"], [data-testid$="-close"], [aria-label="Close"], [aria-label="Dismiss"], .modal-close, .exit-keep',
    );
    if (cancel) {
      cancel.click();
      return;
    }
    const scrim = dialog.closest<HTMLElement>('.modal-scrim');
    scrim?.click();
  });
}

function installBackButton() {
  const { App } = plugins!;
  App.addListener('backButton', () => {
    const dialog = topDialog();
    if (dialog) {
      closeTopDialog(dialog);
      return;
    }
    const screen = screenHooks?.getScreen();
    if (screen === 'game') {
      // Open the in-game exit confirmation instead of dropping the match.
      const exitBtn = document.querySelector<HTMLElement>('[data-testid="exit-btn"]');
      if (exitBtn) {
        exitBtn.click();
        return;
      }
    }
    if (screen && screen !== 'home' && screenHooks) {
      screenHooks.goHome();
      return;
    }
    App.minimizeApp().catch(() => {});
  });
}

/** `/join/CODE` (path) or `?room=CODE` (query): the 4-8 char room code, upper-cased. */
export function parseJoinCode(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/join\/([A-Za-z0-9]{4,8})\/?$/);
    if (m) return m[1].toUpperCase();
    const room = u.searchParams.get('room');
    if (room && /^[A-Za-z0-9]{4,8}$/.test(room)) return room.toUpperCase();
  } catch {
    /* not a URL */
  }
  return null;
}

function navigateToJoin(code: string) {
  // Hand the route to the SPA: replaceState + popstate is what the router
  // listens for; `ll:join` is a direct hook for whatever screen owns joining.
  window.history.replaceState(null, '', `/join/${code}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.dispatchEvent(new CustomEvent('ll:join', { detail: { code } }));
}

function installDeepLinks() {
  const { App } = plugins!;
  App.addListener('appUrlOpen', ({ url }) => {
    const code = parseJoinCode(url);
    if (code) navigateToJoin(code);
  });
  // Cold start from a link: the launch URL is not delivered as appUrlOpen.
  App.getLaunchUrl()
    .then((launch) => {
      const code = launch?.url ? parseJoinCode(launch.url) : null;
      if (code && !window.location.pathname.startsWith('/join/')) navigateToJoin(code);
    })
    .catch(() => {});
}
