/**
 * Native (Capacitor) sign-in: Google + Apple ID tokens from the OS sheets,
 * verified by our API (`POST /auth/google/native`, `POST /auth/apple`), never
 * OAuth inside the WebView (Google returns 403 disallowed_useragent there).
 *
 * STUB. `@capgo/capacitor-social-login` is not installed yet (LAUNCH_PLAN §3
 * "Native sign-in"). When it is:
 *   1. `SocialLogin.initialize({ google: { webClientId, iOSClientId }, apple: {} })`
 *      once at boot (native only).
 *   2. `SocialLogin.login({ provider: 'google', options: { scopes: ['email','profile'] } })`
 *      -> `result.idToken` -> `api('/auth/google/native', { method: 'POST', auth: 'none',
 *      body: { idToken } })` -> `setTokens()` + the AuthProvider's `apply()`.
 *   3. `SocialLogin.login({ provider: 'apple', options: { scopes: ['email','name'] } })`
 *      -> `result.idToken` (+ `authorizationCode`, `givenName`/`familyName` on the
 *      first sign-in) -> `api('/auth/apple', ...)`.
 *   4. The Google server client id must be in the API's GOOGLE_NATIVE_CLIENT_IDS,
 *      the app bundle id in APPLE_CLIENT_ID.
 * Until then both calls throw so a caller can fall back to the email code.
 */
import { isNative } from './platform';

export function nativeSignInAvailable(): boolean {
  return false;
}

export async function signInWithGoogleNative(): Promise<never> {
  throw new Error(isNative ? 'Native Google sign-in is not available yet. Use the email code.' : 'Not a native app.');
}

export async function signInWithAppleNative(): Promise<never> {
  throw new Error(isNative ? 'Native Apple sign-in is not available yet. Use the email code.' : 'Not a native app.');
}
