import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import {
  answerableLetters,
  answerMatches,
  normalizePack,
  placeLetters,
  serveQuestion,
  type QuestionPack,
} from './packs';

const PACK: QuestionPack = {
  id: 'test',
  name: 'Test',
  locale: 'en',
  difficulty: 'medium',
  letters: {
    A: [
      { id: 'A-0', q: '', a: 'Asia' },
      { id: 'A-1', q: '', a: 'Apple', alt: ['Apples'] },
    ],
    B: [{ id: 'B-0', q: '', a: 'Brazil' }],
  },
};

describe('placeLetters', () => {
  it('places distinct letters when board ≤ alphabet', () => {
    const rng = mulberry32(1);
    const big: QuestionPack = {
      ...PACK,
      letters: Object.fromEntries(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => [l, [{ id: `${l}-0`, q: '', a: l }]]),
      ),
    };
    const letters = placeLetters(25, big, rng);
    expect(letters).toHaveLength(25);
    expect(new Set(letters).size).toBe(25); // all distinct
  });

  it('repeats letters when board > alphabet', () => {
    const rng = mulberry32(1);
    const big: QuestionPack = {
      ...PACK,
      letters: Object.fromEntries(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => [l, [{ id: `${l}-0`, q: '', a: l }]]),
      ),
    };
    const letters = placeLetters(49, big, rng);
    expect(letters).toHaveLength(49);
    expect(new Set(letters).size).toBeLessThanOrEqual(26);
  });

  it('is deterministic for a fixed seed', () => {
    const big: QuestionPack = {
      ...PACK,
      letters: Object.fromEntries(
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => [l, [{ id: `${l}-0`, q: '', a: l }]]),
      ),
    };
    expect(placeLetters(16, big, mulberry32(7))).toEqual(placeLetters(16, big, mulberry32(7)));
  });
});

describe('serveQuestion', () => {
  it('prefers unused questions', () => {
    const rng = mulberry32(3);
    const served = serveQuestion(PACK, 'A', ['A-0'], rng);
    expect(served.question.id).toBe('A-1');
  });

  it('falls back to the full pool once all are used', () => {
    const rng = mulberry32(3);
    const served = serveQuestion(PACK, 'A', ['A-0', 'A-1'], rng);
    expect(['A-0', 'A-1']).toContain(served.question.id);
  });

  it('wildcards to another letter when the requested one is empty', () => {
    const rng = mulberry32(3);
    const served = serveQuestion(PACK, 'Z', [], rng);
    expect(served.letter).not.toBe('Z');
  });
});

describe('answerMatches', () => {
  it('is case/space/article/punctuation insensitive', () => {
    const q = { id: 'A-0', q: '', a: 'The Amazon River' };
    expect(answerMatches(q, 'amazon river')).toBe(true);
    expect(answerMatches(q, '  THE   amazon-river ')).toBe(true);
    expect(answerMatches(q, 'nile')).toBe(false);
  });

  it('accepts listed alternatives', () => {
    expect(answerMatches(PACK.letters.A[1], 'apples')).toBe(true);
  });
});

describe('normalizePack', () => {
  it('assigns ids when missing', () => {
    const raw = {
      ...PACK,
      letters: { A: [{ q: 'x', a: 'Asia' } as never] },
    };
    const norm = normalizePack(raw);
    expect(norm.letters.A[0].id).toBe('A-0');
  });
});

describe('answerableLetters', () => {
  it('lists only letters with content', () => {
    expect(answerableLetters(PACK)).toEqual(['A', 'B']);
  });
});
