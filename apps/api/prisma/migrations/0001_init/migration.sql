-- Letterlock: initial schema for the custom backend (LAUNCH_PLAN Phase 2.3).
-- Same public tables, UUID keys and column names as supabase/migrations/0001..0012,
-- with auth.users replaced by public.users and every SQL function that used
-- auth.uid() rewritten to take p_user_id uuid (the API passes the verified id).
-- otp_attempts is dropped: @nestjs/throttler replaces it.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type "user_role" as enum ('player', 'moderator', 'admin');

-- ---------------------------------------------------------------------------
-- users (was auth.users)
-- ---------------------------------------------------------------------------
create table "users" (
  "id"         uuid primary key default gen_random_uuid(),
  "email"      text unique,
  "google_sub" text unique,
  "apple_sub"  text unique,
  "created_at" timestamptz(6) not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table "profiles" (
  "id"                  uuid primary key references "users"("id") on delete cascade on update cascade,
  "username"            text unique not null check (
                          username = lower(username)
                          and char_length(username) between 3 and 20
                          and username ~ '^[a-z0-9_]+$'
                        ),
  "display_name"        text,
  "avatar_url"          text,
  "created_at"          timestamptz(6) not null default now(),
  "updated_at"          timestamptz(6) not null default now(),
  "role"                "user_role" not null default 'player',
  "banned_at"           timestamptz(6),
  "xp"                  integer not null default 0,
  "level"               integer not null default 1,
  "prestige"            integer not null default 0,
  "total_xp"            bigint not null default 0,
  "full_access"         boolean not null default false,
  "username_changed_at" timestamptz(6),
  "ads_removed"         boolean not null default false,
  "ads_removed_source"  text,
  "ads_removed_at"      timestamptz(6),
  "rc_app_user_id"      text
);
create index "profiles_username_idx" on "profiles" ("username");
create index "profiles_role_idx" on "profiles" ("role");
create index "profiles_total_xp_idx" on "profiles" ("total_xp" desc);

-- ---------------------------------------------------------------------------
-- leaderboard
-- ---------------------------------------------------------------------------
create table "leaderboard" (
  "id"          uuid primary key default gen_random_uuid(),
  "user_id"     uuid not null references "users"("id") on delete cascade on update cascade,
  "username"    text not null,
  "pack_id"     text not null,
  "score"       integer not null check (score >= 0),
  "moves"       integer not null check (moves >= 0),
  "duration_ms" integer not null check (duration_ms >= 0),
  "played_at"   timestamptz(6) not null default now()
);
create index "leaderboard_pack_score_idx" on "leaderboard" ("pack_id", "score" desc, "moves" asc, "duration_ms" asc);
create index "leaderboard_user_idx" on "leaderboard" ("user_id", "played_at" desc);

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------
create table "friendships" (
  "user_low"   uuid not null references "users"("id") on delete cascade on update cascade,
  "user_high"  uuid not null references "users"("id") on delete cascade on update cascade,
  "status"     text not null check (status in ('pending','accepted','blocked')),
  "action_by"  uuid not null,
  "created_at" timestamptz(6) not null default now(),
  "updated_at" timestamptz(6) not null default now(),
  primary key ("user_low", "user_high"),
  check (user_low < user_high)
);
create index "friendships_high_idx" on "friendships" ("user_high");

-- ---------------------------------------------------------------------------
-- question_progress
-- ---------------------------------------------------------------------------
create table "question_progress" (
  "user_id"    uuid not null references "users"("id") on delete cascade on update cascade,
  "pack_id"    text not null,
  "served"     text[] not null default '{}',
  "updated_at" timestamptz(6) not null default now(),
  primary key ("user_id", "pack_id")
);

-- ---------------------------------------------------------------------------
-- saved_games
-- ---------------------------------------------------------------------------
create table "saved_games" (
  "user_id"    uuid primary key references "users"("id") on delete cascade on update cascade,
  "state"      jsonb not null,
  "updated_at" timestamptz(6) not null default now()
);

-- ---------------------------------------------------------------------------
-- custom_packs
-- ---------------------------------------------------------------------------
create table "custom_packs" (
  "id"           uuid primary key default gen_random_uuid(),
  "owner_id"     uuid not null references "users"("id") on delete cascade on update cascade,
  "name"         text not null check (char_length(name) between 2 and 80),
  "description"  text,
  "emoji"        text not null default '✨' check (char_length(emoji) <= 8),
  "difficulty"   text not null default 'medium'
                   check (difficulty in ('kids','easy','medium','hard','expert','extreme')),
  "body"         jsonb not null,
  "published"    boolean not null default false,
  "published_at" timestamptz(6),
  "created_at"   timestamptz(6) not null default now(),
  "updated_at"   timestamptz(6) not null default now()
);
create index "custom_packs_owner_idx" on "custom_packs" ("owner_id");
create index "custom_packs_published_idx" on "custom_packs" ("published") where published = true;

-- ---------------------------------------------------------------------------
-- room_members + room_awards
-- ---------------------------------------------------------------------------
create table "room_members" (
  "room_code" text not null,
  "user_id"   uuid not null references "users"("id") on delete cascade on update cascade,
  "team"      text not null check (team in ('A', 'B')),
  "name"      text,
  "joined_at" timestamptz(6) not null default now(),
  primary key ("room_code", "user_id")
);

create table "room_awards" (
  "room_code"  text not null,
  "game_key"   text not null,
  "awarded_at" timestamptz(6) not null default now(),
  primary key ("room_code", "game_key")
);

-- ---------------------------------------------------------------------------
-- Auth tables owned by the API
-- ---------------------------------------------------------------------------
create table "otp_codes" (
  "id"         uuid primary key default gen_random_uuid(),
  "email"      text not null,
  "code_hash"  text not null,
  "expires_at" timestamptz(6) not null,
  "attempts"   integer not null default 0,
  "created_at" timestamptz(6) not null default now()
);
create index "otp_codes_email_idx" on "otp_codes" ("email");

create table "refresh_tokens" (
  "id"         uuid primary key default gen_random_uuid(),
  "user_id"    uuid not null references "users"("id") on delete cascade on update cascade,
  "token_hash" text unique not null,
  "expires_at" timestamptz(6) not null,
  "user_agent" text,
  "created_at" timestamptz(6) not null default now()
);
create index "refresh_tokens_user_idx" on "refresh_tokens" ("user_id");

create table "guest_tokens" (
  "id"         uuid primary key default gen_random_uuid(),
  "name"       text,
  "expires_at" timestamptz(6) not null,
  "created_at" timestamptz(6) not null default now()
);

create table "login_codes" (
  "id"         uuid primary key default gen_random_uuid(),
  "user_id"    uuid not null references "users"("id") on delete cascade on update cascade,
  "code_hash"  text unique not null,
  "expires_at" timestamptz(6) not null,
  "created_at" timestamptz(6) not null default now()
);

create table "app_config" (
  "id"            integer primary key default 1,
  "min_native"    text not null default '0.0.0',
  "min_bundle"    text not null default '0.0.0',
  "maintenance"   boolean not null default false,
  "message"       text,
  "store_links"   jsonb not null default '{}',
  "latest_bundle" jsonb,
  "updated_at"    timestamptz(6) not null default now()
);
insert into "app_config" ("id") values (1);

-- ===========================================================================
-- Triggers (from 0001, 0002, 0005, 0009)
-- ===========================================================================
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on "profiles"
  for each row execute function touch_updated_at();
create trigger custom_packs_touch before update on "custom_packs"
  for each row execute function touch_updated_at();
create trigger friendships_touch before update on "friendships"
  for each row execute function touch_updated_at();

-- 0005: keep the denormalised leaderboard username in sync with profiles.
create or replace function sync_leaderboard_username() returns trigger
language plpgsql as $$
begin
  if new.username is distinct from old.username then
    update "leaderboard" set username = new.username where user_id = new.id;
  end if;
  return new;
end $$;

create trigger trg_sync_leaderboard_username
  after update of username on "profiles"
  for each row execute function sync_leaderboard_username();

-- 0009: username change policy (30-day cooldown + reserved names) as a backstop
-- on ANY write path, plus the friendly change_username function below.
create or replace function username_change_interval()
returns interval language sql immutable as $$ select interval '30 days' $$;

create or replace function is_reserved_username(name text)
returns boolean language sql immutable as $$
  select lower(name) = any (array[
    'admin','administrator','root','system','support','help','moderator','mod',
    'staff','official','letterlock','null','undefined','everyone','anonymous'
  ]);
$$;

create or replace function enforce_username_change_limit() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if is_reserved_username(new.username) then
      raise exception 'username_reserved';
    end if;
    return new;
  end if;
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and now() < old.username_changed_at + username_change_interval() then
      raise exception 'username_change_too_soon'
        using detail = to_char(old.username_changed_at + username_change_interval(),
                               'YYYY-MM-DD"T"HH24:MI:SSOF');
    end if;
    if is_reserved_username(new.username) then
      raise exception 'username_reserved';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end $$;

create trigger trg_enforce_username_change_limit
  before update of username on "profiles"
  for each row execute function enforce_username_change_limit();
create trigger trg_enforce_username_on_insert
  before insert on "profiles"
  for each row execute function enforce_username_change_limit();

-- ===========================================================================
-- Data-logic functions (0004, 0007, 0008, 0009, 0012), auth.uid() -> p_user_id
-- ===========================================================================

-- Cumulative XP to reach a level (mirrors src/core/progression.ts).
create or replace function level_from_xp(p_xp integer) returns integer
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

-- award_xp: amount clamped [0,200] per call; xp caps at 8500; total_xp forever.
create or replace function award_xp(p_user_id uuid, amount integer)
returns table (xp integer, level integer, prestige integer, total_xp bigint, leveled_up boolean)
language plpgsql as $$
declare
  amt   integer := greatest(0, least(200, coalesce(amount, 0)));
  old_l integer;
begin
  if p_user_id is null then raise exception 'not authenticated'; end if;
  select p.level into old_l from "profiles" p where p.id = p_user_id;
  if old_l is null then raise exception 'no profile'; end if;
  update "profiles" p
    set total_xp = p.total_xp + amt,
        xp = least(8500, p.xp + amt),
        level = level_from_xp(least(8500, p.xp + amt))
    where p.id = p_user_id;
  return query
    select p.xp, p.level, p.prestige, p.total_xp, (p.level > coalesce(old_l, 1))
    from "profiles" p where p.id = p_user_id;
end $$;

-- prestige_up: only at level 10, below max prestige.
create or replace function prestige_up(p_user_id uuid)
returns table (level integer, prestige integer)
language plpgsql as $$
begin
  if p_user_id is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from "profiles" where id = p_user_id and "profiles".level >= 10 and "profiles".prestige < 10) then
    raise exception 'not eligible to prestige';
  end if;
  update "profiles" set prestige = "profiles".prestige + 1, level = 1, xp = 0 where id = p_user_id;
  return query select p.level, p.prestige from "profiles" p where p.id = p_user_id;
