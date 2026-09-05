# 🚀 LAUNCH_PLAN.md: Letterlock to the App Store + Play Store

> **What this is:** the single source of truth for taking Letterlock from a web game to a
> published iOS + Android app that earns money (ads + a one-time "Remove Ads" purchase),
> runs fully on our own VPS instead of Supabase cloud, and stays in sync with the web version.
> Written 2026-09-03 after a research sweep (6 parallel agents, ~300 sources; key links in §14).
> **Any session that touches store launch, ads, purchases, VPS migration, copyright of media,
> or Google sign-in branding must read this first and keep it updated.**
> Companion docs: `TECH.md` (stack reference), `DEFERRED.md` (blocked work), `CLAUDE.md` (build log).
>
> ✅ **All decisions D1-D16 were LOCKED by Suhaib on 2026-09-05 (§2).** This plan is now the build order: any session that starts a phase follows it as written and logs progress in §17.

---

## 0. 🍬 The whole plan in 13 lines

1. **Wrap, don't rewrite.** The React app ships inside a Capacitor 8 shell. One codebase = web + iOS + Android.
2. **Backend leaves Supabase and runs on our VPS, the palmandplate way.** Our own API (NestJS + Prisma) and a plain Postgres database on the Hostinger KVM2 we already run, behind the shared Traefik proxy, deployed by GitHub Actions over SSH. No Supabase software anywhere, no supabase.co in any URL. Web and apps share that one database, so accounts, leaderboards, saves and "ads removed" are identical everywhere. Detail in §2b and Phase 2.
3. **That same move fixes the Google login text.** The consent screen shows the *callback domain*. Ours becomes `api.letterlock.raltech.dev`, then we verify the brand so it reads "Letterlock".
4. **Ads = Google AdMob.** Interstitial only between games, rewarded ads for an extra skip/hint, banner only on menus. Never during a question.
5. **Remove Ads = one non-consumable purchase (~$3.99)** through Apple/Google billing via RevenueCat, mirrored to a `profiles.ads_removed` flag so it follows the *login*, not just the phone.
6. **Purchases are owned by the Apple ID / Google account by default.** Our server flag is what makes them follow the user across iPhone, Android and web. §8 explains this in plain words.
7. **The song, TV-clip and iTunes-melody packs stay on the web and are hidden in the store builds.** Apple's guideline 5.2.5 forbids using iTunes previews "as the soundtrack to a game", and the number of clips does not change that, so the packs are platform-gated (web yes, apps no). The self-made public-domain melodies grow to 200+ for both. Charades images stay, but from licensed, bundled sources (D9).
8. **Hard store requirements we do not have yet:** in-app account deletion, privacy policy + terms pages, Sign in with Apple (mandatory because we offer Google login), PNG icons, offline handling.
9. **"AI-looking code" is a myth.** Neither store checks who wrote the code. They reject thin web wrappers, crashes, placeholders and missing privacy features. §10 is the real checklist.
10. **Paperwork first:** Apple Developer ($99/yr), Google Play ($25 once), AdMob, RevenueCat, a differentiated store name (exact "Letterlock" is already used by other apps).
11. **Ops we must add:** backups, uptime monitoring, crash reporting, a version gate, `app-ads.txt`, and **over-the-air JS updates from day one** (D7) so content waves never wait for a store review.
12. **Realistic money:** ads earn tens of dollars a month at hundreds of daily players. The $3.99 purchase will likely out-earn ads early. Do it for reach and polish, not for quick revenue.
13. **Mobile and TV are first-class targets.** A full mobile experience rehaul (portrait + landscape, no browser bar: native app, PWA standalone, fullscreen) built with the `frontend-stack` pipeline before submission, plus an **Android TV / Google TV** build controlled with the remote (D-pad focus, on-screen keyboard on inputs, 10-foot UI). See §3 Phases 1b and 3b and §16.

**Total effort: ~52 dev days of code + ~12-14 weeks wall-clock to store launch** (store reviews, AdMob approval, TV review), then web ads as the last step. The jump from the earlier ~33 days is the custom backend (D14: ~14 dev days instead of 3), OTA updates now (D7), and licensed charades images (D9). Detail in §12.

---

## 1. 📍 Where we actually are today (audited 2026-09-03)

| Area | Reality | Consequence |
|---|---|---|
| Web hosting | **Cloudflare Pages**, not the VPS (`deploy.yml`). `CLAUDE.md` prose about nginx on the VPS was aspirational. | The VPS currently hosts nothing for Letterlock. Migration = build it from scratch. |
| Backend | Supabase **cloud** project `lkudntyvngwwlzuciocd` (URL + anon key committed in `.env.production`). | The Google consent screen shows that random ref. |
| Supabase surface | Auth (email OTP via Resend edge function, Google OAuth), 9 tables, ~30 RPCs, 12 migrations, Realtime broadcast + presence (3 topics), 2 edge functions, **no Storage**, no `postgres_changes`. | Small and portable: ~30 endpoints + 3 realtime channels to rebuild in our own API (Phase 2). |
| Account deletion | **None** for users (only admin QA cleanup). | Store blocker (Apple 5.1.1(v), Play policy). |
| Privacy policy / terms | **None** anywhere. | Store blocker (both stores + AdMob + Google brand verification). |
| Sign in with Apple | Not implemented. | Required by Apple 4.8 because Google login exists. |
| Native login | No `signInWithIdToken`. | Needed for native Google + Apple sign-in in the app. |
| Icons / PWA | SVG-only favicon, no PNG 192/512/1024, no service worker. | Need real icon set + splash. |
| Routing | Query params only (`?room=`, `?view=controller`). No `/join/CODE` path. | Universal Links match paths reliably, query strings poorly. Add `/join/CODE`. |
| Remote media | **1,624** iTunes song previews, **296** iTunes TV/sitcom clips, ~600 SimpleIcons logos (CDN), flagcdn in Sports, **loremflickr** random photos in 5 charades packs, Google Fonts at boot. | Copyright + reliability + content-safety work (§9). |
| Monetization SDKs | Zero (no Capacitor, AdMob, IAP, Sentry, analytics). | Everything in §4-§7 is new. |
| Dead code | `functions/api/auth/send-otp.ts` (old Cloudflare Function), stale Flutter entries in `.gitignore`. | Delete during Phase 1. |

---

## 2. 🧭 Decisions: LOCKED by Suhaib on 2026-09-05

Every row below is final. "Locked" = what Suhaib chose; "Means" = what the build does because of it.

| # | Decision | Locked | Means |
|---|---|---|---|
| D1 | **Store listing name** | **`Letterlock: Party Quiz`** | Reserve it in App Store Connect + Play Console the day the accounts exist. Bundle id stays `dev.raltech.letterlock`. |
| D2 | **Developer account** | **Organization: RAL Technologies** on both stores (free D-U-N-S number first) | Company name on the listing; Play organization accounts skip the 12-testers / 14-day closed-test rule. |
| D3 | **Song / TV-clip / iTunes-melody packs** | **Web only.** Hidden in the iOS/Android/TV builds. Workaround check done: the clip *count* is irrelevant, the *source* (iTunes previews) is what Apple 5.2.5 and the iTunes API terms forbid, so no reduction makes them store-safe. | Packs get `platforms: ['web']`; the category browser hides them when `Capacitor.isNativePlatform()`. Self-made public-domain melodies grow to 200+ and ship everywhere. A licensed clip vendor (Feed.fm Clips) stays a future option if music packs prove popular. |
| D4 | **Ads placement + Remove Ads price** | **Interstitial after each game**, rewarded ads for an extra skip/hint, banner only on Home/menus. **Remove Ads = $3.99 one-time.** | Never during a question, never on the board, never at app open. Play "Better Ads" + Apple UX rules satisfied. |
| D5 | **Static web hosting** | **Move to the VPS** (same box, served by PM2 behind Traefik). Cloudflare stays DNS only. | Cloudflare Pages is retired at cutover. Everything Letterlock runs on our VPS. |
| D6 | **Target audience** | **13+, not directed at children** | Kids pack stays; no child-directed marketing; standard AdMob ads allowed. |
| D7 | **Over-the-air (OTA) JS updates** | **Yes, now, fully working at launch** | Phase 3c: `@capgo/capacitor-updater` in manual mode pulling bundles from **our own VPS** (no Capgo account needed); Capgo cloud ($12/mo) only as a fallback if the manual path misbehaves. Content waves reach installed apps within minutes; native changes still go through the stores. |
| D8 | **VPS** | **The existing Hostinger KVM2** (srv1167964, 2 vCPU, 8 GB RAM, 100 GB NVMe, Ubuntu, ~5 GB RAM free) that already runs palmandplate, jawhara and custompc. Details pulled from those repos are in §2c. | No new server. Letterlock joins the shared Traefik, uses the existing native Postgres with its own role + databases, and its own PM2 processes. Credentials live only in gitignored `infra/vps-creds` and GitHub Actions secrets, never in tracked files. |
| D9 | **Charades images** | **Keep images, make them clean and legal.** No random Flickr photos. | Phase 1c: one build script fetches a reviewed image per prompt from licensed sources (Pixabay Content License: commercial use, no attribution; Openverse CC0/public-domain as fallback; our own generated illustrations for abstract prompts), resizes to WebP, **bundles them in the apps** (works offline, reviewer-proof) and serves them from our domain on web. Human contact-sheet review before shipping; a credits file per image. |
| D10 | **Logo packs** | **Keep**: bundle the SVGs, trademark disclaimer, drop the Apple logo, removal contact published | How every Logo Quiz app operates. |
| D11 | **Fandom packs** | **Keep** as text trivia, "Unofficial fan trivia, not affiliated" label, rename the Harry Potter and Pokémon packs to descriptive titles, franchise names never in store metadata | Facts are not copyrightable; the two most aggressive rights-holders get extra distance. |
| D12 | **Web ads** | **Yes, but as the very last step**, after the apps are live and AdMob is approved. | Phase 8: Google **AdSense "H5 Games Ads"** (the Ad Placement API made for browser games), same placements as the apps, consent banner, honors `ads_removed`. Plain-words explanation in §6b. |
| D13 | **Web Remove-Ads purchase** | **No.** | The `ads_removed` flag earned in an app still hides web ads for that account. No web checkout, no Paddle/Lemon Squeezy. |
| D14 | **What runs on the VPS** | **Option B, the palmandplate way: our own backend.** No Supabase software at all (not the cloud, not the open-source stack). NestJS 11 API + Prisma 7 + the native Postgres already on the box + Socket.IO for realtime, PM2 processes, Traefik routing, GitHub Actions deploy over SSH. | Phase 2 is a real rewrite of the data layer (~14 dev days): auth (email OTP + Google + Apple) with self-issued JWTs, ~30 REST endpoints replacing the RPC calls, a websocket gateway replacing Supabase Realtime, every row-security policy becoming an explicit `where userId` in a service. The database schema itself carries over (same tables, same UUIDs), so users keep their accounts, XP, friends and saves. |
| D15 | **TV scope at launch** | **Android TV / Google TV only** (Sony, Philips, TCL, Hisense, Xiaomi, Chromecast, Nvidia Shield). LG (webOS) and Samsung (Tizen) later as HTML5 apps. Apple TV not feasible. | Same Android project, TV-enabled, Play TV track. Remote (D-pad) navigation, on-screen keyboard on inputs. |
| D16 | **Mobile rehaul before submission** | **Yes, top priority: beautiful and fully playable.** Phase 1b via the `frontend-stack` pipeline. | Runs before the store builds; store screenshots come from the rehauled UI. |

