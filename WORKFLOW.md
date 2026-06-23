# Letterlock — Dev → Test → Deploy → CI/CD runbook

The single source of truth for how this repo is developed, tested, deployed, and
how to check/fix CI. Read this first in a new session.

- **Repo:** https://github.com/Suhaib5333/letterlock  (default branch `main`)
- **Live site:** https://letterlock.raltech.dev (Cloudflare Pages)
- **Supabase project ref:** `lkudntyvngwwlzuciocd`
- **Stack:** React + TS + Vite. Pure game logic in `src/core/`; Supabase for
  auth/leaderboard/progression/friends; Realtime for online mode + presence.

---

## 0. Golden rules

- **Deploy = push to `main`.** GitHub Actions (`.github/workflows/deploy.yml`)
  then (1) applies Supabase migrations, (2) deploys the `send-otp` Edge Function,
  (3) builds + deploys to Cloudflare Pages.
- **CI re-applies EVERY migration on EVERY push** (not a tracked migration
  system — it runs the SQL via the Supabase Management API each time). ⇒ **every
  migration must be idempotent AND re-runnable in sequence repeatedly.**
- **Commit messages: NO AI attribution** (repo CLAUDE.md rule — Suhaib-authored).
- **Secrets never in tracked files.** `*.secret.md` and `.env*` are gitignored.
  Google OAuth + test creds live in `CREDENTIALS.secret.md` (gitignored).
- **Test accounts:** sign-in/OTP tests use ONLY `suhaibrajabo@gmail.com`; never
  `srajab@bdb-bh.com`. (See `TESTING.md`.)

---

## 1. Local dev

```bash
npm run dev        # Vite dev server → http://localhost:5173 (HMR)
npm run preview    # serves the production build → http://localhost:4173
                   #   (Playwright/noscroll/percat target 4173)
```

Env: `.env.local` (gitignored) holds `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
(public) and, if present, `SUPABASE_ACCESS_TOKEN` (for running migrations from the
shell — see §5). `.env.production` is committed (public Supabase keys only).

---

## 2. Testing (run before every push)

```bash
npm run typecheck                 # tsc -b --noEmit  (must be clean)
npm test                          # vitest — unit/fuzz/content/progression (~346 tests)
npm run build                     # tsc -b && vite build  (must be clean)
npx playwright test               # full e2e (desktop + mobile projects) (~98 tests)
npx playwright test --grep "X"    # subset
npx playwright test --repeat-each=N --grep "X"   # flake-hunt a test N times
```

**Overflow / responsive (build + preview first):**
```bash
npm run build && npm run preview &      # serve on 4173
node scripts/noscroll.mjs               # 17 device profiles × EVERY screen — must end "ALL CLEAR"
node scripts/percat.mjs                 # ONE question of EVERY pack × 4 tight viewports
```
See `TESTING.md` for the full device matrix + which screens are covered. **Add
every new screen to `scripts/noscroll.mjs` AND the matrix.**

**Dev/QA seams (URL params / localStorage; inert in normal use):**
- `?__devscreens=1` — show admin + pack-editor + friends buttons when signed out.
- `?__onlinepanel=1` — force the host online "Player answers" panel with mock data.
- `?__crashtest=1` — throw in render to verify the ErrorBoundary recovery card.
- `?__unlockall=1` (or `localStorage.letterlock.unlockall='1'`) — grant full
  progression access so checkers can reach 5×5/7×7/bo5/hard content. noscroll,
  percat and the e2e `beforeEach` all set this.

**Driving the app live (Playwright MCP):** the MCP browser is an ISOLATED
profile — it has NO session for the user's Supabase/Google/Gmail/GitHub. You
cannot click through those dashboards or read the user's inbox; for two-client
online tests, open a second tab at `/?room=<CODE>&view=controller&name=X`.

---

## 3. Deploy

```bash
git add -A
git commit -q -m "…"      # NO AI attribution
git push origin main      # → triggers the Deploy workflow
```
There is NO separate deploy command — push to `main` is the deploy.

---

## 4. Check CI/CD (no gh CLI, no GitHub login needed — public REST API)

`gh` is not installed and the automation browser isn't logged into GitHub, so use
the **public Actions REST API** (works for this public repo, rate-limited):

**Poll the run for the current HEAD until it finishes:**
```bash
SHA=$(git rev-parse HEAD)
URL="https://api.github.com/repos/Suhaib5333/letterlock/actions/runs?per_page=5"
for i in $(seq 1 40); do
  line=$(curl -s "$URL" | python -c "import sys,json;d=json.load(sys.stdin);r=[x for x in d['workflow_runs'] if x['head_sha']=='$SHA'];print(r[0]['status'],r[0]['conclusion']) if r else print('none','none')")
  echo "poll $i: $line"; echo "$line" | grep -q completed && break; sleep 15
