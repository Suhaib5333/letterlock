import confetti from 'canvas-confetti';
import { useEffect, useState } from 'react';
import { privacyOptionsAvailable, showPrivacyOptions } from '../lib/ads';
import { useAdsRemoved } from '../lib/entitlements';
import { isNative } from '../lib/platform';
import { buyRemoveAds, purchasesAvailable, removeAdsOffer, restorePurchases } from '../lib/purchases';
import { play } from '../services/audio';
import { useStore } from '../state/store';

/**
 * Settings > "Ads" group (LAUNCH_PLAN Phase 4 + 5): Remove Ads card with the
 * store price, Restore Purchases (Apple requires it) and the UMP "Privacy
 * options" row. Renders nothing on the web (no web purchase, D13) and nothing
 * when neither RevenueCat nor AdMob is configured for this build.
 */
export function MonetizationSettings() {
  const removed = useAdsRemoved();
  const { state } = useStore();
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const store = isNative && purchasesAvailable();
  const privacy = privacyOptionsAvailable();

  useEffect(() => {
    if (!store || removed) return;
    removeAdsOffer()
      .then((o) => setPrice(o?.priceString ?? null))
      .catch(() => {});
  }, [store, removed]);

  if (!isNative || (!store && !privacy)) return null;

  const celebrate = () => {
    play('win');
    if (state.settings.motion !== 'reduced') {
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.4 }, scalar: 1.1 });
    }
  };

  const buy = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await buyRemoveAds();
      if (r === 'purchased') {
        celebrate();
        setMsg('Ads removed. Thank you!');
      } else if (r === 'failed') {
        setMsg('The purchase did not go through. Nothing was charged.');
      }
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const ok = await restorePurchases();
      if (ok) celebrate();
      setMsg(ok ? 'Purchase restored. Ads removed.' : 'No Remove Ads purchase found on this store account.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="set-group" data-testid="set-monetization">
      <h3>Ads</h3>
      {store &&
        (removed ? (
          <div className="set-row">
            <div>
              <div className="set-label">✓ Ads removed</div>
              <div className="set-hint">Thank you for supporting Letterlock.</div>
            </div>
          </div>
        ) : (
          <>
            <div className="set-row">
              <div>
                <div className="set-label">Remove Ads</div>
                <div className="set-hint">One-time purchase{price ? ` · ${price}` : ''}. Follows your account on every device.</div>
              </div>
              <button className="btn btn-primary" data-testid="remove-ads" disabled={busy} onClick={buy}>
                {price ?? 'Buy'}
              </button>
            </div>
            <div className="set-row">
              <div>
                <div className="set-label">Restore Purchases</div>
                <div className="set-hint">Already bought it on this store account?</div>
              </div>
              <button className="btn btn-ghost" data-testid="restore-purchases" disabled={busy} onClick={restore}>
                Restore
              </button>
            </div>
          </>
        ))}
      {privacy && (
        <div className="set-row">
          <div>
            <div className="set-label">Privacy options</div>
            <div className="set-hint">Review or change your ad consent choices</div>
          </div>
          <button className="btn btn-ghost" data-testid="privacy-options" onClick={() => void showPrivacyOptions()}>
            Open
          </button>
        </div>
      )}
      {msg && (
        <div className="set-hint" role="status" data-testid="monetization-msg">
          {msg}
        </div>
      )}
    </div>
  );
}
