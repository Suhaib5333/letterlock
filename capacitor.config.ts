/// <reference types="@capacitor/splash-screen" />
/// <reference types="@capacitor/keyboard" />
/// <reference types="@capacitor/status-bar" />
/// <reference types="@capgo/capacitor-updater" />

import type { CapacitorConfig } from '@capacitor/cli';

// Letterlock native shell (LAUNCH_PLAN.md Phase 3). The same `dist/` that
// deploys to letterlock.raltech.dev is bundled into both apps by `npx cap sync`.
// Nothing here changes the web build; `src/lib/native.ts` is the only runtime
// code that knows about Capacitor, and it is a no-op outside the apps.
const config: CapacitorConfig = {
  appId: 'dev.raltech.letterlock',
  appName: 'Letterlock',
  webDir: 'dist',
  // Studio-dark ground behind the WebView so there is never a white flash
  // between the splash and the first paint (matches theme-color / manifest).
  backgroundColor: '#0a0e1f',
  // The web app handles its own zoom rules (viewport meta is set by initNative).
  zoomEnabled: false,
  loggingBehavior: 'debug',
  server: {
    // WebView origin = our real domain, so localStorage / cookies / password
    // managers / App Links all treat the app as letterlock.raltech.dev.
    hostname: 'letterlock.raltech.dev',
    androidScheme: 'https',
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'never',
    // No 3D-touch / long-press link previews inside the game (Apple 4.2 polish).
    allowsLinkPreview: false,
    // Clip questions (TV previews, songs) play inline in the card, never
    // force-fullscreen by the OS.
    preferredContentMode: 'mobile',
    scrollEnabled: false,
    backgroundColor: '#0a0e1f',
  },
  android: {
    backgroundColor: '#0a0e1f',
    allowMixedContent: false,
    // Web Audio + video autoplay after the first user gesture (same rule the
    // web build already follows).
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      // initNative() hides it right after React's first paint; the 3 s value is
      // only the safety net if JS never boots.
      launchShowDuration: 3000,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: '#0a0e1fff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    Keyboard: {
      // Shrink the document instead of panning: the app is a fixed 100svh
      // no-scroll shell, so `body` resize keeps the host pad / answer box in view.
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      // Light icons over the dark studio background; not overlaid so the
      // notch inset math stays with env(safe-area-inset-top).
      style: 'DARK',
      backgroundColor: '#0a0e1f',
      overlaysWebView: false,
    },
    CapacitorUpdater: {
      // OTA (LAUNCH_PLAN Phase 3c, D7) in MANUAL mode: src/lib/ota.ts asks OUR
      // API for `latestBundle`, downloads with a sha256 checksum and set()s it.
      // No Capgo account. If the new bundle never calls notifyAppReady() within
      // appReadyTimeout the native side rolls back to the last good bundle.
      autoUpdate: false,
      appReadyTimeout: 10000,
      autoDeleteFailed: true,
      autoDeletePrevious: true,
      // A store update (new builtin) discards downloaded bundles that may be older.
      resetWhenUpdate: true,
      keepUrlPathAfterReload: true,
    },
  },
};

export default config;
