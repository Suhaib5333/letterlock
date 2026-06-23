# Letterlock — testing notes

## Test accounts / emails (HARD RULE)

- ✅ **Sign-in / OTP testing:** use ONLY `suhaibrajabo@gmail.com`.
- ✅ **Extra/throwaway accounts:** use temporary disposable emails (e.g. a temp-mail service).
- ⛔ **NEVER** send OTPs / magic links / any email to `srajab@bdb-bh.com` — that is the
  owner's real work address and must not receive test mail.

## Quick test commands

- Dev server: `npm run dev` (http://localhost:5173)
- Unit/fuzz/content: `npm test`
- E2E (Playwright): `npm run e2e` (incl. a 2-client online end-to-end test)
- Overflow sweep (17 device profiles × 8 screens): `npm run build && npm run preview` then
  `node scripts/noscroll.mjs`
- Typecheck: `npm run typecheck`

## Online Mode manual test

1. Play → Online Mode (host) → note the 6-char code.
2. Open `/?room=<CODE>&view=controller&name=Tester` on another device/tab.
3. Host assigns the player to a team → Continue to setup → Start match.
4. Host picks a hex → the question appears on the player's phone → player submits →
   host sees it under "📱 Player answers" → host adjudicates → player gets feedback.

## Playwright device matrix (every screen must pass on ALL of these)

Run `node scripts/noscroll.mjs` (build + `npm run preview` first). It checks
**zero document scroll, zero off-screen controls, zero clipped flex regions**
across these 17 profiles × every screen:

| Profile | W×H | Notes |
|---|---|---|
| iphone-se | 375×667 | smallest common portrait |
| iphone-12mini | 360×780 | |
| iphone-15 | 393×852 | |
| iphone-promax | 430×932 | |
| pixel7 | 412×915 | |
| galaxy-s8 | 360×740 | narrowest portrait |
| phone-landscape | 740×360 | **shortest landscape** |
| se-landscape | 667×375 | landscape |
| iphone-landscape | 844×390 | landscape |
| ipad-mini-p | 768×1024 | tablet portrait |
| ipad-pro-p | 834×1112 | tablet portrait |
| ipad-landscape | 1024×768 | tablet landscape |
| laptop-sm | 1280×720 | |
| laptop | 1366×768 | |
| desktop | 1440×900 | |
| tv-1080 | 1920×1080 | 10-foot UI |
| tv-1440 | 2560×1440 | |

**Screens covered:** home, all modals (settings, category, leaderboard, auth,
admin, pack-editor), tutorial, image-view, mode-select, setup, setup-online,
lobby-host, lobby-join, controller-join, controller, game-pick, game-question,
game-online (host answers panel via `?__onlinepanel=1`), game-over, victory.
**Add every NEW screen here + to `scripts/noscroll.mjs`.**

Also run `node scripts/percat.mjs` — loads ONE question from EVERY pack on the 4
tightest viewports (iphone-se, galaxy-s8, phone-landscape, se-landscape) to catch
per-category media overflow (flags/maps/logos/audio/video/charades).

Dev seams for QA (inert in normal use):
- `?__devscreens=1` — surface admin + pack-editor buttons when signed-out.
- `?__onlinepanel=1` — force the host's online answers panel with sample data.
- `?__crashtest=1` — throw during render to verify the error boundary.

New progression/social screens to ADD to the matrix as they land: rank badge,
Friends modal (list/requests/add), notification toast, prestige/level-up overlay,
admin progression controls, login-incentive nudge.
