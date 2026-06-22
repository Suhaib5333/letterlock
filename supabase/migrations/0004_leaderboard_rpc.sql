-- 0004 — Secure the leaderboard.
--
-- Before this, the client inserted leaderboard rows directly under the
-- "leaderboard insert own" policy (auth.uid() = user_id). That let any signed-in
-- user post an arbitrary score with a spoofed free-text username, and did not
-- block banned users. This replaces the direct insert with a SECURITY DEFINER
-- RPC that derives the username from the caller's profile, refuses banned
-- accounts, and sanity-bounds the metrics.

create or replace function public.submit_score(
  p_pack_id     text,
  p_score       int,
  p_moves       int,
  p_duration_ms bigint
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_username text;
  v_banned   timestamptz;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select username, banned_at into v_username, v_banned
  from public.profiles
  where id = v_uid;

  if v_username is null then
    raise exception 'no profile / username';
  end if;
  if v_banned is not null then
    raise exception 'account is banned';
  end if;

  -- Sanity bounds — a single match can't realistically exceed these. Keeps
  -- garbage / forged values out of the board without being restrictive.
  if p_score   < 0 or p_score   > 100        then raise exception 'bad score'; end if;
  if p_moves   < 0 or p_moves   > 100000     then raise exception 'bad moves'; end if;
  if p_duration_ms < 0 or p_duration_ms > 86400000 then raise exception 'bad duration'; end if;

  insert into public.leaderboard (user_id, username, pack_id, score, moves, duration_ms)
  values (v_uid, v_username, p_pack_id, p_score, p_moves, p_duration_ms);
end;
$$;

grant execute on function public.submit_score(text, int, int, bigint) to authenticated;

-- Remove the forgeable direct-insert path; the RPC is now the only way in.
drop policy if exists "leaderboard insert own" on public.leaderboard;
