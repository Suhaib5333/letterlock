# 🤖 Letterlock — Agent & Workflow Guide

**Read this first.** It captures how this repo actually works, the tools we use, how/when
to use them, and the standing rules — so you don't need fresh instructions each session.
Companion docs: `TECH.md` (the "everything" reference — every technology, decision, media source &
change log), `CLAUDE.md` (full plan + build log), `QUESTION_AUTHORING.md` (content rules),
`DEFERRED.md` (blocked work + what unblocks it), `HANDOFF.md` (quick orientation).

---

## 1. What this is (stack & deploy reality)
- **React 18 + TypeScript + Vite** SPA (NOT Flutter — see `CLAUDE.md` PART II for why). Pure
  rules engine in `src/core/` (zero React), UI in `src/components` + `src/screens`, state in
  `src/state` (useReducer + context), content in `src/content`, styles in `src/app/app.css`.
- **Deploy = Cloudflare Pages, auto-deploy on push to `main`.** There is **no VPS step**.
  `git push origin main` → Cloudflare builds (`npm run build`, output `dist/`) and publishes to
  `letterlock.raltech.dev`. So: **to ship, just commit + push.** Tell the user to hard-refresh
  (CF cache) after a deploy. `base` is `/` (root); `vite.config.ts` keeps a `BASE_PATH` override
  for subpath hosts but Cloudflare is root.
- **Node 24 / npm 11, Windows.** Use the Bash tool for the mjs scripts; PowerShell to kill
  stray `node` preview servers (`Get-Process node | Stop-Process -Force`).

## 2. ⭐ The standing workflow (do this every change)
1. Make the change.
2. `npx tsc -b` — must be clean.
3. `npx vitest run` — all unit + content tests green (currently **218**).
4. If layout/CSS changed: `node scripts/noscroll.mjs` in **3+ modes** (see §3) → "ALL CLEAR".
5. If content changed: `npx vitest run src/content` (leak/letter/dup/Surname guards).
6. If media changed: `npx vite-node scripts/checkmedia.mjs` (set `ALL=1` to include logos/charades) — every clip/audio/flag URL must be reachable (clip packs should show **0 dead**).
7. `npx playwright test` — e2e green (currently **36**, desktop + mobile).
7. Commit (**no AI attribution** — see §6) + `git push origin main` (Cloudflare deploys).

> ### ⚠️ ALWAYS VERIFY WITH PLAYWRIGHT — before AND after — especially LANDSCAPE PHONES
> This is the #1 standing instruction from the user. For **any** UI/layout change, capture
> screenshots **before and after** with Playwright (`scripts/audit.mjs` / `diag.mjs` /
> `measure.mjs`, then `Read` the PNGs) and run `noscroll.mjs`. **Landscape phones are the
> most fragile and most often broken** — small landscape (e.g. **667×375**, 740×360, 844×390)
> fell into the portrait column layout and cut off the question. They are now in
> `noscroll.mjs`'s viewport list AND get the side-by-side 2-col layout
> (`@media (orientation: landscape) and (max-height: 520px)`). **Never ship a layout change
> without screenshotting portrait AND landscape (small + large) and confirming the question
> card + Show-answer + host pad are fully visible and the board is the biggest element.**

## 3. 🧪 Verification toolchain — what / how / when / how often
Everything runs against a local preview: `npm run build` then `npm run preview` (port **4173**).
The scripts and noscroll connect to `http://localhost:4173` — **start preview first** or they
error ("connection refused"). Playwright e2e starts its own server.