end $$;

-- submit_score: username derived server-side, banned users refused, metrics bounded.
create or replace function submit_score(
  p_user_id uuid, p_pack_id text, p_score int, p_moves int, p_duration_ms bigint
) returns void
language plpgsql as $$
declare
  v_username text;
  v_banned   timestamptz;
begin
  if p_user_id is null then raise exception 'not authenticated'; end if;
  select username, banned_at into v_username, v_banned from "profiles" where id = p_user_id;
  if v_username is null then raise exception 'no profile / username'; end if;
  if v_banned is not null then raise exception 'account is banned'; end if;
  if p_score < 0 or p_score > 100 then raise exception 'bad score'; end if;
  if p_moves < 0 or p_moves > 100000 then raise exception 'bad moves'; end if;
  if p_duration_ms < 0 or p_duration_ms > 86400000 then raise exception 'bad duration'; end if;
  insert into "leaderboard" (user_id, username, pack_id, score, moves, duration_ms)
  values (p_user_id, v_username, p_pack_id, p_score, p_moves, p_duration_ms);
end $$;

-- global_ranks: top N by lifetime XP with dense position.
create or replace function global_ranks(p_limit integer default 100)
returns table (id uuid, username text, level integer, prestige integer, total_xp bigint, rank bigint)
language sql stable as $$
  select p.id, p.username, p.level, p.prestige, p.total_xp,
         row_number() over (order by p.total_xp desc, p.created_at asc) as rank
  from "profiles" p
  where p.banned_at is null
  order by p.total_xp desc, p.created_at asc
  limit greatest(1, least(500, coalesce(p_limit, 100)));
