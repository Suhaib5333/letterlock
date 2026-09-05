import { useEffect, useState } from 'react';
import { useAppConfig } from '../lib/appConfig';
import { isMobileBrowser, mobileOS } from '../lib/platform';
import { play } from '../services/audio';

const KEY = 'letterlock.installPrompt.dismissedAt';
const REMEMBER_MS = 14 * 24 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// Chrome fires `beforeinstallprompt` once, early, possibly before React mounts:
// keep the event at module level so a later mount can still use it.
let deferred: BeforeInstallPromptEvent | null = null;
const waiters = new Set<(e: BeforeInstallPromptEvent) => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    for (const w of waiters) w(deferred);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    for (const w of waiters) w(null as unknown as BeforeInstallPromptEvent);
  });
}

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(KEY) ?? 0);
    return at > 0 && Date.now() - at < REMEMBER_MS;
  } catch {
    return false;
  }
}

function remember() {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * "Add to Home Screen" prompt (LAUNCH_PLAN.md Phase 1b, URL-bar layer 2): the
 * installed PWA opens full-screen, so the browser bar stops eating the board.
 * Mobile BROWSERS only: never inside the apps, never once installed
 * (`display-mode: standalone`), never on desktop or TV, and it steps aside for
 * the store sheet once the native apps are live. Android Chrome: waits for
 * `beforeinstallprompt` and offers a real Install button. iOS Safari: the three
 * share-sheet steps (Apple has no install API). Dismissal is kept for 14 days.
 */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(recentlyDismissed);
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(deferred);
  const config = useAppConfig();
  const os = mobileOS();

  useEffect(() => {
    const w = (e: BeforeInstallPromptEvent) => setInstallEvt(e ?? null);
    waiters.add(w);
    return () => {
      waiters.delete(w);
    };
  }, []);

  const links = config?.storeLinks;
  const storeSheetShowing = !!links && (!!links.ios || !!links.android);
  if (dismissed || storeSheetShowing || !isMobileBrowser()) return null;
  // Android without an install event: Chrome has not judged the page installable
  // (or it is already installed); showing manual steps there would be noise.
  if (os === 'android' && !installEvt) return null;
  if (os === null) return null;

  const close = () => {
    play('tap');
    remember();
    setDismissed(true);
  };

  const install = async () => {
    if (!installEvt) return;
    play('tap');
    try {
      await installEvt.prompt();
      const { outcome } = await installEvt.userChoice;
      if (outcome === 'accepted') remember();
    } catch {
      /* the browser refused; keep the sheet so the user can retry */
    }
    setInstallEvt(null);
    setDismissed(true);
  };

  return (
    <div className="install-sheet" role="complementary" aria-label="Add to Home Screen" data-testid="install-prompt" data-os={os}>
      <button className="install-sheet-close" aria-label="Not now" data-testid="install-dismiss" onClick={close}>
        ✕
      </button>
      <div className="install-sheet-text">
        <strong>Play full-screen</strong>
        {os === 'android' ? (
          <span>Install Letterlock to hide the browser bar and get the whole board.</span>
        ) : (
          <ol className="install-steps">
            <li>
              Tap <span className="install-key" aria-label="Share">⎋</span> Share
            </li>
            <li>Choose <b>Add to Home Screen</b></li>
            <li>Tap <b>Add</b></li>
          </ol>
        )}
      </div>
      {os === 'android' && (
        <button className="btn btn-primary install-sheet-btn" data-testid="install-btn" onClick={install}>
          Install
        </button>
      )}
    </div>
  );
}