### Also requested by Suhaib (now in the plan)

| Ask | Where |
|---|---|
| Web home screen pops up "Get the app" with App Store / Play Store links, only after the apps are live | Phase 6b |
| Ads on the web too, at the very end | Phase 8 + §6b |
| OTA updates fully functioning at launch | Phase 3c |
| Full mobile rehaul, portrait + landscape, using `frontend-stack` | Phase 1b |
| TVs with the Play Store, remote control, keyboard pops on text fields | Phase 3b |
| VPS details and config recorded from the jawhara / custompc / palmandplate repos, secrets gitignored | §2c + Phase 2 |
| Charades images kept and made to work properly | Phase 1c |

### 2b. 🧾 "Off Supabase" means exactly this

Suhaib's standing instruction: **we are migrating off Supabase, fully.** Locked as D14 = our own backend.

| | Today | After Phase 2 |
|---|---|---|
| Where the data lives | Supabase's servers (their cloud project) | **Our VPS**, plain Postgres |
| Supabase account / bill / software | Cloud project | **None.** No Supabase cloud, no Supabase open-source stack, no `@supabase/supabase-js` in the app. Project deleted 2 weeks after cutover. |
| Domain users see | `lkudntyvngwwlzuciocd.supabase.co` | `api.letterlock.raltech.dev` |
| Who can switch it off | Supabase | Only us |
| Server software | Supabase's hosted stack | **Our NestJS API + Prisma + Postgres + Socket.IO**, the same shape as palmandplate and jawhara |
| Auth | Supabase Auth (GoTrue) | Our own: email OTP (scrypt-hashed codes, copied from palmandplate), Google (web redirect + native id-token), Apple (native + web), 15-min access JWT + 90-day rotating refresh token |
| Data access | `supabase.from()` / `.rpc()` + row-level security | REST endpoints; every policy becomes an explicit `where: { userId }` in a service |
| Realtime | Supabase Realtime broadcast + presence | Socket.IO gateway (JWT or guest token on the handshake, rooms assigned server-side) |
| Email | `send-otp` edge function → Resend | Resend over SMTP from the API (`@nestjs-modules/mailer`), same as palmandplate |

Wherever this doc says "the backend" or "the API", it means this custom backend on our VPS. Never describe the end state as "on Supabase".

### 2c. 🖥️ Our VPS, as documented in the palmandplate / jawhara / custompc repos (2026-09-05)

**The box** (shared by all RAL projects; nothing here is a secret, the passwords are not in any tracked file):

| Fact | Value | Source |
|---|---|---|
| Provider / plan | Hostinger **KVM2**: 2 vCPU, 8 GB RAM, 100 GB NVMe, ~$8.49/mo | palmandplate `docs/architecture-research.md` |
| Host | `srv1167964`, IPv4 `72.62.16.1`, IPv6 `2a02:4780:28:e6c1::1` | jawhara `infra/vps-creds` (names only), custompc `docs/DEPLOYMENT.md` |
| OS | Ubuntu (24.x; SSH is socket-activated, listens on **22 and 2222**) | jawhara `docs/TROUBLESHOOTING.md` |
| Access | `root` over SSH with a password (key auth still a TODO across RAL). Office IPv4 is ISP-blackholed to this box: the helper scripts fall back to IPv6 automatically. | jawhara `infra/vps.py`, custompc `scripts/kvm.py` |
| Free resources | ~5 GB RAM, ~63 GB disk (mid-2026) | jawhara `PLAN.md` |
| Reverse proxy | **Traefik** in Docker (`root-traefik-1`, owns :80/:443), Let's Encrypt via the `mytlschallenge` TLS-ALPN resolver, dynamic file config in **`/root/traefik-dynamic/`** (hot-reloaded), Docker network `root_default` | custompc `docs/CLAUDE-WORKING-STYLE.md`, palmandplate `deploy/traefik/palmandplate.yml` |
| Postgres | **Native apt install, one instance on localhost:5432**, one role + database per project (palmandplate holds `palmandplate` + `palmandplate_dev`). Jawhara runs its own Postgres 16 containers on :5433/:5434. | palmandplate `scripts/server-setup.sh`, jawhara `PLAN.md` |
| Process model | palmandplate: **PM2** (API on :3000/:3001, SPAs via `pm2 serve dist --spa` on :5173/:5174/:5183/:5184/:4322). jawhara + custompc: Docker containers with Traefik labels. | palmandplate `apps/api/ecosystem.config.js` |
| Deploy | GitHub Actions → SSH → git pull / upload bundle → `prisma migrate deploy` → build → restart. Jawhara's workflow retries SSH 5× across ports 22/2222 because Hostinger intermittently drops fresh connections from GitHub runners. | palmandplate `.github/workflows/deploy-prod.yml`, jawhara `.github/workflows/deploy-staging.yml` |
| DNS | Cloudflare zone `raltech.dev`, A records to the VPS. Traefik's TLS challenge needs **DNS-only (grey cloud)** until the first cert exists; jawhara then flipped to proxied and it kept working. | jawhara `HANDOFF.md`, `PROGRESS.md` |
| Backups | jawhara: `pg_dump` cron 03:30 Bahrain, 14-day rotation, `pg_restore`-verified, no off-box copy yet. palmandplate: none. | jawhara `PROGRESS.md` |
| Existing tenants (do not touch) | palmandplate (API + 2 SPAs), jawhara (db + api containers, pgweb :8081), custompc (frontend container), n8n, docuseal, onecli + its Postgres | custompc `docs/CLAUDE-WORKING-STYLE.md` |

**What Letterlock adds to that box (Phase 2):**

