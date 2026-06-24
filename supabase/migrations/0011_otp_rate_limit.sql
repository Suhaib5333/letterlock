-- 0011 — OTP send rate limiting (anti-spam for the email verification flow).
--
-- Caps how often a verification code can be requested:
--   • per email address: 3 per 5 minutes
--   • per client IP:      3 per 5 minutes
-- Enforced server-side in the send-otp Edge Function (which calls otp_rate_check
-- with the service-role key) so it can't be bypassed from the client. Stops
-- resend spam / typo'd-email abuse before we ever create a user or hit Resend.

create table if not exists public.otp_attempts (
  id         bigint generated always as identity primary key,
  email      text not null,
  ip         text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists otp_attempts_email_idx on public.otp_attempts (email, created_at desc);
create index if not exists otp_attempts_ip_idx    on public.otp_attempts (ip, created_at desc);

alter table public.otp_attempts enable row level security;
-- No policies → unreachable from anon/authenticated. Only the SECURITY DEFINER
-- RPC below (and the service role) can touch it.

-- Atomic "may I send a code now?" check. Counts recent attempts for this email
-- AND this ip; if either is at/over the cap, returns allowed=false plus how many
-- seconds until the window frees up. Otherwise records this attempt and allows.
create or replace function public.otp_rate_check(
  p_email text,
  p_ip text default '',
  p_max integer default 3,
  p_window_secs integer default 300
)
returns table (allowed boolean, retry_after integer)
language plpgsql security definer set search_path = public as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_ip text := coalesce(p_ip, '');
  v_window interval := make_interval(secs => greatest(1, p_window_secs));
  v_email_n integer;
  v_ip_n integer;
  v_oldest timestamptz;
  v_retry integer;
begin
  -- Opportunistic cleanup so the table can't grow without bound.
  delete from public.otp_attempts where created_at < now() - interval '1 hour';

  select count(*) into v_email_n
  from public.otp_attempts
  where email = v_email and created_at > now() - v_window;

  select count(*) into v_ip_n
  from public.otp_attempts
  where v_ip <> '' and ip = v_ip and created_at > now() - v_window;

  if v_email_n >= p_max or v_ip_n >= p_max then
    -- Seconds until the oldest in-window attempt (for whichever bucket is full)
    -- ages out, so the client can show an accurate "try again in N".
    select min(created_at) into v_oldest
    from public.otp_attempts
    where created_at > now() - v_window
      and ( email = v_email or (v_ip <> '' and ip = v_ip) );
    v_retry := greatest(1, ceil(extract(epoch from (v_oldest + v_window - now())))::integer);
    return query select false, v_retry;
    return;
  end if;

  insert into public.otp_attempts (email, ip) values (v_email, v_ip);
  return query select true, 0;
end;
$$;

-- Only the service role (used by the Edge Function) may call this; never anon.
revoke all on function public.otp_rate_check(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.otp_rate_check(text, text, integer, integer) to service_role;
