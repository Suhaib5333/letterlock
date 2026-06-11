# ✍️ Letterlock — Question Authoring Rules

> The single source of truth for writing trivia questions. Every rule here is
> **enforced by `src/content/content.test.ts`** — if you break one, the build fails.
> Read this before adding or editing any pack.

## The core mechanic

A board hex shows a **letter**; a team must give an answer that **starts with that
letter**. So the **first letter of the answer is everything**.

You do **not** need to file a question under the right letter manually —
`rebucketByAnswer` in `src/content/index.ts` re-keys every question by the first
letter of its `a` (answer) automatically, and de-duplicates. So just write the
**natural, correct answer** and the engine files it correctly.

## Data shape

```ts
import type { RawPack } from '../core/packs';

export const myPack: RawPack = {
  id: 'unique-kebab-id',
  name: 'Display Name',
  description: 'One short sentence.',
  locale: 'en',
  difficulty: 'kids' | 'easy' | 'medium' | 'hard' | 'expert' | 'extreme',
  contentRating: 'everyone',
  emoji: '🎬',
  accent: '#e11d48',          // optional card accent
  hideBoardLetters: true,      // OPTIONAL — set for image/audio/charade packs (see below)
  letters: {
    A: [
      { q: 'The clue, phrased so it never contains the answer.', a: 'Argentina', category: 'sports', difficulty: 2 },
    ],
    // ...
  },
};
```

A question is `{ q, a, category?, difficulty?, alt?, image?, audio?, video? }`.
- `alt`: accepted alternative answers (lowercased match).
- `image` / `audio` / `video`: media URL shown on the card.

## THE RULES (all test-enforced)

### 1. The answer must start with a letter A–Z
`a` must begin with an alphabetic character. `"3 sets"` ❌ → `"Three sets"` ✅.

### 2. The answer must NEVER appear in the question — this is the #1 failure
- **Single-word answer:** that word must not appear anywhere in `q`.
  - ❌ `q: 'France's capital city', a: 'Paris'` — wait, that's fine (Paris not in q).
  - ❌ `q: 'The Eiffel Tower stands in Paris', a: 'Paris'` — "Paris" leaks.
- **Multi-word answer:** neither the **whole phrase** nor any **distinctive word**
  (≥4 letters, not a generic head-noun) may appear in `q`.
  - ❌ `q: 'The Tour de France cycling race', a: 'Tour de France'`
  - ✅ `q: 'The three-week stage race held each July, cycling's most prestigious event.', a: 'Tour de France'`
- **Generic head-nouns are allowed to repeat** (ocean, war, planet, film, league,
  king, etc. — see the `GENERIC` set in `content.test.ts`). Only the *distinctive*
  word leaking is a bug. `q: 'The largest ocean on Earth', a: 'Pacific Ocean'` ✅
  ("ocean" is generic; "Pacific" is the distinctive word and is absent).

### 3. No clue-restatement / sentence answers
The answer is a **clean noun or name**, never a sentence that restates the clue.
Banned substrings in `a`: `capital is`, `capital of`, `'s capital`, `begins with`,
`the country whose…`, and the possessive-is pattern `X's … is …`.
- ❌ `a: "Ukraine's capital is Kyiv"` → ✅ `a: "Kyiv"` (clue: "The capital of Ukraine.")
- ❌ `a: "Old Heraclitus"` → ✅ `a: "Heraclitus"`

### 4. No duplicate question text within a letter
Don't repeat the same `q` string. Vary phrasing.

### 5. A pack must cover ≥16 distinct starting letters to be playable
Spread answers across the alphabet. (The two fully-covered packs — General
Knowledge and Kids — must cover **all 26**.)

## Style guide (quality, not just passing tests)

- **One clean fact per question.** No two-part / compound clues ("X and also Y").
- **Phrase as a definition or "who/what" clue**, varied: definition, who-am-I,
  fill-in-the-blank, "the X that…". Avoid every question starting "The…".
- **Be factually accurate.** Double-check names, dates, places.
- **Match the pack's difficulty.** Don't slip expert facts into an easy pack.
- **Culturally neutral** unless the pack is explicitly regional.
- **Natural answers only.** Write the answer a person would actually say
  ("Michael Jackson", never "Jackson, Michael" or "The singer Michael Jackson").
- **Make the first letter land on something answerable.** Avoid forcing answers
  onto X/Z/Q just to fill a bucket; the engine biases those off small boards anyway.

## Letterless packs (`hideBoardLetters: true`)

For packs where the clue is an **image, audio clip, or charade** (flags, logos,
"guess the song", melodies, charades), set `hideBoardLetters: true`. The board
shows no letters and tiles are **not pinned to a letter** — any tile can serve any
question. The card prompt should be generic ("Name this flag", "Act this out").
Answers still must start with a real letter (used for nothing on the board, but
keeps validation/serving consistent).

## Where files live & how they're wired

- One pack (or one expansion batch) per file in `src/content/`.
- Register packs in `src/content/index.ts` (the `PACKS` array, sorted by
  `DIFFICULTY_RANK`). Expansions merge into a base pack via `withExtra(...)`.
- After editing content: `npx vitest run src/content` must stay green.
