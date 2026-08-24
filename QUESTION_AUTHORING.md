# ✍️ Letterlock — Question Authoring Rules

> The single source of truth for writing trivia questions. Every rule here is
> **enforced by `src/content/content.test.ts`** — if you break one, the build fails.
> Read this before adding or editing any pack. For **where** the pack lives in
> the home-screen browser (groupings, tier collapsing, naming conventions),
> see [`CATEGORIES.md`](./CATEGORIES.md).

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
Knowledge and Kids — must cover **all 26**.) Every letter in the pack should
also have **≥5 questions** so a board hex never lands on a near-empty bucket
(top up genuinely scarce hard letters via a `*Gaps.ts` companion).

### 5b. Every pack ships with ≥200 questions
The pack lineup target is **at least 200 questions per pack**. Two source-
capped exceptions: the **World Flags** trio and the **World Maps** trio —
only ~195 countries exist, so each tier ends up smaller and the three tiers
collectively cover the entire source. For any new pack outside those two
families: author at least 210 in the source file, then top up via `*Extra.ts`
until the merged total clears 200. The shipping audit
(`npx vite-node scripts/audit_letters.mjs`) and `npm test` content suite
together flag anything that falls below the floor.

### 6. Answers must be the SPECIFIC named entity, never a generic category
If the clue describes **one particular thing**, the answer must name *that thing*,
not the category it belongs to. A generic answer is wrong because many things fit it.
- ❌ `a: 'Causeway'` for "the crossing linking Bahrain to Saudi Arabia" → ✅ `a: 'King Fahd Causeway'`
- ❌ `a: 'Roundabout'` for the 2011 Manama monument → ✅ `a: 'Pearl Roundabout'`
- ❌ `a: 'Tower'`, `a: 'Mosque'`, `a: 'Airport'`, `a: 'Museum'` when a *named* one is meant
  → ✅ `'Burj Khalifa'`, `'Al-Fateh Grand Mosque'`, `'Bahrain International Airport'`, `'Louvre Abu Dhabi'`
