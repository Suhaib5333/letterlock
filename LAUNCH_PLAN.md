# 🚀 LAUNCH_PLAN.md: Letterlock to the App Store + Play Store

> **What this is:** the single source of truth for taking Letterlock from a web game to a
> published iOS + Android app that earns money (ads + a one-time "Remove Ads" purchase),
> runs fully on our own VPS instead of Supabase cloud, and stays in sync with the web version.
> Written 2026-09-03 after a research sweep (6 parallel agents, ~300 sources; key links in §14).
> **Any session that touches store launch, ads, purchases, VPS migration, copyright of media,
> or Google sign-in branding must read this first and keep it updated.**
> Companion docs: `TECH.md` (stack reference), `DEFERRED.md` (blocked work), `CLAUDE.md` (build log).

---

## 0. 🍬 The whole plan in 13 lines

1. **Wrap, don't rewrite.** The React app ships inside a Capacitor 8 shell. One codebase = web + iOS + Android.
2. **Backend leaves Supabase cloud and runs on our VPS.** We run the open-source server software ourselves (Postgres, auth, API, realtime) in Docker: no Supabase account, no bill, no supabase.co anywhere. Zero app-code rewrite, only the URL changes. Web and apps share one database, so accounts, leaderboards, saves and "ads removed" are identical everywhere. See §2b for what "off Supabase" means exactly and decision D14.
3. **That same move fixes the Google login text.** The consent screen shows the *callback domain*. Ours becomes `api.letterlock.raltech.dev`, then we verify the brand so it reads "Letterlock".
4. **Ads = Google AdMob.** Interstitial only between games, rewarded ads for an extra skip/hint, banner only on menus. Never during a question.
5. **Remove Ads = one non-consumable purchase (~$3.99)** through Apple/Google billing via RevenueCat, mirrored to a `profiles.ads_removed` flag so it follows the *login*, not just the phone.
6. **Purchases are owned by the Apple ID / Google account by default.** Our server flag is what makes them follow the user across iPhone, Android and web. §8 explains this in plain words.
7. **The song, TV-clip and iTunes-melody packs cannot ship in the store build.** Apple's guideline 5.2.5 literally forbids using iTunes previews "as the soundtrack to a game". Replace with self-made public-domain melodies + text clues.
8. **Hard store requirements we do not have yet:** in-app account deletion, privacy policy + terms pages, Sign in with Apple (mandatory because we offer Google login), PNG icons, offline handling.
9. **"AI-looking code" is a myth.** Neither store checks who wrote the code. They reject thin web wrappers, crashes, placeholders and missing privacy features. §10 is the real checklist.
10. **Paperwork first:** Apple Developer ($99/yr), Google Play ($25 once), AdMob, RevenueCat, a differentiated store name (exact "Letterlock" is already used by other apps).
11. **Ops we must add:** backups, uptime monitoring, crash reporting, a version gate, `app-ads.txt`.
12. **Realistic money:** ads earn tens of dollars a month at hundreds of daily players. The $3.99 purchase will likely out-earn ads early. Do it for reach and polish, not for quick revenue.
13. **Mobile and TV are first-class targets.** A full mobile experience rehaul (portrait + landscape, no browser bar: native app, PWA standalone, fullscreen) built with the `frontend-stack` pipeline before submission, plus an **Android TV / Google TV** build controlled with the remote (D-pad focus, on-screen keyboard on inputs, 10-foot UI). See §3 Phases 1b and 3b and §16.

