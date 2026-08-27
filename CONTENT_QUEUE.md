# 📚 Content pipeline and pack queue (living doc, resume from here)

> **Purpose:** if a session ends or context is cleared, this file alone is enough to
> continue authoring packs at full quality. Update the counters and the queue table
> every wave.

## 🔢 Where we are (update every wave)

| Metric | Value | Updated |
|---|---|---|
| Packs shipped | **182** | 2026-08-27 |
| Questions shipped | **40,159** | 2026-08-27 |
| Arabic packs | 51 | 2026-08-27 |
| Packs fact-audited | 55 | 2026-08-27 |
| Target for this programme | 60 new packs (30 EN + 30 AR) | |
| Done toward target | 51 | |
| Left toward target | **see viability finding below** | |

`node scripts/packstats.mjs` prints the live per-group counts, the total, and any
pack under 200 questions.

## 🏭 The pipeline that works (do not deviate)

1. **Author with Opus.** One agent writes 2 packs. Inline the full spec in the prompt;
   tell the agent NOT to read other content files (they are huge and cost a fortune).
2. **The agent self-verifies before it may report.** It must run
   `node scripts/checkpack.mjs src/content/<file>.ts` and keep fixing until the output
   reads `LEAKS: 0`, `duplicates: 0`, `misfiled: 0` and 210+ questions. This removes
   the leak round trip that used to cost hundreds of thousands of tokens.
3. **Register:** `node scripts/autoregister.mjs` (skips merge-only intermediates and
   half-written files). Then `npx tsc -b --noEmit`.
4. **Scan for duplicate letter keys.** JavaScript keeps only the LAST duplicate key, so a
   repeated `D:` silently deletes questions AND hides them from the leak check:
   `grep -oE "^    [A-Z]: \[" src/content/<file>.ts | sort | uniq -d`
   (Arabic: `grep -oE "^    [ء-ي]: \[" ...`)
5. **Fact-audit with a SEPARATE Sonnet agent**, about 14 sampled questions per pack
   spread across the whole file, judged WRONG / INVENTED / VAGUE / OK. Fix what it
   flags. **A pack does not ship without this step.**
6. **Verify:** `npx vitest run` · `npm run build` · `node scripts/noscroll.mjs` ·
   `npx playwright test`.
7. **Commit and push.** No AI attribution, no em dashes.

### ☠️ The lesson that cost ~1M tokens
Ten packs authored by Haiku passed every scriptable gate and were **60-100% factually
wrong or invented** (Houston hosting the 1992 Olympics, Comme des Garcons being Belgian,
ARAMCO being an airline, made-up words like "Quay-haul"). All ten were deleted. The same
topics authored by Opus audited at 0-5% bad. **Authoring trivia is a knowledge task, not
a formatting task. Never author content with a cheap model.**

## 🧰 Scripts

| Script | Use |
|---|---|
| `scripts/checkpack.mjs <file>` | Validate ONE unregistered pack: count, letter coverage, duplicate answers, misfiled answers, every leak. Exit 0 only when clean |
| `scripts/autoregister.mjs` | Import + register any `<name>Pack: RawPack` missing from `src/content/index.ts` |
| `scripts/leaks.mjs [id]` | Print every answer that leaks into its own question, repo-wide or per pack |
| `scripts/dropleaks.mjs <files>` | Delete leaking and duplicate-answer questions; refuses if the pack would fall under 200 (`MIN=` overrides) |
| `scripts/packstats.mjs` | Per-group pack counts, totals, anything under 200 |
| `scripts/checksettings.mjs` | Settings modal must fit one screen on 15 viewports (`SCALE=xlarge` too) |
| `scripts/noscroll.mjs` | Whole app, 17 devices, every screen (`PACK=`, `SCALE=`, `BASE=`) |

## 📝 Authoring spec (copy into every agent prompt)

- `210+` question objects; `20+` letters with `4+` each; each letter key **exactly once**.
- Answer starts with its bucket letter. **Arabic: the article ال does NOT count**, so
  البقرة files under ب and القيروان under ق; hamza forms أ إ آ all file under ا.
- **No word from the answer may appear in its question**, in any form (article ignored).
- One clear factual sentence. No two-part questions.
- Answers 1-3 words, real things. No invented terms, no generic filler.
- No duplicate answers in a file. Escape `\'`. ASCII quotes. No em dashes.
- Arabic packs: MSA, **no tashkeel**, `locale: 'ar'`.
- File shape: `import type { RawPack } from '../core/packs';` then
  `export const <name>Pack: RawPack = { id, name, description, locale, difficulty,
  contentRating, emoji, accent, letters: { <letter>: [ { q, a } ] } };`

