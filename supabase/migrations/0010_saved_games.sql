-- 0010 — Per-account saved game (Resume).
--
-- Signed-in players get their in-progress match stored server-side, ONE row per
-- user, so "leave and come back → resume your last game" follows the account
-- across devices/sessions. Guests keep a local (localStorage) save handled
-- client-side — nothing is written here for them.
--
-- `state` holds the serialized match: { setup, opts (with packId), series, log }.
-- The append-only event `log` is the source of truth; the client replays it.

create table if not exists public.saved_games (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.saved_games enable row level security;

-- A user can only see and write their own saved game.
drop policy if exists "sg select own" on public.saved_games;
create policy "sg select own" on public.saved_games
  for select using (auth.uid() = user_id);

drop policy if exists "sg insert own" on public.saved_games;
create policy "sg insert own" on public.saved_games
  for insert with check (auth.uid() = user_id);

drop policy if exists "sg update own" on public.saved_games;
create policy "sg update own" on public.saved_games
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sg delete own" on public.saved_games;
create policy "sg delete own" on public.saved_games
  for delete using (auth.uid() = user_id);