$$;

-- my_global_rank: the user's exact global position.
create or replace function my_global_rank(p_user_id uuid)
returns table (rank bigint, total_xp bigint, level integer, prestige integer)
language sql stable as $$
  select
    (select count(*) + 1 from "profiles" o
       where o.banned_at is null
         and ( o.total_xp > me.total_xp
            or (o.total_xp = me.total_xp and o.created_at < me.created_at) )) as rank,
    me.total_xp, me.level, me.prestige
  from "profiles" me
  where me.id = p_user_id;
$$;

-- pack_leaderboard: deduped (best per player) + paginated, with total for paging.
create or replace function pack_leaderboard(
  p_pack text default 'all', p_limit integer default 25, p_offset integer default 0
)
returns table (
  user_id uuid, username text, score integer, moves integer, duration_ms bigint,
  level integer, prestige integer, total bigint
)
language sql stable as $$
  with best as (
    select distinct on (l.user_id)
      l.user_id, l.username, l.score, l.moves, l.duration_ms::bigint as duration_ms
    from "leaderboard" l
    where (p_pack = 'all' or l.pack_id = p_pack)
    order by l.user_id, l.score desc, l.moves asc, l.duration_ms asc
  )
  select b.user_id, b.username, b.score, b.moves, b.duration_ms,
         coalesce(p.level, 1), coalesce(p.prestige, 0),
         count(*) over() as total
  from best b
  left join "profiles" p on p.id = b.user_id
  order by b.score desc, b.moves asc, b.duration_ms asc
  limit greatest(1, least(100, coalesce(p_limit, 25)))
  offset greatest(0, coalesce(p_offset, 0));
