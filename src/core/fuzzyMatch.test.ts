import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, levenshtein, normalizeAnswer } from './fuzzyMatch';

describe('normalizeAnswer', () => {
  it('lowercases, trims, strips punctuation/accents and articles', () => {
    expect(normalizeAnswer('  The Café! ')).toBe('cafe');
    expect(normalizeAnswer('U.S.A.')).toBe('u s a');
    expect(normalizeAnswer('Köln')).toBe('koln');
  });
});

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('abc', 'abc')).toBe(0);
    expect(levenshtein('', 'abc')).toBe(3);
  });
});

describe('isAnswerCorrect', () => {
  it('accepts exact + case/space/punctuation variants', () => {
    expect(isAnswerCorrect('quebec', 'Quebec')).toBe(true);
    expect(isAnswerCorrect('  QUEBEC ', 'Quebec')).toBe(true);
    expect(isAnswerCorrect('new york', 'New York')).toBe(true);
    expect(isAnswerCorrect('the louvre', 'Louvre')).toBe(true);
  });

  it('accepts small misspellings', () => {
    expect(isAnswerCorrect('Quebac', 'Quebec')).toBe(true); // 1 typo
    expect(isAnswerCorrect('Copenhagan', 'Copenhagen')).toBe(true);
    expect(isAnswerCorrect('Mississipi', 'Mississippi')).toBe(true);
  });

  it('accepts partial salient-word answers', () => {
    expect(isAnswerCorrect('Quebec City', 'Quebec')).toBe(true);
    expect(isAnswerCorrect('Mount Everest', 'Everest')).toBe(true);
  });

  it('rejects clearly wrong answers', () => {
    expect(isAnswerCorrect('Toronto', 'Quebec')).toBe(false);
    expect(isAnswerCorrect('Berlin', 'Copenhagen')).toBe(false);
    expect(isAnswerCorrect('', 'Quebec')).toBe(false);
    expect(isAnswerCorrect('cat', 'dog')).toBe(false);
  });
});
