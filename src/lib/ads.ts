import { useEffect } from 'react';
import { type AdGateState, interstitialDue, placementAllowed, shouldShowAds } from './adPolicy';
import { type AdUnits, resolveAdUnits } from './adUnits';
import { adsRemoved, useAdsRemoved } from './entitlements';
import { isNative, isTV, platform } from './platform';
import { initWebAds, webAdBreakNext, webAdBreakReward, webRewardAvailable } from './webAds';

/**
 * Ads (LAUNCH_PLAN Phase 4, D4). One entry point for both platforms:
 *   apps -> @capacitor-community/admob (this file), web -> AdSense H5 (webAds.ts).
 * Every export is a no-op on the web build unless webAds is configured, and
 * every plugin call is a dynamic import so the browser bundle never downloads
 * the AdMob code.
 *
 * Boot (native): `initAds()` from initNative(): UMP consent (GDPR/UK/US-state
 * messages configured in the AdMob console) -> iOS ATT with a short pre-prompt
 * -> `AdMob.initialize()` -> preload an interstitial. Declining ATT is fine
 * (non-personalised ads). Unit ids come from adUnits.ts: real ids from
 * VITE_ADMOB_*; Google test ids only in a non-production build; a production
 * build with empty env keeps the whole system OFF (Apple 2.1).
 *
 * Placements (adPolicy.ts): adaptive banner at the bottom of Home / Lobby
 * waiting (the Category menu and Settings are modals over Home, so they keep
 * it); interstitial between games, at most one per 4 minutes, never at app
 * open, never mid-question; rewarded on the host's own tap for an extra skip.
 * Never on the board, never on a TV.
 */

type AdMobModule = typeof import('@capacitor-community/admob');

let mod: AdMobModule | null = null;
let units: AdUnits | null = null;
let consentDone = false;
let consentFormAvailable = false;
let privacyOptionsRequired = false;
let lastInterstitialAt = 0;
let interstitialReady = false;
let rewardedReady = false;
let bannerShown = false;
let initPromise: Promise<void> | null = null;

/** Bottom inset the native banner occupies; layout may read `var(--ad-banner-h)`. */
function setBannerInset(px: number): void {
  document.documentElement.style.setProperty('--ad-banner-h', `${Math.max(0, Math.round(px))}px`);
}

function gate(): AdGateState {
  return { enabled: !!mod && !!units, consentDone, adsRemoved: adsRemoved(), tv: isTV() };
}

/** The one gate (E): SDK ready && consent && !adsRemoved && !TV. Placement rules on top. */
export function adsEnabled(): boolean {
  return shouldShowAds(gate());
}

function questionLive(): boolean {
  return !!document.querySelector('[data-testid="question-card"]');
}

/** Short in-page explainer shown right before the iOS ATT system prompt. */
function attPrePrompt(): Promise<void> {
  return new Promise((resolve) => {
    const scrim = document.createElement('div');
    scrim.setAttribute('role', 'dialog');
    scrim.setAttribute('aria-label', 'About ads');
    scrim.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(5,8,20,.82)';
    const card = document.createElement('div');
    card.style.cssText =
      'max-width:420px;background:#141a33;color:#fff;border-radius:20px;padding:24px;font:16px/1.45 system-ui,sans-serif;text-align:center';
    card.innerHTML =
      '<h2 style="margin:0 0 8px;font-size:22px">Ads keep Letterlock free</h2>' +
      '<p style="margin:0 0 18px;opacity:.85">Next, iOS asks whether Letterlock may use your advertising identifier. ' +
      'Allowing it shows ads that suit you better. Declining is fine: you keep the whole game, with generic ads.</p>';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-primary block';
    btn.textContent = 'Continue';
    btn.onclick = () => {
      scrim.remove();
      resolve();
    };
    card.appendChild(btn);
    scrim.appendChild(card);
    document.body.appendChild(scrim);
    btn.focus();
  });
}

/** Native only. Resolves when the SDK is ready (or when ads are disabled). Never throws. */
export function initAds(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (isTV()) return; // no ads on the 10-foot build
    const p = platform === 'ios' ? 'ios' : 'android';
    units = resolveAdUnits(import.meta.env as Record<string, string | undefined>, p, import.meta.env.PROD);
    if (!units) return;
    mod = await import('@capacitor-community/admob');
    const { AdMob } = mod;

    // 1) UMP consent. canRequestAds is true when consent is obtained or not required.
    let info = await AdMob.requestConsentInfo();
    if (!info.canRequestAds && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
    consentFormAvailable = !!info.isConsentFormAvailable;
    privacyOptionsRequired = String(info.privacyOptionsRequirementStatus) === 'REQUIRED';

    // 2) iOS App Tracking Transparency (asked once; the OS remembers).
    if (p === 'ios') {
      const { status } = await AdMob.trackingAuthorizationStatus();
      if (status === 'notDetermined') {
        await attPrePrompt();
        await AdMob.requestTrackingAuthorization();
      }
    }

    consentDone = info.canRequestAds;
    if (!consentDone) return;

    // 3) SDK.
    await AdMob.initialize({ initializeForTesting: units.test });
    lastInterstitialAt = Date.now(); // cap timer starts at app open: never an interstitial at launch

    AdMob.addListener(mod.BannerAdPluginEvents.SizeChanged, (size) => setBannerInset(size.height)).catch(() => {});
    AdMob.addListener(mod.InterstitialAdPluginEvents.Loaded, () => {
      interstitialReady = true;
    }).catch(() => {});
    AdMob.addListener(mod.RewardAdPluginEvents.Loaded, () => {
      rewardedReady = true;
    }).catch(() => {});
    void prepareInterstitial();
  })().catch(() => {
    // Ads are optional: any failure here simply means no ads this session.
    consentDone = false;
  });
  return initPromise;
}

