create extension if not exists pgcrypto;

create table if not exists public.event_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  anonymous_session_id text not null,
  event_name text not null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  user_agent text null
);

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  anonymous_session_id text not null,
  display_name text null,
  score integer not null check (score >= 0 and score <= 5000),
  stage_reached text not null,
  distance integer not null check (distance >= 0 and distance <= 500000),
  event_name text not null,
  prize_status text not null default 'unclaimed',
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_content text null,
  device_type text null,
  auth_method text null
);

create table if not exists public.prize_claims (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  score_id uuid not null references public.scores(id) on delete cascade,
  claimed_by_staff text null,
  claimed_at timestamptz null,
  prize_type text not null,
  status text not null default 'pending'
);

create index if not exists scores_event_name_score_idx
  on public.scores (event_name, score desc, created_at asc);

create index if not exists scores_user_id_event_name_idx
  on public.scores (user_id, event_name, score desc, created_at asc);

create index if not exists event_sessions_anonymous_session_idx
  on public.event_sessions (anonymous_session_id, created_at desc);

alter table public.event_sessions enable row level security;
alter table public.scores enable row level security;
alter table public.prize_claims enable row level security;

drop policy if exists "event sessions insertable by anyone" on public.event_sessions;
create policy "event sessions insertable by anyone"
  on public.event_sessions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "event sessions readable by authenticated" on public.event_sessions;
create policy "event sessions readable by authenticated"
  on public.event_sessions
  for select
  to authenticated
  using (true);

drop policy if exists "scores readable by anyone" on public.scores;
create policy "scores readable by anyone"
  on public.scores
  for select
  to anon, authenticated
  using (true);

drop policy if exists "scores insertable by owner" on public.scores;
create policy "scores insertable by owner"
  on public.scores
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "scores updatable by owner" on public.scores;
create policy "scores updatable by owner"
  on public.scores
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "prize claims readable by authenticated" on public.prize_claims;
create policy "prize claims readable by authenticated"
  on public.prize_claims
  for select
  to authenticated
  using (true);

create or replace function public.submit_score_secure(
  p_anonymous_session_id text,
  p_user_id uuid,
  p_display_name text,
  p_score integer,
  p_stage_reached text,
  p_distance integer,
  p_event_name text,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_utm_content text default null,
  p_device_type text default null,
  p_auth_method text default null
)
returns setof public.scores
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted public.scores;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'User mismatch';
  end if;

  if p_score < 1 or p_score > 5000 then
    raise exception 'Score out of range';
  end if;

  if p_distance < 1 or p_distance > 500000 then
    raise exception 'Distance out of range';
  end if;

  insert into public.scores (
    user_id,
    anonymous_session_id,
    display_name,
    score,
    stage_reached,
    distance,
    event_name,
    prize_status,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    device_type,
    auth_method
  )
  values (
    p_user_id,
    p_anonymous_session_id,
    left(coalesce(p_display_name, 'Consultant'), 80),
    p_score,
    p_stage_reached,
    p_distance,
    p_event_name,
    'unclaimed',
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_utm_content,
    p_device_type,
    p_auth_method
  )
  returning * into inserted;

  return query
  select * from public.scores where id = inserted.id;
end;
$$;

revoke all on function public.submit_score_secure(
  text,
  uuid,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) from public;

grant execute on function public.submit_score_secure(
  text,
  uuid,
  text,
  integer,
  text,
  integer,
  text,
  text,
  text,
  text,
  text,
  text,
  text
) to authenticated;
