import { levelFromXp, tierForLevel } from '../core/progression';

/**
 * Compact rank badge: tier-coloured pill with the level + (optional) prestige
 * star. Used on the leaderboard, home, lobby and friends list.
 */
export function RankBadge({
  level,
  prestige,
  size = 'sm',
}: {
  level: number;
  prestige: number;
  size?: 'sm' | 'md';
}) {
  const tier = tierForLevel(level);
  // Prestige adds a distinct OUTER border (data-prestige drives the ring colour),
  // capped at a few visual bands so it stays legible.
  const pBand = prestige <= 0 ? 0 : Math.min(5, Math.ceil(prestige / 2));
  return (
    <span
      className={`rank-badge rank-${size} tier-${tier.key}`}
      data-testid="rank-badge"
      data-prestige={pBand}
      title={prestige > 0 ? `Prestige ${prestige} · ${tier.name}` : tier.name}
    >
      <span className="rank-icon" aria-hidden="true">{tier.icon}</span>
      {prestige > 0 && <span className="rank-prestige">★{prestige}</span>}
      <span className="rank-lv">Lv {level}</span>
      <span className="rank-tier">{tier.name}</span>
    </span>
  );
}

/**
 * Rank + XP progress bar for the signed-in player's own card (home / profile).
 */
export function RankBar({
  xp,
  level,
  prestige,
}: {
  xp: number;
  level: number;
  prestige: number;
}) {
  const info = levelFromXp(xp);
  const tier = tierForLevel(level);
  return (
    <div className="rank-bar" data-testid="rank-bar">
      <div className="rank-bar-top">
        <RankBadge level={level} prestige={prestige} size="md" />
        <span className="rank-bar-xp">
          {info.atLevelCap ? 'MAX — ready to prestige' : `${info.intoLevel} / ${info.neededForNext} XP`}
        </span>
      </div>
      <div className={`rank-bar-track tier-${tier.key}`}>
        <div className="rank-bar-fill" style={{ transform: `scaleX(${info.pct})` }} />
      </div>
    </div>
  );
}
