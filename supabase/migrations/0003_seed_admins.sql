-- ============================================================================
-- Letterlock — seed additional admins
-- ----------------------------------------------------------------------------
-- Run AFTER 0002_roles_admin.sql.
--
-- Bootstraps admin role for known operator emails. Idempotent — each row
-- update only runs if the auth.users row exists; re-running is a no-op once
-- the role is already set.
-- ============================================================================

do $$
declare
  admin_emails constant text[] := array[
    'suhaibrajabo@gmail.com',
    'revenueautomationlab@gmail.com'
  ];
  e text;
  uid uuid;
  promoted integer := 0;
begin
  foreach e in array admin_emails loop
    select id into uid from auth.users where lower(email) = lower(e) limit 1;
    if uid is null then
      raise notice 'Skip %: not in auth.users yet — sign in once with that email, then re-run.', e;
      continue;
    end if;
    -- Ensure the profile row exists (Supabase auth creates auth.users but
    -- the profile is created on first claim; we'd rather promote on first
    -- visit than wait). Username is a placeholder; the user can change it.
    insert into public.profiles (id, username, role)
    values (uid, regexp_replace(split_part(e, '@', 1), '[^a-z0-9_]', '', 'g'), 'admin')
    on conflict (id) do update set role = 'admin';
    promoted := promoted + 1;
    raise notice 'Granted admin to % (uid %)', e, uid;
  end loop;
  raise notice 'Promoted % admin(s).', promoted;
end $$;
