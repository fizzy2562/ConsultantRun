-- Migration: add character_key to scores table and update submit_score_secure RPC
-- Apply to any existing database that was created from schema.sql before this change.

alter table public.scores
  add column if not exists character_key text null;

-- Drop and recreate the RPC so Postgres picks up the new parameter.
-- Using create or replace is safe here because the function body is fully replaced.
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
  p_auth_method text default null,
  p_character_key text default null
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
    auth_method,
    character_key
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
    p_auth_method,
    p_character_key
  )
  returning * into inserted;

  return query
  select * from public.scores where id = inserted.id;
end;
$$;

-- Revoke from public, grant to authenticated only (matches original permissions).
revoke all on function public.submit_score_secure(
  text, uuid, text, integer, text, integer, text,
  text, text, text, text, text, text, text
) from public;

grant execute on function public.submit_score_secure(
  text, uuid, text, integer, text, integer, text,
  text, text, text, text, text, text, text
) to authenticated;