## 🗂️ Queue

### 🔄 In flight

Nothing in flight. Everything authored so far is registered, audited and pushed.

**Done in waves 2-5** (all audited, all 210+ questions). English: Olympics, Pets, Money &
Economics, Comics & Graphic Novels, Trains & Ships, Fashion & Designers, Famous Firsts,
Travel & Airlines, Board Games & Puzzles, Festivals & Holidays. Arabic: اقتصاد وعملات،
البحر والملاحة، نباتات وزراعة، جغرافيا الخليج، طب وصحة، رياضيات وأرقام، فنون وعمارة إسلامية،
تاريخ عالمي، قرآن وسور، مسلسلات ودراما عربية، مصر، بلاد الشام، المغرب العربي، فلسطين والقدس،
حيوانات الصحراء، صناعات وحرف تقليدية، صحافة وإعلام، سيارات ومواصلات.

### ✅ Wave 6 (2026-08-27) — 21 packs shipped

**English (15, all 210+, 0 leaks, 0 misfiled):** Dinosaurs (212), Ocean & Sailing (212),
Photography (215), Chess (212), Volcanoes & Earthquakes (213), Rivers Lakes & Waterfalls
(212), Castles & Fortresses (213), Great Engineering (220, covers the queue's Bridges &
Tunnels), Predators & Prey (212, covers Cats of the Wild), Dance & Ballet (211), Robots &
AI (211), Codes Ciphers & Spies (219, covers Cryptography), Nobel Prizes (210), Wine
Coffee & Tea (216), Cycling (210).

**Arabic (6, all 210+):** مدن العالم (213), مأكولات عالمية (258), مهن وأعمال (210),
سفر ومواصلات (210), البيت والأدوات (212), مناخ وطبيعة (210).

### ☠️ The finding of this wave: TOPIC WIDTH, not effort, is the binding constraint

A pack needs ~210 answers spread over 26 (EN) or 28 (AR) letter buckets. **A narrow topic
cannot supply them, no matter how well it is authored.** The diagnostic is the
`checkpack.mjs` misfiled count: if a first draft shows 30-80 answers filed under the wrong
letter, the author was reaching for on-topic items that do not start with the needed letter,
i.e. the topic is out of answers. Two packs were **written and then deleted** for this:

- **Toys & Playthings** (EN): 52 of 187 answers could not file under their own letter —
  toy names cluster on B/L/M (Lego, Barbie, Mattel…). Its intent is already covered by the
  existing Board Games & Puzzles and Video Games packs.
- **طيور ومحميات** (AR): 203 questions but 64 leaks and 11 misfiles; bird names in Arabic
  cluster on ب/ح/ن/ط, and abstract fillers (لحم، ليل، ماء) leak into their own clues.

**What DOES work at 210:**
- EN: a topic where *proper names* spread across the alphabet (riders, laureates, cities,
  dishes), or a whole engineering/scientific vocabulary. Cycling only cleared 210 once it
  was rebuilt around rider surnames (Anquetil→Zoetemelk).
- AR: only **broad everyday-vocabulary domains** — food, home, jobs, travel, climate,
  cities. Those six are now done. Every remaining Arabic topic tried (أعياد، ألعاب،
  كرتون، أبطال، حيوانات بحرية، مدرسة، ألبسة) tops out at **110-170 real answers**; going
  further means padding, which this doc already forbids. **Do not start them.**

### 🔧 Two Arabic-specific authoring rules learned the hard way

1. **Never write a clue as «الـ+answer الذي…»** — the leak checker strips ال, so
   «اللون الذي يميز ريش الغراب» + answer «لون أسود» is a leak. Describe, never name.
2. **Prefer single-word answers.** Compound answers («X الماء», «Y الباب») almost always
   leak, because the clue has to mention the common noun. 60 of the 64 leaks in the
   deleted birds pack were of this shape.

### 📐 The distribution that reaches 210 in one pass (Arabic)

Skew hard, do not spread evenly — this is how the existing arFood (228) is built:
ب/م ≈ 18-21 · ك/س/ش/ت/ف/ح/ق ≈ 10-16 · most others 5-9 · ث/ذ/ض/ظ ≈ 2-3.
Even spreading (8 per letter) always lands ~180 and then needs two top-up rounds.