done
# → "in_progress None" … then "completed success" or "completed failure"
```
Run this with `run_in_background: true` (it sleeps); you'll be notified on exit.

**If it FAILED, find which step failed (jobs endpoint, also public):**
```bash
SHA=$(git rev-parse HEAD)
RUNID=$(curl -s "https://api.github.com/repos/Suhaib5333/letterlock/actions/runs?per_page=5" \
  | python -c "import sys,json;d=json.load(sys.stdin);print([x['id'] for x in d['workflow_runs'] if x['head_sha']=='$SHA'][0])")
curl -s "https://api.github.com/repos/Suhaib5333/letterlock/actions/runs/$RUNID/jobs" \
  | python -c "
import sys,json
d=json.load(sys.stdin)
for j in d['jobs']:
    print('JOB:', j['name'], j['conclusion'])
    for s in j['steps']:
        if s['conclusion'] not in ('success','skipped',None):
            print('  FAILED STEP:', s['name'], s['conclusion'])
"
```
(Full step LOGS need auth — the jobs endpoint gives the failing step NAME, which
is usually enough to diagnose. The workflow steps are named, e.g. "Apply Supabase
database migrations", "Deploy to Cloudflare Pages".)

**Verify the live site after a green deploy:** navigate Playwright MCP to
https://letterlock.raltech.dev and screenshot; hard-refresh on device if the CDN
is still serving the old bundle.

---

## 5. Migrations — the #1 source of deploy failures

- Files: `supabase/migrations/000N_*.sql`, applied in order EVERY push.
- **Must be idempotent + re-runnable repeatedly.** Use: `add column if not
  exists`, `create table if not exists`, `create or replace function`, `drop
  policy if exists` then `create policy`, `drop trigger if exists` then `create
  trigger`, `do $$ … exception when duplicate_object …$$` for `create type`.
- **GOTCHA (already hit):** `create or replace function` CANNOT change a
  function's return type/columns. If a later migration widens a function's
  returns (e.g. 0007 widened `admin_list_users`), the EARLIER migration that also
  defines it will fail on re-apply ("cannot change return type"). **Fix: `drop
  function if exists fn();` immediately before the earlier `create or replace`**
  (done for `admin_list_users` in 0002). Same pattern for any redefined function.
- Migration ledger:
  - 0001 profiles + leaderboard + RLS
  - 0002 roles/admin + custom_packs (+ `drop function admin_list_users` guard)
  - 0003 seed admin (suhaibrajabo@gmail.com)
  - 0004 secure leaderboard `submit_score` RPC
  - 0005 username→leaderboard cascade trigger
  - 0006 per-user `question_progress`
  - 0007 progression (xp/level/prestige, full_access) + friendships + friend RPCs
        + admin progression RPCs + widened admin_list_users
- **Apply locally (if `SUPABASE_ACCESS_TOKEN` is set in `.env.local`):**
  `npm run db:push` (links + pushes via the Supabase CLI). Without the token you
  can't apply locally — rely on CI and watch §4.

---

## 6. Supabase config that needs the dashboard (can't be done from code)

- **Google SSO:** Google Cloud OAuth client (redirect
  `https://lkudntyvngwwlzuciocd.supabase.co/auth/v1/callback`) → paste Client
  ID/Secret into Supabase → Auth → Providers → Google. (Done; creds in
  `CREDENTIALS.secret.md`.)
- **OTP:** Edge Function `send-otp` (Resend) deploys via CI; needs
  `RESEND_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` as project/CI secrets. Verify
  type is `email` (correct). OTP length/expiry set in Auth settings.
- These require either the dashboard (user logged in) or `SUPABASE_ACCESS_TOKEN`
  (Management API). The automation browser can't reach them.

---

## 7. Typical fix loop

1. Reproduce (unit/e2e/noscroll, or Playwright MCP live).
2. Fix; `npm run typecheck` + relevant test.
3. `npm run build`; if responsive change, `node scripts/noscroll.mjs` → ALL CLEAR.
4. `npx playwright test` (full or targeted) green.
5. Commit (no AI attribution) + push `main`.
6. Poll CI (§4). If migration step fails → §5 gotcha. If green → verify live (§4).

---

## 8. Key docs

- `WORKFLOW.md` (this) — dev/test/deploy/CI runbook.
- `TESTING.md` — Playwright device matrix, manual online test, seams, test emails.
- `PROGRESSION_SOCIAL.md` — XP/level/prestige, unlocks, friends spec + phase log.
- `AUDIT.md` — the 2026-06-22 audit + fixes.
- `CLAUDE.md` / `TECH.md` — architecture; `QUESTION_AUTHORING.md` — content rules.
- `CREDENTIALS.secret.md` (gitignored) — Google OAuth secret + test-email rules.