async function prepareInterstitial(): Promise<void> {
  if (!mod || !units || interstitialReady) return;
  try {
    await mod.AdMob.prepareInterstitial({ adId: units.interstitial, isTesting: units.test });
  } catch {
    /* no fill: the next break tries again */
  }
}

async function prepareRewarded(): Promise<void> {
  if (!mod || !units || rewardedReady) return;
  try {
    await mod.AdMob.prepareRewardVideoAd({ adId: units.rewarded, isTesting: units.test });
  } catch {
    /* no fill */
  }
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

async function showBanner(screen: string): Promise<void> {
  await initPromise;
  if (!mod || !units || bannerShown) return;
  if (!adsEnabled() || !placementAllowed('banner', { screen, questionLive: questionLive() })) return;
  try {
    await mod.AdMob.showBanner({
      adId: units.banner,
      adSize: mod.BannerAdSize.ADAPTIVE_BANNER,
      position: mod.BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: units.test,
    });
    bannerShown = true;
  } catch {
    /* no fill / not ready */
  }
}

async function removeBanner(): Promise<void> {
  if (!mod || !bannerShown) return;
  bannerShown = false;
  setBannerInset(0);
  try {
    await mod.AdMob.removeBanner();
  } catch {
    /* already gone */
  }
}

/**
 * Mount the bottom banner while the calling screen is on. Web: nothing
 * (AdSense H5 has no banner placement). Re-evaluates when Remove Ads flips.
 */
export function useBannerAd(screen: 'home' | 'lobby-host'): void {
  const removed = useAdsRemoved();
  useEffect(() => {
    if (!isNative || removed) return;
    void showBanner(screen);
    return () => {
      void removeBanner();
    };
  }, [screen, removed]);
}

// ---------------------------------------------------------------------------
// Interstitial (between games)
// ---------------------------------------------------------------------------

/**
 * Call at the between-games moment (the "Next game / See result" tap). Shows an
 * interstitial only if one is preloaded, the 4-minute cap has passed and no
 * question is live; otherwise just preloads for the next break. Never blocks
 * the game flow.
 */
export async function adBreakBetweenGames(): Promise<void> {
  if (!isNative) {
    webAdBreakNext();
    return;
  }
  if (!mod || !units || !adsEnabled()) return;
  if (!placementAllowed('interstitial', { screen: 'game', questionLive: questionLive() })) return;
  if (!interstitialDue(lastInterstitialAt, Date.now())) return;
  if (!interstitialReady) {
    void prepareInterstitial();
    return;
  }
  interstitialReady = false;
  lastInterstitialAt = Date.now();
  try {
    await mod.AdMob.showInterstitial();
  } catch {
    /* failed to show: the cap still applies so we do not retry in a loop */
  } finally {
    void prepareInterstitial();
  }
}

// ---------------------------------------------------------------------------
// Rewarded (extra skip)
// ---------------------------------------------------------------------------

/** Whether the "Watch an ad for an extra skip" button should render at all. */
export function rewardAdAvailable(): boolean {
  return isNative ? adsEnabled() : webRewardAvailable();
}

/**
 * Play a rewarded ad; `onReward` fires only when the ad network grants the
 * reward (watched to the end). Resolves when the ad is dismissed or fails.
 */
export async function adBreakForReward(onReward: () => void): Promise<void> {
  if (!isNative) {
    webAdBreakReward(onReward);
    return;
  }
  if (!mod || !units || !adsEnabled()) return;
  const { AdMob, RewardAdPluginEvents } = mod;
  if (!rewardedReady) await prepareRewarded();
  if (!rewardedReady) return;
  rewardedReady = false;
  await new Promise<void>((resolve) => {
    const handles: Promise<{ remove: () => Promise<void> }>[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const h of handles) h.then((x) => x.remove()).catch(() => {});
      resolve();
    };
    // A rewarded video is at most ~60 s; the timeout only guards a lost event.
    const timer = setTimeout(finish, 3 * 60_000);
    handles.push(AdMob.addListener(RewardAdPluginEvents.Rewarded, () => onReward()));
    handles.push(AdMob.addListener(RewardAdPluginEvents.Dismissed, finish));
    handles.push(AdMob.addListener(RewardAdPluginEvents.FailedToShow, finish));
    AdMob.showRewardVideoAd().catch(finish);
  });
  void prepareRewarded();
}

// ---------------------------------------------------------------------------
// Privacy options (Settings row)
// ---------------------------------------------------------------------------

/** Native only: the UMP form exists for this user (regulated region) or is required. */
export function privacyOptionsAvailable(): boolean {
  return isNative && !!mod && (privacyOptionsRequired || consentFormAvailable);
}

/** Re-open the UMP privacy options (or the consent form where options are not required). */
export async function showPrivacyOptions(): Promise<void> {
  if (!mod) return;
  try {
    if (privacyOptionsRequired) await mod.AdMob.showPrivacyOptionsForm();
    else await mod.AdMob.showConsentForm();
    const info = await mod.AdMob.requestConsentInfo();
    consentDone = info.canRequestAds;
    if (!consentDone) await removeBanner();
  } catch {
    /* form unavailable right now */
  }
}

/** Web boot hook (main.tsx): loads the AdSense H5 tag when configured. No-op in the apps. */
export function initWebAdsIfConfigured(): void {
  if (!isNative) initWebAds();
}
