-- Add server-side bounds and atomic rate limiting for privileged Edge Functions.
-- Apply this migration before deploying the hardened functions; they fail closed without it.
alter table public.user_finance_snapshots
  add constraint user_finance_snapshots_object_check
  check (jsonb_typeof(snapshot) = 'object') not valid;
alter table public.user_finance_snapshots
  add constraint user_finance_snapshots_size_check
  check (octet_length(snapshot::text) <= 2097152) not valid;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;
create table if not exists private.api_rate_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (length(action) between 1 and 80),
  bucket_start timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action)
);
revoke all on table private.api_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table private.api_rate_limits to service_role;

create or replace function public.consume_api_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_bucket_start timestamptz;
  v_request_count integer;
begin
  if p_user_id is null or p_action is null or length(p_action) < 1 or length(p_action) > 80
     or p_limit is null or p_limit < 1 or p_limit > 1000
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit parameters';
  end if;
  v_bucket_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into private.api_rate_limits(user_id, action, bucket_start, request_count)
    values (p_user_id, p_action, v_bucket_start, 1)
  on conflict (user_id, action) do update set
    bucket_start = excluded.bucket_start,
    request_count = case
      when private.api_rate_limits.bucket_start = excluded.bucket_start
        then private.api_rate_limits.request_count + 1
      else 1
    end
  returning request_count into v_request_count;
  return v_request_count <= p_limit;
end;
$$;
revoke all on function public.consume_api_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(uuid, text, integer, integer) to service_role;
