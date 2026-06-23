import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { useAuth } from '../lib/auth';
import { startSocial, stopSocial, type Notification } from '../lib/friends';
import { play } from '../services/audio';
import { initAudio, setAudioEnabled, setMusicContext, startMusic, stopMusic } from '../services/audio';
import { applyTeamColors } from '../state/palette';
import { useStore } from '../state/store';
import { Home } from '../screens/Home';
import { Setup } from '../screens/Setup';
import { Game } from '../screens/Game';
import { Victory } from '../screens/Victory';
import { Tutorial } from '../screens/Tutorial';
import { ModeSelect } from '../screens/ModeSelect';
import { LobbyHost } from '../screens/LobbyHost';
import { LobbyJoin } from '../screens/LobbyJoin';

/** Test-only seam: `?__crashtest=1` throws during render so the ErrorBoundary can be
 *  verified to show the recovery card (never a blank screen). Inert otherwise. */
function CrashProbe() {
  if (new URLSearchParams(window.location.search).has('__crashtest')) {
    throw new Error('crash test');
  }
  return null;
}

export function App() {
  const { state } = useStore();
  const { user, profile } = useAuth();
  const [notif, setNotif] = useState<Notification | null>(null);

  // Start presence + the notification inbox while signed in; tear down on sign-out.
  useEffect(() => {
    if (!user || !profile) {
      void stopSocial();
      return;
    }
    void startSocial(user.id, profile.username, (n) => {
      setNotif(n);
      play('select');
    });
    return () => {
      void stopSocial();
    };
  }, [user?.id, profile?.username]);

  // Auto-dismiss notifications.
  useEffect(() => {
    if (!notif) return;
    const t = setTimeout(() => setNotif(null), 8000);
    return () => clearTimeout(t);
  }, [notif]);

  // Initialise audio on the first user gesture (browser autoplay policy).
  useEffect(() => {
    const onFirst = () => {
      initAudio();
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
    window.addEventListener('pointerdown', onFirst);
    window.addEventListener('keydown', onFirst);
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, []);

  useEffect(() => {
    setAudioEnabled(state.settings.sound);
  }, [state.settings.sound]);

  // Ambient music follows the Music setting (and starts only after audio init).
  useEffect(() => {
    if (state.settings.music) {
      initAudio();
      startMusic();
    } else {
      stopMusic();
    }
  }, [state.settings.music]);

  const screen = state.screen;

  // Reset scroll on every screen change so a screen never opens mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  // Online-lobby teardown: when the host lands back on Home, close the Realtime
  // channel (tells players "host_left") and free the session room code so the
  // next online match mints a fresh one. No-op for Couch Mode (no __lobby).
  useEffect(() => {
    if (screen !== 'home') return;
    const lobby = window.__lobby;
    if (!lobby) return;
    window.__lobby = undefined;
    lobby.leave().catch(() => {});
    try {
      sessionStorage.removeItem('letterlock.lobby.code');
    } catch {
      /* ignore */
    }
  }, [screen]);

  // Music plays quieter during a match, fuller in menus.
  useEffect(() => {
    setMusicContext(screen === 'game' ? 'game' : 'menu');
  }, [screen]);

  // Drive the live team colors. During a match use the locked-in team colors;
  // otherwise mirror the setup picker so home/setup preview the choice.
  const aColor = state.opts && (screen === 'game' || screen === 'victory') ? state.opts.teams.A.colorId : state.setup.colorA;
  const bColor = state.opts && (screen === 'game' || screen === 'victory') ? state.opts.teams.B.colorId : state.setup.colorB;
  useEffect(() => {
    applyTeamColors(aColor, bColor);
  }, [aColor, bColor]);

  return (
    <div className="ll-app" data-screen={screen}>
      <AnimatePresence>
        {notif && (
          <motion.div
            className="notif-toast"
            data-testid="notif-toast"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <span className="notif-icon" aria-hidden="true">
              {notif.type === 'room_invite' ? '🎮' : notif.type === 'friend_accepted' ? '🎉' : '👋'}
            </span>
            <span className="notif-text">
              {notif.type === 'friend_request' && (
                <><strong>@{notif.fromName}</strong> sent you a friend request.</>
              )}
              {notif.type === 'friend_accepted' && (
                <><strong>@{notif.fromName}</strong> accepted your friend request!</>
              )}
              {notif.type === 'room_invite' && (
                <><strong>@{notif.fromName}</strong> invited you to room <strong>{notif.code}</strong>.</>
              )}
            </span>
            {notif.type === 'room_invite' && (
              <button
                className="btn btn-primary sm"
                data-testid="notif-join"
                onClick={() => {
                  const u = new URL(window.location.href);
                  u.search = `?room=${notif.code}&view=controller${profile ? `&name=${encodeURIComponent(profile.username)}` : ''}`;
                  window.location.href = u.toString();
                }}
              >
                Join ▸
              </button>
            )}
            <button className="notif-close" aria-label="Dismiss" onClick={() => setNotif(null)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      <ErrorBoundary>
        <CrashProbe />
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            className="ll-screen"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {screen === 'home' && <Home />}
            {screen === 'mode-select' && <ModeSelect />}
            {screen === 'lobby-host' && <LobbyHost />}
            {screen === 'lobby-join' && <LobbyJoin />}
            {screen === 'setup' && <Setup />}
            {screen === 'game' && <Game />}
            {screen === 'victory' && <Victory />}
            {screen === 'tutorial' && <Tutorial />}
          </motion.div>
        </AnimatePresence>
      </ErrorBoundary>
    </div>
  );
}