### ⏳ Not started (deliberately, with reasons)

- **English, viable but not attempted:** Architecture Styles (overlaps the shipped
  Architecture & Landmarks), Motorsport Legends (overlaps Cars & Motorsport), Trains of
  the World (overlaps Trains & Ships), Currencies & Flags of Asia (overlaps Flags + Money).
- **English, tried and judged too narrow for 210:** Toys & Lego (deleted), Airports,
  Islands, Waterfalls, Coral Reefs, Shipwrecks, Deserts & Rivers (the last four are folded
  into the shipped Rivers Lakes & Waterfalls and Volcanoes packs).
- **Arabic:** every topic on the old list is either already shipped under another name
  (سيارات = arCars, فلسطين = arJerusalem, المغرب = arMaghreb, تاريخ مصر = arEgypt,
  حيوانات الصحراء = arDesertAnimals, صناعات = arCrafts, صحافة = arMedia, أمثال =
  arProverbs, لغات = arLanguage, فلك = arSpace) or below the 210 line (see the finding
  above).

## 🎨 Category routing

`groupOf(id)` in `src/content/index.ts` routes packs to groups. `EN_GROUPS` and
`AR_GROUPS` drive the two sides of the language toggle in `CategoryMenu.tsx`. When adding
an Arabic pack, make sure its id matches one of the topic regexes in `groupOf` or it falls
back to معلومات عامة. Add new keywords there as needed.

## 🚧 Known gaps

- `scripts/noscroll.mjs` needs `PACK=ar-*` to click the عربي language toggle before it can
  find an Arabic pack card; that is handled, but any new screen gating packs must be taught
  to the checker too.
- Packs permanently under 200 because the real world caps them: flags (39/54/81),
  maps (61/74/60), logos (147/178), songs-rnb (82). Not defects.

## 🔎 Fact-audit sweep (2026-08-27) — every question of the 21-pack wave, read line by line

The user asked "all questions verified?". They were gate-clean, not fact-checked, so the
whole Round-20 wave was read question by question (~4,300 questions) and corrected in place.
No question was deleted; every pack still passes `checkpack.mjs` (count, letters,
duplicates, misfiles, leaks) after the edits.

| Side | Packs read | Corrections | Notes |
|---|---|---|---|
| English | 15 (dinosaurs → cycling) | 26 | Worst offender was `cycling.ts`: 9 wrong palmares stats (jersey counts, podium years). Two `shorten.mjs` over-trims (`blanc`, `Dry ice wine`) replaced with real answers (`Brut`, `Dolcetto`). |
| Arabic | 6 (`arWorldCities`, `arWorldFood`, `arJobs`, `arTravel`, `arHome`, `arClimate`) | ~150 | `arWorldFood` was clean (0). `arHome` needed 85 and `arClimate` 54. |

**The finding worth keeping: an everyday-vocabulary Arabic pack fails differently from a
knowledge pack.** A history or geography pack fails on facts, which a careful author mostly
gets right. A "things in the house" pack fails on **lexicon**: to reach 210 under a
28-letter index the author reaches for a plausible-looking word that does not exist
(`ثيابدان`, `بشكير النوم`, `عصا الجمع`, `آلة الشفط`) or attaches a real word to the wrong
object (`بانيو` clued as the bathroom, `شرشف` as a towel, `برشامة` as a pillowcase,
`دورق` as a plate, `هراوة` as a carpet beater, `ممسحة` as a dish scourer). **Neither failure
is visible to any script**: the answer is correctly lettered, unique and leak-free, so every
gate passes. Only reading it catches it.

Practical rules that came out of the sweep:
- **Author the noun, then the clue.** Most bad entries were a clue in search of an answer.
- **A compound answer of the shape `<noun> + <noun>` is a smell** (`لجة المرجان`,
  `نطاق الوشاح`, `أرض القارة`): it usually means no single real word was available, and the
  fix is a different, real word for that letter.
- **Two entries for the same object is a bug even when the words differ** (ثريا/نجفة,
  صحراء/صحاري, كرة أرضية/كوكب الأرض, دعسة/دواسة). Sweep each letter for near-twins.
- **Tashkeel to disambiguate does not work**: `برد` vs `بَرَد` looked distinct to
  `checkpack` but `normalizeArabic` strips the harakat, so in play they were the same answer.
  Use two different words instead.
