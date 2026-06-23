import { motion } from 'motion/react';
import { useAuth } from '../lib/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { play } from '../services/audio';
import { useStore } from '../state/store';

/**
 * Pick the play mode after tapping Play on Home.
 *
 *   🛋 Couch Mode — one device, host adjudicates (the existing flow).
 *   🛜 Online Mode — Kahoot-style: room code, phones-as-controllers.
 *
 * Online is gated on Supabase being configured — when it isn't, the card is
 * still visible but disabled with a friendly hint, so the UI is the same on
 * every machine and we don't surprise users with hidden buttons.
 */
export function ModeSelect() {
  const { dispatch } = useStore();
  const { user } = useAuth();
  const online = isSupabaseConfigured();
  const signedOut = online && !user;

  return (
    <div className="mode-select" data-testid="mode-select">
      <header className="sub-head">
        <button
          className="btn btn-ghost"
          data-testid="mode-back"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'home' })}
        >
          ‹ Back
        </button>
        <div className="sub-head-title">
          <h1>Pick how you play</h1>
        </div>
        <div />
      </header>

      {signedOut && (
        <div className="login-nudge" data-testid="login-nudge">
          💡 <strong>Sign in</strong> (on the home screen) to earn <strong>XP</strong>, level up,
          unlock bigger boards &amp; harder packs, add friends, and climb the leaderboard. You can
          still play as a guest.
        </div>
      )}

      <div className="mode-grid">
        <motion.button
          className="mode-card"
          data-testid="mode-couch"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            play('pick');
            dispatch({ type: 'SET_ONLINE', value: false });
            dispatch({ type: 'SET_SCREEN', screen: 'setup' });
          }}
        >
          <span className="mode-card-emoji" aria-hidden="true">🛋</span>
          <span className="mode-card-name">Couch Mode</span>
          <span className="mode-card-tag">In-person · one screen</span>
          <span className="mode-card-desc">
            Same room, one device. Host reads questions aloud and taps the result.
            The classic Letterlock party setup.
          </span>
        </motion.button>

        <motion.button
          className="mode-card"
          data-testid="mode-online"
          disabled={!online}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
          whileHover={online ? { y: -3 } : undefined}
          whileTap={online ? { scale: 0.98 } : undefined}
          onClick={() => {
            if (!online) return;
            play('pick');
            // Online sets up the match FIRST (colours/pack/mode), THEN shows the
            // room code — so the lobby + player phones know the real team colours.
            dispatch({ type: 'SET_ONLINE', value: true });
            dispatch({ type: 'SET_SCREEN', screen: 'setup' });
          }}
        >
          <span className="mode-card-emoji" aria-hidden="true">🛜</span>
          <span className="mode-card-name">Online Mode</span>
          <span className="mode-card-tag">
            {online ? 'Phones as controllers · room code' : 'Needs Supabase — set VITE_SUPABASE_URL'}
          </span>
          <span className="mode-card-desc">
            Host a room from this device. Everyone joins from their phone using a
            6-letter code (or QR). Type your answer — the host sees them all and picks the winner.
          </span>
        </motion.button>

        <motion.button
          className="mode-card mode-card-join"
          data-testid="mode-join"
          disabled={!online}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
          whileHover={online ? { y: -3 } : undefined}
          whileTap={online ? { scale: 0.98 } : undefined}
          onClick={() => {
            if (!online) return;
            play('pick');
            dispatch({ type: 'SET_SCREEN', screen: 'lobby-join' });
          }}
        >
          <span className="mode-card-emoji" aria-hidden="true">📱</span>
          <span className="mode-card-name">Join a room</span>
          <span className="mode-card-tag">
            {online ? 'I have a 6-letter code' : 'Needs Supabase'}
          </span>
          <span className="mode-card-desc">
            Got the code from the host? Enter it here to join the lobby on this device.
          </span>
        </motion.button>
      </div>
    </div>
  );
}
