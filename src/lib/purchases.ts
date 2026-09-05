import type { CustomerInfo, PurchasesPackage } from '@revenuecat/purchases-capacitor';
import { adsRemoved, setAdsRemoved } from './entitlements';
import { isNative, platform } from './platform';

/**
 * Remove Ads purchase (LAUNCH_PLAN Phase 5, §7, §8) through RevenueCat.
 * Entitlement `no_ads`, non-consumable product `remove_ads` ($3.99 tier).
 *
 * Keys (build time): VITE_REVENUECAT_IOS_KEY / VITE_REVENUECAT_ANDROID_KEY.
 * Empty key -> `configure()` is skipped and every export is a harmless no-op,
 * so the Settings card simply does not render. Web never purchases (D13).
 *
 * The device's store account is one source of `adsRemoved` (entitlements.ts);
 * the server flag written by the RevenueCat webhook is the other. Hook points
 * for the auth layer: `purchasesLogin(userId)` at sign-in (merges an anonymous
 * purchase into the account) and `purchasesLogout()` at sign-out.
 */
export const ENTITLEMENT_ID = 'no_ads';
export const PRODUCT_ID = 'remove_ads';

type PurchasesModule = typeof import('@revenuecat/purchases-capacitor');

let mod: PurchasesModule | null = null;
let configured = false;
let initPromise: Promise<void> | null = null;

function apiKey(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return (platform === 'ios' ? env.VITE_REVENUECAT_IOS_KEY : env.VITE_REVENUECAT_ANDROID_KEY)?.trim() ?? '';
}

/** RevenueCat is configured on this build (drives the Settings card). */
export function purchasesAvailable(): boolean {
  return configured;
}

function applyCustomerInfo(info: CustomerInfo | undefined): void {
  if (!info) return;
  setAdsRemoved(ENTITLEMENT_ID in (info.entitlements?.active ?? {}), 'store');
}

/** Native only; resolves once configured (or at once when no key). Never throws. */
export function initPurchases(): Promise<void> {
  if (!isNative) return Promise.resolve();
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const key = apiKey();
    if (!key) return;
    mod = await import('@revenuecat/purchases-capacitor');
    await mod.Purchases.configure({ apiKey: key });
    configured = true;
    await mod.Purchases.addCustomerInfoUpdateListener((info) => applyCustomerInfo(info));
    const { customerInfo } = await mod.Purchases.getCustomerInfo();
    applyCustomerInfo(customerInfo);
  })().catch(() => {
    configured = false;
  });
  return initPromise;
}

/** Auth hook: identify the RevenueCat user with our account id so purchases follow the login. */
export async function purchasesLogin(userId: string): Promise<void> {
  await initPromise;
  if (!mod || !configured || !userId) return;
  try {
    const { customerInfo } = await mod.Purchases.logIn({ appUserID: userId });
    applyCustomerInfo(customerInfo);
  } catch {
    /* offline: the listener catches up later */
  }
}

/** Auth hook: back to an anonymous RevenueCat user at sign-out. */
export async function purchasesLogout(): Promise<void> {
  await initPromise;
  if (!mod || !configured) return;
  try {
    const { customerInfo } = await mod.Purchases.logOut();
    applyCustomerInfo(customerInfo);
  } catch {
    /* already anonymous */
  }
}

export interface RemoveAdsOffer {
  priceString: string;
  pkg: PurchasesPackage;
}

/** The Remove Ads package from the current offering (price localised by the store). */
export async function removeAdsOffer(): Promise<RemoveAdsOffer | null> {
  await initPromise;
  if (!mod || !configured) return null;
  try {
    const { current, all } = await mod.Purchases.getOfferings();
    const packages = current?.availablePackages ?? Object.values(all).flatMap((o) => o.availablePackages);
    const pkg =
      packages.find((p) => p.product.identifier === PRODUCT_ID || p.product.identifier.startsWith(`${PRODUCT_ID}:`)) ??
      packages[0];
    return pkg ? { priceString: pkg.product.priceString, pkg } : null;
  } catch {
    return null;
  }
}

function userCancelled(e: unknown): boolean {
  const err = e as { readableErrorCode?: string; userCancelled?: boolean; code?: unknown } | null;
  return !!err && (err.readableErrorCode === 'PURCHASE_CANCELLED_ERROR' || err.userCancelled === true || err.code === 1);
}

export type PurchaseOutcome = 'purchased' | 'cancelled' | 'failed';

export async function buyRemoveAds(): Promise<PurchaseOutcome> {
  const offer = await removeAdsOffer();
  if (!mod || !offer) return 'failed';
  try {
    const { customerInfo } = await mod.Purchases.purchasePackage({ aPackage: offer.pkg });
    applyCustomerInfo(customerInfo);
    return adsRemoved() ? 'purchased' : 'failed';
  } catch (e) {
    return userCancelled(e) ? 'cancelled' : 'failed';
  }
}

/** Apple requires this button; on Android the store re-grants automatically but it does no harm. */
export async function restorePurchases(): Promise<boolean> {
  await initPromise;
  if (!mod || !configured) return false;
  try {
    const { customerInfo } = await mod.Purchases.restorePurchases();
    applyCustomerInfo(customerInfo);
    return adsRemoved();
  } catch {
    return false;
  }
}
