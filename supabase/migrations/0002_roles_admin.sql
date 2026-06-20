-- ============================================================================
-- Letterlock — roles, admin, ban, custom packs
-- ----------------------------------------------------------------------------
-- Run AFTER 0001_initial_schema.sql.
--
-- Adds:
--   - user_role enum  (player | moderator | admin)
--   - profiles.role + profiles.banned_at
--   - is_admin() / is_moderator_or_admin() helpers
--   - set_user_role(user_id, role)  — admin-only
--   - set_user_banned(user_id, banned)  — admin-only
--   - admin_list_users()  — admin-only, joins profiles + auth.users.email
--   - admin_delete_leaderboard_row(id)  — admin-only, moderation
--   - custom_packs table — user-authored question packs (RLS: owner edits,
--     moderator+admin can publish/unpublish, everyone reads published packs)
--
-- Seeds the FIRST admin: suhaibrajabo@gmail.com (whenever that auth.users row
-- exists). Idempotent — re-running won't grant a second time.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. role enum + columns on profiles
-- --------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('player', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'player';

alter table public.profiles
  add column if not exists banned_at timestamptz;

create index if not exists profiles_role_idx on public.profiles (role);

-- --------------------------------------------------------------------------
-- 2. Helpers — used inside policies + RPCs
-- --------------------------------------------------------------------------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and banned_at is null
  );
$$;

create or replace function public.is_moderator_or_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin') and banned_at is null
  );
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_moderator_or_admin() to authenticated;

-- --------------------------------------------------------------------------
-- 3. Profile policy: admins can update any profile (for role/ban changes via
--    the RPCs below, which run as security definer — but a direct update by
--    an admin is still useful for display_name fixes, avatar, etc.)
-- --------------------------------------------------------------------------
drop policy if exists "profiles admin update any" on public.profiles;
create policy "profiles admin update any" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------------------------------
-- 4. RPCs — the only path to mutate role / banned_at. SECURITY DEFINER lets
--    them bypass the per-row "update own" policy when the caller is admin;
--    the body guards on is_admin() so non-admins can't escalate.
-- --------------------------------------------------------------------------
create or replace function public.set_user_role(target_id uuid, new_role public.user_role)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;
  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'cannot demote yourself — ask another admin';
  end if;
  update public.profiles set role = new_role where id = target_id;
end $$;

create or replace function public.set_user_banned(target_id uuid, banned boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;
  if target_id = auth.uid() then
    raise exception 'cannot ban yourself';
  end if;
  update public.profiles
    set banned_at = case when banned then now() else null end
    where id = target_id;
end $$;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  display_name text,
  email text,
  role public.user_role,
  banned_at timestamptz,
  created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin role required';
  end if;
  return query
    select p.id, p.username, p.display_name, u.email::text, p.role, p.banned_at, p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;

create or replace function public.admin_delete_leaderboard_row(row_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_moderator_or_admin() then
    raise exception 'forbidden: moderator+ role required';
  end if;
  delete from public.leaderboard where id = row_id;
end $$;

grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
grant execute on function public.set_user_banned(uuid, boolean) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_delete_leaderboard_row(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- 5. custom_packs — user-authored question packs ("add stuff")
--    Schema mirrors core/packs.ts: each pack is a self-contained JSON blob.
--    Anyone signed in can DRAFT one; moderator+admin can publish (visible to
--    every player). The owner can edit / delete their own draft.
-- --------------------------------------------------------------------------
create table if not exists public.custom_packs (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  name          text not null check (char_length(name) between 2 and 80),
  description   text,
  emoji         text not null default '✨' check (char_length(emoji) <= 8),
  difficulty    text not null default 'medium'
                  check (difficulty in ('kids','easy','medium','hard','expert','extreme')),
  body          jsonb not null,           -- { letters: { A: [{q, a, id?}, …], … } }
  published     boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists custom_packs_owner_idx on public.custom_packs (owner_id);
create index if not exists custom_packs_published_idx on public.custom_packs (published) where published = true;

drop trigger if exists custom_packs_touch on public.custom_packs;
create trigger custom_packs_touch before update on public.custom_packs
  for each row execute function public.touch_updated_at();

alter table public.custom_packs enable row level security;

-- Read: published packs are visible to everyone; an owner sees their own
-- drafts; moderators+admins see every pack (for review).
drop policy if exists "custom_packs select" on public.custom_packs;
create policy "custom_packs select" on public.custom_packs
  for select using (
    published
    or owner_id = auth.uid()
    or public.is_moderator_or_admin()
  );

-- Insert: any signed-in user can create a draft (owner = themselves only).
drop policy if exists "custom_packs insert own" on public.custom_packs;
create policy "custom_packs insert own" on public.custom_packs
  for insert with check (auth.uid() = owner_id);

-- Update: owner edits their own; moderators+admins can flip `published`.
drop policy if exists "custom_packs update own or staff" on public.custom_packs;
create policy "custom_packs update own or staff" on public.custom_packs
  for update using (auth.uid() = owner_id or public.is_moderator_or_admin())
       with check (auth.uid() = owner_id or public.is_moderator_or_admin());

-- Delete: owner or staff.
drop policy if exists "custom_packs delete own or staff" on public.custom_packs;
create policy "custom_packs delete own or staff" on public.custom_packs
  for delete using (auth.uid() = owner_id or public.is_moderator_or_admin());

-- --------------------------------------------------------------------------
-- 6. Seed the bootstrap admin — suhaibrajabo@gmail.com
--    Runs lazily: if the user hasn't signed in yet there's nothing to seed.
--    Re-running is a no-op (idempotent UPDATE).
-- --------------------------------------------------------------------------
do $$
declare
  bootstrap_email constant text := 'suhaibrajabo@gmail.com';
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(bootstrap_email) limit 1;
  if uid is null then
    raise notice 'Bootstrap admin email % not in auth.users yet — sign in once, then re-run this section.', bootstrap_email;
    return;
  end if;
  update public.profiles set role = 'admin' where id = uid;
  if not found then
    raise notice 'Profile for % not created yet — sign in once to claim username, then re-run.', bootstrap_email;
  else
    raise notice 'Granted admin role to %.', bootstrap_email;
  end if;
end $$;
