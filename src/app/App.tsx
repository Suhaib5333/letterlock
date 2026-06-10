import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { initAudio, setAudioEnabled } from '../services/audio';
import { useStore } from '../state/store';
import { Home } from '../screens/Home';
import { Setup } from '../screens/Setup';
import { Game } from '../screens/Game';
import { Victory } from '../screens/Victory';
import { Tutorial } from '../screens/Tutorial';

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

  const screen = state.screen;

  // Reset scroll on every screen change so a screen never opens mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  return (
    <div className="ll-app" data-screen={screen}>
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
    </div>
  );
}
