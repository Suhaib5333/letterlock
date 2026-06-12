# 🧠 Letterlock — Technology, Decisions & Change Log (the "everything" doc)

**Purpose:** the single, exhaustive reference for *what* we use, *why* we chose it, *how* each
external source works, and *what changed when*. If you're an agent or human picking this up, read
this + `AGENTS.md` (workflow) + `CLAUDE.md` (master plan & build log) and you know the whole system.

> Companion docs: `CLAUDE.md` (game-design master plan + detailed build log, PART II), `AGENTS.md`
> (how to work in this repo + verification toolchain), `DEFERRED.md` (blocked work + unblockers),
> `QUESTION_AUTHORING.md` (content rules), `HANDOFF.md` (quick orientation).

---

## 1. 🏗️ The stack — every technology & why

### 1.1 Language / build / runtime
| Tech | Version | Why we use it |
|---|---|---|
| **React** | 18.3 | Component UI; DOM is Playwright-inspectable (unlike Flutter's canvas — the deciding factor). |
| **react-dom** | 18.3 | DOM renderer. |
| **TypeScript** | 5.7 (strict) | Type safety on the rules engine + UI; `tsc -b` gates every change. |
| **Vite** | 5.4 (+ `@vitejs/plugin-react`) | Fast dev server + build; outputs static `dist/` for Cloudflare Pages. |
| **Node / npm** | Node 24 / npm 11 (Windows) | Dev + the `scripts/*.mjs` generators/checkers. |

### 1.2 UI / animation / feedback (runtime dependencies)
| Tech | Version | Used for |
|---|---|---|
| **motion** (`motion/react`, formerly Framer Motion) | 11.18 | All declarative animation: card transitions, modal/menu springs, block toast, pie overlay, victory. |
| **canvas-confetti** | 1.9 | Victory confetti burst (honors reduced-motion). |
| **qrcode** (+ `@types/qrcode`) | 1.5 | Charade "secret prompt" QR (points to `/?view=img`). |

### 1.3 Browser APIs used directly (NO library — deliberate, to stay dependency-light)
- **Web Audio API** — `services/audio.ts` synthesizes ALL sound: layered SFX (claim/steal/block/
  win/tick/whomp/select/swap/undo/whoosh/sparkle) + 4 generative looping music moods (composed
  melody + bass + pad). No audio files bundled for SFX/music (copyright-free, tiny).
- **`<audio>` / `<video controls>`** elements — TV clips (iTunes `.m4v`) and song previews (iTunes
  `.m4a`). Native controls give **safe fullscreen** (raw footage, no title overlay). *(YouTube embeds
  were removed — see §3 / §8 — because an iframe always leaks the title/thumbnail/end-screen and
  can't be made spoiler-safe in fullscreen.)*
- **`navigator.vibrate`** (HapticFeedback) — claim/block haptics (no-op where unsupported).
- **Web Speech API** (`speechSynthesis`) — TTS "read question aloud" accessibility option.
- **localStorage** — settings, save/resume (the event log), no-repeat question cycle, team colors.
- **`matchMedia`** — `prefers-reduced-motion`, and `(pointer: fine)` to decide search autofocus.

### 1.4 Testing / quality (dev dependencies)
| Tech | Version | Used for |
|---|---|---|
| **Vitest** (+ `@vitest/coverage-v8`) | 2.1 | Unit + property/fuzz + content tests on the pure core (`dart test` equivalent). |
| **@playwright/test** | 1.49 | E2E flows + all the `scripts/*.mjs` headless verification drivers. |
| **ESLint** | (config) | Lint. |

### 1.5 Deploy
- **Cloudflare Pages**, auto-deploy on push to `main` (`npm run build` → `dist/`). **No VPS step.**
  `base: '/'`. PWA manifest + theme color. Hard-refresh after deploy (CF cache).

---

## 2. 🧭 Architecture decisions (with rationale)

1. **Web (React+TS+Vite) instead of Flutter** — the master plan (`CLAUDE.md`) specifies Flutter.
   We deviated because (a) no Flutter SDK on the build machine, (b) Flutter web renders to a
   `<canvas>` Playwright can't DOM-inspect, and the user required Playwright-verified "0-mistakes"
   play. The plan's *architecture* is preserved 1:1 (see below), so a Flutter port is a clean spec.
2. **Pure rules core in `src/core/` (zero React)** — the `game_core` equivalent. Models, hex coords,
   topology, event reducer, union-find win detection. Unit-tested in milliseconds. This is priority
   #1 (bug-free win logic).
3. **Immutable state + append-only event log** — `GameEvent`s (`QuestionServed`, `QuestionSkipped`,
   `HexClaimed`, `TurnPassed`, `PieSwapped`). `reduce(state, event)` is pure. Consequences:
   **undo = truncate + replay**, **save/resume = persist the log**, deterministic, and a future
   server could replay the same events.
4. **Union-Find (DSU) win detection + independent flood-fill oracle + fuzz tests** — DSU with two
   virtual edge-nodes per team; team wins iff `find(edgeA)==find(edgeB)`. Cross-checked against a
   flood-fill oracle over 2,400 random full boards + the Hex-theorem fuzz (exactly one winner).
5. **Pluggable topology** — `HexRhombusTopology` (default, 6-neighbour, fair equal-length) +
   `SquareGridTopology` (4-neighbour, allows true draws). Both feed the same DSU.
6. **State management = `useReducer` + context** (`state/store.tsx`) — the Riverpod equivalent; the
   reducer wraps the pure core.
7. **SVG board** (`Board.tsx`) — the `CustomPainter` equivalent, but DOM-inspectable so Playwright
   can hit-test hexes (`.ll-hex.claimable[data-cell]`).
8. **Fairness**: pie rule (swap), per-game direction + first-pick alternation, hard-letter biasing
   on small boards.

---

## 3. 🌐 External data & media sources — how each works + legality

Every media source was chosen to be **hotlinkable, legal, and verifiable**. The rule: verify at
build time so nothing wrong/dead ships, and degrade gracefully at runtime.

| Pack(s) | Source | How it's fetched / verified | Legal note |
|---|---|---|---|
| 📺 **TV Show Clips** (easy/med/hard, ~221) | **iTunes Search API** `entity=tvEpisode` | `scripts/genmovies.mjs` searches each show, matches `artistName` = show, takes `previewUrl` (real 30s `.m4v` episode clip). Plays in the native `<video controls>` → **safe fullscreen**, no title overlay. Retries w/ backoff (iTunes rate-limits bursts). | Apple preview clips are made for hotlinking; nothing stored. **Netflix/Disney+/Apple-TV+ originals aren't on iTunes** → lists lean on network/cable/HBO shows. |
| 🎬 **Movie clips** | ❌ **Removed** | The only movie-*video* source was YouTube trailers (iTunes' movie API is dead), and a YouTube iframe can't be made spoiler-safe in fullscreen (title/thumbnail/end-screen leak; click-through to youtube.com). So movie *clips* were dropped; movie **content lives in the Movies & TV trivia packs**. | — |
| 🎵 **Guess the Song** | **iTunes Search API** `entity=song` | `scripts/gensongs.mjs` → 30s `previewUrl` `.m4a`. **Do NOT use Deezer** — its preview CDN is hotlink-blocked (clips silently fail). | Store preview clips, hotlinked. |
| 🎼 **Guess the Melody** | **Synthesized public-domain tunes** | `scripts/genclips.mjs` renders PD melodies to bundled WAVs in `public/clips/`. Source-capped (~23; each is hand-transcribed). | PD compositions; our rendition. |
| 🏳️ **World Flags** + regional cards | **Bundled SVGs** in `public/flags/` | `scripts/genflags.mjs` downloads ~175 country SVGs locally. **flagcdn.com is blocked on some networks** → we bundle. Regional pack cards show the bundled flag image (emoji renders as "BH/SA/AE" letters on Windows). | Public-domain flag SVGs. |
| 🔷 **Guess the Logo** (easy/med/hard) | **Simple Icons** (`cdn.simpleicons.org`) | `scripts/genlogos.mjs` resolves brand→slug and **verifies each slug against the CDN** (no dead logos). Shown on a light panel so any color shows. | Simple Icons are free brand icons. |
| 🎭 **Charades** (5 packs) | **loremflickr keyword images** | `withCharadeImages()` attaches `loremflickr.com/…/<keyword>`; the card shows a **QR → `/?view=img`** secret-prompt page (word + image, privately). | Keyword stock images; **image is a bonus** — the WORD is the content, and the image hides on error (loremflickr 500s on abstract nouns). |
| 🧠 Trivia / Sports / Regional | Authored text | `QUESTION_AUTHORING.md` rules; `rebucketByAnswer` + dedupe; content tests enforce. | Original. |

### 3.1 Media robustness (runtime) — the rules that keep play unbroken
- Every media element (`image`/`audio`/`video`) has an **`onError`** handler.
- On error → **`AUTO_SKIP`**: the game **auto-advances to a fresh question on its own** (no manual
  skip, doesn't spend the host's skip, timer keeps running), **capped at 12/pick** so a fully-broken
  pack can't loop — past the cap it shows a manual fallback (Retry / Skip).
- **Skip is always enabled on a clip question** (`hasClip`) as a backstop.
- **No spoiler chrome**: clips use the native `<audio>`/`<video controls>` (raw media, no title or
  thumbnail), which also give **safe fullscreen**. Third-party iframe embeds (YouTube) are banned —
  they leak the title/thumbnail/end-screen and a click-through to the answer.
- **Timer starts on first play**: for audio/video questions the countdown is held until the clip is
  first played (`onMediaPlay` → `timerActive`), so watching/listening isn't on the clock.
- **`scripts/checkmedia.mjs`** verifies every clip/audio/flag URL is reachable (0 dead on clip packs).

---

## 4. 🧩 Content pipeline invariants
- **`rebucketByAnswer`** (`content/index.ts`) re-files every question under the FIRST LETTER of its
  answer and drops duplicates — so authoring keys self-correct.
- **`withExtra(base, ...extras)`** merges expansion files (`*Extra.ts`).
- **`groupOf(id)` + `PACK_GROUPS`** assign each pack a browse-menu group (Trivia & Knowledge,
  Movies & TV, Music, Flags, Logos & Brands, Sports, Charades, Regional).
- **`hideBoardLetters`** (letterless) packs (flags/logos/clips/charades) serve from the WHOLE pack
  per hex; the ≥16-distinct-letters playability rule is relaxed to **`totalQuestions ≥ 16`** for them
  (many titles start with "The" → one bucket, but every tile still draws a distinct clip).
- Content tests guard: answer-starts-with-letter, no answer-in-question leak, no clue-restatement,
  no "Surname, First", no dupes.

---

## 5. 🎨 Layout / UX decisions
- **`100svh` shell, `overflow:hidden` — no document scroll ever.** Guarded by `scripts/noscroll.mjs`
  across 15+ viewports × 4 screens (incl. landscape phones + xlarge text). Internal scrollers
  (`overflow:auto`) are intentional and ignored.
- **The hex board is the biggest content piece.** The question panel (`.question-zone`) **sizes to
  content and centres** (`flex: 0 1 auto`) so the host pad sits right under the card (this fixed a
  ~260px desktop gap). Landscape uses a **2-col grid** (board left, question right).
- **Pie-swap prompt is an absolute overlay** — never reshrinks the board.
- **Category browser** (`CategoryMenu.tsx`): a full-screen, scrollable, **searchable** menu opened by
  a button — grouped sections + filter chips. Search autofocuses **only on fine-pointer devices**
  (desktop), so the mobile keyboard doesn't pop on open.
- **Accessibility**: Okabe-Ito colorblind-safe palette + ownership patterns (never color-only),
  **gray (not red) for wrong**, `prefers-reduced-motion` honored everywhere, font picker
  (Atkinson Hyperlegible / Lexend), text scaling, TTS, separate SFX/music mutes (music off by
  default), full keyboard play, ARIA grid roles.
- **Timer**: `requestAnimationFrame`-driven (no CSS transition fighting it); two-phase (picker →
  steal at half time); pulse only in the last 5s; steal label not truncated.

---

## 6. 🔁 Change log (what changed, when) — index into `CLAUDE.md` PART II
Detailed entries live in `CLAUDE.md`; this is the index.
- **v1 MVP** (II.1–II.3): pure core + DSU/oracle/fuzz, SVG board, host-adjudicated loop, 4 packs,
  full UI/UX bible, accessibility, save/resume, FTUE, PWA. 73 unit / 14 e2e.
- **Round 2** (II.3b): no-scroll app layout, pack carousel, team color picker, flag packs, ambient
  music, exit modal.
- **Round 3** (II.3c): ~2,650 Qs / 10 packs, harder packs, steal timer, color-named teams.
- **Round 4** (II.3d): media clips (melody WAVs + iTunes songs), logos/sports/movies/music packs,
  music overhaul, big quality pass.
- **Round 5** (II.3e): clue-restatement guard, timer smoothness.
- **Round 6** (II.3f): pie overlay, one-skip + continuing timer, manual switch-turn, no-repeat
  cycle, charades + QR, regional packs, content to 200+.
- **Round 7** (II.3g): movie *trailer* pack (YouTube oEmbed-verified), exit-arrow, steal-timer
  polish, iPhone layout.
- **Round 8** (II.3h): **searchable category menu**, **movie+TV clip tiers** (3+3, ~207 clips via
  YouTube trailers + iTunes TV previews), **media robustness** (checkmedia, 0 dead), desktop
  host-pad gap fix. 238 unit / 36 e2e.
- **Round 8b**: **auto-advance past unreachable clips** (`AUTO_SKIP`, capped), **mobile search
  no-autofocus**, and the **TECH.md** doc (this file).
- **Round 8c**: **YouTube removed entirely** — movie clip packs dropped (no spoiler-safe / fullscreen
  source; iTunes movie API dead). TV clips kept + expanded to ~221 via iTunes (native `<video>`,
  **safe fullscreen**). **Answer timer starts on the clip's first play.** Movie *content* stays in
  the Movies & TV trivia packs.
- **Round 9**: **every pack 200+ except World Flags.** Regional packs authored to 200+ (Bahrain 259 /
  Saudi 229 / UAE 228 / Gulf 233, via 4 parallel agents + leak-fix pass). **Guess the Melody → 235**
  (kept synth PD WAVs + ~214 real iTunes instrumental-theme previews, `scripts/genmelodies_itunes.mjs`).
  **TV Show Clips → one 204 pack** (3 tiers merged — iTunes has no 200+ recognisable shows per tier).
  **Final: 31 packs, ~7,367 questions; 218 unit / 36 e2e; checkmedia 0 dead.**

---

## 7. 🛠️ Generators & checkers (network scripts) — quick reference
`scripts/`: `genmovies.mjs` (movie trailers via oEmbed + TV via iTunes tvEpisode), `gensongs.mjs`
(iTunes song previews), `genlogos.mjs` (Simple Icons slug-verified), `genflags.mjs` (bundle flag
SVGs), `genclips.mjs` (synth PD melody WAVs), `checkmedia.mjs` (reachability of every media URL),
`noscroll.mjs` (layout), `audit.mjs`/`measure.mjs`/`diag.mjs`/`verify_*.mjs` (Playwright visual
checks). Full how/when table in `AGENTS.md` §3–§4.

---

## 8. 🚩 Constraints & standing rules (don't relearn the hard way)
- **Commits: NO AI attribution** (author as the user alone). **Push freely to `main`** (auto-deploys).
- **Deezer preview CDN is hotlink-blocked** — use iTunes for audio. **flagcdn blocked on some
  networks** — flags are bundled locally. **iTunes movie API is dead** (`entity=movie` → 0) — movies
  use YouTube trailers; **iTunes TV API works** (`entity=tvEpisode`).
- **Netflix/Disney+/Apple-TV+ originals aren't on iTunes** — TV clip lists use network/cable/HBO.
- **YouTube embeds are BANNED for clips** — an iframe always leaks the title/thumbnail/end-screen
  and can't be made spoiler-safe in fullscreen. Clips use the native `<audio>`/`<video controls>`.
- **Always verify with Playwright before AND after** any UI change, esp. **landscape phones**.
- Blocked work (accounts/leaderboard, licensed music) + unblockers are in `DEFERRED.md`.