| Tool | Command | What it checks | When / how often |
|---|---|---|---|
| **Unit + content** | `npx vitest run` | win-detection/fuzz/reducer; **every pack**: answer-starts-with-letter, no answer-in-question leak, no clue-restatement, ≥16 letters, no "Surname, First" | every change; fast (ms) |
| **Type check** | `npx tsc -b` | strict types | every change |
| **No-scroll** | `node scripts/noscroll.mjs` (env `SCALE=xlarge`, `PACK=<id>`) | 15 device viewports × 4 screens: no document scroll, no control off-screen (offBottom/offSide), no flex-region clip (regionOver). Ignores intentional scrollers (overflow:auto). | any layout/CSS change; run ≥3 modes: default, `SCALE=xlarge`, a tall pack e.g. `PACK=charades-easy` |
| **Cross-device audit** | `node scripts/audit.mjs` | screenshots all 7 profiles × {home,pick,pie,question,charade} to `audit-shots/`, reports overflow/clip + **board-stability** (board must not shrink when the pie popup appears) | any layout change; then **Read the PNGs** to eyeball hex size / overlap |
| **Layout measure** | `W=375 H=667 [PACK=..] node scripts/measure.mjs` | exact px: board height, reveal/skip/hostpad visibility, qcard scroll overflow at a viewport | when tuning the question-phase fit |
| **Flag randomization** | `node scripts/verify_flags.mjs` | proves letterless packs serve a random item of ANY letter per hex (not letter-per-hex) | after touching serve logic |
| **Audio reachability** | `N=30 node scripts/checkaudio.mjs src/content/songs.ts` | song/clip URLs load + are audio (headless can't decode AAC, so it checks reachability + browser canplay) | after regenerating songs |
| **Quick diagnosis** | `node scripts/diag.mjs` | targeted screenshots (home, flags board/card, landscape question) | reproducing a reported visual bug |
| **E2E** | `npx playwright test` (`-g "name"` to filter) | full flows incl. pie-overlay, switch-turn, one-skip, charade QR + /img, media fallback, flags/melody | before push |
| **Playwright MCP** | `mcp__plugin_playwright_playwright__browser_*` (when connected) | interactive navigate/resize/screenshot/evaluate for before/after UI verification | when available; it disconnects often — fall back to the mjs scripts above |

**MCP note:** the Playwright MCP server connects/disconnects between turns. When its tools
aren't available, use `scripts/audit.mjs` / `diag.mjs` / `measure.mjs` (custom Playwright
drivers) + `Read` the PNGs instead — same coverage, no MCP needed.

## 4. 📝 Content pipeline (how we author + expand packs)
- **Rules:** `QUESTION_AUTHORING.md` (13 rules + style + media-pack notes). Tests enforce the
  big ones. Read it before writing/editing any question.
- **`rebucketByAnswer` (src/content/index.ts) is the core invariant:** every question is re-filed
  under the FIRST LETTER of its `a` automatically, and duplicates (same q+a) are dropped. So you
  author the natural answer; bucketing/keying is automatic. Mis-keyed authoring self-corrects.
- **Merging:** base pack + `withExtra(base, ...extraMaps)` in `index.ts`. Expansions live in
  `*Extra.ts` files. `PACKS` is sorted by `DIFFICULTY_RANK`.
- **Parallel authoring (how we scale content):** spawn **multiple background Agent tool calls**,
  one per pack/group, each writing ONE independent file (no conflicts) and following
  `QUESTION_AUTHORING.md`. Then wire into `index.ts`, run `vitest run src/content`, and fix the
  few leaks/dupes the tests flag. This is how all the 200+ packs were built/audited.
