/**
 * Ad placement policy (LAUNCH_PLAN Phase 4 / D4, §6, §6b). Pure functions, no
 * platform code, so the rules are unit-tested in isolation and shared by the
 * AdMob (apps) and AdSense H5 (web) paths in ads.ts / webAds.ts.
 *
 * The law: interstitial only between games (never at app open, never during a
 * question, never on the phone controller while a question is live); rewarded
 * only on the player's own tap; banner only on Home / Category menu / Settings /
 * Lobby waiting (the menu and Settings are modals over Home); nothing on the
 * board; nothing on a TV.
 */
export type Placement = 'banner' | 'interstitial' | 'rewarded';

export interface AdGateState {
  /** SDK present and unit ids resolved (see adUnits.ts). */
  enabled: boolean;
  /** UMP consent flow finished and ads may be requested. */
  consentDone: boolean;
  /** Remove Ads owned (store or account flag, see entitlements.ts). */
  adsRemoved: boolean;
  /** Running on a TV (Android TV / Google TV or a TV browser). */
  tv: boolean;
}

export interface PlacementContext {
  /** The app screen the placement would appear on (store.tsx `Screen`). */
  screen: string;
  /** A question card is currently open (host board or phone controller). */
  questionLive?: boolean;
}

/** Minimum gap between two interstitials (D4: "1 per 3-5 min"). */
export const INTERSTITIAL_CAP_MS = 4 * 60_000;

/** Screens whose bottom edge may carry the adaptive banner. */
export const BANNER_SCREENS: ReadonlySet<string> = new Set(['home', 'lobby-host']);

/** Screens where a between-games interstitial may appear. */
export const INTERSTITIAL_SCREENS: ReadonlySet<string> = new Set(['game', 'victory']);

/** The one gate every ad goes through: enabled && consent && !removed && !TV. */
export function shouldShowAds(s: AdGateState): boolean {
  return s.enabled && s.consentDone && !s.adsRemoved && !s.tv;
}

/** Placement-specific rules on top of shouldShowAds(). */
export function placementAllowed(placement: Placement, ctx: PlacementContext): boolean {
  switch (placement) {
    case 'banner':
      return BANNER_SCREENS.has(ctx.screen) && !ctx.questionLive;
    case 'interstitial':
      return INTERSTITIAL_SCREENS.has(ctx.screen) && !ctx.questionLive;
    case 'rewarded':
      // Opt-in by definition: the player tapped "Watch an ad". Always allowed
      // (the global gate still applies).
      return true;
  }
}

/** Frequency cap for interstitials; `lastShownAt` starts at app open so the first one is never at launch. */
export function interstitialDue(lastShownAt: number, now: number, capMs: number = INTERSTITIAL_CAP_MS): boolean {
  return now - lastShownAt >= capMs;
}
