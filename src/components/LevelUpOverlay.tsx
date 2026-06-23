import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { rankLabel, tierForLevel } from '../core/progression';
import { play } from '../services/audio';
import { RankBadge } from './RankBadge';

/**
 * Full-screen rank-up celebration — confetti + an animated badge. Used for both
 * a level-up and a prestige, on the host's big screen AND on a player's phone.
 * Honors reduced motion (skips confetti, keeps the card).
 */
export function LevelUpOverlay({
  kind,
  level,
  prestige,
  reducedMotion,
  onDone,
}: {
  kind: 'level' | 'prestige';
  level: number;
  prestige: number;
  reducedMotion?: boolean;
  onDone: () => void;
}) {
  const tier = tierForLevel(level);

  useEffect(() => {
    play(kind === 'prestige' ? 'win' : 'claim');
    if (!reducedMotion) {
      const colors = ['#ffd35c', '#38bdf8', '#ff9f0a', '#a78bfa', '#ffffff'];
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.45 }, colors, scalar: 1.1 });
      setTimeout(() => confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0 }, colors }), 200);
      setTimeout(() => confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1 }, colors }), 360);
      if (kind === 'prestige') {
        setTimeout(() => confetti({ particleCount: 200, spread: 120, origin: { y: 0.5 }, colors, scalar: 1.3 }), 520);
      }
    }
    const t = setTimeout(onDone, 4200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        className="levelup-scrim"
        data-testid="levelup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDone}
      >
        <motion.div
          className={`levelup-card tier-${tier.key}`}
          initial={{ scale: 0.6, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="levelup-kicker">{kind === 'prestige' ? '🌟 PRESTIGE!' : '⭐ LEVEL UP!'}</div>
          <motion.div
            className="levelup-badge"
            initial={{ scale: 0.5, rotate: -8 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 12, delay: 0.15 }}
          >
            <RankBadge level={level} prestige={prestige} size="md" />
          </motion.div>
          <div className="levelup-title">
            {kind === 'prestige' ? `Prestige ${prestige}` : rankLabel(prestige, level)}
          </div>
          <div className="levelup-sub">
            {kind === 'prestige'
              ? 'Everything unlocked — a new star on your name. Legendary.'
              : 'New rank reached. Keep climbing!'}
          </div>
          <button className="btn btn-primary block" data-testid="levelup-continue" onClick={onDone}>
            Continue ▸
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
