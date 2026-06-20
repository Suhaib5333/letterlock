-- ============================================================================
-- Letterlock — initial Supabase schema
-- ----------------------------------------------------------------------------
-- Run via the Supabase Dashboard SQL editor OR `supabase db push` once the
-- CLI is linked to project `lkudntyvngwwlzuciocd`.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. profiles — one row per signed-in user, owns the public username
-- --------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text unique not null check (
                  username = lower(username)
                  and char_length(username) between 3 and 20
                  and username ~ '^[a-z0-9_]+$'
                ),
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

-- Anyone authenticated can read profiles (so the leaderboard can show names);
-- only the owner can update their own row.
alter table public.profiles enable row level security;

drop policy if exists "profiles select all" on public.profiles;
create policy "profiles select all" on public.profiles
  for select using (true);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Trigger: bump updated_at on every change.
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------------------
-- 2. leaderboard — one row per finished match, keyed by user + pack
-- --------------------------------------------------------------------------
create table if not exists public.leaderboard (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  username      text not null,
  pack_id       text not null,
  score         integer not null check (score >= 0),
  moves         integer not null check (moves >= 0),
  duration_ms   integer not null check (duration_ms >= 0),
  played_at     timestamptz not null default now()
);

create index if not exists leaderboard_pack_score_idx
  on public.leaderboard (pack_id, score desc, moves asc, duration_ms asc);

create index if not exists leaderboard_user_idx on public.leaderboard (user_id, played_at desc);

alter table public.leaderboard enable row level security;

drop policy if exists "leaderboard select all" on public.leaderboard;
create policy "leaderboard select all" on public.leaderboard
  for select using (true); -- public board

drop policy if exists "leaderboard insert own" on public.leaderboard;
create policy "leaderboard insert own" on public.leaderboard
  for insert with check (auth.uid() = user_id);

-- --------------------------------------------------------------------------
-- 3. username availability RPC — checks without leaking PII
-- --------------------------------------------------------------------------
create or replace function public.username_available(name text) returns boolean
language sql stable as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;

grant execute on function public.username_available(text) to anon, authenticated;