$$;

-- change_username: format + reserved + 30-day cooldown + uniqueness, structured result.
create or replace function change_username(p_user_id uuid, p_name text)
returns table (ok boolean, error text, next_allowed_at timestamptz)
language plpgsql as $$
declare
  v_name text := lower(trim(coalesce(p_name, '')));
  v_current text;
  v_changed_at timestamptz;
  v_next timestamptz;
begin
  if p_user_id is null then
    return query select false, 'not_signed_in', null::timestamptz; return;
  end if;
  if v_name !~ '^[a-z0-9_]{3,20}$' then
    return query select false, 'invalid', null::timestamptz; return;
  end if;
  if is_reserved_username(v_name) then
    return query select false, 'reserved', null::timestamptz; return;
  end if;
  select username, username_changed_at into v_current, v_changed_at
  from "profiles" where id = p_user_id;
  if v_current is null then
    return query select false, 'no_profile', null::timestamptz; return;
  end if;
  if v_name = v_current then
    return query select false, 'unchanged', null::timestamptz; return;
  end if;
  if v_changed_at is not null then
    v_next := v_changed_at + username_change_interval();
    if now() < v_next then
      return query select false, 'too_soon', v_next; return;
    end if;
  end if;
  if exists (select 1 from "profiles" where username = v_name and id <> p_user_id) then
    return query select false, 'taken', null::timestamptz; return;
  end if;
  update "profiles" set username = v_name, username_changed_at = now() where id = p_user_id;
  return query select true, null::text, now() + username_change_interval();
exception
  when unique_violation then
    return query select false, 'taken', null::timestamptz;
end $$;

-- admin_grant_xp: signed adjustment (can be negative), clamped like award_xp.
create or replace function admin_grant_xp(target_id uuid, amount integer)
returns void
language plpgsql as $$
begin
  update "profiles"
    set total_xp = greatest(0, total_xp + amount),
        xp = greatest(0, least(8500, xp + amount)),
        level = level_from_xp(greatest(0, least(8500, xp + amount)))
    where id = target_id;
end $$;

-- award_room_xp: credit every recorded member of a room once per (room, game_key).
create or replace function award_room_xp(p_room text, p_winner text, p_game_key text)
returns integer
language plpgsql as $$
declare
  m   record;
  amt integer;
  n   integer := 0;
begin
  if p_room is null or length(p_room) <> 6 then raise exception 'bad room code'; end if;
  if p_winner is not null and p_winner not in ('A', 'B') then raise exception 'bad winner'; end if;
  insert into "room_awards" (room_code, game_key)
  values (p_room, coalesce(nullif(p_game_key, ''), 'g'))
  on conflict do nothing;
  if not found then return 0; end if;
  for m in select user_id, team from "room_members" where room_code = p_room loop
    amt := case when p_winner is not null and m.team = p_winner then 100 else 50 end;
    update "profiles" p
      set total_xp = p.total_xp + amt,
          xp = least(8500, p.xp + amt),
          level = level_from_xp(least(8500, p.xp + amt))
      where p.id = m.user_id;
    n := n + 1;
  end loop;
  return n;
end $$;
