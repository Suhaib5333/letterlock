import { useState } from 'react';
import { adBreakForReward, rewardAdAvailable } from '../lib/ads';
import { useAdsRemoved } from '../lib/entitlements';
import { play } from '../services/audio';
import { useStore } from '../state/store';

/**
 * "Watch an ad for an extra skip" (LAUNCH_PLAN D4, rewarded placement). Shown
 * on the host pad only once the pick's skips are used up, and only when an ad
 * system is live (AdMob in the apps, AdSense H5 on web) and Remove Ads is not
 * owned. The reward is a `GRANT_SKIP` (one skip refunded on the current pick).
 */
export function ExtraSkipButton({ show }: { show: boolean }) {
  const { dispatch } = useStore();
  const removed = useAdsRemoved();
  const [busy, setBusy] = useState(false);
  if (!show || removed || !rewardAdAvailable()) return null;
  return (
    <button
      className="btn btn-ghost skip"
      data-testid="extra-skip"
      disabled={busy}
      onClick={async () => {
        play('tap');
        setBusy(true);
        try {
          await adBreakForReward(() => dispatch({ type: 'GRANT_SKIP' }));
        } finally {
          setBusy(false);
        }
      }}
    >
      🎬 Watch an ad for an extra skip
    </button>
  );
}
