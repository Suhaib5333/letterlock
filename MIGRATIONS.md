# Letterlock — production setup runbook

This is the complete checklist to take a freshly deployed `letterlock.raltech.dev` from
"page loads" → "all features work, end to end". Three sections:

1. **Database** — run the three SQL migrations.
2. **Google OAuth** — toggle on (5 min, one-time).
3. **Resend email** — route Supabase auth emails through your Resend account so they
   look professional + ship from your domain.

After all three, sign-in (Google or 6-digit code), leaderboard, admin panel, custom
pack editor, and the online lobby all work on production.

---

## 1. Database — apply the SQL migrations

The schema lives in `supabase/migrations/`, applied in numeric order.

```
supabase/migrations/
  0001_initial_schema.sql   profiles + leaderboard + username_available RPC
  0002_roles_admin.sql      user_role enum, role/banned_at, admin RPCs, custom_packs
  0003_seed_admins.sql      promotes suhaibrajabo@gmail.com + revenueautomationlab@gmail.com to admin
```

### Easiest path — paste into the SQL editor

1. Open **<https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/sql/new>**
2. Paste `supabase/migrations/0001_initial_schema.sql` → Run.
3. Paste `supabase/migrations/0002_roles_admin.sql` → Run.
4. Sign in once with each admin email via the live app (creates the auth.users row).
5. Paste `supabase/migrations/0003_seed_admins.sql` → Run. (Idempotent — paste it any
   time after a new admin signs in to promote them.)

### CLI path (recommended once you've signed in)

```sh
npm run db:link           # one-time — prompts for DB password
npm run db:push           # applies any new migration on each run
npm run db:status         # shows which migrations have been recorded
```

Verify:

```sql
select email, p.role
from public.profiles p join auth.users u on u.id = p.id
where p.role = 'admin';
-- → suhaibrajabo@gmail.com  admin
-- → revenueautomationlab@gmail.com  admin
```

---

## 2. Google OAuth — enable the provider

You're currently getting `Unsupported provider: provider is not enabled` because
Google OAuth needs a Client ID/Secret from Google Cloud, then pasted into Supabase.
5 minutes one-time.

### A. Get OAuth credentials from Google

1. Open **<https://console.cloud.google.com/apis/credentials>**.
2. Project selector (top) → **NEW PROJECT** → name it `letterlock`. Wait ~10s.
3. **CONFIGURE CONSENT SCREEN** → External → fill in:
   - App name: **Letterlock**
   - User support email: your email
   - Authorized domains: `supabase.co`
   - Developer email: your email
   - Save → next, next, BACK TO DASHBOARD (skip the scopes/test users pages).
