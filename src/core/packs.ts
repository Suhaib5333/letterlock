import { shuffle, type Rng } from './rng';

export interface Question {
  id: string;
  q: string;
  a: string;
  difficulty?: number; // 1..5
  category?: string;
  alt?: string[]; // accepted alternative answers
  image?: string; // optional image URL (e.g. a flag/logo to identify)
  audio?: string; // optional audio clip URL (e.g. guess-the-song)
  artist?: string; // optional performing artist/band (e.g. guess-the-song) — shown on reveal
  video?: string; // optional video clip URL (e.g. guess-the-movie)
  youtube?: string; // optional YouTube id — embedded trailer (e.g. guess-the-movie)
  /** ISO 3166-1 alpha-2 code (lowercase). Renders the shared world map with
   *  this single country highlighted (see CountryMap component). */
  mapIso?: string;
}

export interface QuestionPack {
  id: string;
  name: string;
  description?: string;
  locale: string;
  difficulty: 'kids' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme';
  contentRating?: string;
  emoji?: string;
  accent?: string; // optional theme accent for the pack card
  group?: string; // category group for the browse menu (e.g. 'Movies & TV')
  hideBoardLetters?: boolean; // hide letters on the board (e.g. flags — no first-letter hint)
  letters: Record<string, Question[]>; // 'A'..'Z' -> questions whose answer starts with the letter
}

/** Authoring shape: ids are optional and assigned by {@link normalizePack}. */
export type RawQuestion = Omit<Question, 'id'> & { id?: string };
export type RawPack = Omit<QuestionPack, 'letters'> & {
  letters: Record<string, RawQuestion[]>;
};

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Ordering used to sort packs easiest → hardest in the selector. */
export const DIFFICULTY_RANK: Record<QuestionPack['difficulty'], number> = {
  kids: 0,
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
  extreme: 5,
};
/** Hardest starting letters — biased OUT of small boards so games stay answerable (plan §2.5). */
export const HARD_LETTERS = new Set(['X', 'Z', 'Q', 'J', 'K']);

/**
 * Letters ordered easiest → hardest by how readily an answer can start with them
 * (roughly initial-letter frequency). Used to bias the hardest letters off small
 * boards: we keep the easiest `cellCount` letters when the board can't fit all 26.
 */
const EASE_ORDER = 'SCPATBMDRFLHIEONGWUVYKJQXZ'.split('');
const EASE_RANK: Record<string, number> = {};
EASE_ORDER.forEach((l, i) => (EASE_RANK[l] = i));

/** Assign stable ids to any pack loaded from JSON/authored that omitted them. */
export function normalizePack(pack: RawPack | QuestionPack): QuestionPack {
  const letters: Record<string, Question[]> = {};
  for (const letter of Object.keys(pack.letters)) {
    letters[letter] = pack.letters[letter].map((q, i) => ({
      ...q,
      id: q.id || `${letter}-${i}`,
    }));
  }
  return { ...pack, letters };
}

export function letterCount(pack: QuestionPack, letter: string): number {
  return pack.letters[letter]?.length ?? 0;
}

/** Every question in the pack, flattened (used for global/letterless serving). */
export function allQuestions(pack: QuestionPack): Question[] {
  const out: Question[] = [];
  for (const letter of Object.keys(pack.letters)) out.push(...pack.letters[letter]);
  return out;
}

/** Every question id in the pack (used for the no-repeat cycle tracker). */
export function allQuestionIds(pack: QuestionPack): string[] {
  return allQuestions(pack).map((q) => q.id);
}

/** Total number of questions in the pack. */
export function totalQuestions(pack: QuestionPack): number {
  return allQuestions(pack).length;
}

/** Letters that actually have at least one question. */
export function answerableLetters(pack: QuestionPack): string[] {
  return ALPHABET.filter((l) => letterCount(pack, l) > 0);
}

/**
 * Place a letter on each board cell (plan §2.5).
 * - cells ≤ 26: distinct letters, optionally biasing the hardest ones out.
 * - cells > 26: letters repeat (perfectly fine — Blockbusters repeats too).
 */
export function placeLetters(
  cellCount: number,
  pack: QuestionPack,
  rng: Rng,
  biasOutHard = true,
): string[] {
  const available = answerableLetters(pack);
  if (available.length === 0) throw new Error('pack has no answerable letters');

  if (cellCount <= available.length) {
    let pool = available.slice();
    if (biasOutHard && available.length > cellCount) {
      // Keep the easiest `cellCount` letters; the hardest are dropped first.
      pool = available
        .slice()
        .sort((a, b) => (EASE_RANK[a] ?? 99) - (EASE_RANK[b] ?? 99))
        .slice(0, cellCount);
    }
    return shuffle(pool, rng).slice(0, cellCount);
  }

  // Board larger than the alphabet: repeat letters, evenly then shuffled.
  const out: string[] = [];
  let i = 0;
  const base = shuffle(available.slice(), rng);
  while (out.length < cellCount) {
    out.push(base[i % base.length]);
    i++;
  }
  return shuffle(out, rng);
}

export interface ServedQuestion {
  question: Question;
  letter: string;
}

/**
 * Serve a randomized, unused-first question for a letter (plan §3.2 / §6.4).
 * Falls back to the full pool (least-recently-used: oldest used first) when every
 * question for the letter has already been served — so we never run dry.
 */
export function serveQuestion(
  pack: QuestionPack,
  letter: string,
  usedIds: readonly string[],
  rng: Rng,
): ServedQuestion {
  const all = pack.letters[letter] ?? [];
  if (all.length === 0) {
    // Wildcard fallback: pull from any letter that has content.
    const fallbackLetter = answerableLetters(pack)[0];
    const pool = pack.letters[fallbackLetter];
    return { question: pool[Math.floor(rng() * pool.length)], letter: fallbackLetter };
  }
  const used = new Set(usedIds);
  const unused = all.filter((q) => !used.has(q.id));
  const pool = unused.length > 0 ? unused : all;
  return { question: pool[Math.floor(rng() * pool.length)], letter };
}

/** Loose answer matching: case/space/punctuation-insensitive, accepts alternatives. */
export function answerMatches(question: Question, guess: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '') // strip diacritics
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^(the|a|an)\s+/, '') // strip a single leading article
      .replace(/[^a-z0-9]/g, '');
  const g = norm(guess);
  if (!g) return false;
  const candidates = [question.a, ...(question.alt ?? [])].map(norm);
  return candidates.includes(g);
}
