-- ============================================================================
-- Letterlock — Progression (XP/level/prestige), unlocks, and the friends system.
-- Mirrors src/core/progression.ts. Run AFTER 0002.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Progression columns on profiles
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists xp integer not null default 0;        -- xp within current prestige (capped at level-10 entry)
alter table public.profiles add column if not exists level integer not null default 1;       -- 1..10 (derived from xp)
alter table public.profiles add column if not exists prestige integer not null default 0;    -- 0..10
alter table public.profiles add column if not exists total_xp bigint not null default 0;      -- lifetime, never resets (global rank)
alter table public.profiles add column if not exists full_access boolean not null default false; -- admin override: unlock everything

create index if not exists profiles_total_xp_idx on public.profiles (total_xp desc);

-- Cumulative XP to REACH a level (games [2,3,5,7,9,11,13,15,20] × 100 WIN xp).
-- reach: L1=0 L2=200 L3=500 L4=1000 L5=1700 L6=2600 L7=3700 L8=5000 L9=6500 L10=8500
create or replace function public.level_from_xp(p_xp integer) returns integer
language sql immutable as $$
  select case
    when p_xp >= 8500 then 10
    when p_xp >= 6500 then 9
    when p_xp >= 5000 then 8
    when p_xp >= 3700 then 7
    when p_xp >= 2600 then 6
    when p_xp >= 1700 then 5
    when p_xp >= 1000 then 4
    when p_xp >= 500  then 3
    when p_xp >= 200  then 2
    else 1
  end;
$$;

-- Award XP to the caller. amount is clamped [0,200] per call (one win+join max).
-- xp within prestige caps at 8500 (level-10 entry); total_xp accrues forever.
create or replace function public.award_xp(amount integer)
returns table (xp integer, level integer, prestige integer, total_xp bigint, leveled_up boolean)
language plpgsql security definer set search_path = public as $$
declare
  amt   integer := greatest(0, least(200, coalesce(amount, 0)));
  old_l integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select p.level into old_l from public.profiles p where p.id = auth.uid();
  update public.profiles p
    set total_xp = p.total_xp + amt,
        xp = least(8500, p.xp + amt),
        level = public.level_from_xp(least(8500, p.xp + amt))
    where p.id = auth.uid();
  return query
    select p.xp, p.level, p.prestige, p.total_xp, (p.level > coalesce(old_l, 1))
    from public.profiles p where p.id = auth.uid();
end $$;

-- Manual prestige (CoD-style): only at level 10, below max prestige.
create or replace function public.prestige_up()
returns table (level integer, prestige integer)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and level >= 10 and prestige < 10) then
    raise exception 'not eligible to prestige';
  end if;
  update public.profiles set prestige = prestige + 1, level = 1, xp = 0 where id = auth.uid();
  return query select p.level, p.prestige from public.profiles p where p.id = auth.uid();
end $$;

grant execute on function public.level_from_xp(integer) to authenticated;
grant execute on function public.award_xp(integer) to authenticated;
grant execute on function public.prestige_up() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Friends — one row per pair, ordered (user_low < user_high), status machine.
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
  user_low  uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  status    text not null check (status in ('pending','accepted','blocked')),
  action_by uuid not null,                 -- who sent the request / who blocked
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);
create index if not exists friendships_high_idx on public.friendships (user_high);

drop trigger if exists friendships_touch on public.friendships;
create trigger friendships_touch before update on public.friendships
  for each row execute function public.touch_updated_at();

alter table public.friendships enable row level security;
-- Participants can READ their own friendship rows; all writes go through RPCs.
drop policy if exists "friendships select own" on public.friendships;
create policy "friendships select own" on public.friendships
  for select using (auth.uid() = user_low or auth.uid() = user_high);

