# 🔒 Letterlock — Engineering Handoff (for a fresh Claude session)

> Paste this whole file into a new chat. It tells you exactly what the project is, how it's
> built, **how to test/verify everything**, the invariants you must not break, and the known
> open items. After reading, you can continue fixing and shipping immediately.

---

## 0. TL;DR

**Letterlock** is a fair, polished web reimplementation of TV's *Blockbusters* on a Game-of-Hex
board. Two teams claim lettered hexes by answering trivia (answer starts with that letter);
one team connects left↔right, the other top↔bottom; first to connect wins. Host-adjudicated.

- **Repo:** `c:\Users\Suhaib\Desktop\RAL\repos\letterlock`
- **GitHub:** `https://github.com/Suhaib5333/letterlock` — branch **`main`** (push freely, the user does NOT require permission to push).
- **Stack:** **React 18 + TypeScript + Vite** (NOT Flutter — deliberate; see §8). Node 24, npm 11, Windows.
- **Status:** fully playable, deployed-ready PWA. 153 unit/content tests + 22 Playwright E2E + a custom no-scroll checker all green.
- **Commit message rule (IMPORTANT):** NEVER add AI attribution / "Co-Authored-By: Claude" / "Generated with Claude Code". Commit as the user alone. (Global user rule.)

---

## 1. How to run, build, and TEST (this is the important part)

```bash
npm install
npm run dev            # Vite dev server → http://localhost:5173
npm run build          # tsc -b + vite build → dist/
npm run preview        # serve production build → http://localhost:4173
npm test               # Vitest: unit + content tests (currently 153 passing)
npx vitest run src/content   # just the content-validation tests
npm run typecheck      # tsc -b (strict)
npm run e2e            # Playwright (needs: npx playwright install chromium)
```

### The verification tools you MUST use after changes

1. **Unit / logic / content tests — `npx vitest run`**
   - `src/core/*.test.ts`: hex topology, **union-find win detection cross-checked vs an
     independent flood-fill oracle + fuzz tests** (the Hex theorem — exactly one winner on a
     full board), reducer/undo/replay, pie rule, match flow, packs/serving.
   - `src/content/content.test.ts`: validates EVERY pack:
     - **every answer starts with its letter** (the core mechanic),
     - **no answer leaks into its question text** (guard test, see §5),
     - every pack is playable (≥16 answerable letters, serves a question per letter).

2. **`node scripts/noscroll.mjs` — the custom "app-like, nothing cut off" checker (CRITICAL).**
   It launches headless Chromium across **15 device viewports** (iPhone SE … 4K TV, incl.
   landscape phones) × **4 screens** (home, setup, game-pick, game-question) and asserts:
   - no document scroll (`vScroll`/`hScroll` ≈ 0),
   - **no interactive control clipped off-screen** (`offBottom`/`offSide` — buttons/inputs/
     gridcells beyond the viewport, which `overflow:hidden` would hide), ignoring elements
     inside intentionally-scrollable regions,
   - **no flex region overflow** (`regionOver` — content taller than a height-bounded flex box,
     except regions that are intentionally `overflow-y:auto`).
   - Env flags: `SCALE=xlarge node scripts/noscroll.mjs` (test large text), `PACK=flags-hard node scripts/noscroll.mjs` (select a pack first). Exit code 0 = "ALL CLEAR".
   - **Run all three modes after any layout/content change:** default, `SCALE=xlarge`, and a couple `PACK=...`.

3. **`node scripts/shots.mjs`** — screenshot sweep → `shots/` for eyeballing.

4. **Playwright E2E — `tests-e2e/game.spec.ts`** (desktop + mobile/Pixel 7). Covers home→setup→
   board, question serve+reveal, **full game-to-win + winning trace**, undo, neutral "No one",
   the **in-UI exit modal**, **team color carry-through**, **flag/melody packs hide board
   letters**, settings persistence, tutorial. Playwright auto-starts `build && preview` on :4173.

5. **Playwright MCP** (`browser_navigate`, `browser_resize`, `browser_take_screenshot`,
   `browser_click`, `browser_evaluate`, `browser_snapshot`) — used for live visual checks.
   Pattern used: resize to a device, navigate `http://localhost:4173` (keep a `vite preview`
   running in the background), click through, screenshot, and `Read` the PNG.

