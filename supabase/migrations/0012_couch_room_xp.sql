-- Letterlock — Couch-Mode "link for XP" without keeping your phone open.
--
-- In Couch Mode the host adjudicates on one screen and linked players' phones are
-- passive. Previously each phone credited its OWN XP when it received the
-- game_won broadcast — so the phone had to stay open. This migration moves the
-- award SERVER-SIDE: a signed-in player records their membership ONCE (when they
-- scan the QR + get a team), then can close their phone; the host credits every
-- recorded member at game end via award_room_xp().
--
-- Idempotent + re-runnable (CI re-applies every migration on every push).

-- ── room_members ─────────────────────────────────────────────────────────
-- One row per (room, signed-in user): which team they're linked to for XP.
-- Owned by the user (RLS), so a phone that's closed still leaves its row behind
-- for the host to credit at game end.
create table if not exists public.room_members (
  room_code text not null,
  user_id   uuid not null references auth.users(id) on delete cascade,
  team      text not null check (team in ('A', 'B')),
  name      text,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);
alter table public.room_members enable row level security;

drop policy if exists rm_self_select on public.room_members;
create policy rm_self_select on public.room_members for select using (auth.uid() = user_id);
drop policy if exists rm_self_insert on public.room_members;
create policy rm_self_insert on public.room_members for insert with check (auth.uid() = user_id);
drop policy if exists rm_self_update on public.room_members;
create policy rm_self_update on public.room_members for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists rm_self_delete on public.room_members;
create policy rm_self_delete on public.room_members for delete using (auth.uid() = user_id);

-- ── room_awards ──────────────────────────────────────────────────────────
-- Dedupe log so a given game's XP is credited at most once (guards double-fire /
-- a host re-clicking / a re-render). No client policies — only the SECURITY
-- DEFINER function (which bypasses RLS) touches it.
create table if not exists public.room_awards (
  room_code  text not null,
  game_key   text not null,
  awarded_at timestamptz not null default now(),
  primary key (room_code, game_key)
);
alter table public.room_awards enable row level security;

-- ── award_room_xp ────────────────────────────────────────────────────────
-- Called by the host at the end of each game. Credits every recorded member of
-- the room their CANONICAL XP — winner 100, everyone else 50 (the same
-- winner-full / loser-partial split players earn live) — even if their phone is
-- closed. The host cannot choose amounts or target arbitrary users; only people
-- who genuinely joined the room are credited, and amounts are fixed here.
-- Idempotent per (room, game_key). Returns the number of members credited.
drop function if exists public.award_room_xp(text, text, text);
create or replace function public.award_room_xp(p_room text, p_winner text, p_game_key text)
returns integer
language plpgsql security definer set search_path = public as $$
declare
  m   record;
  amt integer;
  n   integer := 0;
begin
  if p_room is null or length(p_room) <> 6 then raise exception 'bad room code'; end if;
  if p_winner is not null and p_winner not in ('A', 'B') then raise exception 'bad winner'; end if;

  -- Claim this game exactly once; a duplicate (already-awarded) call no-ops.
  insert into public.room_awards (room_code, game_key)
  values (p_room, coalesce(nullif(p_game_key, ''), 'g'))
  on conflict do nothing;
  if not found then return 0; end if;

  for m in select user_id, team from public.room_members where room_code = p_room loop
    amt := case when p_winner is not null and m.team = p_winner then 100 else 50 end;
    update public.profiles p
      set total_xp = p.total_xp + amt,
          xp = least(8500, p.xp + amt),
          level = public.level_from_xp(least(8500, p.xp + amt))
      where p.id = m.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.award_room_xp(text, text, text) to authenticated, anon;

-- ── room_clear ───────────────────────────────────────────────────────────
-- Wipe a room's membership + award log when the match ends or the host leaves,
-- so stale rows can't be credited if a 6-char code is later reused.
drop function if exists public.room_clear(text);
create or replace function public.room_clear(p_room text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_room is null or length(p_room) <> 6 then return; end if;
  delete from public.room_members where room_code = p_room;
  delete from public.room_awards  where room_code = p_room;
end $$;
grant execute on function public.room_clear(text) to authenticated, anon;