- **Generator scripts (network, run once, gentle pacing + retries):**
  - `scripts/gensongs.mjs` → `songs.ts` (iTunes 30s previews — **hotlinkable & playable**; do NOT
    use Deezer, its preview CDN is hotlink-blocked). `gensongs_add.mjs` → `songsExtra.ts`.
  - `scripts/genlogos.mjs` (+ `logobrands*.mjs`) → `logosExtra.ts` — resolves brand→Simple Icons
    slug and **verifies each against cdn.simpleicons.org** (no dead logos).
  - `scripts/genflags.mjs` → downloads flag SVGs into `public/flags/` (bundled locally so flags
    always load — flagcdn.com is blocked on some networks). Flag helper uses `/flags/<code>.svg`.
  - `scripts/genclips.mjs` → synthesizes public-domain melody WAVs into `public/clips/`.
  - `scripts/genmovies.mjs` → `movieClips.ts` — **3 TV-clip packs** (easy/med/hard, ~221 total).
    REAL iTunes Search API episode **preview clips** (`entity=tvEpisode` → `previewUrl` .m4v,
    hotlinkable), matched by `artistName` = show — no guessed ids (the API is the source of truth);
    iTunes rate-limits bursts, so it retries with backoff. Netflix/Disney+/Apple-TV+ originals
    aren't on iTunes (use network/cable/HBO shows). Add shows + re-run to expand. **YouTube/movie
    clips were removed** — an iframe leaks the title/thumbnail/end-screen + can't fullscreen safely,
    and iTunes' movie API is dead; movie *content* lives in the Movies & TV trivia packs.
  - `scripts/checkmedia.mjs` → loads PACKS and checks EVERY media URL is reachable (audio/video
    Range GET, youtube oEmbed, local flags/clips file-exists); reports dead per pack. Clip packs
    must be 0 dead. The YouTube embed uses the **IFrame Player API** (`YouTubeEmbed.tsx`) so an
    unplayable/non-embeddable trailer (onError 100/101/150) falls back cleanly; Skip is ALWAYS
    enabled on a clip question so a broken clip never strands play.
  - `scripts/verify_fixes.mjs` / `scripts/verify_clips.mjs` → focused before/after Playwright
    checks (fixes geometry; clip iframe-injection + `<video>` readyState) → `verify-shots/`.
- **Counts:** `npx vite-node /tmp/counts.mjs` (a tiny script that prints questions per pack).
  Every text pack is 200+; flags & melodies are the source-capped exceptions (see DEFERRED.md).

## 5. 🎨 Layout system & invariants (don't regress)
- Shell is `100svh`, `overflow:hidden` (`.ll-screen`). **No document scroll, ever** — guarded by
  `noscroll.mjs`. Internal scrollers (`overflow-y:auto` regions like `.game-side`, `.qcard-scroll`,
  the home `.hero`, the pack carousel) are intentional and ignored by the checker.
- **The hex board is the biggest content piece.** Mobile portrait: `.board-wrap` is
  `flex:1 1 auto; min-height:clamp(140px,32vh,300px)` — large, and grows in the pick phase.
- **Question phase fits with no scroll:** `.question-zone` = Timer (top) + `.qcard-scroll`
  (middle, the only thing that scrolls, as a last resort on tiny phones) + **HostPad as a fixed
  footer** (always visible, never clipped). The card is compacted on `max-height:720px`.
- **The pie-swap prompt is an absolute overlay** (`.pie-pop`, click-through except its buttons) so
  it NEVER resizes the board.
- **Landscape** is a 2-col grid (board left = biggest, question right); the scoreboard is
  compacted on `max-height:480px`; the home hero compacts on `max-height:520px`.
- **Letterless packs** (`hideBoardLetters`: flags/logos/songs/melodies/charades) serve a random
  question from the WHOLE pack per hex (tiles not pinned to a letter). The charade card shows a
  **QR** to `/?view=img&w=…` (a standalone secret-prompt page in `main.tsx`).
- **Media fallback:** audio/video/image `onError` → a clean "couldn't load" card + Retry; Reveal
  + Skip stay available so a dead clip never stalls the game.

## 6. 🚦 Standing rules / preferences
- **Commits: NO AI attribution** — no "Co-Authored-By", no "Generated with Claude", author as the
  user alone. (Global user rule.)
- **Push freely to `main`** (no permission needed); Cloudflare auto-deploys.
- **Use Context7** for any library/API question; **frontend-design** skill for UI work.
- Keep `CLAUDE.md`, `QUESTION_AUTHORING.md`, `DEFERRED.md`, this file **living** — update them
  when you learn something a future agent will need.

## 7. 🚩 Deferred / blocked (don't re-attempt without these — see DEFERRED.md)
- **Accounts / login / OTP / Google SSO / global leaderboard** — need a real Resend API key
  (the ral-workspace one is an empty placeholder), a Supabase project, and a Google OAuth client.
- **Movie/TV video clips** — player infra is built (`youtube` field → embed); needs a **TMDB API
  key** to populate official trailers (iTunes movie API is dead; don't guess YouTube ids).
- **Licensed/Minecraft music** — copyright; original generative music ships instead.
- **flags / logos / melodies / songs at 200+** — source-capped (countries / verified slugs /
  bundled clips); documented.