4. **+ CREATE CREDENTIALS → OAuth client ID**:
   - Application type: **Web application**
   - Name: `letterlock-web`
   - **Authorized JavaScript origins:**
     ```
     https://letterlock.raltech.dev
     http://localhost:4173
     http://localhost:5173
     ```
   - **Authorized redirect URIs** — paste this **one exact URL** (Supabase's callback):
     ```
     https://lkudntyvngwwlzuciocd.supabase.co/auth/v1/callback
     ```
   - **CREATE**. Copy the **Client ID** and **Client secret** that pop up.

### B. Paste into Supabase

1. Open **<https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/auth/providers>**.
2. Click **Google** → toggle **Enable**.
3. Paste the **Client ID** and **Client Secret** from step A.
4. **Save**.

### C. Set the Site URL + redirect allowlist

1. Open **<https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/auth/url-configuration>**.
2. **Site URL**: `https://letterlock.raltech.dev`
3. **Redirect URLs** — add all three (one per line):
   ```
   https://letterlock.raltech.dev/**
   http://localhost:4173/**
   http://localhost:5173/**
   ```
4. **Save**.

Test on the live site — "Continue with Google" should now open Google's chooser,
sign you in, bounce back, and you'll land on the username-claim step.

---

## 3. Resend email — pretty branded emails (optional, recommended)

By default Supabase sends auth emails from `noreply@mail.app.supabase.io` — works
but looks like spam. To send from your own domain via Resend, pick **one** of
the two paths below.

### Path A — Custom SMTP (simplest, 5 min)

Resend exposes its own SMTP server. Supabase's "Custom SMTP" feature just routes
all auth emails through it. **No code, no edge function.**

1. **Get Resend SMTP credentials**: open
   <https://resend.com/settings/smtp> — you'll see `Host: smtp.resend.com`,
   `Port: 465`, `User: resend`, `Password: <your RESEND_API key>`.
2. **Verify a sending domain** (one-time): in Resend → Domains → add
   `raltech.dev` (or any domain you control) → copy the DNS records to
   Cloudflare → wait ~2 min for "verified".
3. **Supabase dashboard** → **<https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/auth/smtp>**
   - Toggle **Enable Custom SMTP** ON.
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: your `RESEND_API` key (the same one you put in GitHub).
   - Sender email: `no-reply@raltech.dev` (or whichever domain you verified).
   - Sender name: `Letterlock`
   - Save.

Done. Every Supabase auth email (signup, magic-link, recovery) now ships through
Resend, from your domain.

### Path B — Send Email Hook + Edge Function (more control, fully branded HTML)

If you want totally custom HTML templates (the branded Letterlock email built into
this repo at `supabase/functions/send-email/index.ts`), wire it as a Send Email
hook instead:

1. **Get a Supabase access token**:
   <https://supabase.com/dashboard/account/tokens> → Generate new → save in
   `.env.local` as `SUPABASE_ACCESS_TOKEN=…`.
2. **Deploy the function** (one command):
   ```sh
   npx supabase login
   npx supabase link --project-ref lkudntyvngwwlzuciocd
   npx supabase functions deploy send-email --no-verify-jwt
   ```
3. **Set the function's secrets** in Supabase dashboard → Project settings →
   Edge Functions → Secrets:
   ```
   RESEND_API_KEY          = re_xxxxxxxxxxxxxxxxxxx
   SEND_EMAIL_HOOK_SECRET  = v1,whsec_<openssl rand -base64 32>
   MAIL_FROM               = Letterlock <no-reply@raltech.dev>
   ```
4. **Wire the hook**:
   <https://supabase.com/dashboard/project/lkudntyvngwwlzuciocd/auth/hooks> →
   Send email hook → HTTPS →
   URL: `https://lkudntyvngwwlzuciocd.functions.supabase.co/send-email` →
   Secret: paste the exact same `v1,whsec_...` string → Enabled.

The function (in this repo) renders a beautiful Letterlock-branded HTML email
with the 6-digit code prominent.

---

## How the sign-in flow works (after setup)

The app shows three sign-in options at <https://letterlock.raltech.dev>:

1. **Continue with Google** — OAuth (after step 2 above). One click → signed in.
2. **Send sign-in code** — Email OTP. Type your email → receive 6-digit code →
   type it back into the app → signed in. **Works without any provider setup**
   because Supabase's default email is enabled out of the box.
3. **Skip — play locally** — Couch Mode, no account.

After signing in (any method) the modal forces a username claim. That username is
how you appear on the leaderboard.

---

## Becoming admin (the seed promotion)

Once an admin email signs in once, run `0003_seed_admins.sql` (idempotent — the
3rd file in this list) and reload. You'll see:

- 🛠 **Admin** button in the top-right of Home (gated on `useAuth().isAdmin`).
- 📦 **My packs** button (gated on signed-in users only).

The Admin panel lets you promote/demote any user (player ↔ moderator ↔ admin),
ban/unban, and approve user-authored custom packs for publishing.

---

## Future migrations

Add `supabase/migrations/0004_*.sql`. Run `npm run db:push` (or paste into the
dashboard).
