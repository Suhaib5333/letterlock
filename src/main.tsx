import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { StoreProvider } from './state/store';
import './theme.css';
import './app/app.css';

const splash = document.getElementById('boot-splash');
if (splash) {
  setTimeout(() => splash.classList.add('hide'), 300);
  setTimeout(() => splash.remove(), 900);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
);