| Item | Value |
|---|---|
| Stack root | `/opt/letterlock` (prod) and `/opt/letterlock-dev` (dev, deployed from the `uat` branch) |
| Database | Two databases on the existing native Postgres: `letterlock` and `letterlock_dev`, role `letterlock`, password generated once with `openssl rand -base64 24` during setup, pasted into GitHub secrets. Postgres never exposed outside localhost. |
| Processes (PM2) | `letterlock-api` :3100, `letterlock-api-dev` :3101 (bound to **127.0.0.1**, not 0.0.0.0), `letterlock-web` :5190, `letterlock-web-dev` :5191 (`pm2 serve dist --spa`). Ports chosen to avoid every port already in use. |
| Traefik | `/root/traefik-dynamic/letterlock.yml` (committed in this repo as `deploy/traefik/letterlock.yml`): routers on `websecure` with `certResolver: mytlschallenge`, services at `http://host.docker.internal:<port>`, `passHostHeader: true`. Websocket upgrade works out of the box in Traefik. |
| Domains | `letterlock.raltech.dev` (web), `api.letterlock.raltech.dev` (API + websockets), `dev.letterlock.raltech.dev`, `api.dev.letterlock.raltech.dev`. Cloudflare A records, grey cloud first. |
| Firewall | `ufw`: OpenSSH (22 + 2222), 80, 443 only. Never open the API ports (palmandplate has 3000 open to the world; do not copy that). |
| Committed config (no secrets) | `deploy/traefik/letterlock.yml`, `deploy/ecosystem.config.js`, `deploy/server-setup.sh` (adapted from palmandplate), `apps/api/.env.example` (variable names), `.github/workflows/deploy-prod.yml` + `deploy-dev.yml` (jawhara's retrying SSH loop), `infra/vps.py` (paramiko helper, reads the gitignored creds file), `deploy/backup.sh` + cron line. |
| Gitignored (secrets) | `infra/vps-creds` (`KVM_HOST`, `KVM_HOST6`, `KVM_USER`, `KVM_PORT`, `KVM_PASS`, `STACK_ROOT`), `infra/db-creds` (`PROD_DB_URL`, `DEV_DB_URL`), `infra/.kvm-known-hosts`, `.env`, `.env.*` except `.env.example`. **Unlike jawhara, Letterlock never commits credentials, private repo or not.** |
| GitHub Actions secrets (names) | `VPS_HOST`, `VPS_USER`, `VPS_PASS`, `DATABASE_URL`, `DATABASE_URL_DEV`, `JWT_SECRET`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `CORS_ORIGINS`, `MAIL_REPLY_TO` |
| RAM budget | ~200-300 MB for the API + ~60 MB per `pm2 serve`; Postgres is already running. Fits comfortably in the ~5 GB free. |

---

## 3. 🗺️ The phases (what happens, what changes, ETA)

Phases 1 and 2 can run in parallel. Phase 0 is paperwork you start today because it has waiting time.

### Phase 0: Paperwork and accounts (you, ~1 hour of forms, 1-2 weeks of waiting)

| Step | Who | Notes | ETA |
|---|---|---|---|
| Get a **D-U-N-S number** for RAL (free, Dun & Bradstreet) | Suhaib | Needed for Organization accounts on both stores | 5-10 business days |
| **Apple Developer Program** ($99/yr) as Organization | Suhaib | Then sign the Paid Apps Agreement, add bank + W-8BEN tax form. Bahrain bank acceptance is unverified; if rejected, a bank in another country is accepted. | 1-3 days after D-U-N-S |
| **Google Play Console** ($25 once) as Organization + **Play merchant account** | Suhaib | Bahrain is officially supported for both developer and merchant registration. Payout in USD by wire. | 1-2 days |
| **AdMob account** | Suhaib | Bahrain supported. Payout $100 threshold, wire. Apps are approved only after they are live in a store. | 1 day, approval later |
| **RevenueCat account** | Suhaib or me | Free under $2,500/month revenue. | 10 min |
| **Google Cloud OAuth consent screen**: app name "Letterlock", logo, homepage, privacy URL, authorized domain `raltech.dev`, verify domain in Search Console | me + Suhaib | Needed for the consent-screen fix (§11) | 30 min + Google review 2-3 days |
| Pick the **store name** (D1) and check it in App Store Connect | Suhaib | | 10 min |
| Decide **VPS** (D8) and give me SSH access | Suhaib | | |

### Phase 1: Store-readiness changes inside the web app (~5 dev days)

Everything here ships to the website too, so it is useful even before the apps exist.

| Change | Files / where | Why |
|---|---|---|
| **Account deletion** (in-app button + confirmation + a web page URL for Play) | New RPC `delete_my_account()` (SECURITY DEFINER: deletes profile rows, leaderboard, friendships, saved game, then `auth.users`), button in `AuthModal.tsx` profile view, page at `/account/delete` | Apple 5.1.1(v), Play account-deletion policy |
| **Privacy Policy + Terms pages** | `public/privacy.html`, `public/terms.html` (static, plain), links in Settings + footer + store listings | Both stores, AdMob, Google brand verification (must be on the same domain as the homepage) |
| **Sign in with Apple** (web + later native) | `auth.tsx`: web Sign in with Apple JS → `POST /auth/apple` on our API (Phase 2.4); Apple config (Services ID, Team ID, `.p8` key; the client secret must be regenerated every 6 months, put a reminder in `MIGRATIONS.md`) | Apple 4.8 |
| **`/join/CODE` path** (keep `?room=` as alias) | `main.tsx` router switch, `LobbyHost.tsx` QR + copy link, nginx SPA fallback | Universal Links / App Links match paths reliably |
| **Offline handling** | `navigator.onLine` + (later) Capacitor Network; non-blocking banner; local play works offline; hide remote-media packs offline; disable Create/Join room; queue `submit_score`/`award_xp` and flush on reconnect | Apple 2.1 (reviewers test in airplane mode and IPv6-only) |
| **Version gate** | `GET /api/app-config` → `{minNative, minBundle, maintenance, message}`; cached locally; "Update required" screen | Lets us retire old app versions and show maintenance notices |
| **Real icons + splash** | 1024 PNG master → `npx @capacitor/assets generate`; PNG 192/512 + maskable for the PWA manifest; `apple-touch-icon.png` | Stores + PWA |
| **Bundle media we legally can** | flags (already local, Sports still hotlinks flagcdn), SimpleIcons SVGs (CC0), Google Fonts files | Offline + review reliability + no CDN dependency |
| **Content changes (D3, D9, D10, D11)** | Remove/convert `songs*.ts`, `musicDecadeClips.ts`, `melodiesExtra.ts` (iTunes part), `movieClips.ts`, `sitcomsClips.ts`; expand `scripts/genclips.mjs` PD library; charades word-only; logos disclaimer + Apple logo removed; fandom labels/renames | §9 |
| **Kill dead code** | `functions/api/auth/send-otp.ts`, Flutter lines in `.gitignore` | Hygiene |
| **`app-ads.txt`** placeholder | `public/app-ads.txt` (AdMob gives the exact line) | AdMob requires it since Jan 2025 |
| Tests | e2e for account deletion, Apple button present, `/join/CODE`, offline banner; noscroll matrix unchanged | Testing mandate |

### Phase 1b: Mobile experience rehaul, portrait + landscape (~6 dev days, `frontend-stack` pipeline)

Suhaib's report: playing on a phone is not great, and in the browser the URL bar eats the screen
in portrait **and** landscape. This phase is a full optimization / revamp / rehaul of the mobile
experience, run through the **`frontend-stack` skill** (style pick, taste floor, guidelines review,
Playwright verify on the device matrix), before any store screenshot is taken.

| Problem | Fix |
|---|---|
| Browser URL bar steals space (portrait and landscape) | Three layers, all shipped: **(1) the native app has no browser chrome at all** (the real fix); **(2) PWA standalone**: an in-app "Add to Home Screen" prompt (iOS Safari share-sheet steps, Android install prompt) so the web version opens full-screen with no bar today; **(3) in-browser**: a "⛶ Fullscreen" button on the board screen using the Fullscreen API on Android Chrome (iPhone Safari does not allow it, so iPhone gets the PWA route), `100dvh`-aware layout so the bar collapsing/expanding never shifts the board. |
| Landscape is cramped | Landscape-first host layout: board left at max height, question + host pad right as one column, header collapses to a slim strip, timer becomes a thin top bar. Phone controller locks to portrait (`screen-orientation` plugin in the app, CSS in browser). |
| Touch targets and thumb reach | Every tappable ≥ 44 pt; host pad and controller answer button anchored to the bottom thumb zone; destructive actions (exit, undo) moved away from the primary thumb path. |
| Small text at arm's length | Type scale re-tuned per breakpoint; question text ≥ 18 px on phones; hex letters scale with the board. |
| Screen dims / locks mid-match | Keep-awake during a match (`@capacitor-community/keep-awake` in the app, Wake Lock API in Chrome). |
| Audio on mobile | Audio unlock on first tap (exists), duck for clips (exists), respect the silent switch on iOS in the app. |
| Low-end Android jank | Motion budget: claim animation + trace stay, ambient particles reduced on `saveData` / low-memory devices; measure with Playwright CPU throttling. |
| Verification | `scripts/noscroll.mjs` matrix (17 devices, incl. landscape phones) stays the gate, plus before/after screenshots per screen per orientation, plus a real-device pass on an iPhone and a mid-range Android. |

### Phase 1c: Charades images, kept and made legal (~3 dev days)

Today the 5 charades packs (~1,100 prompts) load a random Flickr photo at runtime from loremflickr by keyword: unmoderated content in a family game, licenses we cannot honor, and a remote fetch that fails on reviewer networks. D9 says keep the images. So:

| Step | Detail |
|---|---|
| Source order | 1) **Pixabay API** (`safesearch=true`, `editors_choice` first; Pixabay Content License allows commercial use with no attribution and requires downloading rather than hotlinking, which is what we want anyway). 2) **Openverse API** filtered to `license=cc0,pdm` for prompts Pixabay misses. 3) **Our own generated illustration** (flat, consistent style) for abstract prompts such as actions and emotions, where photo search fails. |
| Script | `scripts/genimages.mjs`: one candidate per prompt → resize to 512 px WebP (≤ 40 KB) → `public/charades/<packId>/<slug>.webp` + `credits.json` (source, author, license, URL) per image. Re-runnable; only fetches missing prompts. |
| Human review | Contact sheets (20 per page) rendered to PDF for a quick scan; a `reject.txt` list forces a re-fetch or a generated fallback. Nothing ships unreviewed. |
| Delivery | **Bundled in the app builds** (~1,100 × 35 KB ≈ 40 MB, fine for both stores) so the QR secret-prompt page works offline and on Apple's review network; **served from our domain on web**, lazy-loaded, cached by the service worker. |
| Fallback | `onError` still shows the word only (existing behavior), so a missing file can never break a game. |
| Credits | Settings → "Image credits" screen generated from `credits.json` (Openverse CC-BY items would need it; CC0/Pixabay/own do not, we show them anyway). |
| Gate | `scripts/checkmedia.mjs` extended: every charades prompt has a local image, every image ≤ 60 KB, no remote URL left in any pack. |

