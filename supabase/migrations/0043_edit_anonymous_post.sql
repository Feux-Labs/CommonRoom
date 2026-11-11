-- Authors can edit the text of their own anonymous post. Guard rails:
--  * only the author;
--  * not once the post has been reported, or flagged by the automatic checks (a flagged post is decided by a moderator);
--  * limited to 10 edits an hour;
--  * the API re-runs the text filter and the AI text check on every edit, and the post shows an "edited" label.
alter table public.anonymous_posts add column if not exists edited_at timestamptz;

create or replace function public.edit_anonymous_post(p_post_id uuid, p_body text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_body text := btrim(coalesce(p_body, ''));
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if char_length(v_body) not between 1 and 3000 then raise exception 'invalid_anonymous_body'; end if;
  if not exists (select 1 from public.anonymous_posts post where post.id = p_post_id and post.author_id = v_user_id) then
    return false;
  end if;
  if exists (select 1 from public.anonymous_reports r where r.target_kind = 'post' and r.target_id = p_post_id)
     or exists (select 1 from public.auto_flags f where f.target_kind = 'post' and f.target_id = p_post_id and f.status = 'open') then
    raise exception 'anonymous_post_locked';
  end if;
  perform public.consume_anonymous_rate_limit('post_edit', 10, 3600);
  update public.anonymous_posts post set body = v_body, edited_at = now() where post.id = p_post_id and post.author_id = v_user_id;
  return found;
end;
$$;
revoke execute on function public.edit_anonymous_post(uuid, text) from public, anon;
grant execute on function public.edit_anonymous_post(uuid, text) to authenticated;