**Total effort: ~33 dev days of code + ~8-10 weeks wall-clock** (store reviews, Play's 14-day closed test, AdMob approval, TV review). Detail in §12.

---

## 1. 📍 Where we actually are today (audited 2026-09-03)

| Area | Reality | Consequence |
|---|---|---|
| Web hosting | **Cloudflare Pages**, not the VPS (`deploy.yml`). `CLAUDE.md` prose about nginx on the VPS was aspirational. | The VPS currently hosts nothing for Letterlock. Migration = build it from scratch. |
| Backend | Supabase **cloud** project `lkudntyvngwwlzuciocd` (URL + anon key committed in `.env.production`). | The Google consent screen shows that random ref. |
| Supabase surface | Auth (email OTP via Resend edge function, Google OAuth), 9 tables, ~30 RPCs, 12 migrations, Realtime broadcast + presence (3 topics), 2 edge functions, **no Storage**, no `postgres_changes`. | Small and portable. Self-hosting is realistic. |
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

## 2. 🧭 Decisions you (Suhaib) need to make

Recommendation is listed first. Say "go with the recommendations" and the plan proceeds as written.

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | **Store listing name** | `Letterlock: Trivia Hex Duel` (or `Letterlock Party Quiz`) | Exact "Letterlock"/"LetterLock" is taken on both stores (word-puzzle apps). Apple names must be unique. Bundle id stays `dev.raltech.letterlock`. |
| D2 | **Developer account type** | **Organization** (RAL, needs a free D-U-N-S number) on both stores | Shows the company name, and Play organization accounts skip the "12 testers for 14 days" closed-test rule. Individual works too but is slower on Play. |
| D3 | **Song / TV-clip / iTunes-melody packs** | **Remove from the store build.** Keep the 23 self-made PD melodies and grow them to 200+; convert songs/TV to text-clue trivia. | Apple 5.2.5 + iTunes API terms forbid game use. Licensed clips (Feed.fm etc.) can come later if music proves popular. |
| D4 | **Ads placement + price** | Interstitial between games (1 per 3-5 min max), rewarded for extra skip/hint, banner on Home/menus only. Remove Ads at **$3.99** one-time. | Matches Play "Better Ads" rules and Apple's UX rules. $2.99-$4.99 is the casual-game norm. |
| D5 | **Static web hosting** | Move the static site to the VPS (nginx) too, keep Cloudflare only as DNS/proxy | You asked for "fully on our VPS". It is a 1-hour job once the API is there. |
| D6 | **Target audience** | **13+ / not directed at children** on both stores. Keep the Kids pack but no child-directed marketing. | Kids Category forbids third-party ads; Play Families adds constraints. A general trivia game with one Kids pack is normal. |
| D7 | **OTA (over-the-air) JS updates** | **Later.** Launch with store builds only; add Capgo (self-hostable) when release cadence hurts. | Every content wave otherwise needs a store update (Play ~hours, Apple ~1-2 days). Acceptable at first. |
| D8 | **VPS size** | **8 GB RAM** (4 GB is the hard minimum with analytics off) | Self-hosted Supabase idles at ~3-4 GB. Tell me the current VPS spec. |
| D9 | **Charades images (loremflickr)** | **Drop images, show the word only** | Random unmoderated Flickr photos are a content-safety and license risk. Curated bundled images can come later. |
| D10 | **Logo packs** | Keep, but **bundle** the SVGs, add a trademark disclaimer, drop the Apple logo, publish a removal contact | This is how every Logo Quiz app survives. |
| D11 | **Fandom packs** | Keep as text trivia, label "Unofficial fan trivia, not affiliated", rename the Harry Potter and Pokémon packs to descriptive titles, never in store metadata | Those two rights-holders are the most aggressive. Facts are not copyrightable. |
| D12 | **Web ads (AdSense)** | **Skip at launch**; honor `ads_removed` on web anyway | AdSense rejects thin-text game pages; a rejection can complicate later approval. |
| D13 | **Web Remove-Ads purchase** | Optional, later, via a merchant-of-record (Paddle / Lemon Squeezy) | They handle VAT. Never mention web pricing inside the iOS/Android app (Apple 3.1.3 outside the US). |
| D14 | **What runs on the VPS** | **Option A: run the open-source Supabase server stack ourselves** (no Supabase account, no bill, our domain). ~3 days, zero app rewrite. | Option B is a fully custom backend (own Node API, own auth, own websockets, port ~30 database functions): 4-6 extra weeks for the same user-facing result. The database is plain Postgres either way, so B stays possible later. See §2b. |
| D15 | **TV scope at launch** | **Android TV / Google TV only** (Sony, Philips, TCL, Hisense, Xiaomi, Chromecast, Nvidia Shield) via the same Android project. LG (webOS) and Samsung (Tizen) later as HTML5 TV apps; Apple TV not feasible with web tech. | LG and Samsung TVs have no Play Store. Their stores accept HTML5 apps, so our web build can be packaged for them later. Apple TV has no web view at all. |
| D16 | **Mobile rehaul before submission** | **Yes**, Phase 1b runs before the store builds, using the `frontend-stack` skill pipeline (style pick, taste floor, guidelines review, Playwright device-matrix verify). | Store screenshots and first reviews are made from the mobile UI. Shipping the current mobile experience and fixing later burns the launch. |

### 2b. 🧾 "Off Supabase" means exactly this

Suhaib's standing instruction: **we are migrating off Supabase.** Precisely:

| | Today | After the move |
|---|---|---|
| Where the data lives | Supabase's servers (their cloud project) | **Our VPS**, plain Postgres in Docker |
| Supabase account / bill | Yes | **None.** Project deleted after cutover. |
| Domain users see | `lkudntyvngwwlzuciocd.supabase.co` | `api.letterlock.raltech.dev` |
| Who can switch it off | Supabase | Only us |
| Server software | Supabase's hosted stack | **A:** the same open-source stack, run by us (recommended). **B:** our own custom code. |
| App code changes | | A: the URL and key. B: rewrite auth, ~30 data calls, realtime sync, leaderboards. |

Either way, Supabase-the-company disappears from the picture. The only choice (D14) is whether we
reuse their free open-source server software (A) or write our own (B). Wherever this doc says
"the backend on the VPS" or "self-hosted stack", it means Option A unless Suhaib picks B. Do not
describe the end state as "on Supabase"; describe it as "on our VPS".

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
| **Sign in with Apple** (web + later native) | `auth.tsx`: `signInWithOAuth({provider:'apple'})`; Supabase Apple provider config (Services ID, Team ID, `.p8` key; the client secret must be regenerated every 6 months, put a reminder in `MIGRATIONS.md`) | Apple 4.8 |
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

### Phase 2: Backend off Supabase cloud, onto the VPS (~3 dev days + a cutover evening)

**Answer to "will this continue for our app?" Yes.** The apps and the website all talk to `https://api.letterlock.raltech.dev`. Same database, same accounts, same leaderboards, same saved games, same `ads_removed` flag. Nothing in the app depends on Supabase cloud, and after cutover no Supabase account exists (§2b).

| Step | Detail |
|---|---|
| Install the open-source backend stack (Option A) | Official Docker Compose (Postgres 17, Envoy gateway, Auth, PostgREST, Realtime, Edge Runtime, Studio). **Remove** Storage, imgproxy, Logflare/analytics, Vector to save ~1.5 GB RAM. |
| Secrets | `generate-keys.sh`: JWT secret, anon + service keys, Postgres password, dashboard password. Store in a password manager, never in git. |
| Domains + TLS | `api.letterlock.raltech.dev` → nginx → gateway :8000. WebSocket upgrade headers + long `proxy_read_timeout` on `/realtime/v1/`. Studio only behind basic auth or Tailscale. Firewall: 22/80/443 only. Add an AAAA (IPv6) record. |
| Auth config | `SITE_URL=https://letterlock.raltech.dev`, `GOTRUE_URI_ALLOW_LIST` (web + `/join/*` + app deep link), `GOTRUE_EXTERNAL_GOOGLE_*` with new callback `https://api.letterlock.raltech.dev/auth/v1/callback` (add it in Google Cloud Console), `GOTRUE_EXTERNAL_APPLE_*`, **SMTP = Resend SMTP** (`smtp.resend.com`) so built-in auth mails work too. |
| Edge functions | Copy `send-otp` (and drop `send-email` if unused) into `volumes/functions/`, secrets in `.env.functions`, `run.sh restart functions`. No `supabase functions deploy` on self-host. |
| Data migration | `supabase db dump --role-only`, `--schema`, `--data-only --use-copy` from cloud → `psql --single-transaction` into the VPS. `auth.users` (password hashes) and `auth.identities` (Google links) survive. **Users must sign in again once** (new JWT secret). |
| Realtime check **before** cutover | Known self-host bug #1617: default tenant crashes Broadcast/Presence. Test host + phone lobby on day one; rename the default tenant if needed. |
| CI rewrite | `deploy.yml`: build → rsync `dist/` to VPS (or Pages, D5) → `supabase db push --db-url postgres://…@vps:5432` → scp functions + restart. `qa-cleanup.yml` → new admin URL. `.env.production` → new URL + anon key. Remove the Cloudflare + Supabase Management API steps. |
| Cutover | Low-traffic evening: final dump → restore → flip `VITE_SUPABASE_URL` → deploy → smoke test (OTP, Google, room, leaderboard). Keep the cloud project alive 2 weeks as rollback. Then downgrade/delete it. |
| Ops (see Phase 7) | Backups before anything else. |

### Phase 3: The Capacitor apps (~5 dev days)

| Step | Detail |
|---|---|
| Add Capacitor 8 | `npm i @capacitor/core @capacitor/cli`, `npx cap init "Letterlock" dev.raltech.letterlock --web-dir dist`, `npx cap add ios android`. Requirements: Node 22+, Xcode 26 (via Codemagic), Android Studio, minSdk 24, targetSdk 36. `server.hostname: "letterlock.raltech.dev"` so the WebView origin matches our domain. |
| Plugins | `@capacitor/app` (deep links, Android back button), `browser`, `haptics` (web `vibrate` is a no-op in iOS WebView), `share`, `network`, `status-bar`, `splash-screen`, `keyboard`, `preferences`, `screen-orientation`. |
| Native sign-in | `@capgo/capacitor-social-login` → Google + Apple ID tokens → `supabase.auth.signInWithIdToken`. Never OAuth inside the WebView (Google returns `403 disallowed_useragent`). This also removes any consent-screen domain text on mobile entirely. |
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

### Phase 4: Ads (~2 dev days + AdMob approval 1-2 weeks after store launch)

| Step | Detail |
|---|---|
| SDK | `@capacitor-community/admob` (banner, interstitial, rewarded, UMP consent, ATT helper). AdMob only, no mediation until real volume. |
| Consent | UMP form on every launch before ads (GDPR/EEA + UK + US states messages configured in AdMob), "Privacy options" entry in Settings so consent can be revoked. iOS: ATT prompt with a short pre-prompt; most users deny, ads become non-personalized (lower eCPM, still allowed). Add SKAdNetwork ids to Info.plist. |
| Placement (D4) | `Victory` / between games in Bo3-Bo5: interstitial, capped 1 per 3-5 min, never at app open, never mid-question, never on the phone controller while a question is live. Rewarded: "watch to get an extra skip" (host) / "hint". Banner: Home, Category menu, Settings, Lobby waiting. **Never on the board.** |
| Gate | `if (!adsRemoved && isNative && consentDone) show()`. Web shows no ads (D12). |
| Compliance | `app-ads.txt` on the domain listed in the store; declare "Contains ads"; App Privacy labels + Play Data safety include AdMob's collection; age rating consistent with ad content. |
| Test | AdMob test unit ids in dev; never ship test ads (Apple 2.1). |

### Phase 5: Remove Ads purchase (~3 dev days)

| Step | Detail |
|---|---|
| Products | App Store Connect + Play Console: non-consumable `remove_ads`, $3.99 tier (auto per-country pricing). Enable Family Sharing on iOS (Play has no IAP family sharing). |
| SDK | `@revenuecat/purchases-capacitor`. Entitlement `no_ads`. `Purchases.logIn(supabaseUserId)` at sign-in so anonymous purchases merge into the account. Restore behavior: **Transfer** (entitlement follows the last account that restores; prevents one purchase unlocking unlimited accounts). |
| UI | "Remove Ads" card in Settings + a small button near ads; **"Restore Purchases"** button (Apple requires it). Success = ads gone instantly + confetti. |
| Server sync | RevenueCat webhook → our endpoint (self-hosted edge function `rc-webhook`) → `profiles.ads_removed = true/false` + `ads_removed_source`, `ads_removed_at`. Handles refunds automatically (RevenueCat consumes Apple Server Notifications v2 + Google RTDN). RLS: user can read the flag, only service role writes it. |
| Client rule | **Ads hidden if the store says this device's store account owns it OR the signed-in account has `ads_removed = true`.** Cached locally for offline. |
| Web | Same flag hides web ads (if ever added). Optional later: web purchase via Paddle/Lemon Squeezy writes the same flag (D13). |
| Test | Sandbox testers (Apple) + license testers (Play): buy, restore, refund → revoked, second device with same account → still no ads. |

### Phase 6: Store submission (~2 dev days of work + 2-4 weeks waiting)

| Step | Detail |
|---|---|
| Assets | Icon 1024 (iOS) / 512 (Play), Play feature graphic 1024×500, screenshots from the **real build**: iPhone 6.9" (1320×2868), iPad 13" (2064×2752, we support iPad since it is the shared screen), Play phone + 7"/10" tablet. No logos or franchise names in screenshots. |
| Listing | Name (D1), subtitle, description, keywords, support URL, marketing URL (same domain as `app-ads.txt`), privacy policy URL, account-deletion URL (Play). |
| Forms | Apple: App Privacy labels (Supabase + AdMob + RevenueCat data), new 2025 age-rating questionnaire, `ITSAppUsesNonExemptEncryption = false`. Play: Data safety, IARC content rating, target audience 13+, "Contains ads", Play Billing declaration. |
| Review notes | Demo room code flow, a test account, how to play host and player, explanation of offline behavior. Reviewers must be able to reach every feature. |
| Play closed test | Personal account: 12 testers opted in for 14 days before production. Organization account: exempt. Start the internal/closed track the day Phase 3 builds. |
| TestFlight | Internal testers immediately; external testers need a light TestFlight review. |
| Submit | Play review hours to days; Apple 24-48 h typical. First submissions often get one rejection round: budget a week. |

### Phase 7: Keep it alive (ops, ~2 dev days, then ongoing)

| Item | What |
|---|---|
| Backups | Nightly `pg_dump -Fc` + tar of `volumes/` + `.env` → `rclone` to B2/S3, 30-day retention, quarterly restore test. Self-hosted Supabase has **no built-in backups**. |
| Uptime | Uptime Kuma container: website, `/auth/v1/health`, `/rest/v1/`, Realtime WebSocket, `/api/app-config`. Alerts to your phone. |
| Crashes / errors | Sentry free tier (`@sentry/capacitor` + `@sentry/react`), plus Play Console vitals (Play hides apps above 1.09% crash / 0.47% ANR) and Xcode Organizer. |
| Analytics | Store built-ins first (free, no consent prompts). PostHog (free tier or self-hosted) if we want funnels. No Firebase Analytics (ad-id consent burden). |
| Network monitoring in-app | Capacitor Network listener + banner + queued writes (Phase 1/3). Yes, we need it: reviewers and real users both hit offline. |
| Maintenance flag | `/api/app-config.maintenance` shows a banner and blocks online rooms during VPS maintenance. |
| Updates | Pin every Docker image tag; upgrade manually with `run.sh recreate`; never auto-pull `latest`. Docker log rotation (`max-size 50m`). fail2ban + SSH keys only. |
| Recurring chores | Apple client secret for Sign in with Apple every 6 months; Play target API bump yearly (API 36 required since Aug 2026); Xcode major bump yearly (Xcode 26 required since Apr 2026); Apple age-rating and privacy label updates when SDKs change. |
| Content takedowns | Publish `legal@` contact + a removal SOP: pull a pack within 48 h of a rights-holder complaint (logos, fandoms). |

---

## 4. 🔄 How web and apps stay in sync

- **One repo, one build.** `npm run build` produces `dist/`; the website serves it, `npx cap sync` copies the same `dist/` into the iOS and Android projects. Same commit = same game.
- **One backend.** Everything reads `api.letterlock.raltech.dev`. A leaderboard row posted from an iPhone appears on the web instantly.
- **Release rule.** Web deploys on every push (as today). App builds go out on a tag (`app-v1.2.0`). Content-only waves can wait and batch into the next app build; the web gets them immediately. If that gap hurts, add Capgo OTA (D7), which is allowed by Apple for JS/content that does not change the app's purpose.
- **Version gate.** Old app versions can be forced to update via `minNative` when the API changes in a breaking way.
- **Feature flags by platform.** `isNative` (Capacitor) gates ads, IAP, haptics plugin, native login. Web keeps the current behavior.

---

## 5. 💰 Costs

| Item | Cost |
|---|---|
| Apple Developer Program | $99 / year |
| Google Play Console | $25 once |
| D-U-N-S number | free |
| AdMob, RevenueCat (<$2.5k/mo), Sentry (5k errors/mo), Uptime Kuma, Codemagic (500 min/mo), self-hosted Supabase | free |
| VPS 8 GB | whatever you already pay (or ~$20-40/mo if upgraded) |
| Offsite backups (B2/S3) | ~$1-2 / month |
| Store cut | 15% of purchases (Apple Small Business Program, Google first $1M) |
| Optional later: Capgo OTA $12/mo, licensed music clips (quote needed), Paddle/Lemon Squeezy ~5% + $0.50 per web sale |

---

## 6. 📣 Ads: what to know

- **Placement rules are law, not taste.** Play's "Better Ads" policy (since Sep 2024) forbids interstitials at app open, before a level, mid-action, or when leaving. Natural break = end of a game. Rewarded ads are always allowed because the user opts in.
- **Consent is mandatory** in the EU/UK (Google-certified CMP = the UMP SDK) and recommended everywhere. On iOS, ATT is Apple's tracking prompt; declining it is fine, ads still show, just untargeted.
- **AdMob approval happens after launch.** They verify `app-ads.txt` on our domain and review the live store listing. Until then ads serve limited.
- **Money reality (eCPM = revenue per 1,000 ad views):** interstitial ~$10 US / ~$5 EU / ~$1-4 MENA; rewarded ~$16-20 US; banner ~$1. A party game shows maybe 2-3 interstitials per 30-minute session for a whole room on one device. **300 daily players ≈ $10-40 a month. 3,000 ≈ $100-400.** The remove-ads purchase will likely be the bigger line early.
- **Classroom / TV use.** Ads on a projected shared screen are annoying; the interstitial-only-between-games rule protects that. An education/no-ads license is a later option.

---

## 7. 🛒 Remove Ads: options chosen

| Choice | Picked | Rejected |
|---|---|---|
| Billing | Apple In-App Purchase + Google Play Billing (mandatory for digital goods) | Stripe inside the app (instant rejection) |
| SDK | RevenueCat (free under $2.5k/mo, does receipt verification, refunds, restore, cross-platform entitlements, webhooks) | `cordova-plugin-purchase` / `@capgo/native-purchases` (free, but we would write and host receipt verification, Apple notifications, Google Pub/Sub RTDN, reconciliation jobs) |
| Type | Non-consumable, one-time, ~$3.99 | Subscription (wrong vibe for a family game) |
| Web | No web ads at launch; flag honored anyway; optional web purchase later via a merchant of record | Selling on web and advertising it inside the iOS app (Apple 3.1.3 outside the US) |

---

## 8. 🎓 Education: how do we know who bought "Remove Ads"?

**The short answer:** the *store account* (Apple ID on iPhone, Google account on Android) owns the purchase. Our login does not, unless we copy it there ourselves. We do both.

**Plain-English model:**

1. Someone taps "Remove Ads" on an iPhone. Apple charges their Apple ID and records "Apple ID X owns `remove_ads`". Google does the same on Android with the Google account. Our Supabase account is invisible to Apple and Google.
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
| Guess the Song (1,624 iTunes 30-s previews) | HIGH | HIGH | **Remove from store build.** Apple 5.2.5: previews "may not be used for their entertainment value (e.g. ... the soundtrack to a game)". iTunes API terms: promo use only, must show the track name + buy link (which would spoil the answer), no monetization. |
| TV Show / Sitcom clips (296 iTunes video previews) | HIGH | HIGH | **Remove.** Same terms; TV episode previews are not even listed as permitted promo content. Convert to text trivia. |
| Guess the Melody, iTunes part (~212) | HIGH | HIGH | **Remove.** |
| Guess the Melody, our 23 synthesized public-domain WAVs | LOW | LOW | **Keep, bundle, grow to 200+** (classical, folk, anthems, nursery, pre-1930 songs). Compositions are PD, the recording is ours. |
| Logos (~600 SimpleIcons SVGs) | MEDIUM | MEDIUM | **Keep** with disclaimer ("all logos are trademarks of their owners"), bundle the SVGs (CC0), remove the Apple logo, no logos in marketing, removal-on-request contact. Logo Quiz apps with 60M downloads live this way. |
| Flags | LOW | LOW | Bundle everything (public domain). Sports pack still hotlinks flagcdn: switch to local files. |
| Charades images (loremflickr) | HIGH | MED-HIGH | **Drop images, word only.** Random Flickr photos: unmoderated content in a family game + CC-BY-SA/NC licenses we cannot honor. |
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
| 5.1.2 Privacy labels wrong with an ad SDK | Declare AdMob/RevenueCat/Supabase data honestly, ATT prompt in place. |
| 5.2 Intellectual property | §9 content changes. |
| 2.5.2 Remote code changing app purpose | No `server.url` wrapper; OTA (if added) only for content/fixes. |
| Play: personal account skipped the 12-tester/14-day test | Organization account (D2) or start the closed test early. |

Pre-submission polish checklist (native feel): splash + icon, styled status bar, no pinch-zoom, no text selection on game surfaces, no link previews, Android back button handled, safe areas on notch + Android 16 edge-to-edge, haptics via plugin, native share, landscape phones verified with `scripts/noscroll.mjs`, reviewer notes with a demo room + test account.

---

## 11. 🔐 Fixing "xxxxxxxx.supabase.co will access…" on Google login

**Why it happens:** Google shows the **domain of the OAuth callback** until the app's branding is verified. Our callback is `lkudntyvngwwlzuciocd.supabase.co/auth/v1/callback`, so that is what users see. Supabase's own docs say: use a custom domain and verify your brand.

**Fix (in order):**
1. Move the callback to our domain: `https://api.letterlock.raltech.dev/auth/v1/callback` (automatic with Phase 2 self-hosting; the paid alternative is Supabase's Custom Domain add-on at $10/mo on the $25/mo Pro plan).
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
| 2 Supabase → VPS | 3 + cutover | week 1-3 | VPS access (D8) |
| 3 Capacitor apps | 5 | week 4-5 | Phases 1, 1b, Apple account for signing |
| 3b TV support (Android TV / Google TV, remote) | 5 | week 5-6 | Phase 3 |
| 4 Ads | 2 | week 6 | Phase 3, AdMob account |
| 5 Remove Ads | 3 | week 6-7 | Phase 3, store products created |
| 6 Submission | 2 + waiting | week 7-10 | all above; Play closed test 14 days if personal account; TV track review |
| 7 Ops | 2 | week 2 onward (backups first) | Phase 2 |
| **Total** | **~33 dev days** | **~8-10 weeks to live** | |

---

## 13. ⚠️ Risks and unverified items

| Risk | Mitigation |
|---|---|
| Apple accepting a Bahraini bank for payouts is unverified (no published exclusion) | Try it; fallback is a bank in another country or the company entity's bank. |
| Self-hosted Realtime bug #1617 (Broadcast/Presence crash on default tenant) | Test the host+phone lobby on the VPS on day one, rename tenant if needed, before any cutover. |
| Exact "Letterlock" name availability | Pick D1 name; reserve it in App Store Connect as soon as the account exists. |
| Apple Universal Links with query strings are unreliable | We move to `/join/CODE` paths. |
| Anti-steering rules (US ruling under Supreme Court review from Oct 2026; EU terms change Oct 2026) | We never mention web purchases in-app, so changes cannot hurt us. |
| AdMob eCPM in MENA is low | Expectations set in §6; remove-ads is the revenue line. |
| Rights-holder complaint on a logo or fandom pack | Takedown contact + 48 h removal SOP. |
| Losing the VPS = losing everything (no managed backups) | Phase 7 backups are the first ops task, before cutover. |
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
- Supabase self-hosting https://supabase.com/docs/guides/self-hosting/docker, restore from platform https://supabase.com/docs/guides/self-hosting/restore-from-platform, proxy/HTTPS https://supabase.com/docs/guides/self-hosting/self-hosted-proxy-https, self-hosted functions https://supabase.com/docs/guides/self-hosting/self-hosted-functions, Realtime issue https://github.com/supabase/realtime/issues/1617, Google provider https://supabase.com/docs/guides/auth/social-login/auth-google
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
