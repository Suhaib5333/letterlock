# 🧪 TESTING MANDATE (read first — the user's standing instruction)

> **Every feature must be tested fully end-to-end with Playwright before it's
> called done.** For any change or feature list: drive the real app with Playwright
> (the device-matrix `noscroll` checker + the e2e suite + live MCP-browser runs,
> incl. two-page host+player for online), **identify the issues, fix them ALL, then
> re-verify — and keep fixing-and-re-testing in a loop until everything passes.**
> Don't report something as working on inspection alone; prove it by exercising the
> actual UI. Online/multi-device features get a two-client test; signed-in features
> get a real login via a TEMP email (maildrop.cc — mailinator is bot-walled) — **never**
> the user's work email.
> **QA-account cleanup is part of the test:** every account created during testing
> (claimed username or email-only stray) MUST be deleted from the DB afterwards via
> `gh workflow run qa-cleanup.yml -f targets=<username-or-email>,…`
> (`.github/workflows/qa-cleanup.yml`, uses the CI service-role secret; exact matches
> only — never touch real players).
> Also always show the full status table (see below) on every reply.

## 📊 Working convention: always report a status table

> **Show the FULL status board every single time the user gives a command or task —
> no exceptions** — and regularly as work progresses, not just at the end. Render the
> COMPLETE current task list (every active/pending item, not a subset) as a Markdown
> table: emoji status (✅ done / 🔄 in-progress / ⏳ pending / 🚫 blocked), the task,
> and a **% completion**. Keep it tight. (Recorded twice at the user's explicit
> request — this is mandatory in every session.)

---

# 🎮 Letterlock — where everything lives

This file is the **standing rules + blocked list + latest round**, and it has a hard
**150k-char budget** (Claude Code warns past ~40k across all memory files). Everything
else lives in its own living doc — read the right one before touching that area, and
update it when you do.

| Doc | What's in it — read it before… |
|---|---|
| `LETTERLOCK_MASTER_PLAN.md` | The full plan §0-18: North Star & non-negotiables (§0), the reverse-engineered original (§1), **fairness engine / Hex topology + pie rule** (§2), rules/modes/flow + the **draw & edge-case table** (§3), tech stack (§4), project structure (§5), core systems, event log, union-find win detection, pack schema (§6), the **UI/UX bible** (§7), content system (§8), retention (§9), **Phase-2 multiplayer + buzzer fairness** (§10), monetization (§11), testing strategy (§12), build/deploy (§13), the phased roadmap + Future TODO (§14), the edge-case master checklist (§15), §16-18. |
| `AGENTS.md` | How this repo actually works: stack, the standing per-change workflow, the verification toolchain, layout invariants. |
| `TECH.md` | Every technology, decision, media source and change log. |
| `HISTORY.md` | The round-by-round build log (rounds 1-33) plus everything moved out of this file verbatim. Open it for the detail behind any rule below. |
| `CONTENT_QUEUE.md` | **Any pack authoring.** The pipeline (Opus authors → the agent self-verifies with `scripts/checkpack.mjs` → a separate Sonnet agent fact-audits a sample → register, verify, push), the full script list, the copy-paste authoring spec, the remaining queue, and the pack/question counters (**update them every wave**). ⚠️ It also records the finding that cost a million tokens: content authored by a cheap model passed every scriptable gate and was 60-100% factually wrong, so all ten of those packs were deleted. **Never author content with a cheap model.** |
| `LAUNCH_PLAN.md` | **Any store / monetization / VPS work.** Capacitor wrapper, self-hosted Supabase on the VPS (also fixes the "xxxx.supabase.co" Google consent text), AdMob ads, the RevenueCat "Remove Ads" purchase and how entitlements follow the login (not just the Apple ID), the copyright verdicts (iTunes song/TV previews cannot ship in a store build), the store-blocker list (account deletion, privacy/terms, Sign in with Apple), the phase plan with ETAs, costs, and the open decisions D1-D17. **Update its change log when you touch any of it.** |
| `docs/EMAIL_RULES.md` | **Anything that sends mail.** Summary below. |
| `docs/ACCOUNTS.md` | Every store/ads identifier and the file each placeholder sits in. Tracked deliberately, not gitignored: a D-U-N-S, a Team ID and an app-signing fingerprint are printed on public store listings or served from `.well-known/`. Passwords, API secrets and `.p8` files stay in gitignored `infra/*-creds`. |
| `QUESTION_AUTHORING.md`, `DEFERRED.md`, `HANDOFF.md`, `TESTING.md`, `WORKFLOW.md` | Content rules; blocked work + what unblocks it; quick orientation; test and workflow detail. |

