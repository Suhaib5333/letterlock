import { describe, expect, it } from 'vitest';
import {
  boardSizeUnlocked,
  canPrestige,
  difficultyUnlocked,
  GUEST_ACCESS,
  isMaxed,
  levelFromXp,
  MAX_LEVEL,
  modeUnlocked,
  rankLabel,
  tierForLevel,
  teamXpForResult,
  hostXpForResult,
  XP,
  xpToNext,
  xpToReach,
} from './progression';

describe('XP attribution (couch-mode linking + party)', () => {
  it('winning team earns the full WIN; losing team earns the partial LOSS', () => {
    expect(teamXpForResult('A', 'A')).toBe(XP.WIN);
    expect(teamXpForResult('B', 'B')).toBe(XP.WIN);
    expect(teamXpForResult('A', 'B')).toBe(XP.LOSS);
    expect(teamXpForResult('B', 'A')).toBe(XP.LOSS);
  });
  it('a drawn board (no winner) pays everyone the partial LOSS', () => {
    expect(teamXpForResult('A', null)).toBe(XP.LOSS);
    expect(teamXpForResult('B', null)).toBe(XP.LOSS);
  });
  it('loser XP is exactly half the winner XP (winner-full / loser-partial)', () => {
    expect(XP.LOSS * 2).toBe(XP.WIN);
  });
  it('couch host earns their chosen team\'s result; "just hosting" earns nothing', () => {
    expect(hostXpForResult('A', 'A')).toBe(XP.WIN); // host on winning team
    expect(hostXpForResult('A', 'B')).toBe(XP.LOSS); // host on losing team
    expect(hostXpForResult('B', 'B')).toBe(XP.WIN);
    expect(hostXpForResult(null, 'A')).toBeNull(); // "just hosting" → no XP
    expect(hostXpForResult(null, null)).toBeNull();
  });
});

describe('xp curve', () => {
  it('level 1 needs 2 games to advance', () => {
    expect(xpToNext(1)).toBe(2 * XP.WIN);
  });
  it('reach(1) is 0 and is monotonic', () => {
    expect(xpToReach(1)).toBe(0);
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(xpToReach(l + 1)).toBeGreaterThan(xpToReach(l));
    }
  });
  it('level 10 is the cap (no xp to next)', () => {
    expect(xpToNext(10)).toBe(0);
  });
});

describe('levelFromXp', () => {
  it('starts at level 1 with 0 xp', () => {
    const i = levelFromXp(0);
    expect(i.level).toBe(1);
    expect(i.pct).toBeCloseTo(0);
    expect(i.atLevelCap).toBe(false);
  });
  it('advances to level 2 at the level-1 threshold', () => {
    expect(levelFromXp(xpToReach(2) - 1).level).toBe(1);
    expect(levelFromXp(xpToReach(2)).level).toBe(2);
  });
  it('caps at level 10 and flags atLevelCap', () => {
    const i = levelFromXp(xpToReach(MAX_LEVEL) + 99999);
    expect(i.level).toBe(MAX_LEVEL);
    expect(i.pct).toBe(1);
    expect(i.atLevelCap).toBe(true);
  });
  it('reports mid-level progress', () => {
    const xp = xpToReach(3) + Math.floor(xpToNext(3) / 2);
    const i = levelFromXp(xp);
    expect(i.level).toBe(3);
    expect(i.pct).toBeGreaterThan(0.3);
    expect(i.pct).toBeLessThan(0.7);
  });
});

describe('prestige', () => {
  it('can prestige only at level 10 below max prestige', () => {
    expect(canPrestige(0, 9)).toBe(false);
    expect(canPrestige(0, 10)).toBe(true);
    expect(canPrestige(10, 10)).toBe(false);
  });
  it('maxes out at prestige 10 level 10', () => {
    expect(isMaxed(10, 10)).toBe(true);
    expect(isMaxed(9, 10)).toBe(false);
  });
  it('labels include prestige', () => {
    expect(rankLabel(0, 5)).toBe('Gold I');
    expect(rankLabel(3, 5)).toBe('P3 · Gold I');
  });
  it('tier names map correctly', () => {
    expect(tierForLevel(1).key).toBe('bronze');
    expect(tierForLevel(10).key).toBe('grandmaster');
  });
});

describe('unlock gating', () => {
  it('guests get only base content', () => {
    expect(boardSizeUnlocked(4, GUEST_ACCESS)).toBe(true);
    expect(boardSizeUnlocked(5, GUEST_ACCESS)).toBe(false);
    expect(boardSizeUnlocked(7, GUEST_ACCESS)).toBe(false);
    expect(difficultyUnlocked('medium', GUEST_ACCESS)).toBe(true);
    expect(difficultyUnlocked('hard', GUEST_ACCESS)).toBe(false);
    expect(modeUnlocked('bo3', GUEST_ACCESS)).toBe(true);
    expect(modeUnlocked('bo5', GUEST_ACCESS)).toBe(false);
  });
  it('unlocks progressively by level', () => {
    expect(boardSizeUnlocked(5, { level: 3, prestige: 0, fullAccess: false })).toBe(true);
    expect(boardSizeUnlocked(7, { level: 5, prestige: 0, fullAccess: false })).toBe(false);
    expect(boardSizeUnlocked(7, { level: 6, prestige: 0, fullAccess: false })).toBe(true);
    expect(difficultyUnlocked('extreme', { level: 7, prestige: 0, fullAccess: false })).toBe(false);
    expect(difficultyUnlocked('extreme', { level: 8, prestige: 0, fullAccess: false })).toBe(true);
  });
  it('prestige 1 unlocks everything', () => {
    const a = { level: 1, prestige: 1, fullAccess: false };
    expect(boardSizeUnlocked(7, a)).toBe(true);
    expect(difficultyUnlocked('extreme', a)).toBe(true);
    expect(modeUnlocked('bo5', a)).toBe(true);
  });
  it('admin full access unlocks everything', () => {
    const a = { level: 1, prestige: 0, fullAccess: true };
    expect(boardSizeUnlocked(7, a)).toBe(true);
    expect(difficultyUnlocked('extreme', a)).toBe(true);
    expect(modeUnlocked('bo5', a)).toBe(true);
  });
});
