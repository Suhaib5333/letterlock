-- 0005 — Keep the leaderboard's denormalised username in sync with profiles.
--
-- The leaderboard stores user_id (the source of truth) plus a denormalised
-- username for fast display. When a user edits their username (profiles.username),
-- cascade it to all their leaderboard rows BY user_id so their existing scores
-- immediately show the new name. Runs SECURITY DEFINER because normal users have
-- no UPDATE policy on leaderboard.

create or replace function public.sync_leaderboard_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is distinct from old.username then
    update public.leaderboard
       set username = new.username
     where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_leaderboard_username on public.profiles;
create trigger trg_sync_leaderboard_username
  after update of username on public.profiles
  for each row
  execute function public.sync_leaderboard_username();
