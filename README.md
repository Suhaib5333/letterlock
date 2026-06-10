# 🔒 Letterlock

A fair, gorgeous reinvention of TV's *Blockbusters*. Two teams battle on a Game-of-Hex
honeycomb — one races **left ↔ right**, the other **top ↕ bottom**. Claim hexes by
answering trivia (the answer starts with the hex's letter), block your opponent, and lock
in the connection. First to link their two edges wins. A board can never draw.

> **v1 is a production-grade web app** (React + TypeScript + Vite, SVG board) — host it on
> a TV/tablet/laptop, or add it to an iPhone home screen as a PWA. See
> [`CLAUDE.md`](./CLAUDE.md) for the full design plan, the architecture, and the build log
> (including why v1 ships on the web stack rather than Flutter).

## Quick start

```bash
npm install
npm run dev          # local dev at http://localhost:5173
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm test` | Unit + property/fuzz tests for `game_core` (Vitest) |
| `npm run test:cov` | …with coverage (target ≥80% on `game_core`) |
| `npm run typecheck` | Strict TypeScript check |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build at `:4173` |
| `npm run e2e` | Playwright end-to-end tests (desktop + mobile) |

First time running E2E: `npx playwright install chromium`.

## Architecture (one-liner)

`src/core/` is a **pure, zero-UI TypeScript package** holding all rules — hex topology,
the event-log reducer, and union-find win detection cross-checked against an independent
flood-fill oracle and fuzz tests. The React app in `src/` renders it. This is the same
separation the plan prescribes so the logic is unit-tested in milliseconds and could be
reused verbatim by a future authoritative multiplayer server.

```
src/
  core/        # PURE game logic (no React) — models, topology, unionFind, win, engine, match, packs, rng
  content/     # question packs (General Knowledge, Kids & Family, Science, World)
  board/        # SVG hex geometry (pure, derivable)
  components/  # Board, QuestionCard, HostPad, Timer, Scoreboard, SettingsModal, Logo
  screens/     # Home, Setup, Game, Victory, Tutorial
  state/       # Riverpod-equivalent store (useReducer + context) + save/resume
  services/    # synthesized audio, haptics, TTS
tests-e2e/      # Playwright specs
```

## Deploy to the VPS (PWA)

```bash
npm run build
# rsync dist/ to the Nginx web root for e.g. letterlock.raltech.dev
```

Serve `dist/` as static files with an SPA fallback to `index.html`. Open in mobile Safari →
**Add to Home Screen** to play as an installed app.
