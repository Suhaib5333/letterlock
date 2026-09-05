/**
 * AdMob unit-id selection (LAUNCH_PLAN Phase 4). Pure, so the "never ship test
 * ads" rule (Apple 2.1) is unit-tested.
 *
 * Env (build time, Vite):
 *   VITE_ADMOB_BANNER_ANDROID / VITE_ADMOB_BANNER_IOS
 *   VITE_ADMOB_INTERSTITIAL_ANDROID / VITE_ADMOB_INTERSTITIAL_IOS
 *   VITE_ADMOB_REWARDED_ANDROID / VITE_ADMOB_REWARDED_IOS
 * The APP ids live in the native projects (AndroidManifest strings.xml
 * `admob_app_id`, Info.plist `GADApplicationIdentifier`).
 *
 * Rules: all three real ids set and well-formed -> real ads. Anything missing in
 * a non-production build -> Google's public TEST ids fill the gaps. Anything
 * missing in a production build -> null, the ad system stays fully off.
 */
export type AdPlatform = 'ios' | 'android';

export interface AdUnits {
  banner: string;
  interstitial: string;
  rewarded: string;
  /** True when any id is a Google test id (drives `isTesting` on every request). */
  test: boolean;
}

/** Google's public test APP ids (also pasted in the native projects as the default). */
export const TEST_APP_ID: Record<AdPlatform, string> = {
  android: 'ca-app-pub-3940256099942544~3347511713',
  ios: 'ca-app-pub-3940256099942544~1458002511',
};

/** Google's public test UNIT ids (adaptive banner, interstitial, rewarded). */
export const TEST_UNITS: Record<AdPlatform, Omit<AdUnits, 'test'>> = {
  android: {
    banner: 'ca-app-pub-3940256099942544/9214589741',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2435281174',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
  },
};

const UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;

/** The env var names read for a platform, in banner / interstitial / rewarded order. */
export function adUnitEnvKeys(platform: AdPlatform): [string, string, string] {
  const P = platform.toUpperCase();
  return [`VITE_ADMOB_BANNER_${P}`, `VITE_ADMOB_INTERSTITIAL_${P}`, `VITE_ADMOB_REWARDED_${P}`];
}

export function resolveAdUnits(
  env: Record<string, string | undefined>,
  platform: AdPlatform,
  prodBuild: boolean,
): AdUnits | null {
  const [kb, ki, kr] = adUnitEnvKeys(platform);
  const clean = (v: string | undefined) => {
    const s = (v ?? '').trim();
    return UNIT_ID.test(s) ? s : '';
  };
  const real = { banner: clean(env[kb]), interstitial: clean(env[ki]), rewarded: clean(env[kr]) };
  if (real.banner && real.interstitial && real.rewarded) return { ...real, test: false };
  // Never ship a test id in a store build: a half-configured production build
  // simply shows no ads at all.
  if (prodBuild) return null;
  const t = TEST_UNITS[platform];
  return {
    banner: real.banner || t.banner,
    interstitial: real.interstitial || t.interstitial,
    rewarded: real.rewarded || t.rewarded,
    test: true,
  };
}
