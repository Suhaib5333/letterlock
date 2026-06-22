# Letterlock — Full Audit & Fix Log (2026-06-22)

Audit of the recent Couch Mode / Online Mode / Auth(OTP) work, plus a frontend
pass. Severity: **B**locker / **M**ajor / **m**inor. Status updated as fixed.

## 1. Theme / design tokens (root cause of half the UI looking broken)

- [ ] **T1 (B)** `app/lobby.css` & `app/admin.css` use tokens never defined at `:root` —
  `--ink` (×32), `--accent` (×40), `--surface-border` (×23), `--team-a`/`--team-b`, `--bg`.
  theme.css defines `--text`, `--ta`/`--tb`, `--line-strong`, `--bg-0/1/2` instead.
  → Mode Select, Online Lobby, Join, Player Controller, Admin, Pack Editor, AuthModal
  email UI render with no card surfaces / borders / accents. **Fix: add root aliases.**

## 2. Online Mode (Kahoot lobby) — core feature is non-functional past the lobby

- [ ] **O1 (B)** `lib/lobby.ts openRoom()` throws *"cannot add presence callbacks after subscribe()"*
  on StrictMode/double-mount (channel reused after subscribe). → remove stale same-topic
  channel before re-create; make handlers mutable (ref) so the host can attach a game listener.
- [ ] **O2 (B)** `Game.tsx` never reads `window.__lobby` → host broadcasts nothing. Players never
  get `question_served`/`answer_revealed`/`adjudicated`/`game_over`. **Wire host→player.**
- [ ] **O3 (B)** No host UI to view player-submitted answers → host cannot adjudicate online.
  Nobody subscribes to `answer_submitted`. **Add a submitted-answers panel.**
- [ ] **O4 (B)** `window.__lobby` never torn down; `EXIT_HOME` only sets screen. Channel leaks,
  players never get `host_left`. **Tear down on exit + `beforeunload`.**
- [ ] **O5 (M)** Host `joinUrl` is `?room=CODE` without `&view=controller` → scanning the host QR
  loads the full app (Home), not the controller. **Append `&view=controller`.**
- [ ] **O6 (M)** Team assignment fragile: unassign broadcasts nothing (`if(team)` skips null);
  unassigned player submit defaults to `'A'`. **Broadcast unassign; block submit when unassigned.**
- [ ] **O7 (M)** PlayerController `onEvent`/`onRoster` registered once at mount → stale `team`
  closure (adjudicated feedback compares stale team). **Route handlers through a ref.**
- [ ] **O8 (M)** `answer_submitted` has no `cell` → host can't bucket answers per question. **Add cell.**
- [ ] **O9 (M)** `match_started` is a no-op for the player (stays on "waiting"). **Add "get ready".**
- [ ] **O10 (m)** Joining a non-existent room silently "succeeds" (ghost lobby). **Detect no-host → error.**
- [ ] **O11 (m)** Controller media has no `onError` fallback; rejoin doesn't persist team.

## 3. Auth / OTP

- [ ] **A1 (B)** New-user sign-in can't create the user: Edge Function `generate_link(type:'magiclink')`
  doesn't create users; client 404-fallback `signInWithOtp` omits `shouldCreateUser`.
  **Fix client fallback (+ treat 5xx as fall-through); fix Edge Function to ensure-user.**
  (Verify type `email` is CORRECT — not the bug.)
- [ ] **A2 (M)** `AuthModal` username-claim insert error is swallowed (stuck button). **Surface errors.**
- [ ] **A3 (M)** `needsUsername` flashes during profile load (no loading flag) → existing users
  briefly forced to the username view. **Add `profileLoading`.**
- [ ] **A4 (M)** `leaderboard` insert (client) has no ban check and is forgeable (free-text username,
  arbitrary score). **Write a SECURITY DEFINER RPC migration (server-side; needs deploy).**
- [ ] **A5 (m)** Dead second backend `functions/api/auth/send-otp.ts` (client never calls it) still
  ships a magic link. **Remove link / note as dead.**
- [ ] **A6 (m)** `AdminPanel` uses `confirm()`/`alert()` (inconsistent with in-UI modals).

## 4. Frontend polish (design bar = commercial game-show)

- [ ] **F1 (M)** Red used as a status color against the explicit no-red mandate: CountryMap target
  (`#ef4444`), lobby/admin errors, danger buttons. **Route to amber/neutral.**
- [ ] **F2 (M)** Modals don't close on Escape / no focus trap / no return-focus (Settings, Category,
  Auth, Leaderboard, Admin, PackEditor). **Shared `useModalDismiss` hook.**