- ❌ contrived number/word padding like `a: 'Number six'` → ✅ `a: 'Six'` (just the clean word)
Keep the **distinctive part of the name out of the clue** (rule 2 still applies), e.g.
clue "named for a Saudi monarch" + answer "King Fahd Causeway" is fine ("King Fahd" isn't in the clue).

### 7. Be factually exact, especially dates/places
Double-check specifics. (e.g. Bahrain declared **independence on 15 Aug 1971**; its
**National Day is 16 Dec** — don't conflate them. The UAE federation was **2 Dec 1971**.)

### 8. Write names in natural spoken order — and spell out digit/symbol-led names
"Albert Einstein", **never** "Einstein, Albert" (index-card order reads as a database
entry *and* mis-files the question under the surname's letter). For names that start with
a digit or symbol, use the spoken form as `a` and put the literal in `alt`:
"Fifty Cent" (alt `50 cent`), "Pink" (alt `p!nk`). **Test-enforced** (no "Surname, First").

### 9. No contrived padding answers
Don't force a word onto a letter with a roundabout clue or an invented term. Define the
word for what it actually is.
- ❌ "the number of legs on an octopus" → `Octet`; ❌ `Aurea ratio`, `Metaphysical forms`,
  `Number six`, `Tiger elephant` (not a real thing). ✅ a genuine definition + the real name.

### 10. Verify type & self-consistency of compound clues
- **Type match:** a clue that opens "Director of…/Composer of…" must answer the *person*;
  "X's 1994 film…" or a plot description must answer the *work*. Don't pair a "director of…"
  clue with a film-title answer.
- **Self-consistency:** every sub-fact in a clue must be true and non-contradictory — don't
  call a player "German… the Polish striker", or claim a coach won a trophy he didn't.
  One verified fact beats two unverified ones.

### 11. No same-stem giveaways (beyond the exact-word leak test)
Rule 2's test only catches the exact answer words. Also avoid a *different* word that shares
the answer's distinctive **root/stem**: ❌ clue "founded by **Constantine**" → `Constantinople`;
❌ "the **Newton**ian era" → `Isaac Newton`. Use a periphrasis ("the emperor it's named after").

### 12. Keep facts current, and don't repeat a superlative across the pack
Rankings/records drift — verify against today (most populous country = **India**; planet with
most moons = **Saturn**; largest rough-diamond producer = **Russia**). Prefer timeless framings
("by some measures", definitional). And don't let two questions both claim the same superlative
(largest/hottest/tallest) — pick one canonical holder.

### 13. Duplicates span a pack AND its expansion files
A base pack and its `withExtra(...)` files (e.g. `kids.ts` + `kids2.ts`) merge into ONE pack;
identical `q` strings across them are silently de-duplicated at runtime (wasting a question).
When authoring an expansion, check new clues against the base file too — write fresh phrasings.

### 14. Media / image-by-identifier packs (flags, logos, songs, melodies)
These render an asset by an external identifier, so the answer and the identifier are
**two facts that must agree** — a wrong id silently shows the wrong asset (no test catches it).
- **Flags** (`flagcdn.com/<iso2>`): the code must be the country's real ISO 3166-1 alpha-2.
  Watch look-alikes: Congo `cg` vs DR Congo `cd`; Niger `ne` vs Nigeria `ng`;
  Guinea `gn` vs Equatorial Guinea `gq` vs Guinea-Bissau `gw`.
- **Logos** (`cdn.simpleicons.org/<slug>`): the slug = the *Simple Icons brand title*
  (lowercased, punctuation/spaces stripped, `.`→`dot`, `&`→`and`). A generic-looking slug
  is often a specific product — `rocket` = **WP Rocket**, `origin` = EA's Origin,
  `delta` = the airline. Set `a` to that exact brand; everyday name → `alt`.
- **Songs / melodies** (audio clips): no two entries share the same clip URL, and no `a`
  title repeats (runtime de-dupe silently drops the second). `a` = clean Title-Case title
  (keep official stylisation: "HUMBLE.", "Señorita"); `alt` carries the **performing artist**.
- **Dedupe globally** across the base file and every `*Extra` expansion — each country /
  brand / song should appear exactly once.
- These packs set `hideBoardLetters: true`; tiles are **not** pinned to a letter — any hex
  serves a random item of any starting letter (verified: `scripts/verify_flags.mjs`).

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

### Charade-specific rules

In a charade pack `q` is a **fixed acting instruction** (e.g. "Act this out — no
talking!") and `a` is the **thing to mime** — a generic word or short phrase is
*correct* here (it is NOT a rule-6 "generic category" violation, because there is
no clue describing one specific thing). Additional rules for charade answers:

- **The answer must be a real, correctly-spelled, recognisable thing** a team could
  reasonably *guess* — a concrete object, animal, action, profession, emotion,
  concept, or a **genuine, well-known movie/TV title**. No invented/padded terms
  ("Volcano eruption", "Cricket bug", "Jellyfish bloom", "Lobster trap" → use the
  real single word: "Vase", "Cicada", "Jay", "Labrador"), and nothing so obscure the
  guesser can't know it.
- **No duplicate answer across the whole charade family.** The charade packs span
  six source files (`charades.ts`, `charadesExtra.ts`, `charades2a/2b.ts`,
  `charades3.ts`, `charadesMovies2.ts`); the same word in two different themed packs
  (Easy / Animals / Actions / Hard / Movies) still counts as a duplicate — keep one,
  and file each word in its best-fit pack (animals → Animals, verbs/sports → Actions,
  everyday objects/simple mimes → Easy). `rebucketByAnswer` only de-dupes the *exact*
  `q|a` pair *within one merged pack*, so it will NOT catch a same-answer/different-
  instruction or cross-pack repeat — author these out by hand.
- **Movie/TV titles must be real and broadly known.** Prefer the canonical English
  title ("The Matrix", not "Matrix"; avoid foreign-release names like "Vaiana" for
  "Moana"). The board key letter is ignored (titles rebucket by the title's first
  letter), so a title placed under the "wrong" object key still files correctly — but
  keep it tidy.

## 🎬 Media-clip packs (audio / video / image) — special rules

Clip packs (`hideBoardLetters: true`) ask players to name a thing from a **clip** or
**image** instead of a letter. They have extra hard rules so a clip never gives the
answer away and never strands the game:

1. **The clip/image must NOT reveal the answer.** No title text, no thumbnail with the
   name, no caption, no on-screen logo that spells it out. This is why **YouTube embeds
   are banned** — a YouTube iframe always exposes the video title, the poster thumbnail,
   an end-screen, and a click-through to youtube.com, and there is *no* way to fully hide
   them (especially in fullscreen). Use sources whose media is *raw* (no title overlay):
   - ✅ **iTunes `entity=tvEpisode` preview clips** (`.m4v`) — real footage, no title,
     plays in the native `<video>` (which supports **safe fullscreen**). Matched by
     `artistName` = show. (Movie clips have **no** safe source — iTunes' movie API is
     dead and YouTube is banned — so movie *content* lives in the trivia packs instead.)
   - ✅ iTunes `entity=song` previews (`.m4a`) for audio.
   - ✅ Bundled flag SVGs / Simple-Icons logos / synthesized melodies.
2. **Use the native `<audio>`/`<video controls>`** — they support fullscreen and have no
   spoiler chrome. Don't embed third-party iframes for clips.
3. **Every clip element must have an `onError`** → the game **auto-advances** to another
   question (`AUTO_SKIP`, capped 12/pick) and Skip stays enabled. Verify reachability with
   `npx vite-node scripts/checkmedia.mjs` (clip packs must be **0 dead**).
4. **The answer timer starts on the clip's first play** (audio/video), not when the
   question is served — so watching/listening isn't on the clock. (Image clips start
   immediately.) Handled by `onMediaPlay` → `timerActive` in `Game.tsx`.
5. **Question text is generic** ("Watch the clip — name the TV show.") — never name or
   hint the answer in the prompt.

## Where files live & how they're wired

- One pack (or one expansion batch) per file in `src/content/`.
- Register packs in `src/content/index.ts` (the `PACKS` array, sorted by
  `DIFFICULTY_RANK`). Expansions merge into a base pack via `withExtra(...)`.
- After editing content: `npx vitest run src/content` must stay green.

## 🕌 Arabic packs (locale: 'ar') — special rules

Arabic packs put the **28 Arabic letters on the board** and run fully RTL. Extra rules:

1. **Letter filing follows quiz convention (سين جيم / حروف):** the definite article
   "ال" does NOT count — "البحرين" plays under **ب**. Hamza forms (أ إ آ) all count
   as **ا**. Filing is done by `bucketLetter(answer, 'ar')` in `core/packs.ts`; the
   loader rebuckets automatically, and the content tests verify with the same function.
   NOTE: the article check runs on RAW text (bare alef + lam) so hamza-initial words
   like "ألمانيا" correctly file under ا, not م.
2. **Modern Standard Arabic (فصحى), no tashkeel.** Answers 1-3 words. Dialect
   variants go in `alt`, not in `a`.
3. **Answer matching** (`answerMatches`) is Arabic-aware: tashkeel, hamza variants,
   ة/ه, ى/ي and a leading "ال" never fail a correct guess.
4. **Coverage:** ≥18 letters (the playability test needs ≥16). Rare letters
   (ث ذ ض ظ ز غ) may be thin or skipped — `placeLetters` biases them off small boards
   via the Arabic ease order in `core/packs.ts`.
5. **Group:** ids start with `ar-` → the "عربي" browse group. Tier siblings share the
   stem (`ar-seen-jeem-easy/-medium/-hard` collapse into one card).
6. **UI:** question + answer render with `dir="auto"` (RTL automatic); Arabic glyphs
   come from the Tajawal font (in the Google Fonts link + font stacks).
