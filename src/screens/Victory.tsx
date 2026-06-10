import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Board } from '../components/Board';
import { play } from '../services/audio';
import { clearSavedGame, useStore } from '../state/store';

export function Victory() {
  const { state, dispatch } = useStore();
  const { game, opts, series } = state;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    clearSavedGame();
    play('win');
    if (state.settings.motion === 'reduced') return;
    const colors = series.matchWinner === 'A' ? ['#3aa0ff', '#7cc4ff'] : ['#ffb43a', '#ffd27a'];
    const burst = () =>
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.3 }, colors, scalar: 1.2 });
    burst();
    const t = setTimeout(burst, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!opts || !series.matchWinner) return null;
  const winner = series.matchWinner;
  const teams = opts.teams;
  const winnerName = teams[winner].name;

  const summary = `🔒 Letterlock — ${winnerName} win ${series.A}–${series.B} (${opts.size}×${opts.size}, ${opts.mode.toUpperCase()})\nClaim the letters. Connect your edges.`;

  return (
    <div className="victory" data-testid="victory-screen">
      <motion.div
        className={`victory-crown team-${winner}`}
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 14 }}
      >
        🏆
      </motion.div>
      <motion.h1
        className="victory-title"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <span className={`grad-text-${winner}`}>{winnerName}</span> win the match!
      </motion.h1>
      <motion.div
        className="victory-score"
        data-testid="victory-score"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="team-A">{series.A}</span>
        <span className="dash">–</span>
        <span className="team-B">{series.B}</span>
      </motion.div>

      <motion.div
        className="victory-board"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35 }}
      >
        <Board game={game} selectedCell={null} lastClaimCell={null} pickable={false} onPick={() => {}} />
      </motion.div>

      <div className="victory-actions">
        <button
          className="btn btn-secondary"
          data-testid="share-result"
          onClick={async () => {
            try {
              if (navigator.share) {
                await navigator.share({ text: summary, title: 'Letterlock' });
              } else {
                await navigator.clipboard.writeText(summary);
              }
              setCopied(true);
              play('reveal');
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* user cancelled */
            }
          }}
        >
          {copied ? '✓ Copied!' : '📤 Share result'}
        </button>
        <button
          className="btn btn-primary"
          data-testid="rematch"
          onClick={() => {
            play('pick');
            dispatch({ type: 'REMATCH' });
          }}
        >
          ⟲ Rematch
        </button>
        <button className="btn btn-ghost" onClick={() => dispatch({ type: 'EXIT_HOME' })}>
          Home
        </button>
      </div>
    </div>
  );
}