> **Always, after editing content or layout:** `npx tsc -b` → `npx vitest run` → `node scripts/noscroll.mjs` (×3 modes) → `npx playwright test`. Then commit + push.

---

## 2. Architecture / file map

```
src/
  core/                      ⭐ PURE TypeScript, ZERO React imports (the "game_core")
    models.ts                GameState, MatchState, TeamId, Direction, edgesFor, opponent, gamesNeededFor
    topology.ts              BoardTopology; HexRhombusTopology (6-neighbour, default) + SquareGridTopology (4-neighbour)
    unionFind.ts             weighted DSU (Int32Array)
    win.ts                   detectWin (DSU + 2 virtual edge-nodes/team) + floodFillConnected (oracle) + extractPath (winning trace)
    events.ts                GameEvent union (GameStarted/HexClaimed/TurnPassed/PieSwapped/QuestionServed/QuestionSkipped)
    engine.ts                reduce(state,event), createGame, replay, undoLast, canPieSwap, legalPicks  (pure reducer)
    match.ts                 newMatch, startGameEvent, recordGameResult, assignmentForGame (direction/first-picker swap per game)
    packs.ts                 Question / QuestionPack / RawPack types; placeLetters, serveQuestion, answerMatches,
                             ALPHABET, HARD_LETTERS, EASE_ORDER, DIFFICULTY_RANK, normalizePack, answerableLetters
    rng.ts                   mulberry32 (seedable PRNG), shuffle, hashSeed
    *.test.ts                vitest unit/property/fuzz tests
  content/
    index.ts                 ⭐ pack REGISTRY. Builds & exports PACKS (sorted by DIFFICULTY_RANK), DEFAULT_PACK_ID, packById.
                             Helpers: rebucketByAnswer (see §4), withExtra (merge), themedFrom (derive Science/World from GK)
    generalKnowledge.ts      base GK pack (hand-authored). + generalKnowledge2.ts + generalKnowledge3.ts (merged via withExtra)
    kids.ts (+ kids2.ts)     Kids & Family
    flags.ts                 flagsEasy/Medium/HardPack — flag IMAGES from flagcdn.com; hideBoardLetters:true
    logos.ts                 logosEasy/Medium/HardPack — brand icons from cdn.simpleicons.org; hideBoardLetters
    sports.ts                sportsEasy/MediumPack
    screen.ts                moviesPack + moviesHardPack (Movies & TV)
    musicpack.ts             musicMediumPack + musicHardPack
    melodies.ts              melodiesPack — synthesized public-domain melody WAVs in /public/clips (audio)
    songs.ts                 songsPack — real 30s previews via iTunes preview CDN (audio), hideBoardLetters
    history.ts, space.ts, genius.ts   World History (hard), Space & Cosmos (hard), Genius Mode (extreme)
    content.test.ts          ⭐ pack validation incl. the answer-leak guard
  board/geometry.ts          pure SVG hex layout (boardGeometry, pathThroughCells)
  components/
    Board.tsx                SVG board; team colors via CSS vars (--ta*/--tb*); `hideLetters` prop; winning lightning trace; "selected" neutral highlight
    QuestionCard.tsx         question/answer; renders flag/logo `image`; `<audio>`/`<video>` for songs/melodies; `hideLetter` (shows 🚩); TTS button
    HostPad.tsx              ✅A / ✅B(steal) / ⬜No-one / ↩Undo
    Timer.tsx                TWO-PHASE: picker full time → other team HALF time to steal (advisory; host still adjudicates)
    Scoreboard.tsx           team panels, series pips, stats
    Logo.tsx, SettingsModal.tsx
  screens/
    Home.tsx                 pack CAROUSEL (horizontal swipe, scroll-snap) + live "N packs · M questions" count
    Setup.tsx                team COLOR SWATCHES (name follows color, NOT typable), mode, board size, timer, pie rule
    Game.tsx                 orchestration; in-UI exit modal; block toast; confetti; steal timer wiring
    Victory.tsx, Tutorial.tsx
  state/
    store.tsx                useReducer + context; localStorage save/resume; applies team colors + accessibility to <html>
    types.ts                 Settings, SetupForm (colorA/colorB — no team-name strings), UiState
    palette.ts               TEAM_COLORS (6 colorblind-safe), colorById, applyTeamColors (sets --ta*/--tb* CSS vars)
  services/audio.ts          synthesized SFX, ambient generative MUSIC (startMusic/stopMusic, fade in/out), haptics, speak (TTS)
  theme.css                  design tokens (Okabe-Ito blue/amber defaults, type scale, 8pt grid, team color CSS vars)
  app/app.css                ⭐ all layout/components; the no-scroll/responsive rules live here
  app/App.tsx, main.tsx
public/  favicon.svg, manifest.webmanifest, clips/ (melody WAVs)
scripts/ noscroll.mjs (checker), shots.mjs (screenshots), genclips.mjs, gensongs.mjs (content generators)
tests-e2e/ game.spec.ts (Playwright)
CLAUDE.md  living design+build plan (PART I plan, PART II web build log)   README.md
```

