import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';
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

const view = new URLSearchParams(window.location.search).get('view');
// Two stand-alone "secret" pages — both bypass the game store so they're
// independent of an in-progress match:
//   - `?view=img` : the charade-QR secret-prompt page.
//   - `?view=controller` : the phone-as-controller for Online mode.
const isImgView = view === 'img';
const isController = view === 'controller';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isImgView ? (
      <ImgView />
    ) : isController ? (
      <PlayerController />
    ) : (
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
