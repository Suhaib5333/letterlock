-- ============================================================================
-- Letterlock — global XP ranking ("Ranks" leaderboard tab). total_xp accumulates
-- forever (even past max level/prestige) so players keep competing. Run AFTER 0007.
-- ============================================================================

-- Top N players by lifetime XP, with their dense position. SECURITY DEFINER +
-- granted to anon so the Ranks tab works signed-out too (RLS hides profiles from
-- anon otherwise).
create or replace function public.global_ranks(p_limit integer default 100)
returns table (id uuid, username text, level integer, prestige integer, total_xp bigint, rank bigint)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.level, p.prestige, p.total_xp,
         row_number() over (order by p.total_xp desc, p.created_at asc) as rank
  from public.profiles p
  where p.banned_at is null
  order by p.total_xp desc, p.created_at asc
  limit greatest(1, least(500, coalesce(p_limit, 100)));
$$;

-- The caller's exact global position + lifetime XP (null when signed out).
create or replace function public.my_global_rank()
returns table (rank bigint, total_xp bigint, level integer, prestige integer)
language sql stable security definer set search_path = public as $$
  select
    (select count(*) + 1 from public.profiles o
       where o.banned_at is null
         -- "ahead of me" matches global_ranks order (total_xp desc, created_at asc):
         and ( o.total_xp > me.total_xp
            or (o.total_xp = me.total_xp and o.created_at < me.created_at) )) as rank,
    me.total_xp, me.level, me.prestige
  from public.profiles me
  where me.id = auth.uid();
$$;

grant execute on function public.global_ranks(integer) to anon, authenticated;
grant execute on function public.my_global_rank() to authenticated;

-- Deduped, paginated match-score leaderboard: each player appears ONCE per scope
-- (their BEST score), with level/prestige joined and a total count for paging.
-- p_pack = 'all' → best across every pack; otherwise that pack only.
create or replace function public.pack_leaderboard(
  p_pack text default 'all', p_limit integer default 25, p_offset integer default 0
)
returns table (
  user_id uuid, username text, score integer, moves integer, duration_ms bigint,
  level integer, prestige integer, total bigint
)
language sql stable security definer set search_path = public as $$
  with best as (
    select distinct on (l.user_id)
      l.user_id, l.username, l.score, l.moves, l.duration_ms
    from public.leaderboard l
    where (p_pack = 'all' or l.pack_id = p_pack)
    order by l.user_id, l.score desc, l.moves asc, l.duration_ms asc
  )
  select b.user_id, b.username, b.score, b.moves, b.duration_ms,
         coalesce(p.level, 1), coalesce(p.prestige, 0),
         count(*) over() as total
  from best b
  left join public.profiles p on p.id = b.user_id
  order by b.score desc, b.moves asc, b.duration_ms asc
  limit greatest(1, least(100, coalesce(p_limit, 25)))
  offset greatest(0, coalesce(p_offset, 0));
$$;
grant execute on function public.pack_leaderboard(text, integer, integer) to anon, authenticated;