---

## 3. Game rules / behavior (so fixes don't break design)

- Board = N×N rhombus of pointy-top hexes (sizes 4/5/7, default 5). 6-neighbour Hex adjacency.
- Team A connects LEFT↔RIGHT, Team B TOP↔BOTTOM (directions swap each game in a series).
- Win = union-find finds a team's two virtual edge-nodes connected. **Hex theorem**: a full board
  always has exactly one winner (square topology can draw; it's an unused future mode).
- Host adjudication: pick hex → question served (randomized, unused-first) → ✅A / ✅B(steal) /
  ⬜No-one / ⏭Skip / ↩Undo. Undo = truncate event log + replay.
- Pie rule (swap) neutralises first-move advantage. Modes Bo1/3/5. Timer optional; on expiry the
  other team gets HALF the time to steal.
- Team identity = a COLOR from a 6-color colorblind-safe palette; the team's NAME is the color name
  (Blue/Amber/Teal/Violet/Sky/Rose). Not typable. Colors drive board fills, edges, scoreboard,
  host pad, confetti via CSS variables `--ta*` / `--tb*` (set by `applyTeamColors`).

---

## 4. ⭐ THE CORE CONTENT INVARIANT — `rebucketByAnswer`

In `src/content/index.ts`, **every pack is normalized through `rebucketByAnswer`**: each question
is placed under the letter its **answer's first letter** dictates (A–Z). Consequences:

- When authoring/editing questions you **do NOT need to keep an answer under a specific letter
  key** — always use the **natural, correct answer** (e.g. `"Michael Jackson"`, never the
  contrived `"Jackson Michael"`). The bucket is derived automatically.
- The board only shows letters that have answers; serving pulls from `pack.letters[letter]`.
- `hideBoardLetters: true` on a pack hides letters on the board (flags/logos/songs/melodies) so
  the first letter isn't a hint; the question card then shows 🚩 instead of the letter.

---

## 5. ⭐ CONTENT QUALITY RULES (enforced by tests — keep them green)

`src/content/content.test.ts` will FAIL the build if any of these break:

1. **Every answer starts with its letter** (guaranteed by `rebucketByAnswer`, but the test catches
   non-letter answers).
2. **No answer leaks into its question** — the question text must not contain the answer or a
   *distinctive* word of it. Generic head-nouns are allowed (a `GENERIC` set in the test:
   ocean, planet, war, film, composer, river, number, etc.). Examples of bugs fixed:
   - "Which country produced composer Grieg? → Norway" (music-tagged, country answer) — reframed to ask for the composer.
   - "A bear that is cuddly… → Bear", "the Amazon rainforest → Amazon", "played in Augusta → Augusta National".
3. Every pack playable (≥16 answerable letters).

**When you add/edit questions:** keep answers natural, keep facts accurate, and make sure the clue
**describes** the answer without **naming** it. Then `npx vitest run src/content` must stay green.

---

## 6. No-scroll / responsive design system (don't regress this)

- App shell is locked to `100svh` with `overflow:hidden`; each screen is a flex column. The HEX
  BOARD is the biggest element and flexes; controls are pinned. Safe-area insets via
  `env(safe-area-inset-*)` + `viewport-fit=cover`.
- Home packs are a **horizontal swipe carousel** (so adding packs never pushes the header off).
- Text-size accessibility: scaling is modest and dense regions (`.hero`, `.setup-body`,
  `.game-side`) have an **internal-scroll safety net** so big text never clips (default text = no
  scroll anywhere).
- **Guardrail:** `node scripts/noscroll.mjs` must print "ALL CLEAR" in default, `SCALE=xlarge`,
  and `PACK=...` modes. If it flags `offBottom`/`regionOver`, compact that screen at the relevant
  breakpoint in `src/app/app.css` (breakpoints: `max-width:920`, `max-width:720`, `max-height:600`,
  `max-height:540`, `min-width:1600`).

---

## 7. What was built this project (chronological highlights)

- v1: pure `game_core` (union-find + oracle + fuzz), SVG board, host loop, GK/Kids/Science/World
  packs, full UI/UX (studio-dark, Okabe-Ito blue/amber, motion, synthesized audio, accessibility),
  save/resume, FTUE, victory/share, Playwright + Vitest. Deployed-ready PWA.
- Rounds added: true no-scroll app layout (15-device checker), pack carousel, **team color picker
  (name follows color)**, **flag packs (easy/med/hard) with images + hidden board letters**,
  ambient generative music (fade in/out), accessibility fonts (Atkinson Hyperlegible, Lexend),
  in-UI exit modal (no browser confirm), centered logo, **steal timer (half time)**.
- Categories now (sorted easiest→hardest in the selector): Kids → Flags Easy → General Knowledge →
  Logos (E/M/H) → Sports (E/M) → Science & Nature → World Geography → Movies & TV (+ Hard) →
  Music (+ Hard) → Melodies → Songs → World History (hard) → Space & Cosmos (hard) → Flags Hard →
  Genius Mode (extreme). (Home shows the live total question count.)
- **Content quality pass:** parallel sub-agents audited packs and fixed Q&A mismatches, factual
  errors, contrived/reversed answers, the "No —" self-contradicting clues, and **answer-in-question
  leaks** (a permanent guard test now prevents regressions). Audio/song packs (`melodies.ts`,
  `songs.ts`) and `logos.ts` were added externally and wired into `index.ts`.

---

## 8. Deliberate deviations & known limitations

- **Web (React) instead of Flutter** (the original `CLAUDE.md` plan specified Flutter): chosen so
  the SVG/DOM UI is Playwright-inspectable and deployable as a PWA today. The pure `src/core/` is a
  1:1 spec to port to Dart if ever needed. Documented in `CLAUDE.md` PART II.
- **External media dependencies (need internet):** flags = `flagcdn.com`, logos =
  `cdn.simpleicons.org`, songs = iTunes 30s preview CDN. Melodies = bundled WAVs in `/public/clips`.
  These can rot (dead slugs / 404 audio).
- **Content is not 100% human-fact-checked.** All *mechanical* issues are tested/fixed (letter
  bucketing, answer leaks, playability) and many factual errors were corrected, but ~thousands of
  questions across hard/extreme packs aren't individually verified.

## 9. OPEN TASKS (what to do next)

1. **Logos pack:** verify `cdn.simpleicons.org/<slug>` slugs resolve; replace dead ones. (Image won't render if the slug is wrong.)
2. **Songs / Melodies packs:** verify audio URLs still play (iTunes preview links can expire); the melody WAVs in `/public/clips` are safe.
3. **Deeper factual pass** on the Genius (Extreme) and Hard packs (Space/History/Music-Hard/Movies-Hard).
4. Anything new the user reports — reproduce in Playwright MCP, fix, re-run §1 tools, push.

## 10. Conventions checklist before every push
- [ ] `npx tsc -b` clean
- [ ] `npx vitest run` green (unit + content incl. answer-leak guard)
- [ ] `node scripts/noscroll.mjs` ALL CLEAR (default + `SCALE=xlarge` + a `PACK=...`)
- [ ] `npx playwright test` green
- [ ] commit message has **no AI attribution**; push to `main`
