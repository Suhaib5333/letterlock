import { adsRemoved } from './entitlements';
import { isNative, isTV } from './platform';

/**
 * Web ads (LAUNCH_PLAN Phase 8, D12): Google AdSense "H5 Games Ads", the Ad
 * Placement API. ONE script tag, `adConfig()` at boot, `adBreak({type:'next'})`
 * at the same between-games moment as the apps' interstitial and
 * `adBreak({type:'reward'})` behind the same extra-skip button.
 *
 * Loads only when VITE_ADSENSE_CLIENT (`ca-pub-...`) is set at build time AND
 * this is the web build AND Remove Ads is not owned AND not a TV. With the env
 * empty (today, web ads come last) nothing is injected and every call is a
 * no-op. Google's own consent message (enabled in AdSense) covers EEA/UK.
 */
type AdBreakOptions = Record<string, unknown>;

declare global {
  interface Window {
    adsbygoogle?: AdBreakOptions[];
    adBreak?: (o: AdBreakOptions) => void;
    adConfig?: (o: AdBreakOptions) => void;
  }
}

const CLIENT = /^ca-pub-\d{16}$/;

function client(): string {
  const c = ((import.meta.env.VITE_ADSENSE_CLIENT as string | undefined) ?? '').trim();
  return CLIENT.test(c) ? c : '';
}

let loaded = false;

/** True when the AdSense H5 tag may be used on this page (build + platform, before the user flags). */
export function webAdsConfigured(): boolean {
  return !!client() && !isNative && typeof document !== 'undefined' && !isTV();
}

export function initWebAds(): void {
  if (loaded || !webAdsConfigured() || adsRemoved()) return;
  loaded = true;
  const c = client();
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(c)}`;
  s.dataset.adClient = c;
  s.dataset.adFrequencyHint = '120s';
  document.head.appendChild(s);
  window.adsbygoogle = window.adsbygoogle || [];
  // The documented shim: calls queue until the tag is ready.
  window.adBreak = window.adConfig = (o: AdBreakOptions) => {
    window.adsbygoogle!.push(o);
  };
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

/** Between-games full-screen ad; Google applies its own frequency capping. */
export function webAdBreakNext(): void {
  if (!loaded || adsRemoved()) return;
  window.adBreak?.({ type: 'next', name: 'between-games' });
}

export function webRewardAvailable(): boolean {
  return loaded && !adsRemoved();
}

/** Rewarded ad; the player already tapped the button, so the ad is shown at once. */
export function webAdBreakReward(onReward: () => void): void {
  if (!webRewardAvailable()) return;
  window.adBreak?.({
    type: 'reward',
    name: 'extra-skip',
    beforeReward: (showAdFn: () => void) => showAdFn(),
    adViewed: onReward,
    adDismissed: () => {},
  });
}
