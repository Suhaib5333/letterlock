import { describe, expect, it } from 'vitest';
import { reducer } from './store';
import type { StoreState } from './types';

/**
 * The rewarded "extra skip" is ONE per pick. Before the cap, GRANT_SKIP simply
 * refunded a skip, so the button came back the instant the refund was spent and
 * a player could watch rewarded ads forever on a single hex.
 */
const served = { question: { q: 'q', a: 'A' }, letter: 'A', cell: 0 } as unknown;

function stateWith(skipsUsed: number, bonusSkips: number): StoreState {
  return {
    ui: { served, skipsUsed, bonusSkips },
  } as unknown as StoreState;
}

describe('GRANT_SKIP (rewarded extra skip)', () => {
  it('refunds one skip and records the bonus', () => {
    const next = reducer(stateWith(1, 0), { type: 'GRANT_SKIP' });
    expect(next.ui.skipsUsed).toBe(0);
    expect(next.ui.bonusSkips).toBe(1);
  });

  it('refuses a second bonus on the same pick', () => {
    const spent = stateWith(1, 1);
    expect(reducer(spent, { type: 'GRANT_SKIP' })).toBe(spent);
  });

  it('does nothing when no skip has been taken yet', () => {
    const fresh = stateWith(0, 0);
    expect(reducer(fresh, { type: 'GRANT_SKIP' })).toBe(fresh);
  });
});
