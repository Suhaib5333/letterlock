import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';
import { initNative, nativeReady } from './lib/native';
import { isNative } from './lib/platform';
import { ImgView } from './screens/ImgView';
import { PlayerController } from './screens/PlayerController';
import { StoreProvider } from './state/store';
import './theme.css';
import './app/app.css';
import './app/lobby.css';
import './app/admin.css';

const splash = document.getElementById('boot-splash');
if (splash) {
  setTimeout(() => splash.classList.add('hide'), 300);
  setTimeout(() => splash.remove(), 900);
}

// `/join/ABCDEF` is a path alias for `?room=ABCDEF&view=controller` (Universal
// Links / App Links match paths reliably; the QR + copy-link in LobbyHost emit it).
// Rewrite the URL in place before rendering so every downstream reader of
// `?room=` / `?view=` (PlayerController, the OAuth redirect) stays unchanged.
{
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const m = /\/join\/([A-Za-z0-9]{4,8})\/?$/.exec(window.location.pathname);
  if (m && window.location.pathname.startsWith(base)) {
    const p = new URLSearchParams(window.location.search);
    p.set('room', m[1].toUpperCase());
    p.set('view', 'controller');
    window.history.replaceState(null, '', `${base}/?${p.toString()}${window.location.hash}`);
  }
}

const view = new URLSearchParams(window.location.search).get('view');
// Two stand-alone "secret" pages — both bypass the game store so they're
// independent of an in-progress match:
//   - `?view=img` : the charade-QR secret-prompt page.
//   - `?view=controller` : the phone-as-controller for Online mode.
const isImgView = view === 'img';
const isController = view === 'controller';

function boot() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isImgView ? (
        <ImgView />
      ) : isController ? (
        // Wrapped in AuthProvider so a signed-in phone auto-uses its account
        // username on join (no manual name entry).
        <AuthProvider>
          <PlayerController />
        </AuthProvider>
      ) : (
        <AuthProvider>
          <StoreProvider>
            <App />
          </StoreProvider>
        </AuthProvider>
      )}
    </StrictMode>,
  );
  // Capacitor apps: drop the native splash once React has painted (no-op on web).
  requestAnimationFrame(() => nativeReady());
}

// Capacitor apps (iOS/Android) restore mirrored storage + wire the native shell
// BEFORE the first render so the store's initial settings see them. The web
// build takes the synchronous path exactly as before.
if (isNative) {
  initNative().then(boot, boot);
} else {
  boot();
}
