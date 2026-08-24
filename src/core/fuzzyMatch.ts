/**
 * Lenient answer matching for Online Mode auto-grading. A typed answer counts as
 * correct if it's "close enough" to the expected answer — ignoring case, spaces,
 * punctuation, accents, a leading article, and small spelling slips. This drives
 * the auto-award countdown; the host can always override with the undo button.
 */

import { normalizeArabic } from './packs';

/** Normalise for comparison: lowercase, strip accents/punctuation, drop a leading
 *  article ("the/a/an", Arabic "ال"), collapse whitespace. Arabic letters survive
 *  the punctuation strip and are unified (tashkeel, hamza forms, taa marbuta) so
 *  ar-locale packs auto-grade at all. */
export function normalizeAnswer(s: string): string {
  return normalizeArabic(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics (café → cafe)
    .toLowerCase()
    .replace(/[^a-z0-9ء-ي\s]/g, ' ') // punctuation → space (Arabic block kept)
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(the|a|an)\s+/, '') // ignore a LEADING article only
    .replace(/^ال(?=[ء-ي]{2,})/, ''); // ...and the Arabic definite article
}

/** Levenshtein edit distance (iterative, O(m·n)). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[b.length];
}

/**
 * True if `guess` should be auto-accepted as `answer`.
 *  - exact (normalised) match, or
 *  - within a length-scaled edit distance (1 slip for short words, more for long), or
 *  - the guess's significant token covers the answer (e.g. answer "Quebec",
 *    guess "Quebec City"; or answer "United States", guess "united states of america").
 */
export function isAnswerCorrect(guess: string, answer: string): boolean {
  const g = normalizeAnswer(guess);
  const a = normalizeAnswer(answer);
  if (!g || !a) return false;
  if (g === a) return true;

  // Whole-string fuzzy: allow ~1 edit per 5 chars (min 1, cap 4).
  const tol = Math.min(4, Math.max(1, Math.floor(a.length / 5)));
  if (levenshtein(g, a) <= tol) return true;

  // Token coverage: every word of the shorter side appears (fuzzily) in the other,
  // so partial-but-clearly-right answers pass ("quebec" ≈ "quebec city").
  const ga = g.split(' ').filter(Boolean);
  const aa = a.split(' ').filter(Boolean);
  const [short, long] = ga.length <= aa.length ? [ga, aa] : [aa, ga];
  if (short.length === 0) return false;
  const everyShortWordFound = short.every((w) =>
    long.some((lw) => lw === w || levenshtein(w, lw) <= Math.min(2, Math.max(1, Math.floor(w.length / 4)))),
  );
  // Only accept token-coverage when the answer is a single salient word, to avoid
  // over-accepting (e.g. answer "Quebec" matched by guess containing "quebec").
  if (everyShortWordFound && (aa.length === 1 || ga.length === 1)) return true;

  return false;
}
