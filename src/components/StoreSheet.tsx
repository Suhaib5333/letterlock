import { useState } from 'react';
import type { AppConfig } from '../lib/appConfig';
import { isMobileBrowser, mobileOS } from '../lib/platform';
import { play } from '../services/audio';

const KEY = 'letterlock.storeSheet.dismissedAt';
const REMEMBER_MS = 14 * 24 * 60 * 60 * 1000;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY) ?? 0);
    return at > 0 && Date.now() - at < REMEMBER_MS;
  } catch {
    return false;
  }
}

function withUtm(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'web');
    u.searchParams.set('utm_medium', 'home_sheet');
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Phase 6b web → app funnel: a dismissible bottom sheet on Home, mobile BROWSERS
 * only (never inside the apps, an installed PWA, on desktop or on a TV), shown
 * only once `app-config.storeLinks` carries a link (i.e. the apps are live).
 * Dismissal is remembered for 14 days. Never blocks the page. No prices anywhere.
 */
export function StoreSheet({ config }: { config: AppConfig | null }) {
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const links = config?.storeLinks;
  if (dismissed || !links || (!links.ios && !links.android) || !isMobileBrowser()) return null;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const os = mobileOS();
  // Show this device's store first; both when both exist.
  const badges = [
    links.ios && { key: 'ios', href: withUtm(links.ios), src: `${base}/badges/app-store.svg`, alt: 'Download on the App Store' },
    links.android && { key: 'android', href: withUtm(links.android), src: `${base}/badges/google-play.png`, alt: 'Get it on Google Play' },
  ].filter((b): b is { key: string; href: string; src: string; alt: string } => !!b);
  if (os === 'android') badges.reverse();

  return (
    <div className="store-sheet" role="complementary" aria-label="Get the app" data-testid="store-sheet">
      <button
        className="store-sheet-close"
        aria-label="Not now"
        data-testid="store-sheet-close"
        onClick={() => {
          play('tap');
          try {
            localStorage.setItem(KEY, String(Date.now()));
          } catch {
            /* ignore */
          }
          setDismissed(true);
        }}
      >
        ✕
      </button>
      <div className="store-sheet-text">
        <strong>Play Letterlock in the app</strong>
        <span>Faster, works offline, and joins rooms with one tap.</span>
      </div>
      <div className="store-sheet-badges">
        {badges.map((b) => (
          <a key={b.key} href={b.href} rel="noopener noreferrer" data-testid={`store-badge-${b.key}`}>
            <img src={b.src} alt={b.alt} height={40} draggable={false} />
          </a>
        ))}
      </div>
    </div>
  );
}
