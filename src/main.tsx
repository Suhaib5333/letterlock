import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { AuthProvider } from './lib/auth';
import { ImgView } from './screens/ImgView';
import { StoreProvider } from './state/store';
import './theme.css';
import './app/app.css';

const splash = document.getElementById('boot-splash');
if (splash) {
  setTimeout(() => splash.classList.add('hide'), 300);
  setTimeout(() => splash.remove(), 900);
}

// Deep-link "secret prompt" page for charade QR codes — no game store needed.
const isImgView = new URLSearchParams(window.location.search).get('view') === 'img';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isImgView ? (
      <ImgView />
    ) : (
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    )}
  </StrictMode>,
);
