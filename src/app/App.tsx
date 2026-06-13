import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { initAudio, setAudioEnabled, setMusicContext, startMusic, stopMusic } from '../services/audio';
import { applyTeamColors } from '../state/palette';
import { useStore } from '../state/store';
import { Home } from '../screens/Home';
import { Setup } from '../screens/Setup';
import { Game } from '../screens/Game';
import { Victory } from '../screens/Victory';
import { Tutorial } from '../screens/Tutorial';

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