## 📧 Email, in one paragraph (full rules: `docs/EMAIL_RULES.md`)

Every Resend send in this repo (the API's OTP mail plus the three notifier workflows) must carry a
plain-`text` part beside the HTML, a unique `X-Entity-Ref-ID` and a real `reply_to`; must go through
`/emails` and never `/broadcasts`; must carry no images, few links and no `List-Unsubscribe`; and must
come from an ops-style address (`ops@`, never `reminders@`/`news@`/`promo@`). Written 2026-09-08 after
the day-1 backup email landed in Gmail's **Promotions** tab: HTML-only with no text part is one of the
strongest promotional signals there is. Gmail's tab choice is a classifier with no header that can force
Primary, so the only deterministic fix is a recipient-side Gmail filter (`Categorise as: Primary`).
**Never "improve" the OTP email with a logo or a footer** — an OTP in Promotions means players cannot sign in.

## 🧩 Repo conventions
- Mirror this file as `CLAUDE.md` / `AGENTS.md` / `GEMINI.md`. Keep every doc a **living document**.
- Commit messages: **no AI attribution** (Suhaib-authored only).
- `melos bootstrap` after clone. Run `dart test` (logic) + `flutter test` (widget/golden) in CI.
- Use the **`frontend-design`** skill for UI work, **Context7** for all library questions, **graphify** to keep a knowledge graph of the repo.
- Build logic **test-first** — win detection is the highest-risk code and the #1 priority.

---

# 🛠️ PART II — v1 implementation record

## II.0 The one deliberate deviation: web stack instead of Flutter

The plan specifies Flutter; v1 ships as a **React + TypeScript + Vite** web app. Why: there is no
Flutter SDK on the build machine, and Flutter web renders to a `<canvas>` that **Playwright cannot
inspect via the DOM**, while the user explicitly required Playwright verification of a "fully playable,
0-mistakes" game; the web stack satisfies every platform goal in the plan (host build on the VPS
subdomain, Android via the browser, iPhone via Safari → Add to Home Screen) with no Mac and no dev
accounts; and the SVG board is DOM-inspectable, so the real UI is end-to-end testable. **The plan's
architecture is preserved**: a pure, zero-UI rules package (`src/core/`, the `game_core` equivalent)
with union-find win detection cross-checked against a flood-fill oracle + fuzz tests, an append-only
event-log reducer enabling undo/resume/replay, pluggable Hex/Square topology, the pie rule, and all
§3.6 edge cases. If Flutter is ever required, this TS core is a 1:1 spec to port, and the same
`game_core` could back a Dart server. (Full original text in `HISTORY.md`.)

## II.4 Still deferred (unchanged from §14 "Future TODO")

Multiplayer (Phase 2 §10), accounts/cloud (Supabase), pack editor + UGC moderation, daily
board/streaks/leaderboards/achievements, AI opponent, varying-difficulty packs, square-grid mode UI
toggle, native store builds, replays, online ranked/anti-cheat, i18n/RTL packs. The core engine
already supports the seams these need (pluggable topology, event log as wire format, seeded RNG,
pure rules engine).

## 📜 Rounds 1-33: see `HISTORY.md`

