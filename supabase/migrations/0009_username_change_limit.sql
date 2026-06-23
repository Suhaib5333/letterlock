-- ============================================================================
-- Letterlock — username change policy. Usernames are already unique + lowercase
-- + format-checked (3-20 [a-z0-9_]) by 0001. This migration adds:
--   1. A once-every-30-days rate limit on CHANGES (the first claim is free).
--   2. A reserved-name block (admin / system / etc.).
--   3. A friendly RPC `change_username` that returns a structured result so the
--      UI can show "you can change again on <date>" instead of a raw SQL error.
--   4. A BEFORE-UPDATE trigger backstop so the limit holds even against a direct
--      table update (users have an UPDATE policy on their own profile row).
-- Run AFTER 0008.
-- ============================================================================

-- When the username was last changed. NULL = never changed since the initial
-- claim → the first change is always allowed.
alter table public.profiles
  add column if not exists username_changed_at timestamptz;

-- How long a user must wait between username changes.
-- (kept as a single source of truth referenced by both the trigger and the RPC)
create or replace function public.username_change_interval()
returns interval language sql immutable as $$ select interval '30 days' $$;

-- Names nobody may take (case-insensitive). Extend as needed.
create or replace function public.is_reserved_username(name text)
returns boolean language sql immutable as $$
  select lower(name) = any (array[
    'admin','administrator','root','system','support','help','moderator','mod',
    'staff','official','letterlock','null','undefined','everyone','anonymous'
  ]);
$$;

-- ── Backstop trigger: enforce the cooldown + stamp the timestamp on ANY username
--    change, no matter how it's issued. Skips non-username updates (xp, level…). ──
create or replace function public.enforce_username_change_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- First claim (INSERT): reserved names are still off-limits, but there's no
  -- cooldown to apply (the rate limit only governs subsequent changes).
  if tg_op = 'INSERT' then
    if public.is_reserved_username(new.username) then
      raise exception 'username_reserved';
    end if;
    return new;
  end if;

  -- Edits (UPDATE) that actually change the username.
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and now() < old.username_changed_at + public.username_change_interval() then
      raise exception 'username_change_too_soon'
        using detail = to_char(old.username_changed_at + public.username_change_interval(),
                               'YYYY-MM-DD"T"HH24:MI:SSOF');
    end if;
    if public.is_reserved_username(new.username) then
      raise exception 'username_reserved';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_username_change_limit on public.profiles;
-- BEFORE the leaderboard-sync trigger (0005, AFTER UPDATE) so a rejected change
-- never cascades. for-each-row; UPDATE OF username can't also list INSERT, so the
-- insert guard lives in its own trigger below.
create trigger trg_enforce_username_change_limit
  before update of username on public.profiles
  for each row
  execute function public.enforce_username_change_limit();

drop trigger if exists trg_enforce_username_on_insert on public.profiles;
create trigger trg_enforce_username_on_insert
  before insert on public.profiles
  for each row
  execute function public.enforce_username_change_limit();

-- ── Friendly RPC: validate + rate-limit + uniqueness in one call, returning a
--    structured result. The UI calls this instead of a raw table update. ──
create or replace function public.change_username(p_name text)
returns table (ok boolean, error text, next_allowed_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := lower(trim(coalesce(p_name, '')));
  v_current text;
  v_changed_at timestamptz;
  v_next timestamptz;
begin
  if v_uid is null then
    return query select false, 'not_signed_in', null::timestamptz; return;
  end if;

  -- Format: 3-20 chars, lowercase letters / digits / underscores.
  if v_name !~ '^[a-z0-9_]{3,20}$' then
    return query select false, 'invalid', null::timestamptz; return;
  end if;

  if public.is_reserved_username(v_name) then
    return query select false, 'reserved', null::timestamptz; return;
  end if;

  select username, username_changed_at into v_current, v_changed_at
  from public.profiles where id = v_uid;

  if v_current is null then
    -- No profile yet → this isn't an edit; the claim path (insert) handles it.
    return query select false, 'no_profile', null::timestamptz; return;
  end if;

  if v_name = v_current then
    return query select false, 'unchanged', null::timestamptz; return;
  end if;

  -- Rate limit (the first change since claiming is free: v_changed_at is null).
  if v_changed_at is not null then
    v_next := v_changed_at + public.username_change_interval();
    if now() < v_next then
      return query select false, 'too_soon', v_next; return;
    end if;
  end if;

  -- Uniqueness (case-insensitive; usernames are stored lowercase).
  if exists (select 1 from public.profiles where username = v_name and id <> v_uid) then
    return query select false, 'taken', null::timestamptz; return;
  end if;

  update public.profiles
     set username = v_name, username_changed_at = now()
   where id = v_uid;

  return query select true, null::text, now() + public.username_change_interval();
exception
  when unique_violation then
    -- TOCTOU: someone claimed it between the check and the update.
    return query select false, 'taken', null::timestamptz;
end;
$$;

grant execute on function public.change_username(text) to authenticated;
grant execute on function public.username_change_interval() to anon, authenticated;
grant execute on function public.is_reserved_username(text) to anon, authenticated;
