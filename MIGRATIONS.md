# Database migrations

The full schema lives in `supabase/migrations/`, applied in numeric order.

```
supabase/migrations/
  0001_initial_schema.sql   profiles + leaderboard + username_available RPC
  0002_roles_admin.sql      user_role enum, role/banned_at columns,
                            admin RPCs, custom_packs table, seed admin
```

Two ways to apply. Pick one.

---

## Path A — Dashboard SQL editor (no install, ~30 s)

Recommended for the first run. Just paste both files into the SQL editor:

1. Open **<https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/sql/new>**
2. Copy the entire contents of `supabase/migrations/0001_initial_schema.sql`, paste, click **Run**.
3. Repeat for `supabase/migrations/0002_roles_admin.sql`.
4. Sign in once with Google in the app so `auth.users` has your row (`srajab@bdb-bh.com`), then re-run the **bottom `do $$` block of 0002** (or paste it again) — that's the bit that promotes you to `admin` once your `auth.users` row exists.

Verify:

```sql
select id, username, role, banned_at from public.profiles where role = 'admin';
```

You should see your row.

---

## Path B — CLI (so future migrations are one command)

One-time setup:

1. Generate a personal access token at <https://supabase.com/dashboard/account/tokens>. Paste it into `.env.local` as `SUPABASE_ACCESS_TOKEN=...` (already gitignored).
2. Grab the DB password from <https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/settings/database> ("Database password" — reset if you forgot it). Paste it into `.env.local` as `SUPABASE_DB_PASSWORD=...`.
3. Link the project:

   ```sh
   npm run db:link   # prompts for the DB password
   ```

From then on:

```sh
npm run db:push     # applies any new migration in supabase/migrations/
npm run db:status   # shows which migrations have run
npm run db:diff     # diff your live schema against the migration files
npm run db:pull     # pull a snapshot from the live DB as a new migration
```

---

## After running 0002 — the admin seed

The bootstrap `do $$ ... end $$` block at the bottom of `0002_roles_admin.sql` looks for `auth.users.email = 'srajab@bdb-bh.com'` and sets that row's profile to `role = 'admin'`. It's idempotent — safe to re-run.

If the block prints `Bootstrap admin email srajab@bdb-bh.com not in auth.users yet`, you haven't signed in once yet. Sign in via the Google SSO on the live app, claim your username, then re-run the block (the easiest way is to paste it again in the SQL editor).

---

## Future migrations

Add a new file `supabase/migrations/0003_*.sql`. Run `npm run db:push` (or paste into the dashboard).
