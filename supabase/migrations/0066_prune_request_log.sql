-- The request log grows with every request (about half a kilobyte each, indexes included), so it is trimmed automatically:
-- ordinary requests are kept 14 days, anything flagged or failed (attacks, scripts, failed sign-ins, denied admin access) 90 days.
-- At most 200,000 rows are removed per run, so a big backlog is worked through over a few nights without locking the table.
-- Analytics (app_events) are NOT trimmed: "all-time visitors" depends on them.
create or replace function public.prune_request_log()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with doomed as (
    select id from public.request_log
    where (flag is null and kind = 'request' and ts < now() - interval '14 days')
       or ts < now() - interval '90 days'
    order by ts
    limit 200000)
  delete from public.request_log r using doomed d where r.id = d.id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
revoke all on function public.prune_request_log() from public, anon, authenticated;
