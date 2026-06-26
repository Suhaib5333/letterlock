/**
 * Pure progression math — XP → level/prestige, tiers, and unlock gating.
 * Zero side effects so it's unit-tested and shared by client + (mirrored in) the
 * server award_xp RPC. See PROGRESSION_SOCIAL.md.
 */

export type BoardSize = 4 | 5 | 7;
export type Difficulty = 'kids' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';
export type MatchMode = 'single' | 'bo3' | 'bo5';

export const MAX_LEVEL = 10;
export const MAX_PRESTIGE = 10;

/** XP rewards (kept in sync with the server award_xp RPC). */
export const XP = {
  WIN: 100,
  // Losing team still earns half — they showed up and played.
  LOSS: 50,
  PLAY: 40,
  ROOM_JOIN: 25,
} as const;

/**
 * XP a participant on `team` earns for a finished game won by `winner`:
 * the winning team gets the full WIN; everyone else who played (including a
 * drawn board, winner === null) gets the partial LOSS. Used identically for a
 * linked player (Couch/Party) and the couch host, so attribution is consistent
 * and unit-testable. (The server `award_xp` RPC re-clamps the amount.)
 */
export function teamXpForResult(team: 'A' | 'B', winner: 'A' | 'B' | null): number {
  return winner !== null && team === winner ? XP.WIN : XP.LOSS;
}

/**
 * XP the COUCH host earns, given the team they chose to play on (`hostTeam`).
 * `null` = "just hosting" → no XP (returns null). Party-Mode hosts are arbiters
 * and never earn XP, so callers pass `hostTeam = null` there.
 */
export function hostXpForResult(hostTeam: 'A' | 'B' | null, winner: 'A' | 'B' | null): number | null {
  if (!hostTeam) return null;
  return teamXpForResult(hostTeam, winner);
}

/** Games needed to advance FROM level i (1-indexed). Index 0 unused. Level 10 = prestige. */
const GAMES_TO_NEXT = [0, 2, 3, 5, 7, 9, 11, 13, 15, 20];
/** XP needed to go from level L → L+1 (L = 1..9). */
export function xpToNext(level: number): number {
  if (level < 1 || level >= MAX_LEVEL) return 0;
  return GAMES_TO_NEXT[level] * XP.WIN;
}

/** Cumulative XP required to REACH level L (1..10) within a prestige. reach(1)=0. */
export function xpToReach(level: number): number {
  let sum = 0;
  for (let l = 1; l < level; l++) sum += xpToNext(l);
  return sum;
}

/** Total XP from the start of a prestige to max it out (reach level 10). */
export const XP_PER_PRESTIGE = xpToReach(MAX_LEVEL);

export interface LevelInfo {
  level: number; // 1..10
  intoLevel: number; // xp accumulated into the current level
  neededForNext: number; // xp span of the current level (0 at level 10)
  pct: number; // 0..1 progress toward next level (1 at level 10)
  atLevelCap: boolean; // reached level 10 this prestige (eligible to prestige)
}

/** Resolve XP-within-the-current-prestige into a level + progress. */
export function levelFromXp(xpInPrestige: number): LevelInfo {
  const xp = Math.max(0, Math.floor(xpInPrestige));
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpToReach(level + 1)) level++;
  const base = xpToReach(level);
  const span = xpToNext(level); // 0 at level 10
  const intoLevel = xp - base;
  return {
    level,
    intoLevel,
    neededForNext: span,
    pct: span === 0 ? 1 : Math.min(1, intoLevel / span),
    atLevelCap: level >= MAX_LEVEL,
  };
}

export interface Tier {
  name: string;
  key: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';
  icon: string; // emoji shown on the rank badge
}
const TIERS: Record<number, Tier> = {
  1: { name: 'Bronze I', key: 'bronze', icon: '🥉' },
  2: { name: 'Bronze II', key: 'bronze', icon: '🥉' },
  3: { name: 'Silver I', key: 'silver', icon: '🥈' },
  4: { name: 'Silver II', key: 'silver', icon: '🥈' },
  5: { name: 'Gold I', key: 'gold', icon: '🥇' },
  6: { name: 'Gold II', key: 'gold', icon: '🥇' },
  7: { name: 'Platinum', key: 'platinum', icon: '💠' },
  8: { name: 'Diamond', key: 'diamond', icon: '💎' },
  9: { name: 'Master', key: 'master', icon: '🔱' },
  10: { name: 'Grandmaster', key: 'grandmaster', icon: '👑' },
};
export function tierForLevel(level: number): Tier {
  return TIERS[Math.min(MAX_LEVEL, Math.max(1, level))];
}

export function canPrestige(prestige: number, level: number): boolean {
  return level >= MAX_LEVEL && prestige < MAX_PRESTIGE;
}
export function isMaxed(prestige: number, level: number): boolean {
  return prestige >= MAX_PRESTIGE && level >= MAX_LEVEL;
}

/** A short rank label, e.g. "Lv 7 · Platinum" or "P3 · Gold I". */
export function rankLabel(prestige: number, level: number): string {
  const tier = tierForLevel(level);
  return prestige > 0 ? `P${prestige} · ${tier.name}` : tier.name;
}

// ── Unlock gating ───────────────────────────────────────────────────────────
// Everything unlocks by Prestige ≥ 1, or when admin grants full access.

export interface Access {
  level: number;
  prestige: number;
  fullAccess: boolean;
}
/** Guests / signed-out: base (always-unlocked) set only. */
export const GUEST_ACCESS: Access = { level: 1, prestige: 0, fullAccess: false };

function unlockedAt(a: Access, requiredLevel: number): boolean {
  if (a.fullAccess) return true;
  if (a.prestige >= 1) return true; // all base content unlocked from prestige 1
  return a.level >= requiredLevel;
}

const BOARD_UNLOCK: Record<BoardSize, number> = { 4: 1, 5: 3, 7: 6 };
const DIFFICULTY_UNLOCK: Record<Difficulty, number> = {
  kids: 1,
  easy: 1,
  medium: 1,
  hard: 4,
  expert: 8,
  extreme: 8,
};
const MODE_UNLOCK: Record<MatchMode, number> = { single: 1, bo3: 1, bo5: 5 };

export function boardSizeUnlocked(size: BoardSize, a: Access): boolean {
  return unlockedAt(a, BOARD_UNLOCK[size] ?? 1);
}
export function difficultyUnlocked(d: Difficulty, a: Access): boolean {
  return unlockedAt(a, DIFFICULTY_UNLOCK[d] ?? 1);
}
export function modeUnlocked(m: MatchMode, a: Access): boolean {
  return unlockedAt(a, MODE_UNLOCK[m] ?? 1);
}
/** The level a thing unlocks at — for "Unlocks at Level N" copy. */
export function boardUnlockLevel(size: BoardSize): number {
  return BOARD_UNLOCK[size] ?? 1;
}
export function difficultyUnlockLevel(d: Difficulty): number {
  return DIFFICULTY_UNLOCK[d] ?? 1;
}
export function modeUnlockLevel(m: MatchMode): number {
  return MODE_UNLOCK[m] ?? 1;
}
