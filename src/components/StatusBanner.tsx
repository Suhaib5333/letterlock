import { type AppConfig, APP_VERSION } from '../lib/appConfig';
import { useOnline } from '../lib/online';

/**
 * Slim, non-blocking strip above the screen (LAUNCH_PLAN Phase 1): offline and
 * maintenance notices. Local play keeps working underneath; only online rooms
 * and remote-media packs are paused (ModeSelect / CategoryMenu read the same
 * signals). Returns null when there is nothing to say.
 */
export function StatusBanners({ config }: { config: AppConfig | null }) {
  const online = useOnline();
  if (!online) {
    return (
      <div className="status-banner offline" role="status" data-testid="offline-banner">
        <span aria-hidden="true">📴</span>
        <span>You are offline. Local play works; online rooms and remote packs are paused.</span>
      </div>
    );
  }
  if (config?.maintenance) {
    return (
      <div className="status-banner maintenance" role="status" data-testid="maintenance-banner">
        <span aria-hidden="true">🛠</span>
        <span>{config.message || 'Letterlock is under maintenance. Online rooms are paused; local play works.'}</span>
      </div>
    );
  }
  return null;
}

/** Full-screen gate shown when the server's `minBundle` is newer than this build. */
export function UpdateRequired({ config }: { config: AppConfig }) {
  const links = config.storeLinks ?? {};
  return (
    <div className="update-gate" role="alertdialog" aria-labelledby="update-gate-title" data-testid="update-required">
      <div className="update-gate-card">
        <div className="update-gate-emoji" aria-hidden="true">⬆️</div>
        <h1 id="update-gate-title">Update required</h1>
        <p>
          {config.message ||
            'A newer version of Letterlock is needed to keep playing. Reload to get the latest version.'}
        </p>
        <p className="update-gate-ver">
          You have {APP_VERSION}; version {config.minBundle} or newer is required.
        </p>
        <button className="btn btn-primary btn-lg" data-testid="update-reload" onClick={() => window.location.reload()}>
          ↻ Reload
        </button>
        {(links.ios || links.android) && (
          <div className="update-gate-stores">
            {links.ios && <a href={links.ios} rel="noopener noreferrer">App Store</a>}
            {links.android && <a href={links.android} rel="noopener noreferrer">Google Play</a>}
          </div>
        )}
      </div>
    </div>
  );
}