### Phase 2: Backend off Supabase, onto our VPS, the palmandplate way (~14 dev days + a cutover evening)

**Answer to "will this continue for our app?" Yes.** The website, the phone apps and the TV build all talk to `https://api.letterlock.raltech.dev`, our own API. Same database, same accounts, same leaderboards, same saved games, same `ads_removed` flag. After cutover there is no Supabase anything (§2b). The VPS facts and the exact ports/paths are in §2c.

**What we copy (proven in palmandplate + jawhara, same box):** NestJS 11 + Prisma 7 with `@prisma/adapter-pg`, native Postgres, the scrypt email-OTP auth service, refresh-token rotation with replay detection, Resend over SMTP, global `ValidationPipe` + throttler + Swagger, PM2 + Traefik file-provider routing, GitHub Actions deploy over retrying SSH, `/healthz` deploy gate, Socket.IO gateway with the token verified on the handshake, nightly `pg_dump` cron. **What we add that neither repo has:** Google + Apple sign-in, guest tokens for phones that join a room without an account, an off-box backup copy, uptime monitoring.

| Step | Detail |
|---|---|
| 2.1 Provision (0.5 d) | Adapted `deploy/server-setup.sh`: create role `letterlock` + databases `letterlock`, `letterlock_dev` on the existing Postgres; `/opt/letterlock{,-dev}`; PM2 already installed; `ufw` unchanged (22/2222/80/443). Add `deploy/traefik/letterlock.yml` to `/root/traefik-dynamic/`. Cloudflare A records (grey cloud until certs exist). |
| 2.2 API skeleton (1 d) | `apps/api` (NestJS 11, Prisma 7, Node 20, Bun for install/build like palmandplate). `GET /healthz` (`SELECT 1`), Swagger at `/docs`, `CORS_ORIGINS` env-driven from day one, RFC-7807 error filter + Prisma exception filters copied from jawhara. |
| 2.3 Schema (1 d) | `prisma db pull` against a dump of today's `public` schema → `schema.prisma` with the same 9 tables and UUID keys, plus `users` (id = the old `auth.users.id`, email, google_sub, apple_sub, created_at), `otp_codes`, `refresh_tokens`, `guest_tokens`. Drop `otp_attempts` (throttler replaces it). The 34 SQL functions are kept **as SQL** in the first migration where they are pure data logic (leaderboard paging, global ranks, username cooldown, XP award) and called through `$queryRaw` with the user id passed as a parameter instead of `auth.uid()`; only the trivial ones become TypeScript. Fastest correct port, and the fuzz-tested logic stays intact. |
| 2.4 Auth (3 d) | Copy palmandplate's `auth.service.ts`: `POST /auth/otp/request` (6-digit code, scrypt-hashed, 10-min expiry, 60-s resend lock, 3 per email and per IP per 5 min like today), `POST /auth/otp/verify` (5 attempts, `timingSafeEqual`), 15-min access JWT + 90-day opaque refresh token stored as SHA-256 with rotation + replay detection, `POST /auth/refresh`, `POST /auth/logout`, `DELETE /auth/me` (store-required account deletion, cascades). **New:** `GET /auth/google` → Google with `redirect_uri=https://api.letterlock.raltech.dev/auth/google/callback` (this is the consent-screen fix, §11) → one-time code handed to the SPA → tokens; `POST /auth/google/native {idToken}` verified with `google-auth-library`; `POST /auth/apple {identityToken}` verified against Apple's JWKS with `jose` (native + web Sign in with Apple JS). `POST /auth/guest` issues a 24-h guest token for phones joining a room without an account. `JwtAuthGuard` + `RolesGuard` (`player` / `moderator` / `admin`) + `@CurrentUser()`. |
| 2.5 Data endpoints (3 d) | ~30 routes replacing the 22 RPC calls + 6 table accesses: `/me` (profile, username claim/change with the 30-day rule, avatar), `/leaderboard/:pack` (paged), `/ranks` (+ mine), `/xp` (award, prestige), `/friends` (list, request, respond, remove, block, find), `/saves` (one per user), `/progress` (question progress), `/packs/custom`, `/rooms/:code/members` + awards, `/admin/*` (list users, role, ban, grant XP, reset, full access). **Every one of today's 23 row-security policies becomes an explicit `where: { userId }` in a service method**, enumerated in a checklist before cutover, because that is where migrations silently lose authorization. Input validation with class-validator DTOs; `award_xp` clamps stay server-side. |
| 2.6 Realtime (2 d) | `@nestjs/websockets` + `@nestjs/platform-socket.io` gateway copied from jawhara: token (user or guest) verified on the handshake, rooms assigned server-side (`room:<CODE>`, `user:<id>`, `presence:online`). Events mirror today's three channels: lobby broadcast + presence (host ↔ phones), friends presence, friend notifications. Host reconnect re-sends the current `match_started` / `question_served` state exactly as today. Single instance; Redis adapter only if we ever run two. |
| 2.7 Client rewrite (3 d) | Remove `@supabase/supabase-js`. `src/lib/api.ts` (axios, `VITE_API_URL`, single-flight refresh queue copied from palmandplate), `AuthProvider` on React Context, tokens in localStorage under `ll_*` (Capacitor Preferences in the apps). `src/lib/lobby.ts` and `friends.ts` on `socket.io-client`. Every `.rpc()` / `.from()` call becomes a typed API call. The `auth-username-gate` and reconnect-matrix e2e suites are re-pointed at a mocked API and must stay green. |
| 2.8 Data migration (0.5 d) | From Supabase: `pg_dump --data-only --use-copy` of the 9 public tables + a CSV of `auth.users` (id, email, created_at) and `auth.identities` (Google `sub`) → `psql --single-transaction` into `letterlock`. UUIDs preserved, so every foreign key survives. **Users sign in again once** (new token system); their username, XP, friends, saves and leaderboard rows are all there. |
| 2.9 CI/CD (1 d) | `deploy-prod.yml` (push to `main`) and `deploy-dev.yml` (push to `uat`): build on the runner, upload a bundle, SSH with jawhara's 5× retry over ports 22/2222, `bunx prisma migrate deploy`, `pm2 start deploy/ecosystem.config.js`, `pm2 save`, poll `/healthz` for `db:true`, print the last 50 log lines on failure. Web: `pm2 serve dist 5190 --spa`. `qa-cleanup.yml` → `DELETE /admin/users` with a CI token. Remove every Cloudflare Pages and Supabase step. |
| 2.10 Backups + monitoring (part of Phase 7, but first) | `deploy/backup.sh`: nightly `pg_dump -Fc` of both databases, 14-day local rotation (jawhara's script) **plus** `rclone` copy to B2/S3 (the piece jawhara never finished). Uptime Kuma on `/healthz` and the websocket. |
| 2.11 Cutover (an evening) | Low-traffic evening: final dump → restore → deploy web with `VITE_API_URL` → smoke test (OTP, Google, Apple, room host + phone, leaderboard, save/resume) → flip DNS `letterlock.raltech.dev` from Cloudflare Pages to the VPS. Keep the Supabase project alive 2 weeks as rollback, then delete it. |

**Why ~14 days and not 3:** Option A (running Supabase's open-source stack) would have been a URL change. Suhaib chose no Supabase software at all, so auth, data access and realtime are rewritten. The upside is one house pattern across RAL (palmandplate, jawhara, Letterlock), zero dependence on Supabase's roadmap, and a backend any RAL developer already knows.

### Phase 3: The Capacitor apps (~5 dev days)

| Step | Detail |
|---|---|
| Add Capacitor 8 | `npm i @capacitor/core @capacitor/cli`, `npx cap init "Letterlock" dev.raltech.letterlock --web-dir dist`, `npx cap add ios android`. Requirements: Node 22+, Xcode 26 (via Codemagic), Android Studio, minSdk 24, targetSdk 36. `server.hostname: "letterlock.raltech.dev"` so the WebView origin matches our domain. |
| Plugins | `@capacitor/app` (deep links, Android back button), `browser`, `haptics` (web `vibrate` is a no-op in iOS WebView), `share`, `network`, `status-bar`, `splash-screen`, `keyboard`, `preferences`, `screen-orientation`. |
| Native sign-in | `@capgo/capacitor-social-login` → Google + Apple ID tokens → `POST /auth/google/native` / `POST /auth/apple` on our API, which verifies them and issues our tokens. Never OAuth inside the WebView (Google returns `403 disallowed_useragent`). This also removes any consent-screen domain text on mobile entirely. |
| Deep links | `apple-app-site-association` at `/.well-known/` (paths `/join/*`), `assetlinks.json` with the Play App Signing SHA-256, `App.addListener('appUrlOpen')` → join room. QR codes point at `https://letterlock.raltech.dev/join/CODE`: app opens if installed, website otherwise. |
| Storage durability | iOS can evict WebView localStorage under disk pressure. Mirror settings/saves/progress to `@capacitor/preferences`; the account save on the server stays the durable copy. |
| WebView specifics | `allowsInlineMediaPlayback` on iOS, Web Audio unlock on first tap (already done), `user-scalable=no`, `touch-action: manipulation`, `user-select: none` on game surfaces, `allowsLinkPreview: false`, Android 16 edge-to-edge (safe-area CSS already there). nginx must send CORS for `capacitor://localhost` and `https://localhost` on anything the app fetches from our domain. |
| Android back | Close modal / exit-confirm dialog / go home; never a dead end. |
| CI builds | **Codemagic** (500 free macOS minutes/month) with `codemagic.yaml`: iOS signing via App Store Connect API key → TestFlight; Android AAB → Play internal track. Ionic Appflow is shutting down (do not use). |
| Versioning | One semver for the web bundle; a separate native version bumped only when native code/plugins change. Every app release = same commit as the web release. |
| Tests | Playwright still drives the web build (same DOM). Add a device pass on a real iPhone + Android for audio, video fullscreen, deep link, back button, offline. |

### Phase 3b: TV support, Android TV / Google TV, controlled with the remote (~5 dev days)

**Which TVs have the Play Store:** Android TV / Google TV sets: **Sony, Philips (TP Vision models
sold in Europe, Middle East, Asia), TCL, Hisense (most), Sharp, Xiaomi, Nvidia Shield, Chromecast
with Google TV, onn.** **Not:** LG (webOS, LG Content Store), Samsung (Tizen, Samsung TV Apps),
Roku TVs, Apple TV. LG and Samsung both accept HTML5 apps in their own stores, so the same web
build can be packaged for them later (§16). Apple TV has no web view, so it is out; AirPlay
mirroring from an iPhone/iPad and Chromecast from Android/Chrome already work for the board screen.

| Area | What we do |
|---|---|
| Play Store TV listing | Same Android project, TV-enabled: `LEANBACK_LAUNCHER` intent filter, `android.software.leanback` (required=false) + `android.hardware.touchscreen` (required=false) so one app serves phones, tablets and TVs; 320×180 TV banner; 1920×1080 TV screenshots; opt into the Android TV track (separate TV review against the Android TV quality checklist: D-pad navigable, focus always visible, no touch-only paths, no portrait, Back behaves). |
| Remote control (D-pad) | The TV remote arrives in the WebView as keyboard events (Arrow keys, Enter, Back). Add a **spatial focus manager**: arrows move focus to the nearest focusable control in that direction, Enter activates, Back closes the top-most modal or asks to exit. The hex board already supports keyboard play: arrows move a cursor across hexes, Enter picks. Roving `tabindex`, one focus ring style that is big and high-contrast. Ponytail rung: a small nearest-rectangle function first; a spatial-navigation library only if it falls short. |
| Text and numbers on TV | Focusing an `<input>` on Android TV opens the system on-screen keyboard automatically; Enter submits, Back dismisses. We keep TV inputs to the minimum (room code, username) and add a big on-screen **number pad** for the room code as a remote-friendly alternative. Never rely on hover. |
| 10-foot UI | Body text ≥ 24 sp, headings ≥ 48 sp, 5 % overscan margin (TV safe area, already planned), high-contrast palette (blue/amber already TV-safe), no small chips, no scroll-only lists: everything reachable by focus. Ads: banner off on TV, interstitials still between games only. |
| Roles on a TV | (a) TV as the **shared board** while phones are controllers (the Phase-2 model, best experience); (b) TV alone with the remote in host-adjudicated mode. Both must work with remote only. |
| Audio | A remote press counts as the user gesture for audio unlock. |
| Testing | Android TV emulator (1080p) in Android Studio for the real remote path; Playwright at 1920×1080 with **keyboard-only navigation** as a permanent e2e ("TV mode": no mouse, no touch, every screen completable with arrows + Enter + Escape); the noscroll matrix already has TV 1080p and 4K profiles. |

### Phase 3c: Over-the-air updates, live at launch (D7, ~2 dev days)

| Item | What |
|---|---|
| Plugin | `@capgo/capacitor-updater` in **manual mode** (no Capgo account): the app asks **our API** `GET /app-config` → `{ latestBundle: { version, url, sha256, minNative } }`, downloads the zip from `https://api.letterlock.raltech.dev/bundles/<version>.zip`, verifies the checksum, `set()`s it, and calls `notifyAppReady()` once the new bundle boots. If the new bundle fails to call `notifyAppReady()` within 10 s the plugin **auto-rolls back** to the previous one. |
| Release flow | CI on an `ota-*` tag (or every push to `main`, flagged): `npm run build` → zip `dist/` → upload to `/opt/letterlock/bundles/` → update `app-config`. Web and apps get the same commit within minutes. |
| Rules | OTA changes **JS, CSS, content and images only**. Anything native (new Capacitor plugin, permissions, SDK bump) goes through the stores, and `minNative` blocks old shells from loading a bundle they cannot run. Apple allows this (guideline 3.3.2: interpreted code that does not change the app's primary purpose). |
| Channels | `production` and `beta` (RAL team phones) so a wave is tested on real devices before everyone gets it. |
| Fallback | If the manual path proves flaky in testing, switch to Capgo cloud (Solo, $12/mo, 2,000 MAU) with the same plugin. Decision recorded here so no session re-debates it. |

### Phase 4: Ads (~2 dev days + AdMob approval 1-2 weeks after store launch)

| Step | Detail |
|---|---|
| SDK | `@capacitor-community/admob` (banner, interstitial, rewarded, UMP consent, ATT helper). AdMob only, no mediation until real volume. |
| Consent | UMP form on every launch before ads (GDPR/EEA + UK + US states messages configured in AdMob), "Privacy options" entry in Settings so consent can be revoked. iOS: ATT prompt with a short pre-prompt; most users deny, ads become non-personalized (lower eCPM, still allowed). Add SKAdNetwork ids to Info.plist. |
| Placement (D4) | `Victory` / between games in Bo3-Bo5: interstitial, capped 1 per 3-5 min, never at app open, never mid-question, never on the phone controller while a question is live. Rewarded: "watch to get an extra skip" (host) / "hint". Banner: Home, Category menu, Settings, Lobby waiting. **Never on the board.** |
| Gate | `if (!adsRemoved && consentDone) show()` with the platform SDK chosen by `isNative` (AdMob in the apps, AdSense H5 on web after Phase 8). Until Phase 8 the web shows no ads. |
| Compliance | `app-ads.txt` on the domain listed in the store; declare "Contains ads"; App Privacy labels + Play Data safety include AdMob's collection; age rating consistent with ad content. |
| Test | AdMob test unit ids in dev; never ship test ads (Apple 2.1). |

### Phase 5: Remove Ads purchase (~3 dev days)

| Step | Detail |
|---|---|
| Products | App Store Connect + Play Console: non-consumable `remove_ads`, $3.99 tier (auto per-country pricing). Enable Family Sharing on iOS (Play has no IAP family sharing). |
| SDK | `@revenuecat/purchases-capacitor`. Entitlement `no_ads`. `Purchases.logIn(letterlockUserId)` at sign-in so anonymous purchases merge into the account. Restore behavior: **Transfer** (entitlement follows the last account that restores; prevents one purchase unlocking unlimited accounts). |
| UI | "Remove Ads" card in Settings + a small button near ads; **"Restore Purchases"** button (Apple requires it). Success = ads gone instantly + confetti. |
| Server sync | RevenueCat webhook → `POST /webhooks/revenuecat` on our API (shared-secret header) → `profiles.ads_removed = true/false` + `ads_removed_source`, `ads_removed_at`, `rc_app_user_id`. Handles refunds automatically (RevenueCat consumes Apple Server Notifications v2 + Google RTDN). Only the webhook handler writes the flag; users read it via `/me`. |
| Client rule | **Ads hidden if the store says this device's store account owns it OR the signed-in account has `ads_removed = true`.** Cached locally for offline. |
| Web | The same flag hides web ads once Phase 8 ships. No web purchase (D13). |
| Test | Sandbox testers (Apple) + license testers (Play): buy, restore, refund → revoked, second device with same account → still no ads. |

### Phase 6: Store submission (~2 dev days of work + 2-4 weeks waiting)

| Step | Detail |
|---|---|
| Assets | Icon 1024 (iOS) / 512 (Play), Play feature graphic 1024×500, screenshots from the **real build**: iPhone 6.9" (1320×2868), iPad 13" (2064×2752, we support iPad since it is the shared screen), Play phone + 7"/10" tablet. No logos or franchise names in screenshots. |
| Listing | Name (D1), subtitle, description, keywords, support URL, marketing URL (same domain as `app-ads.txt`), privacy policy URL, account-deletion URL (Play). |
| Forms | Apple: App Privacy labels (our backend + AdMob + RevenueCat data), new 2025 age-rating questionnaire, `ITSAppUsesNonExemptEncryption = false`. Play: Data safety, IARC content rating, target audience 13+, "Contains ads", Play Billing declaration. |
| Review notes | Demo room code flow, a test account, how to play host and player, explanation of offline behavior. Reviewers must be able to reach every feature. |
| Play closed test | Personal account: 12 testers opted in for 14 days before production. Organization account: exempt. Start the internal/closed track the day Phase 3 builds. |
| TestFlight | Internal testers immediately; external testers need a light TestFlight review. |
| Submit | Play review hours to days; Apple 24-48 h typical. First submissions often get one rejection round: budget a week. |

### Phase 6b: Web → app funnel, switched on after both stores approve (~0.5 dev day)

| Item | What |
|---|---|
| iOS Safari | `<meta name="apple-itunes-app" content="app-id=<id>, app-argument=https://letterlock.raltech.dev/join/CODE">`: Safari's native Smart App Banner, free, and it deep-links into the same room. |
| Everyone else on a phone browser | A dismissible bottom sheet on **Home** only: "Play Letterlock in the app" with the official App Store and Google Play badges (used per their brand guidelines), shown only on mobile browsers (not inside the apps, not on desktop, not on TV), remembered for 14 days after dismissal, never blocking the game. Links carry `utm_source=web` so the stores show where installs come from. |
| Switch | `app-config.storeLinks` from the API: empty until both apps are live, so nothing shows before launch. |
| Rule | Never mention prices or "cheaper than the app" anywhere (Apple 3.1.3). The popup promotes the app, nothing else. |

### Phase 7: Keep it alive (ops, ~2 dev days, then ongoing)

| Item | What |
|---|---|
| Backups | Nightly `pg_dump -Fc` of `letterlock` + `letterlock_dev` + a copy of the env files → 14-day local rotation + `rclone` to B2/S3, 30-day retention, quarterly restore test. Neither palmandplate nor jawhara has the off-box copy yet; Letterlock ships it first. |
| Uptime | Uptime Kuma (Docker, joins the Traefik network): website, `GET /healthz` (`db:true`), a Socket.IO connect probe, `/app-config`. Alerts to your phone. |
| Crashes / errors | Sentry free tier (`@sentry/capacitor` + `@sentry/react`), plus Play Console vitals (Play hides apps above 1.09% crash / 0.47% ANR) and Xcode Organizer. |
| Analytics | Store built-ins first (free, no consent prompts). PostHog (free tier or self-hosted) if we want funnels. No Firebase Analytics (ad-id consent burden). |
| Network monitoring in-app | Capacitor Network listener + banner + queued writes (Phase 1/3). Yes, we need it: reviewers and real users both hit offline. |
| Maintenance flag | `/api/app-config.maintenance` shows a banner and blocks online rooms during VPS maintenance. |
| Updates | Node/PM2/Postgres upgrades are manual and announced; `npm audit` in CI; fail2ban + move to SSH keys (a TODO shared with the other RAL repos). |
| Recurring chores | Apple client secret for Sign in with Apple every 6 months; Play target API bump yearly (API 36 required since Aug 2026); Xcode major bump yearly (Xcode 26 required since Apr 2026); Apple age-rating and privacy label updates when SDKs change. |
| Content takedowns | Publish `legal@` contact + a removal SOP: pull a pack within 48 h of a rights-holder complaint (logos, fandoms). |

---

### Phase 8: Web ads, the very last step (D12, ~2 dev days + AdSense approval)

Runs only after the apps are live, AdMob is approved, and `app-ads.txt` / `ads.txt` sit on the domain. Plain-words explanation of how web ads differ from app ads is in §6b.

| Step | Detail |
|---|---|
| Account | Apply for **Google AdSense** on `letterlock.raltech.dev` (needs the privacy policy, terms, real content pages, no placeholders). Then request **H5 Games Ads** access (a second gate inside AdSense, made for browser games). Approval days to weeks; a rejection can be re-applied after fixes. |
| Integration | The **Ad Placement API**: one `adsbygoogle.js` tag with `data-ad-frequency-hint="120s"`, `adConfig()` at boot, `adBreak({type:'next', ...})` at the exact same moments as the apps (after a game), `adBreak({type:'reward', ...})` for the extra skip/hint. Google handles the consent message for EEA/UK (Consent Management enabled in AdSense). |
| Gate | Same `ads_removed` flag: a signed-in player who bought Remove Ads in an app sees no web ads either. Never on the board, never during a question, never on the TV build. |
| Files | `ads.txt` next to `app-ads.txt`; both list the AdSense and AdMob publisher lines. |
| Reality | eCPM on web games is lower than in apps; expect pocket money at current traffic. It is done for completeness and because it costs two days, not for revenue. |

---

## 4. 🔄 How web and apps stay in sync

- **One repo, one build.** `npm run build` produces `dist/`; the website serves it, `npx cap sync` copies the same `dist/` into the iOS and Android projects. Same commit = same game.
- **One backend.** Everything reads `api.letterlock.raltech.dev`. A leaderboard row posted from an iPhone appears on the web instantly.
- **Release rule.** Web deploys on every push (as today, now to the VPS). App **bundles** go out over the air on the same push (Phase 3c), so content waves reach installed apps in minutes. Native shells go out on a tag (`app-v1.2.0`) only when something native changed; `minNative` keeps old shells from loading a bundle they cannot run.
- **Version gate.** Old app versions can be forced to update via `minNative` when the API changes in a breaking way.
- **Feature flags by platform.** `isNative` (Capacitor) gates ads, IAP, haptics plugin, native login. Web keeps the current behavior.

---

## 5. 💰 Costs

| Item | Cost |
|---|---|
| Apple Developer Program | $99 / year |
| Google Play Console | $25 once |
| D-U-N-S number | free |
| AdMob, AdSense, RevenueCat (<$2.5k/mo), Sentry (5k errors/mo), Uptime Kuma, Codemagic (500 min/mo), our own backend, OTA from our VPS | free |
| VPS | already paid (the shared Hostinger KVM2, ~$8.49/mo across all RAL projects); Letterlock adds ~300 MB RAM |
| Offsite backups (B2/S3) | ~$1-2 / month |
| Store cut | 15% of purchases (Apple Small Business Program, Google first $1M) |
| Optional later: Capgo cloud $12/mo (only if manual OTA misbehaves), licensed music clips (quote needed), Pixabay API is free |

---

## 6. 📣 Ads: what to know

- **Placement rules are law, not taste.** Play's "Better Ads" policy (since Sep 2024) forbids interstitials at app open, before a level, mid-action, or when leaving. Natural break = end of a game. Rewarded ads are always allowed because the user opts in.
- **Consent is mandatory** in the EU/UK (Google-certified CMP = the UMP SDK) and recommended everywhere. On iOS, ATT is Apple's tracking prompt; declining it is fine, ads still show, just untargeted.
- **AdMob approval happens after launch.** They verify `app-ads.txt` on our domain and review the live store listing. Until then ads serve limited.
- **Money reality (eCPM = revenue per 1,000 ad views):** interstitial ~$10 US / ~$5 EU / ~$1-4 MENA; rewarded ~$16-20 US; banner ~$1. A party game shows maybe 2-3 interstitials per 30-minute session for a whole room on one device. **300 daily players ≈ $10-40 a month. 3,000 ≈ $100-400.** The remove-ads purchase will likely be the bigger line early.
- **Classroom / TV use.** Ads on a projected shared screen are annoying; the interstitial-only-between-games rule protects that. An education/no-ads license is a later option.

---

## 6b. 🌐 Web ads explained (D12), and why they come last

- **Apps and websites use different Google products.** Apps use **AdMob** (an SDK inside the app). Websites use **AdSense** (a script on the page). Same Google account, two separate approvals, two separate publisher ids, two separate payout lines.
- **Normal AdSense hates game pages.** Its reviewers look for text content; a page that is one canvas and a few buttons gets "low value content" rejections. Google built a special program for this: **H5 Games Ads** (the "Ad Placement API"). It shows full-screen ads between rounds and rewarded ads on request, exactly like the app placements. You need AdSense approval first, then H5 program access.
- **Why last:** (1) approval needs the finished privacy/terms pages and a live, polished site; (2) a rejected AdSense application leaves a mark that slows later approvals, so we apply once, when everything is ready; (3) AdMob approval and the store listings must exist for `app-ads.txt` anyway, and both files live on the same domain; (4) money: web game eCPM is roughly half of app interstitials, and most of our traffic will move to the apps.
- **Consent:** Google's own consent message (built into AdSense) covers EEA/UK; nothing else to build.
- **Remove Ads on web:** honored through the account flag (bought once in an app, gone everywhere). No web checkout (D13).
- **Never:** ads on the board, during a question, on the TV build, or in the phone controller while a question is live. Same rules as the apps.

---

## 7. 🛒 Remove Ads: options chosen

| Choice | Picked | Rejected |
|---|---|---|
| Billing | Apple In-App Purchase + Google Play Billing (mandatory for digital goods) | Stripe inside the app (instant rejection) |
| SDK | RevenueCat (free under $2.5k/mo, does receipt verification, refunds, restore, cross-platform entitlements, webhooks) | `cordova-plugin-purchase` / `@capgo/native-purchases` (free, but we would write and host receipt verification, Apple notifications, Google Pub/Sub RTDN, reconciliation jobs) |
| Type | Non-consumable, one-time, ~$3.99 | Subscription (wrong vibe for a family game) |
| Web | Web ads as the last phase (AdSense H5 Games Ads); the account flag hides them for buyers; **no web purchase** (D13) | Selling on web and advertising it inside the iOS app (Apple 3.1.3 outside the US) |

---

## 8. 🎓 Education: how do we know who bought "Remove Ads"?

**The short answer:** the *store account* (Apple ID on iPhone, Google account on Android) owns the purchase. Our login does not, unless we copy it there ourselves. We do both.

**Plain-English model:**

1. Someone taps "Remove Ads" on an iPhone. Apple charges their Apple ID and records "Apple ID X owns `remove_ads`". Google does the same on Android with the Google account. Our Letterlock account is invisible to Apple and Google.
2. On the same Apple ID, a new phone or a reinstall: tap **Restore Purchases** and Apple re-grants it, no login of ours needed. Apple requires this button to exist. On Android the billing library re-grants automatically.
3. An iPhone purchase does **not** appear on Android, and neither appears on the website. Different stores, no bridge. **Only our server can bridge them.**
4. Store receipts can be faked on a jailbroken phone, so the thing that matters (our `ads_removed` flag) is only ever written after **server-side verification**. RevenueCat verifies with Apple/Google and calls our webhook; we write `profiles.ads_removed = true`.
5. From then on, iPhone, Android and web all read that one flag when the user is signed in. **Ads are hidden if EITHER the store says this device owns it OR the signed-in account has the flag.**

**The rule set we implement:**

| Situation | What happens |
|---|---|
| Buys as a guest, signs in later | RevenueCat starts anonymous; at sign-in we call `logIn(userId)` and the purchase merges into the account, flag set. |
| Same person, second device, different Apple ID / Android | Store restore fails (different store account) but the account flag is true → no ads. This is the whole point of the flag. |
| Two of our accounts share one Apple ID (family iPad) | Entitlement **transfers** to whoever restores last. Only one account holds it at a time. Prevents one $3.99 unlocking unlimited accounts. |
| Refund / chargeback | Apple/Google notify RevenueCat → webhook → flag set to false, reason recorded. |
| Family Sharing (iOS only) | Enabled: family members' devices get it via the store. We do not write the flag to their accounts; they hold it through the store only. |
| User deletes their account | Flag is gone with the account. Restore Purchases re-creates it on that store account. |
| Buys on web (later) | Server sets the flag directly. Apps honor it when signed in. Guests on mobile cannot see a web purchase until they sign in. |

**Data we store:** `profiles.ads_removed boolean`, `ads_removed_source text` (apple / google / web), `ads_removed_at timestamptz`, `rc_app_user_id text`. Nothing else. No card data ever touches us.

---

## 9. ⚖️ Copyright verdicts per content type

| Content | Legal risk | Store risk | Verdict |
|---|---|---|---|
| Guess the Song (1,624 iTunes 30-s previews) | HIGH | HIGH | **Web only (D3).** Hidden in every store build via `platforms: ['web']`. Apple 5.2.5: previews "may not be used for their entertainment value (e.g. ... the soundtrack to a game)"; iTunes API terms: promo use only, must show the track name + buy link (which would spoil the answer). The clip count does not change this, so no reduced version is store-safe. |
| TV Show / Sitcom clips (296 iTunes video previews) | HIGH | HIGH | **Web only (D3).** Same terms. |
| Guess the Melody, iTunes part (~212) | HIGH | HIGH | **Web only (D3).** |
| Guess the Melody, our 23 synthesized public-domain WAVs | LOW | LOW | **Keep, bundle, grow to 200+** (classical, folk, anthems, nursery, pre-1930 songs). Compositions are PD, the recording is ours. |
| Logos (~600 SimpleIcons SVGs) | MEDIUM | MEDIUM | **Keep** with disclaimer ("all logos are trademarks of their owners"), bundle the SVGs (CC0), remove the Apple logo, no logos in marketing, removal-on-request contact. Logo Quiz apps with 60M downloads live this way. |
| Flags | LOW | LOW | Bundle everything (public domain). Sports pack still hotlinks flagcdn: switch to local files. |
| Charades images (loremflickr today) | HIGH | MED-HIGH | **Keep images, change the source (D9, Phase 1c):** licensed (Pixabay Content License / CC0 / our own illustrations), human-reviewed, bundled in the apps, credits screen. loremflickr removed entirely. |
| Fandom packs (17, text only) | MEDIUM | LOW-MED | **Keep** with "Unofficial fan trivia, not affiliated" label, franchise names never in store metadata, rename the Harry Potter and Pokémon packs to descriptive titles, publish a takedown contact, remove within 48 h on complaint. Facts are not copyrightable. |
| Movies & TV / Music text trivia | LOW | LOW | Keep. |
| Google Fonts | LOW | LOW | Bundle the font files (OFL/Apache). |

**Why no cheaper music path exists:** Spotify removed preview URLs for new apps (Nov 2024); Deezer's API is non-commercial only and stopped issuing tokens; MusicKit requires every player to have an Apple Music subscription and forbids indirect monetization. Every surviving music-quiz app either licenses clips (SongPop) or gates behind Apple Music. Licensed clip vendors (Feed.fm Clips) exist if music packs ever justify the cost.

**Reviewer reality:** Apple reviewers on restricted networks fail apps whose remote media does not load (guideline 2.1). Bundling removes that risk for everything we legally can bundle; `scripts/checkmedia.mjs` stays a CI gate for anything still remote.

---

## 10. 🤖 "Will Apple ban it for looking AI-made?"

**No.** Neither Apple nor Google has any rule about who or what wrote the code, and reviewers never see the source. What they judge is the product. What actually gets apps rejected, and how we answer each:

| Real rejection reason | Our answer |
|---|---|
| 4.2 Minimum functionality: "repackaged website" | Bundle the build inside the app (never load the live URL), native haptics, share sheet, deep links, native login, offline mode, IAP. |
| 4.3 Spam / clone / low-effort (tightened June 2026) | Letterlock is an original mechanic with 40k questions. Differentiated name, original icon, honest screenshots. |
| 2.1 Crashes, blank screens, placeholder text, broken links, fails on IPv6-only network | Offline banner, no hard-coded IPv4 (hostnames only, add AAAA record), no test ads, no lorem ipsum, every URL live. |
| 2.3 Metadata does not match the app | Screenshots from the real build, description accurate, dev seams stay inert in production (already true). |
| 5.1.1 No privacy policy / no in-app account deletion | Phase 1 adds both. |
| 4.8 Google login without an equivalent private option | Sign in with Apple. |
| 3.1.1 Digital goods sold outside IAP, or steering to web prices | RevenueCat native IAP, no web pricing mentioned in-app. |
| 5.1.2 Privacy labels wrong with an ad SDK | Declare AdMob/RevenueCat/our-backend data honestly, ATT prompt in place. |
| 5.2 Intellectual property | §9 content changes. |
| 2.5.2 Remote code changing app purpose | No `server.url` wrapper; OTA (if added) only for content/fixes. |
| Play: personal account skipped the 12-tester/14-day test | Organization account (D2) or start the closed test early. |

Pre-submission polish checklist (native feel): splash + icon, styled status bar, no pinch-zoom, no text selection on game surfaces, no link previews, Android back button handled, safe areas on notch + Android 16 edge-to-edge, haptics via plugin, native share, landscape phones verified with `scripts/noscroll.mjs`, reviewer notes with a demo room + test account.

---

## 11. 🔐 Fixing "xxxxxxxx.supabase.co will access…" on Google login

**Why it happens:** Google shows the **domain of the OAuth callback** until the app's branding is verified. Our callback is `lkudntyvngwwlzuciocd.supabase.co/auth/v1/callback`, so that is what users see. Supabase's own docs say: use a custom domain and verify your brand.

**Fix (in order):**
1. Move the callback to our domain: `https://api.letterlock.raltech.dev/auth/google/callback`, served by our own API (Phase 2.4). The Google Cloud OAuth client gets this redirect URI; the old supabase.co one is removed at cutover.
2. Verify `raltech.dev` in Google Search Console.
3. Google Cloud → Google Auth Platform → Branding: app name **Letterlock**, logo, homepage `https://letterlock.raltech.dev`, privacy + terms URLs on that same domain (Phase 1 pages), authorized domain `raltech.dev`.
4. Audience: External → **Publish** (Testing mode caps users and hides branding).
5. Click **Verify Branding**. Minutes to 3 business days. Result: "Sign in to continue to Letterlock" with our logo.
6. In the mobile apps the native Google sheet is used instead, so no domain text appears at all.

---

## 12. ⏱️ Timeline

| Phase | Dev days | Wall-clock | Depends on |
|---|---|---|---|
| 0 Paperwork | 0.5 (me) + forms (you) | 1-2 weeks (D-U-N-S, Apple enrollment) | you |
| 1 Store-readiness in web app | 5 | week 1-2 | nothing, start now |
| 1b Mobile experience rehaul (`frontend-stack`) | 6 | week 2-3 | Phase 1 |
| 1c Charades images (licensed, bundled) | 3 | week 3 | nothing |
| 2 Backend to our VPS (custom API, the palmandplate way) | 14 + cutover | week 1-6 (in parallel with 1/1b/1c) | VPS access (§2c) |
| 3 Capacitor apps | 5 | week 6-7 | Phases 1, 1b, 2, Apple account for signing |
| 3b TV support (Android TV / Google TV, remote) | 5 | week 7-8 | Phase 3 |
| 3c OTA updates from our VPS | 2 | week 8 | Phases 2, 3 |
| 4 Ads (AdMob) | 2 | week 8-9 | Phase 3, AdMob account |
| 5 Remove Ads | 3 | week 9 | Phase 3, store products created |
| 6 Submission | 2 + waiting | week 10-13 | all above; TV track review |
| 6b Web → app popup | 0.5 | after both approvals | Phase 6 |
| 7 Ops | 2 | week 2 onward (backups first) | Phase 2 |
| 8 Web ads (AdSense H5) | 2 + approval | after launch, the last step | Phases 4, 6 |
| **Total** | **~52 dev days** | **~12-14 weeks to store launch**, web ads after | |

---

## 13. ⚠️ Risks and unverified items

| Risk | Mitigation |
|---|---|
| Apple accepting a Bahraini bank for payouts is unverified (no published exclusion) | Try it; fallback is a bank in another country or the company entity's bank. |
| The custom backend is the critical path (~14 days, touches auth, data and realtime) | Build it first and in parallel with the UI phases; keep the two-client Playwright reconnect matrix green against the new API before cutover; Supabase project stays alive 2 weeks as rollback. |
| Exact "Letterlock" name availability | Pick D1 name; reserve it in App Store Connect as soon as the account exists. |
| Apple Universal Links with query strings are unreliable | We move to `/join/CODE` paths. |
| Anti-steering rules (US ruling under Supreme Court review from Oct 2026; EU terms change Oct 2026) | We never mention web purchases in-app, so changes cannot hurt us. |
| AdMob eCPM in MENA is low | Expectations set in §6; remove-ads is the revenue line. |
| Rights-holder complaint on a logo or fandom pack | Takedown contact + 48 h removal SOP. |
| Losing the VPS = losing everything (no managed backups) | Phase 7 backups (local + off-box) are the first ops task, before cutover. |
| One shared box for every RAL project | Letterlock binds its API to localhost, uses its own DB role, its own PM2 names and ports (§2c), and never touches another tenant's files, Traefik entries or `acme.json`. |
| AdSense rejects the site (Phase 8) | Apply once, late, with the finished pages; fix and re-apply; web ads are a nice-to-have. |
| Hostinger intermittently drops SSH from GitHub runners | Jawhara's 5× retry over ports 22/2222 is copied into the deploy workflow. |
| Sign in with Apple secret expires every 6 months | Calendar reminder + note in `MIGRATIONS.md`. |
| Play 12-tester rule if the account ends up personal | Recruit testers early (friends, RAL team), start the closed track the day builds exist. |

---

## 14. 📚 Key sources

- Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ (4.2, 4.3, 4.8, 5.1.1, 3.1.1, 3.1.3, 5.2.5, 2.5.5 IPv6)
- Apple 4.8 login services note: https://developer.apple.com/news/?id=7j1f99yf
- Apple US storefront steering change (May 2025): https://developer.apple.com/news/?id=flmb6ri3
- iTunes Search API terms (Promo Content): https://performance-partners.apple.com/search-api and https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/index.html
- Apple account deletion requirement: https://developer.apple.com/news/?id=12m75xbj
- Apple age rating changes 2025: https://developer.apple.com/news/?id=ks775ehf
- Apple universal links / associated domains: https://developer.apple.com/documentation/xcode/supporting-associated-domains
- Google Play: developer account types https://support.google.com/googleplay/android-developer/answer/10788890, closed-test rule https://support.google.com/googleplay/android-developer/answer/14151465, target API https://support.google.com/googleplay/android-developer/answer/11926878, account deletion https://support.google.com/googleplay/android-developer/answer/13327111, Better Ads https://support.google.com/googleplay/android-developer/answer/12271244, Families https://support.google.com/googleplay/android-developer/answer/9893335, supported countries (merchant) https://support.google.com/googleplay/android-developer/answer/9306917
- AdMob: EEA consent https://support.google.com/admob/answer/13554116, app-ads.txt https://support.google.com/admob/answer/9363762, iOS ATT https://developers.google.com/admob/ios/privacy/idfa, availability https://support.google.com/admob/answer/16451422
- Capacitor: `@capacitor-community/admob` https://github.com/capacitor-community/admob, deep links https://capacitorjs.com/docs/guides/deep-links, storage caveat https://capacitorjs.com/docs/guides/storage, Capacitor 8 https://capacitorjs.com/docs/updating/8-0
- RevenueCat: Capacitor SDK https://www.revenuecat.com/docs/getting-started/installation/capacitor, identifying customers https://www.revenuecat.com/docs/customers/identifying-customers, restore behavior https://www.revenuecat.com/docs/projects/restore-behavior
- Apple Server Notifications v2 https://developer.apple.com/documentation/AppStoreServerNotifications/App-Store-Server-Notifications-V2, Google RTDN https://developer.android.com/google/play/billing/rtdn-reference
- Our own backend pattern: palmandplate `docs/architecture-research.md`, `apps/api/src/modules/auth/auth.service.ts`, `.github/workflows/deploy-prod.yml`; jawhara `.github/workflows/deploy-staging.yml`, `apps/api/src/realtime/realtime.gateway.ts`, `docs/TROUBLESHOOTING.md`; custompc `docs/CLAUDE-WORKING-STYLE.md` (Traefik layout)
- OTA: Capgo updater plugin (manual mode) https://capgo.app/docs/plugin/self-hosted/manual-update/, pricing https://capgo.app/pricing/
- Web ads: AdSense H5 Games Ads https://support.google.com/adsense/answer/9959170, Ad Placement API https://developers.google.com/ad-placement/docs/html5-game-structure
- Images: Pixabay API + Content License https://pixabay.com/service/about/api/ and https://pixabay.com/service/terms/, Openverse API https://api.openverse.org/
- Google brand verification https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification, WebView OAuth block https://developers.googleblog.com/upcoming-security-changes-to-googles-oauth-20-authorization-endpoint-in-embedded-webviews/
- Codemagic pricing https://docs.codemagic.io/billing/pricing/, Ionic Appflow sunset https://ionic.io/blog/important-announcement-the-future-of-ionics-commercial-products
- SimpleIcons disclaimer https://github.com/simple-icons/simple-icons/blob/develop/DISCLAIMER.md, Flagpedia terms https://flagpedia.net/terms, loremflickr https://loremflickr.com/
- Spotify preview removal https://developer.spotify.com/blog/2024-11-27-changes-to-the-web-api, Deezer terms https://developers.deezer.com/termsofuse

---

## 15. 📄 Shareable versions

- `docs/launch-plan/index.html`: the tabbed, plain-words version of this doc (also published as a Claude artifact).
- `docs/launch-plan/Letterlock-Launch-Plan.pdf`: the A4 PDF for WhatsApp / email (kept in the repo, not on the Desktop). Regenerate with `node docs/launch-plan/pdf.mjs` after editing the HTML; keep the HTML in step with this file.

## 16. 📺 TV platforms: Future TODO

- **LG webOS** and **Samsung Tizen**: both stores accept HTML5 apps, so package the same web build (webOS: `appinfo.json` + ares CLI; Tizen: `config.xml` + Tizen Studio). Remote handling is the same key-event model as Android TV. Do after the Android TV build proves the 10-foot UI.
- **Amazon Fire TV**: Android-based; the Android TV build can be submitted to the Amazon Appstore with minor changes.
- **Apple TV**: no web view, no Capacitor. Not planned. AirPlay mirroring covers it.

## 17. 📝 Change log for this plan

- 2026-09-03: created after the research sweep. No code changed yet. Awaiting decisions D1-D13 (recommendations given).
- 2026-09-03 (later): Suhaib confirmed "we will migrate off Supabase": added §2b (what off-Supabase means, no Supabase account after cutover) + D14 (open-source stack self-run vs. custom backend). Readable artifact rebuilt as a tabbed page; HTML + PDF generator committed under `docs/launch-plan/`.
- 2026-09-03 (later): added Phase 1b (mobile experience rehaul, portrait + landscape, URL-bar problem, via `frontend-stack`) and Phase 3b (Android TV / Google TV with remote control), decisions D15-D16, §16 TV platforms; totals now ~33 dev days / 8-10 weeks. PDF now lives in the repo.
- 2026-09-05: **all decisions D1-D16 locked by Suhaib** (§2). D14 flipped to Option B (our own backend, the palmandplate way, no Supabase software), D7 to OTA now, D9 to keep images from licensed sources, D12 to web ads last, D13 to no web purchase, D3 to web-only media packs. Added §2c (VPS facts from the palmandplate / jawhara / custompc repos), Phase 1c (charades images), Phase 3c (OTA), Phase 6b (web → app popup), Phase 8 (web ads), §6b (web ads explained). Phase 2 rewritten for the custom backend. Totals now ~52 dev days / 12-14 weeks. Next step: clear the chat and start building in phase order.
- 2026-09-05 (Phase 3 build): Capacitor 8 shell added (`capacitor.config.ts`, `android/`, `ios/`, 11 plugins), icons/splash/PWA icons generated from the favicon (`scripts/genicons.mjs` + `@capacitor/assets`), `.well-known` deep-link files with TEAMID / SHA-256 placeholders, `src/lib/native.ts` (deep links, back button, splash, status bar, keyboard, keep-awake, orientation, haptics, share, Preferences mirror), `html.is-native` CSS polish, Android TV manifest bits (Phase 3b), `.github/workflows/android-build.yml` (debug APK + unsigned AAB) and `codemagic.yaml` (iOS TestFlight, Android Play internal). How-to and placeholder list: `docs/MOBILE_BUILD.md`.