- [ ] **F3 (M)** Framer (`motion/react`) entrance animations ignore reduced-motion (only CSS honored).
  **Gate with `useReducedMotion`.**
- [ ] **F4 (m)** ~90 lines of dead YouTube CSS (`.qcard-yt-*`, `iframe.qcard-video`). **Delete.**
- [ ] **F5 (m)** ARIA grid invalid: `role=grid` with `gridcell` but no `row`. **Wrap rows / adjust roles.**
- [ ] **F6 (polish)** Hex-claim hero underbuilt vs §7.5 (no particle/flood/hit-stop); claimed tiles
  lack depth; turn-handoff `.turn-flare` is unanimated; answer-reveal hardcoded sky not team color;
  button `:active` shadow compression; focus ring on claimable hex.

---
## ✅ RESOLUTION (2026-06-22)

**Fixed & verified (code + Playwright):**
- **T1** theme tokens — added `--ink/--bg/--surface-border/--accent/--team-a/--team-b`
  aliases to `:root`. Mode Select / Lobby / Join / Controller / Admin / Pack Editor /
  Auth all render with proper surfaces now. Guard test added.
- **O1–O9** Online Mode fully wired & live-tested end-to-end (host serves → player phone
  receives → player answers → host sees it → adjudication feedback). `openRoom` channel-reuse
  crash fixed; `useOnlineHost` broadcasts question/reveal/adjudicate/gameover + collects
  answers; re-broadcasts to late joiners; stable room code; join URL `&view=controller`;
  team-assign sync incl. un-assign; controller "ready"/"no-team" states; teardown on exit.
  New two-client e2e test passes 5/5 (not flaky).
- **A1–A3** OTP: client fallback `shouldCreateUser` + 5xx fall-through; Edge Function now
  ensures the user exists before minting the OTP; `profileLoading` gate stops the username
  flash; username-claim errors surfaced. Send path verified live.
- **A4** leaderboard secured via `submit_score` SECURITY DEFINER RPC (migration 0004) —
  server-derived username, ban check, bounds. Client prefers RPC, falls back if not deployed.
- **F1** map highlight red → gold (colourblind-safe). **F2** all 6 modals: Escape + focus
  trap + return-focus (`useModalDismiss`). **F4** ~90 lines dead YouTube CSS deleted.
  **F6** primary-button press compression.
- **Overflow**: ALL CLEAR across 17 device profiles × 8 screens (incl. new online screens).
- **Suite**: 325 unit + 92 e2e (incl. 4 new guards) all green; typecheck + build clean.

**Blocked — needs your credentials (can't reach Supabase/GitHub from the isolated browser):**
- **Google SSO** — code is correct; enable provider in Supabase dashboard + create a Google
  OAuth client (steps given in chat).
- **Deploying** Edge Function fix + migration 0004 + OTP-length config — needs
  `SUPABASE_ACCESS_TOKEN` (or CI run). Code is committed-ready.

## ✅ ROUND 2 (2026-06-22) — exhaustive mobile/device pass + flake hunt

- **Overflow checker extended to EVERY screen**: now covers home, all 6 modals
  (settings/category/leaderboard/auth/admin/pack-editor), tutorial, image-view,
  mode-select, lobby-host, lobby-join, setup, game-pick, game-question, game-over,
  victory, controller — across all 17 device profiles. **ALL CLEAR.**
- **Fixed**: tutorial overflowed on short landscape phones (740×360 / 844×390) →
  added a `@media (orientation:landscape) and (max-height:480px)` compact 2-column rule.
- **Flaky bug found + fixed** (real feature bug, not just the test): the world-map
  zoom-to-fit sometimes didn't apply because `getBBox()` returns 0 before the ~850 KB
  inline SVG lays out. → deadline-based `requestAnimationFrame` retry in CountryMap
  (was an 8-frame cap). Test also hardened to poll for the zoom + drop a country-dependent
  area assertion (huge countries legitimately zoom to ~whole world). 24/24 stable after.
- **Stability runs (the "10×")**: online realtime e2e 10/10; world-map 24/24; full e2e
  suite ×3 then ×2 (276 + 184 executions) all green; 325 unit tests green; build clean.
- **Mobile visual sweep** (iPhone-SE live): home, in-game question, game-over overlay all
  fit perfectly with no clipping.

## Fix order
1. T1 (unblocks all token screens)  2. Online O1–O9  3. Auth A1–A3,A5  4. F1–F6 polish
5. Re-test everything with Playwright repeatedly.  Server-only items (A4 RPC, Edge Function
deploy) get code + migration written; deployment noted as it needs CI secrets.
