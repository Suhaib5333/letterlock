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

## 3. 🎬 Real movie / TV video clips  — ✅ **DONE (2026-06-12) — "Guess the Movie (Trailer)" pack ships**

**Requested (repeatedly):** actual video clips for guessing popular movies. **Built and live.**

**What ships:** a **"Guess the Movie (Trailer)"** pack (`src/content/movieClips.ts`, id
`movies-clips`, 🎬, medium, letterless) with **64 real official trailers** embedded via
`QuestionCard`'s `youtube` field → `youtube-nocookie.com/embed/<id>` (16:9, capped, privacy mode).
Card prompt: "Watch the trailer — name the movie. (year)".

**How it was solved without a TMDB key** (the previously-assumed blocker): `scripts/genmovies.mjs`
holds a curated `[title, year, youtubeId]` candidate list and **verifies every id at build time
against the real video title via YouTube's keyless oEmbed**
(`https://www.youtube.com/oembed?format=json&url=…` returns the title). Only ids whose title
actually matches the movie AND is a trailer/teaser are kept — so a wrong/guessed/dead id can
never ship (10 of 74 candidates were auto-dropped as "not found"). Re-run the script to add more.
Embedding promotional trailers is legal; nothing copyrighted is stored. Guarded by an e2e test
(`movie-trailer pack embeds a YouTube trailer`).

> Note: a few studios disable embedding on specific videos; those would show YouTube's own
> "watch on YouTube" panel inside the iframe — Reveal/Skip still work, so play never stalls.
> To expand: add `[title, year, id]` rows to `scripts/genmovies.mjs` and re-run.

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
