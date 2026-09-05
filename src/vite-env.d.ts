/// <reference types="vite/client" />

/** package.json version, injected by vite `define` (vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Base URL of our API (https://api.letterlock.raltech.dev in production). */
  readonly VITE_API_URL?: string;
  /** Apple Services ID for web Sign in with Apple; unset hides the button. */
  readonly VITE_APPLE_SERVICES_ID?: string;
}
