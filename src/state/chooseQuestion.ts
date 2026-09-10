/**
 * Pick the question to serve for a cell. Pure (no storage, no React), so the
 * no-repeat rules are unit-testable: the caller passes in the persistent
 * already-served set and the ids to avoid.
 *
 * Rules, in order of priority:
 *  1. Never re-serve something the host just SKIPPED. Skip means "give me a
 *     different one", so a skipped id is off the table for the rest of the game.
 *  2. Prefer a question unseen in this pack's current cross-game cycle.
 *  3. Then anything not already served in this game.
 *  4. Only if the pool has nothing left at all does it recycle, and even then it
 *     drops the avoided ids first.
 *
 * 🐛 Fixed 2026-09-10 (Suhaib): once a pack ran out of unseen questions, pressing
 * Skip served THE SAME question again, every time. Two causes, both here.
 * (a) The seed was built from `moveCount` + the used-set size, and a skip changes
 * neither (the engine records QuestionSkipped for an id QuestionServed had already
 * recorded), so the RNG drew the identical index from an identical pool.
 * (b) The last-resort branch fell back to the whole pool without excluding the
 * question being skipped. `avoid` now feeds the seed as well as the filters, so
 * two consecutive skips can never land on the same question.
 */
import type { NewMatchOptions } from '../core/match';
import type { GameState } from '../core/models';
import { allQuestions, type Question, type QuestionPack } from '../core/packs';
import { mulberry32 } from '../core/rng';

const NO_IDS: ReadonlySet<string> = new Set<string>();

export function chooseQuestion(
  opts: NewMatchOptions,
  game: GameState,
  cell: number,
  /** Ids already served for this pack in the current cross-game cycle. */
  persistentlyUsed: ReadonlySet<string> = NO_IDS,
  /** Ids the host skipped in this game: never serve these again if avoidable. */
  avoid: ReadonlySet<string> = NO_IDS,
): { question: Question; letter: string; repeated: boolean } {
  const pack = opts.pack as QuestionPack;
  const global = !!pack.hideBoardLetters;

  // Candidate pool: whole pack for letterless packs, else this cell's letter.
  let letter = game.letters[cell];
  let pool: Question[] = global ? allQuestions(pack) : pack.letters[letter] ?? [];
  if (pool.length === 0) pool = allQuestions(pack); // wildcard fallback

  // Ids already served — this game (avoid same-game dupes) + persistent cycle.
  const gameUsed = new Set<string>();
  if (global) {
    for (const ids of Object.values(game.usedQuestions)) for (const id of ids) gameUsed.add(id);
  } else {
    for (const id of game.usedQuestions[letter] ?? []) gameUsed.add(id);
  }

  // `avoid.size` is in the seed on purpose: it is the one input that changes on
  // every skip, so the draw moves even when the pool and move count do not.
  const seed = (opts.seed + cell * 131 + game.moveCount * 977 + gameUsed.size * 7919 + avoid.size * 7717) >>> 0;
  const rng = mulberry32(seed);

  const wanted = pool.filter((q) => !avoid.has(q.id));
  const unseen = wanted.filter((q) => !persistentlyUsed.has(q.id) && !gameUsed.has(q.id));
  let chosen: Question;
  let repeated: boolean;
  if (unseen.length > 0) {
    chosen = unseen[Math.floor(rng() * unseen.length)];
    repeated = false;
  } else {
    const fresh = wanted.filter((q) => !gameUsed.has(q.id));
    // Cascade: unused-this-game → anything not skipped → the raw pool. The last
    // step only ever bites when the pack is smaller than one game's worth of
    // questions and every single one has been skipped.
    const fallback = fresh.length > 0 ? fresh : wanted.length > 0 ? wanted : pool;
    chosen = fallback[Math.floor(rng() * fallback.length)];
    repeated = true;
  }
  // Event letter: for letterless packs use the answer's own first letter so the
  // move log + usedQuestions stay consistent; otherwise the board cell's letter.
  if (global) letter = chosen.a.trim()[0]?.toUpperCase() || 'A';
  return { question: chosen, letter, repeated };
}

/** Every question the host skipped so far, from the append-only log. */
export function skippedIds(log: readonly { type: string; questionId?: string }[]): Set<string> {
  const out = new Set<string>();
  for (const e of log) if (e.type === 'QuestionSkipped' && e.questionId) out.add(e.questionId);
  return out;
}
