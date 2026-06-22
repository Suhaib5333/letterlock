-- 0006 — Per-user question progress (the cross-game no-repeat cycle).
--
-- Signed-in players get their served-question cycle stored server-side, keyed by
-- user_id + pack_id, so "don't repeat until the pack is exhausted" follows their
-- account across devices/sessions. Guests keep an in-memory cycle that resets each
-- session (handled client-side) — nothing is written here for them.

create table if not exists public.question_progress (
  user_id    uuid not null references auth.users (id) on delete cascade,
  pack_id    text not null,
  served     text[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

alter table public.question_progress enable row level security;

-- A user can only see and write their own progress rows.
drop policy if exists "qp select own" on public.question_progress;
create policy "qp select own" on public.question_progress
  for select using (auth.uid() = user_id);

drop policy if exists "qp upsert own" on public.question_progress;
create policy "qp upsert own" on public.question_progress
  for insert with check (auth.uid() = user_id);

drop policy if exists "qp update own" on public.question_progress;
create policy "qp update own" on public.question_progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "qp delete own" on public.question_progress;
create policy "qp delete own" on public.question_progress
  for delete using (auth.uid() = user_id);
