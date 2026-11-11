-- Full numbers for the author's Insights page: totals, views by hour and by day, likes and comments by day,
-- where views came from (the ?s= tag), and guests versus members. Only the post's author can read them.
create or replace function public.post_insights_detail(p_kind text, p_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_created timestamptz;
  v_preview text;
  v_result jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind = 'anonymous' then
    select p.created_at, left(p.body, 140) into v_created, v_preview
      from public.anonymous_posts p join public.anonymous_post_owners o on o.post_id = p.id
      where p.id = p_post_id and o.owner_id = v_uid;
  elsif p_kind = 'room' then
    select p.created_at, left(p.caption, 140) into v_created, v_preview
      from public.posts p where p.id = p_post_id and p.author_id = v_uid;
  else
    raise exception 'invalid_kind';
  end if;
  if v_created is null then raise exception 'not_your_post'; end if;

  select jsonb_build_object(
    'createdAt', v_created,
    'preview', v_preview,
    'totals', jsonb_build_object(
      'views', (select count(*) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      'viewers', (select count(distinct e.user_id) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'),
      'likes', case when p_kind = 'anonymous' then (select count(*) from public.anonymous_post_likes l where l.post_id = p_post_id)
                    else (select count(*) from public.post_likes l where l.post_id = p_post_id) end,
      'comments', case when p_kind = 'anonymous' then (select count(*) from public.anonymous_post_comments c where c.post_id = p_post_id)
                       else (select count(*) from public.post_comments c where c.post_id = p_post_id) end,
      'shares', case when p_kind = 'anonymous' then (select count(*) from public.app_events e where e.target_id = p_post_id and e.event = 'post_share')
                     else (select count(*) from public.post_shares s where s.post_id = p_post_id) end
    ),
    'hourly', (
      select coalesce(jsonb_agg(jsonb_build_object('t', h.t, 'views', coalesce(v.n, 0)) order by h.t), '[]'::jsonb)
      from generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') as h(t)
      left join (
        select date_trunc('hour', e.created_at) as t, count(*) as n
        from public.app_events e where e.target_id = p_post_id and e.event = 'post_view' group by 1
      ) v on v.t = h.t
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d.day, 'views', coalesce(v.n, 0), 'likes', coalesce(l.n, 0), 'comments', coalesce(c.n, 0)) order by d.day), '[]'::jsonb)
      from generate_series((now() at time zone 'Africa/Lagos')::date - 13, (now() at time zone 'Africa/Lagos')::date, interval '1 day') as g(day)
      cross join lateral (select g.day::date as day) d
      left join (
        select (e.created_at at time zone 'Africa/Lagos')::date as day, count(*) as n
        from public.app_events e where e.target_id = p_post_id and e.event = 'post_view' group by 1
      ) v on v.day = d.day
      left join (
        select (x.created_at at time zone 'Africa/Lagos')::date as day, count(*) as n
        from (select created_at from public.anonymous_post_likes where p_kind = 'anonymous' and post_id = p_post_id
              union all select created_at from public.post_likes where p_kind = 'room' and post_id = p_post_id) x group by 1
      ) l on l.day = d.day
      left join (
        select (x.created_at at time zone 'Africa/Lagos')::date as day, count(*) as n
        from (select created_at from public.anonymous_post_comments where p_kind = 'anonymous' and post_id = p_post_id
              union all select created_at from public.post_comments where p_kind = 'room' and post_id = p_post_id) x group by 1
      ) c on c.day = d.day
    ),
    'sources', (
      select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'views', s.n) order by s.n desc), '[]'::jsonb)
      from (select coalesce(e.source, 'direct') as source, count(*) as n
            from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'
            group by 1 order by 2 desc limit 6) s
    ),
    'audience', jsonb_build_object(
      'guests', (select count(distinct e.user_id) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view' and e.is_anonymous),
      'members', (select count(distinct e.user_id) from public.app_events e where e.target_id = p_post_id and e.event = 'post_view' and not e.is_anonymous)
    ),
    'peakHour', (
      select (extract(hour from (e.created_at at time zone 'Africa/Lagos')))::int
      from public.app_events e where e.target_id = p_post_id and e.event = 'post_view'
      group by 1 order by count(*) desc, 1 limit 1
    )
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.post_insights_detail(text, uuid) from public, anon;
grant execute on function public.post_insights_detail(text, uuid) to authenticated;
