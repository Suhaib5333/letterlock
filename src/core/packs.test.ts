import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import {
  ARABIC_ALPHABET,
  answerableLetters,
  answerMatches,
  bucketLetter,
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

  it('uses the Arabic alphabet for ar-locale packs', () => {
    const ar: QuestionPack = {
      ...PACK,
      locale: 'ar',
      letters: { 'ب': [{ id: 'ب-0', q: '', a: 'البحرين' }], 'م': [{ id: 'م-0', q: '', a: 'مصر' }] },
    };
    expect(answerableLetters(ar)).toEqual(['ب', 'م']);
  });
});

describe('Arabic support', () => {
  it('bucketLetter: ال article does not count, hamza forms unify to ا', () => {
    expect(bucketLetter('البحرين', 'ar')).toBe('ب');
    expect(bucketLetter('القاهرة', 'ar')).toBe('ق');
    expect(bucketLetter('أسد', 'ar')).toBe('ا');
    expect(bucketLetter('إسبانيا', 'ar')).toBe('ا');
    expect(bucketLetter('آسيا', 'ar')).toBe('ا');
    // hamza-initial word is NOT mistaken for an article-prefixed one
    expect(bucketLetter('ألمانيا', 'ar')).toBe('ا');
    expect(bucketLetter('مصر', 'ar')).toBe('م');
    expect(bucketLetter('Asia', 'en')).toBe('A');
    expect(bucketLetter('123', 'en')).toBeNull();
  });

  it('answerMatches: tashkeel, hamza forms, taa marbuta and ال never fail a correct guess', () => {
    const q = { id: 'x', q: '', a: 'القاهرة' };
    expect(answerMatches(q, 'قاهرة')).toBe(true);
    expect(answerMatches(q, 'القاهره')).toBe(true); // taa marbuta as haa
    expect(answerMatches(q, 'القَاهِرَة')).toBe(true); // with tashkeel
    expect(answerMatches(q, 'دمشق')).toBe(false);
    const q2 = { id: 'y', q: '', a: 'أبو بكر', alt: ['أبو بكر الصديق'] };
    expect(answerMatches(q2, 'ابو بكر')).toBe(true); // bare-alef hamza variant
    expect(answerMatches(q2, 'أبو بكر الصديق')).toBe(true);
  });

  it('placeLetters: 25-cell board draws 25 distinct Arabic letters, biasing the hardest out', () => {
    const ar: QuestionPack = {
      ...PACK,
      locale: 'ar',
      letters: Object.fromEntries(
        ARABIC_ALPHABET.map((l) => [l, [{ id: `${l}-0`, q: '', a: l }]]),
      ),
    };
    const letters = placeLetters(25, ar, mulberry32(5));
    expect(letters).toHaveLength(25);
    expect(new Set(letters).size).toBe(25);
    // the three hardest (ذ ض ظ) are biased off a 25-cell board
    expect(letters).not.toContain('ظ');
    expect(letters).not.toContain('ض');
    expect(letters).not.toContain('ذ');
  });
});
