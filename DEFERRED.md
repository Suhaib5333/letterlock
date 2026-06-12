# 🚩 Letterlock — Deferred / Blocked Work (TODO)

These were requested but **cannot be completed autonomously** right now — each needs a
credential, an account, or has a hard legal blocker. Everything here is designed so it can be
finished the moment the blocker is removed. Nothing here blocks the current, fully-working PWA.

---

## 1. 🔐 Accounts · Login · OTP · Google SSO  — **BLOCKED: no credentials**

**Requested:** username/password sign-up, OTP email verification via Resend, Google SSO, and
"no access unless signed in."

**Why it's blocked:**
- The **Resend API key is NOT in the `ral-workspace` repo** — only an empty placeholder
  `RESEND_API_KEY=` in `ral-workspace/.env.example`. There is no real key value anywhere, and
  no Supabase or Google OAuth credentials in any repo.
- Letterlock is currently a **static client-only PWA** (no backend). Real auth + OTP needs a
  server and a database; OTP email needs the Resend key; Google SSO needs an OAuth client.
- Building auth without these would be untestable and would gate the working app behind a
  broken login — so per the "defer what's blocked" instruction it is deferred, not half-built.

**To unblock, provide:**
1. `RESEND_API_KEY` (real value) + a verified sender domain/email in Resend.
2. A **Supabase** project (recommended — self-hostable on the same VPS per `CLAUDE.md` §4):
   `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ service-role key for server use).
3. A **Google OAuth** client: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, with the redirect
   URL registered.

**Recommended build (≈1 day once unblocked):**
- Supabase Auth handles email/password, **email OTP**, and **Google** out of the box —
  far less custom code than rolling our own. (Alternatively: a `dart_frog`/Node server with
  `@supabase/supabase-js`, Resend for OTP, `jsonwebtoken` sessions.)
- Add an `AuthGate` around `<App/>` in `main.tsx`: unauthenticated users see a sign-in /
  sign-up screen; authenticated users get the game. Persist the session in `localStorage`.
- Tables: `profiles (id, username, created_at)`. RLS so users own their rows.
- Env via `import.meta.env.VITE_SUPABASE_URL` etc. (`.env` git-ignored).

---

## 2. 🏆 Global Leaderboard  — **BLOCKED: depends on #1 (shared DB)**

**Requested:** a full end-to-end global leaderboard, stored in a DB (Supabase).

**Why it's blocked:** a *global* leaderboard needs a shared backend (the same Supabase project
as #1). Local-only high scores wouldn't be "global."

**Recommended build (once #1 is done):**
- Table `leaderboard (user_id, username, rating, games_won, games_played, hexes_claimed,
  correct_answers, blocks, fastest_win_moves, updated_at)`, RLS: read-all, write-own (or
  better, write via a server endpoint to prevent tampering).
- **Scoring suggestion** (a simple, tamper-resistant Elo-ish "Letterlock Rating"):
  `rating += K * (won ? 1 : 0)` plus small bonuses for blocks and fast (few-move) wins, minus
  for losses — or full Glicko later (plan §14 Future). Start simple: rank by `games_won`, tie-
  break by win-rate then `hexes_claimed`.
- On `MatchWon`, POST the match stats (already tracked in `game.stats` / `series`) to the
  leaderboard endpoint; show a `/leaderboard` screen (friends / global / class scopes per
  plan §9).
- The data is **already collected** client-side (`game.stats[team]`: claimed, correct, steals,
  blocks; `game.moveCount`; series score) — only the persistence layer is missing.

---

## 3. 🎬 Real movie / TV video clips  — ✅ **TV clips ship; movie clips removed (no safe source)**

> **Update (2026-06-12, round 8c):** the **YouTube movie-clip packs were removed**. A YouTube iframe
> always leaks the answer (title bar, thumbnail poster, end-screen, click-through to youtube.com) and
> **cannot be made spoiler-safe in fullscreen** — and fullscreen is required. iTunes' movie API is
> dead, so there is **no fullscreen-safe movie-video source**. Movie *content* therefore lives in the
> **Movies & TV trivia packs**. **TV Show Clips remain** (3 tiers, ~221) using iTunes episode previews
> in the native `<video controls>` — real footage, **safe fullscreen**, no title to leak. To add a
> movie-clip pack later you'd need a source whose media has no title/thumbnail overlay and allows
> embedding+fullscreen (none free today).

<details><summary>Original entry (the 6-pack version, now superseded)</summary>

**Requested (repeatedly):** actual video clips for guessing popular movies AND TV shows, in
easy/medium/hard. **All built, verified, and live** (`src/content/movieClips.ts`, letterless).

- 🎬 **Movie Clips — Easy/Medium/Hard** (33/35/26) = official **YouTube trailers**. Each
  `[title, year, youtubeId]` is **verified at build time via YouTube's keyless oEmbed** (only ids
  whose title matches the movie AND is a trailer are kept — no TMDB key needed, no wrong/dead id).
  Rendered through the **IFrame Player API** (`YouTubeEmbed.tsx`) so unplayable/non-embeddable
  trailers (onError 100/101/150) fall back to a clean card + "Watch on YouTube" + Skip.
  **Anti-spoiler:** YouTube otherwise reveals the answer via the player title bar, the thumbnail
  poster, and the end-screen — so the embed hides all of it: a Play cover masks the poster/title
  until tapped, a top strip masks the title bar (it flashes on start/hover/pause), fullscreen +
  keyboard + annotations + related videos are disabled, and the trailer **re-covers when it ends**
  (Replay) so the end-screen titles never show.
- 📺 **TV Show Clips — Easy/Medium/Hard** (38/40/33) = REAL **iTunes episode preview clips**
  (`entity=tvEpisode` → hotlinked `.m4v`, same CDN family as the song previews), matched by show
  name so the clip is genuinely from that series — "guess the show from real footage". No guessed
  ids: the iTunes API is the source of truth. (Netflix/Disney+/Apple-TV+ originals aren't on iTunes,
  so the lists lean on network/cable/HBO shows.)

**Verification:** `scripts/checkmedia.mjs` confirms every clip URL is reachable (0 dead). Guarded by
e2e tests. To expand: add shows to `scripts/genmovies.mjs` and re-run.
</details>

---

## 4. 🎵 Real / licensed music (e.g. Minecraft)  — **BLOCKED: copyright**

**Requested:** actual songs, "maybe a Minecraft song."

**Why it's blocked:** Minecraft's soundtrack (C418) and other commercial tracks are
copyrighted and can't be bundled.

**What ships instead:** the music engine now plays **original, composed, looping melodies**
(four moods: calm / blocky / warm / dream) with a bass progression and pad — real *tunes*, not
random notes, in that mellow nostalgic vibe — fully copyright-free. To use real licensed tracks,
drop CC0/CC-BY `.mp3`/`.ogg` files into `public/music/` and wire them in `services/audio.ts`
(a file-playback path can sit alongside the generative one).

---

## 5. 📦 Packs still under 200  — **source-limited (the two hard exceptions)**

Almost every pack is now **200+**. Two remain genuinely capped by their medium, plus the
regional packs (kept short for quality):

| Pack | Count | Cap reason |
|---|---|---|
| **World Flags** (easy/med/hard) | ~49 / 61 / 81 (~191 total) | Only ~195 sovereign countries exist — this is essentially the ceiling. *(User pre-excepted flags.)* |
| **Guess the Melody** | 23 | **Hard exception.** Each clip is a hand-transcribed public-domain tune synthesized to a bundled WAV (`scripts/genclips.mjs`). Reaching 200 would need ~177 more accurate transcriptions **and ~20 MB of bundled audio**; auto-generating risks wrong-note, unrecognisable clips. Could be scaled later by switching to iTunes previews of famous instrumental/classical pieces (loses the synthesized charm). |
| Bahrain / Saudi / UAE / Gulf | ~125 / 72 / 67 / 67 | Quality regional trivia is finite; kept tight to avoid padded/contrived answers (a known prior complaint). |

Now at 200+: **Guess the Song** (≈200, iTunes previews via `scripts/gensongs.mjs`), **Logos**
easy/med/hard (≈215 / 203 / 323, every slug verified against `cdn.simpleicons.org` via
`scripts/genlogos.mjs` — fixes the old dead-slug open task), all trivia packs, and all 5
charades categories.
