# 📚 Content pipeline and pack queue (living doc, resume from here)

> **Purpose:** if a session ends or context is cleared, this file alone is enough to
> continue authoring packs at full quality. Update the counters and the queue table
> every wave.

## 🔢 Where we are (update every wave)

| Metric | Value | Updated |
|---|---|---|
| Packs shipped | **151** | 2026-08-27 |
| Questions shipped | **33,508** | 2026-08-27 |
| Arabic packs | 36 | 2026-08-27 |
| Packs fact-audited | 37 | 2026-08-27 |
| Target for this programme | 60 new packs (30 EN + 30 AR) | |
| Done toward target | 18 | |
| Left toward target | **42** | |

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

**Done in waves 2-4** (all audited, all 210+ questions): Olympics, Pets, Money & Economics,
Comics & Graphic Novels, Trains & Ships, Fashion & Designers, Famous Firsts, Travel &
Airlines, اقتصاد وعملات، البحر والملاحة، نباتات وزراعة، جغرافيا الخليج، طب وصحة،
رياضيات وأرقام، فنون وعمارة إسلامية، تاريخ عالمي، قرآن وسور، مسلسلات ودراما عربية.

### ⏳ Not started, English

Board Games & Puzzles (`board-games`) · Festivals & Holidays (`festivals`) ·
Ocean & Sailing · Photography · Architecture Styles · Dance & Ballet ·
Wine, Coffee & Tea · Chess · Cycling · Motorsport Legends · Toys & Lego ·
Currencies & Flags of Asia · Volcanoes & Earthquakes · Deserts & Rivers ·
Cats of the Wild · Dinosaurs · Robotics & AI · Cryptography · Nobel Prizes ·
Shipwrecks · Castles · Bridges & Tunnels · Trains of the World · Airports ·
Islands · Waterfalls · Coral Reefs

> Board Games and Festivals were both authored by the cheap model and deleted. Festivals
> in particular filled itself with invented names ("X-citing Event", "Quirky Festival").
> Re-author both from scratch with Opus.

**Audit yield so far (Opus-authored):** 2,145 questions read, 5 wrong. The catches were
subtle and worth the pass: الاستهلاك clued as accounting depreciation (that is الإهلاك),
مسجد الحسن الثاني called the world's tallest minaret (only true 1993-2019), the Dow Jones
"30-company average first published in 1896" (it launched with 12), and a drama pack that
CONTRADICTED ITSELF on باي باي لندن and on who played قناوي. Self-contradiction inside a
file is the most reliable smell of a wrong answer.

### ⏳ Not started, Arabic

أمثال خليجية · أفلام عالمية بالعربية · أطفال وعائلة · مناخ وطبيعة ·
عمارة ومدن عربية · صحافة وإعلام عربي · ألعاب وترفيه · سيارات ومواصلات ·
موسيقى عربية كلاسيكية · تاريخ مصر · الشام وبلاد الرافدين · المغرب العربي ·
اليمن وعمان · فلسطين والقدس · لغات وحروف · فلك وتقويم · صناعات وحرف ·
أعياد ومناسبات · حيوانات الصحراء · طيور ومحميات

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
