import { describe, expect, it } from 'vitest';
import { chooseQuestion, skippedIds } from './chooseQuestion';
import type { NewMatchOptions } from '../core/match';
import type { GameState } from '../core/models';
import type { QuestionPack } from '../core/packs';

/**
 * The reported bug: on a pack whose questions have all been served, pressing Skip
 * served the SAME question again, every time. These tests drive the chooser the
 * way the reducer does (skip -> the skipped id joins `avoid` -> choose again) and
 * fail on the old implementation.
 */
function pack(n: number, letterless: boolean): QuestionPack {
  const qs = Array.from({ length: n }, (_, i) => ({ id: `q${i}`, q: `Question ${i}?`, a: `Answer ${i}` }));
  return {
    id: 'test-pack',
    name: 'Test',
    locale: 'en',
    difficulty: 'medium',
    contentRating: 'everyone',
    hideBoardLetters: letterless,
    letters: letterless ? { A: qs } : { A: qs },
  } as unknown as QuestionPack;
}

function opts(p: QuestionPack): NewMatchOptions {
  return { pack: p, seed: 12345 } as unknown as NewMatchOptions;
}

function game(used: string[], letterless: boolean): GameState {
  return {
    letters: Array.from({ length: 25 }, () => 'A'),
    usedQuestions: { A: used },
    moveCount: 4,
    hideBoardLetters: letterless,
  } as unknown as GameState;
}

describe('chooseQuestion', () => {
  it('serves an unseen question when the cycle still has one', () => {
    const p = pack(8, false);
    const got = chooseQuestion(opts(p), game(['q0', 'q1'], false), 3, new Set(['q0', 'q1']));
    expect(got.repeated).toBe(false);
    expect(['q0', 'q1']).not.toContain(got.question.id);
  });

  it('never re-serves the question that was just skipped', () => {
    const p = pack(6, false);
    // Everything has been served this cycle AND this game: the forced-repeat path.
    const allIds = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'];
    const first = chooseQuestion(opts(p), game(allIds, false), 3, new Set(allIds));
    expect(first.repeated).toBe(true);

    const skipped = new Set([first.question.id]);
    const second = chooseQuestion(opts(p), game(allIds, false), 3, new Set(allIds), skipped);
    expect(second.question.id).not.toBe(first.question.id);
  });

  it('keeps giving something different across a run of skips', () => {
    const p = pack(6, false);
    const allIds = ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'];
    const used = new Set(allIds);
    const skipped = new Set<string>();
    let current = chooseQuestion(opts(p), game(allIds, false), 3, used);
    for (let i = 0; i < 5; i++) {
      skipped.add(current.question.id);
      const next = chooseQuestion(opts(p), game(allIds, false), 3, used, skipped);
      expect(skipped.has(next.question.id)).toBe(false); // never a repeat of anything skipped
      current = next;
    }
    expect(skipped.size).toBe(5);
  });

  it('holds for a letterless pack smaller than one game (the melodies case)', () => {
    // 4 questions, every one already served this game: the branch that used to
    // fall back to the raw pool with an unchanged seed.
    const p = pack(4, true);
    const allIds = ['q0', 'q1', 'q2', 'q3'];
    const used = new Set(allIds);
    const first = chooseQuestion(opts(p), game(allIds, true), 7, used);
    const second = chooseQuestion(opts(p), game(allIds, true), 7, used, new Set([first.question.id]));
    expect(second.question.id).not.toBe(first.question.id);
  });

  it('still returns a question when literally everything has been skipped', () => {
    const p = pack(3, false);
    const allIds = ['q0', 'q1', 'q2'];
    const got = chooseQuestion(opts(p), game(allIds, false), 1, new Set(allIds), new Set(allIds));
    expect(allIds).toContain(got.question.id); // a card, never a crash or a blank
    expect(got.repeated).toBe(true);
  });

  it('reads the skipped ids out of the move log', () => {
    const log = [
      { type: 'QuestionServed', questionId: 'q1' },
      { type: 'QuestionSkipped', questionId: 'q1' },
      { type: 'QuestionServed', questionId: 'q2' },
      { type: 'QuestionSkipped', questionId: 'q2' },
      { type: 'HexClaimed' },
    ];
    expect([...skippedIds(log)]).toEqual(['q1', 'q2']);
  });
});