Every round is recorded verbatim there — what was built, every bug found, and the findings worth
keeping. Only a **summary of the latest round** stays below; move it down to `HISTORY.md` when a new
round starts.

### Round 33 — the D-U-N-S landed, AdMob went live, the rewarded skip got a cap (2026-09-14)

- ✅ **D-U-N-S `561683753`** issued (request 102122-10923080), entity **`RAL SOFTWARE SERVICES`** — not "RAL Technologies", so D2 was wrong; the Bahrain CR carries that name, and both stores print the D-U-N-S entity name as the public developer name. **Usable from 2026-09-21**: retrying Apple earlier only fails, because its lookup queries a record D&B has not propagated.
- ❌ **A correction to my own advice:** Play Console organization accounts also require a D-U-N-S validated against D&B, so Play is gated on the same 21 September date. Genuinely unblocked before then: AdMob, RevenueCat, Sentry, the charades image review, and iOS on a real device.
- 🖥️ **Suhaib has a Mac**, which the whole plan had assumed he did not — that assumption is the entire reason `codemagic.yaml` and its `ios-smoke` workflow exist. Local Xcode is now the primary iOS path, and a **free** Apple Account signs a 7-day build onto a real iPhone, so the app can be exercised on device before the $99 membership exists.
- ✅ **AdMob complete (B5 + B10).** Publisher `pub-7138183978612183`, two apps, six ad units and the real `app-ads.txt` line, wired into `.env.production`, `strings.xml` and `Info.plist` and recorded in `docs/ACCOUNTS.md`. Proved rather than assumed: the built bundle contains the real unit ids and **not one Google test id**.
- 🎬 **The rewarded extra skip is capped at ONE per PICK** — not per served question, which is what Suhaib asked for literally, because per question re-opens the chain (every ad hands you a new question carrying its own fresh bonus). `GRANT_SKIP` only refunded a skip, so the button reappeared the instant the refunded skip was spent and a player could sit on one hex watching rewarded ads back to back: bad play, and exactly the repetitive rewarded traffic AdMob treats as invalid. `src/state/store.test.ts` covers refund, refusal and the no-skip-taken case.
- 📈 **Analytics is LAUNCH_PLAN Phase 7b**, required before Suhaib calls the launch fully live: ads served, rewarded offered/started/**completed**, extra-skip usage per pack, Remove Ads purchases/restores/refunds, sessions, and D1/D7/D30. Our own API and Postgres with an `/admin` page, no third-party tracker — another SDK means another consent disclosure and another privacy label for data we already store. The exact report list is open as **D17**.
- 📬 **`.github/workflows/duns-reminder.yml`**: a self-terminating cron that emails Suhaib on 21 Sep and again on the 24th, then stops. Same send path as `backup-watch.yml` (plain text, unique `X-Entity-Ref-ID`, real `reply_to`). Dispatched as a dry run and verified live.
- 💳 **B15 opened** — the AdMob payments profile, 50% by design; see the blocked list.
- ✅ Verified this round: **1129 unit/content tests**, and the CI gate opened per rule 3 rather than trusted from its tick — run 34876855148 ran **19 jobs, all green**: static gates, the API suite on a real Postgres, 10 e2e shards and 4 device-matrix shards. `app-ads.txt` confirmed live on the real domain.


### Round 34 — Phase 7b analytics shipped, the doc split committed (2026-09-15)

- 📉 **CLAUDE.md 154.1k → 22.2k chars.** The build log moved verbatim to `HISTORY.md`; the
  trim existed on disk but had never been committed, which is why every reader still saw
  154.1k. Verified lossless: all 107 headings survive, and every closed-blocker detail was
  found again in `HISTORY.md` / `LAUNCH_PLAN.md` / `docs/ACCOUNTS.md`.
- ✅ **Phase 3b (TV) was already done** and this file's board was wrong to call it open:
  `AndroidManifest.xml` carries leanback + `android:required="false"` touchscreen,
  `src/lib/spatialNav.ts` (268 lines) drives D-pad focus, `tests-e2e/tv-mode.spec.ts` covers it.
- 📈 **Phase 7b analytics built** — our own, no third-party SDK, so no extra consent
  disclosure and no extra store privacy label. `apps/api/src/analytics/analytics.module.ts`
  is one file: `POST /events` (public, batched, max 50, anon install id, optional user id)
  and `GET /admin/analytics?days=N` returning per-name counts, daily actives and D1/D7/D30
  retention off each install's first-seen day. Prisma model `Event` is deliberately
  **FK-free** so QA cleanup and account deletion never rewrite history; migration
  `0002_events`. Client emitter `src/lib/track.ts` buffers 5s and flushes with `keepalive`
  on `pagehide`, and is a no-op when `VITE_API_URL` is unset. Instrumented: `session_start`,
  `ad_served`, `reward_offered` / `reward_started` / `reward_completed`, `extra_skip_used`
  (with `packId`), `purchase`, `purchase_restored`.
- ⏳ **What 7b still lacks:** the `/admin` UI page for the report. The endpoint is the data;
  D17 still decides the exact report list, so building the page first would be guesswork.
- 🧾 `HANDOFF.md` §9 item 6's backend half was superseded — it debugged the retired Supabase
  project, which we left on 2026-09-07.

---

# 🚦 Working rules (Suhaib, 2026-09-05) — READ EVERY SESSION

1. **Never stall waiting on Suhaib.** If something needs him (an account, a payment, a DNS record,
   a store form, an API token), write it down in the **Blocked on Suhaib** list below with the exact
   steps, then **carry on with everything else that is not blocked**. He does his items in one batch
   at the end. Do not ask permission to keep working, and do not park a whole phase because one step
   inside it needs him.
2. **Keep this file updated as you go**, not only at the end of a task — the next session reads it
   first, so it is the handover. **Keep it small:** 150k-char ceiling, only a summary of the LATEST
   round here, previous rounds moved verbatim to `HISTORY.md`, and never duplicate the master plan
   back in (it lives in `LETTERLOCK_MASTER_PLAN.md`).
3. **ALWAYS check CI/CD, every time.** Never report "CI green" from a green tick alone — open the run
   and confirm WHICH jobs ran: `gh run list --limit 5`, then `gh run view <id>` on anything not green,
   and `--log-failed` for the actual error. This rule was written after a session reported "CI green"
   seven times when **no workflow ran a single test** — `deploy-vps.yml` built and shipped to the VPS,
   so the tick only ever meant "the deploy script finished". The gate is `.github/workflows/ci.yml`
   (typecheck, unit + content tests, leak gate, build, Playwright e2e, noscroll matrix, and the API
   suite against a real Postgres service), and both `deploy-vps.yml` and `ota-release.yml` `needs:` it.
   Anything that ships to a user or a server must sit behind it.
4. **Session-budget discipline.** Prefer few, cheap, targeted commands over broad sweeps; do not fan
   out subagents unless the task genuinely needs them; run long suites in the background rather than
   re-reading large files.

## 🛠️ Rules learned the hard way (2026-09-05 cutover night — detail in `HISTORY.md`)

Every one is from a mistake made that evening, several of them user-visible.

1. **Never push file CONTENT through a shell command line.** `ssh "cat > f <<'EOF' $(cat local)"`
   mangles anything the shell touches: the Traefik config contains backticks in its ``Host(`…`)``
   rules, and a hand transfer arrived **missing two routers**, which took the live site to 404. Use
   `python infra/put.py <local> <remote>` (SFTP) and confirm with `md5sum` on both ends. The deploy
   pipeline was never affected — it scps a bundle.
2. **Validate with the real parser before installing or publishing:** `node --check` on a page's
   extracted `<script>`, a duplicate-key-strict YAML loader for configs. An artifact was published
   **completely blank** because `\n` escapes had become real newlines inside a JS string, and PyYAML
   silently accepts duplicate keys, which is how a second `middlewares:` block deleted the first.
   Both are CI gates now.
3. **Building escapes inside a heredoc is unreliable** — `'\n'` came through as a real newline more
   than once. Build the two characters explicitly: `chr(92) + 'n'`.
4. **Back up any live config before editing it** (`cp f f.bak` on the server). That backup restored
   service twice in one evening.
5. **Never run two Playwright suites at once.** They fight over ports 4173/3173 and the e2e database
   and produce 34 phantom failures. Stop the first (`TaskStop`).
6. **Never report CI green from a tick** — open the run and confirm which jobs ran (rule 3 above).
7. **Running the suites that seem relevant is not running the suite.** A `<select>` change was
   verified with vitest, noscroll and checksettings, and broke an e2e test.
8. **Know what auto-deploys before pushing.** Cloudflare Pages still had its Git integration
   connected, so a `main` push silently rebuilt the LIVE site onto a backend that was not ready. Now
   disconnected.
9. **Traefik specifics** (confirmed against the docs via Context7): the file provider only re-reads
   when the watched file is **modified**, and ACME retries sit on a slow ticker, so a domain that
   failed while its DNS was wrong will **not** pick itself up. Appending a comment is not enough,
   because the routers are unchanged and nothing new needs resolving. What works is making Traefik
   see a NEW router: rename the router keys (`sed` limited to the routers line-range **only**, never
   the services), wait for the certificate, then rename them back. Restarting the shared Traefik
   would hit every other tenant on the box and is not acceptable.
10. **A config that has never been executed is not known to work.** In one day: the Android build
    (JDK 17 vs Capacitor 8's Java 21), the API test database (never migrated), the Playwright `pg`
    resolution (stale local `node_modules`), the store-screenshot script (captured the wrong screen),
    `ota-release.yml` (invalid YAML), `deploy.yml` (would have failed every `main` push) and the
    reminder email path. All read correct. All were broken.
11. **Use Context7 for library and tool behaviour** instead of inferring it from symptoms. The
    Traefik answer in point 9 came from the docs in one lookup, after a lot of guessing.
12. **Rehearse any DB migration on dev first, always.** The dev rehearsal failed five times with
    `Permission denied`: `psql` runs as the `postgres` user, the uploaded dump is root-owned, and
    `-f` makes postgres open the file itself. Piping with `<` lets the root shell open it and
    postgres read stdin. That bug would otherwise have surfaced on cutover evening against the real
    database.

> **Supabase cutover: DONE 2026-09-07.** DNS, apex, schema and every row are migrated — users 23,
> profiles 13, leaderboard 219, friendships 4, saved_games 5, question_progress 143, matching
> Supabase exactly. `main` pushes and `workflow_dispatch` workflows are normal again. The full
> cutover procedure (what "off Supabase" actually required) and the historic "do NOT push `main`
> before the DNS exists" ordering rule are kept verbatim in `HISTORY.md`.

## 🔧 Open dev work (mine — NOT blocked on Suhaib, keep it current)

Everything in the product is built except these. Audited 2026-09-15 against `LAUNCH_PLAN.md`
phase by phase, so this is the complete list, not a sample.

| # | What | Why it is not done | Phase | ETA |
|---|---|---|---|---|
| D-a | **TV on-screen number pad for the room code** | Phase 3b asks for a remote-friendly alternative to the system on-screen keyboard. A remote-only player CAN join today (the TV keyboard opens on focus), so this is comfort, not a blocker. | 3b | 0.5d |
| D-b | **`/admin` analytics UI page** | The `GET /admin/analytics` endpoint is live and is the data. **D17 has not decided the report list**, so building the page first is guesswork. | 7b | 1d |
| D-c | **TV 1920×1080 store screenshots** | `scripts/storeshots.mjs` exists but has no TV profile. Only needed at submission, and the Play account does not exist yet (B3). | 6 | 0.5d |
| D-d | **Web → app funnel popup** | Deliberately gated: it can only switch on after BOTH stores approve, or it points players at links that 404. | 6b | 0.5d |
| D-e | **Web ads (AdSense H5)** | Deliberately last: AdSense wants the finished, live site, and a rejection is easier to fix once. | 8 | 2d + approval |
| D-f | **Deeper factual pass on Genius (Extreme) / Hard / `*Extra2` packs** | Mechanically tested and leak-guarded, but not 100% human-fact-checked. Must be Opus per `CONTENT_QUEUE.md` — a cheap model already cost a million tokens here once. | content | 2d |
| D-g | **`HANDOFF.md` §7 inventory is stale** | It stops at rounds 8-9 and predates accounts, online play, ads, purchases and the VPS backend. | doc | 15m |

Nothing else is outstanding: accounts, friends, leaderboard, XP/prestige, online rooms, saves,
OTA, crash reporting, AdMob, Remove Ads, entitlements, admin panel, pack editor, backups,
privacy/terms pages, account deletion, deep-link files, analytics ingest + report, and the
Android/iOS Capacitor projects are all built and covered by CI.

## 🚧 Blocked on Suhaib (living list — keep it current)

✅ **Closed:** B1 + B1b (Cloudflare DNS for the VPS backend, and the apex repointed to it — verified
2026-09-07; rollback is still a 2-minute CNAME back to `letterlock-174.pages.dev`) · B2 (a DNS-capable
Cloudflare token, moot) · B5 + B10 (AdMob ad units wired in, real `app-ads.txt` live — 2026-09-14) ·
B9 (off-box backups: Backblaze B2 `letterlock-backups` via rclone, key in gitignored `infra/b2-creds`
and never a CI secret, rolling 30 days off-box + 14 local, `backup-watch.yml` emails day 1/7/31).
Detail in `HISTORY.md` and `docs/ACCOUNTS.md`.

> ⚠️ **B7 and B8 are NOT quick wins.** A Team ID only exists once the $99 Apple
> enrolment completes, and the Play app-signing SHA-256 only exists once an app is
> created in Play Console. Both therefore sit behind B3 and the 21 September
> D-U-N-S date, not behind five minutes of copy-paste.

| # | What | Exact steps | Blocks |
|---|---|---|---|
| B16 | **AdSense review** (waiting, nothing to do) | Applied 2026-09-15 18:37 for the site **`raltech.dev`** (AdSense only accepts root domains; the subdomain is covered by it). Google says a few days, up to 2-4 weeks. Everything it checks is already live and verified in a real browser: the tag on `letterlock.raltech.dev`, the ownership meta tag on both hosts, `raltech.dev/ads.txt` with the `subdomain=` directive, and NO ad script on the root site. While waiting: never click our own ads (same publisher id as AdMob, so it risks both), and do not edit either `ads.txt`. If it is rejected, the email names the reason. | Phase 8 web ads serving |
| B17 | **H5 Games Ads application** (waits on B16) | Confirmed 2026-09-15: H5 Games Ads is a **by-application** product, separate from the site review, and the form requires an already-approved AdSense account. So the order is B16 approves → apply at https://developers.google.com/ad-placement/docs/signup → Google reviews and emails next steps → only THEN does `adBreak()` serve. Nothing to do until the B16 email lands. **Auto ads stays OFF**: the Ad Placement API is independent of it, and Auto ads would inject display banners into a full-screen no-scroll board and break the layout the device-matrix tests enforce. | `adBreak()` actually serving on web |
| B3 | **Phase 0 paperwork** (in progress) | ✅ Company Apple Account created + verified 2026-09-07 (browser-only, never signed into a phone's iCloud; whichever account enrols permanently owns the listing). ✅ D-U-N-S `561683753` (`RAL SOFTWARE SERVICES`, Bahrain), **usable from 2026-09-21**. ⏳ Still open: Google Play Console ($25, Organization + merchant), RevenueCat, the Google OAuth consent screen, reserving the name in App Store Connect, and the $99/yr Apple Developer Organization enrolment once the D-U-N-S is live. LAUNCH_PLAN §3 Phase 0; every outstanding identifier is in `docs/ACCOUNTS.md`. | Phases 4, 5, 6 going live (the code is already written) |
| B4 | **`VITE_APPLE_SERVICES_ID`** | Apple Developer → Identifiers → Services IDs; return URL `https://letterlock.raltech.dev/auth/callback`. Empty today, which correctly hides the web Sign-in-with-Apple button. | Apple 4.8 compliance at submission |
| B6 | **RevenueCat public keys** | Set `VITE_REVENUECAT_IOS_KEY` and `VITE_REVENUECAT_ANDROID_KEY` (RevenueCat → Project → API keys, the *public* SDK keys). Empty today, so the Remove Ads purchase path is inert. | Phase 5 Remove Ads working on a device |
| B7 | **Apple Team ID in the deep-link file** | `public/.well-known/apple-app-site-association` has the literal `TEAMID`; replace it with the 10-character Team ID (App Store Connect → Membership). | iOS Universal Links (`/join/CODE` opening the app) |
| B8 | **Play app-signing SHA-256** | `public/.well-known/assetlinks.json` has a `TODO:REPLACE:…` fingerprint; copy it from Play Console → Setup → App signing. | Android App Links (`/join/CODE` opening the app) |
| B11 | **Pixabay API key** (optional, 1 min, free) | `scripts/genimages.mjs` works keyless (Wikimedia Commons + Openverse) but tries Pixabay first when `PIXABAY_KEY` is set, which gives better, more on-topic photos for abstract charades prompts. Key at https://pixabay.com/api/docs/, then re-run `RETRY_MISSING=1 node scripts/genimages.mjs`. | Image QUALITY only, not coverage |
| B12 | **Human review of the charades images** | LAUNCH_PLAN Phase 1c says nothing ships unreviewed. Open `docs/charades-review/index.html` (contact sheets, 20 per page) and add anything unsuitable to `public/charades/<packId>/reject.txt` (`<slug>` to refetch, `<slug> !` to force word-only), then re-run the script. | Shipping user-facing images in a family game |
| B13 | **The iOS build has never been run** | The fastest proof is now LOCAL, since Suhaib has a Mac: `npm ci && npm run build && npx cap sync ios && npx cap open ios`, pick a personal team in Xcode, Run — a **free** Apple Account signs a 7-day build onto a real iPhone, so the whole app can be exercised on device BEFORE the $99 membership exists. Codemagic's unsigned simulator-slice **`ios-smoke`** workflow (added 2026-09-08, free tier, no Apple membership, no App Store Connect integration) still proves the Xcode 26 + Capacitor 8 SPM chain; `codemagic.yaml` is covered by the CI YAML parse gate. A signed TestFlight build still needs the paid account. | First store build (signed only) |
| B14 | **Sentry DSN** | Crash reporting is wired and inert: create a free Sentry project (JavaScript → React), set `VITE_SENTRY_DSN` in `.env.production` and as a GitHub Actions variable. Until then a crash still logs to the console, and the 453 KB Sentry chunk is never even fetched (dynamic import). | Seeing white-screen crashes in the wild |
| B15 | **AdMob payments profile** (50%, parked until we earn) | Address + Organization profile done 2026-09-14. Still to submit: **US tax info, the W-8BEN-E entity form** (Payments → Settings → Manage settings → United States tax info; Bahrain has no US treaty, claim no benefit). The **bank/wire fields cannot be filled at all** until payable earnings reach the threshold, when Google posts an address PIN — so this sits at 50% by design. The banner says apps in review stay unreviewed, but AdMob only reviews an app once it is live in a store, so nothing before store launch is blocked by it. Steps in `docs/ACCOUNTS.md` §3b. | First AdMob payout, and AdMob app review after store launch |
