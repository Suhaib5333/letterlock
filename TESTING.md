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