-- Send (or auto-accept a reciprocal) friend request.
create or replace function public.send_friend_request(target uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lo uuid; hi uuid; cur record;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if target = me then raise exception 'cannot friend yourself'; end if;
  if not exists (select 1 from public.profiles where id = target) then raise exception 'no such user'; end if;
  lo := least(me, target); hi := greatest(me, target);
  select * into cur from public.friendships where user_low = lo and user_high = hi;
  if cur is null then
    insert into public.friendships (user_low, user_high, status, action_by) values (lo, hi, 'pending', me);
    return 'pending';
  elsif cur.status = 'blocked' then
    raise exception 'blocked';
  elsif cur.status = 'accepted' then
    return 'accepted';
  elsif cur.status = 'pending' and cur.action_by <> me then
    -- reciprocal request → become friends
    update public.friendships set status = 'accepted', action_by = me where user_low = lo and user_high = hi;
    return 'accepted';
  else
    return 'pending'; -- already sent
  end if;
end $$;

-- Accept (true) or decline/cancel (false) a pending request involving `other`.
create or replace function public.respond_friend_request(other uuid, accept boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other); cur record;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into cur from public.friendships where user_low = lo and user_high = hi and status = 'pending';
  if cur is null then raise exception 'no pending request'; end if;
  if accept then
    update public.friendships set status = 'accepted', action_by = me where user_low = lo and user_high = hi;
    return 'accepted';
  else
    delete from public.friendships where user_low = lo and user_high = hi;
    return 'declined';
  end if;
end $$;

create or replace function public.remove_friend(other uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other);
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  delete from public.friendships where user_low = lo and user_high = hi and status in ('pending','accepted');
end $$;

create or replace function public.block_user(other uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other);
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other = me then raise exception 'cannot block yourself'; end if;
  insert into public.friendships (user_low, user_high, status, action_by) values (lo, hi, 'blocked', me)
    on conflict (user_low, user_high) do update set status = 'blocked', action_by = me;
end $$;

create or replace function public.unblock_user(other uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); lo uuid := least(auth.uid(), other); hi uuid := greatest(auth.uid(), other);
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.friendships where user_low = lo and user_high = hi and status = 'blocked' and action_by = me;
end $$;

-- Caller's social graph: accepted friends + incoming/outgoing pending, with the
-- other person's username + rank. (Online status is overlaid client-side.)
create or replace function public.friends_list()
returns table (
  other_id uuid, username text, level integer, prestige integer,
  status text, incoming boolean
)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  return query
    select
      case when f.user_low = me then f.user_high else f.user_low end as other_id,
      p.username, p.level, p.prestige,
      f.status,
      (f.status = 'pending' and f.action_by <> me) as incoming
    from public.friendships f
    join public.profiles p
      on p.id = case when f.user_low = me then f.user_high else f.user_low end
    where (f.user_low = me or f.user_high = me)
      and f.status in ('pending','accepted')
    order by (f.status = 'pending') desc, p.username asc;
end $$;

-- Find a user by exact username (for the Add-friend search).
create or replace function public.find_user(name text)
returns table (id uuid, username text, level integer, prestige integer)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  return query
    select p.id, p.username, p.level, p.prestige
    from public.profiles p
    where p.username = lower(name) and p.id <> auth.uid()
    limit 1;
end $$;

grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.friends_list() to authenticated;
grant execute on function public.find_user(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Admin progression controls
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_full_access(target_id uuid, value boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden: admin role required'; end if;
  update public.profiles set full_access = value where id = target_id;
end $$;

create or replace function public.admin_grant_xp(target_id uuid, amount integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden: admin role required'; end if;
  update public.profiles
    set total_xp = greatest(0, total_xp + amount),
        xp = greatest(0, least(8500, xp + amount)),
        level = public.level_from_xp(greatest(0, least(8500, xp + amount)))
    where id = target_id;
end $$;

create or replace function public.admin_reset_progression(target_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden: admin role required'; end if;
  update public.profiles set xp = 0, level = 1, prestige = 0, total_xp = 0 where id = target_id;
end $$;

grant execute on function public.admin_set_full_access(uuid, boolean) to authenticated;
grant execute on function public.admin_grant_xp(uuid, integer) to authenticated;
grant execute on function public.admin_reset_progression(uuid) to authenticated;

-- Extend admin_list_users with progression columns (drop + recreate: return type change).
drop function if exists public.admin_list_users();
create or replace function public.admin_list_users()
returns table (
  id uuid, username text, display_name text, email text,
  role public.user_role, banned_at timestamptz, created_at timestamptz,
  level integer, prestige integer, total_xp bigint, full_access boolean
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden: admin role required'; end if;
  return query
    select p.id, p.username, p.display_name, u.email::text, p.role, p.banned_at, p.created_at,
           p.level, p.prestige, p.total_xp, p.full_access
    from public.profiles p
    left join auth.users u on u.id = p.id
    order by p.created_at desc;
end $$;
grant execute on function public.admin_list_users() to authenticated;
