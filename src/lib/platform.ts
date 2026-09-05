import { Capacitor } from '@capacitor/core';

/**
 * Where is the app running? One module so every platform branch in the code
 * reads the same answer.
 *
 * - `isNative`: inside the Capacitor iOS / Android shells (LAUNCH_PLAN.md
 *   Phase 3). The web build (letterlock.raltech.dev, PWA) is always `false`,
 *   so every native-only branch is a plain `if (isNative)` and browser
 *   behaviour stays byte-for-byte what it was.
 * - `mobileOS()` / `isMobileBrowser()`: the Phase 6b web -> app funnel
 *   (StoreSheet) shows store badges only to a phone/tablet BROWSER, never inside
 *   the apps, an installed PWA, on desktop or on a TV.
 */
export const isNative: boolean = Capacitor.isNativePlatform();

/** 'ios' | 'android' | 'web' (Capacitor's view; 'web' for every browser). */
export const platform: string = Capacitor.getPlatform();

/** The mobile OS of this device from the UA, or null for desktop / TV / unknown. */
export function mobileOS(): 'ios' | 'android' | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  // iPadOS 13+ reports a Mac UA; touch points give it away.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
  // Android TV / Google TV boxes are Android but not a phone: exclude them.
  if (/Android/.test(ua) && !/\bTV\b|AFT[A-Z]|BRAVIA|SHIELD|Chromecast/i.test(ua)) return 'android';
  return null;
}

/** True only for a phone/tablet web browser tab (not the apps, not an installed PWA). */
export function isMobileBrowser(): boolean {
  if (isNative) return false;
  if (typeof window === 'undefined') return false;
  if (mobileOS() === null) return false;
  const standalone =
    (typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches) ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}
