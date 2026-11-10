-- Lets the API apply per-user limits to Room, Marketplace and upload actions.
-- consume_anonymous_rate_limit stays private; this wrapper only accepts the named actions below, so a user
-- cannot use it to touch the counters of other features.
create or replace function public.consume_rate_limit(p_action text, p_limit integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_action not in ('room_post', 'room_comment', 'room_report', 'media_upload_url', 'listing_create') then
    raise exception 'invalid_rate_limit_action';
  end if;
  if p_limit not between 1 and 10000 or p_window_seconds not between 1 and 86400 then
    raise exception 'invalid_rate_limit_value';
  end if;
  perform public.consume_anonymous_rate_limit(p_action, p_limit, p_window_seconds);
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
