-- Prompt templates for the anonymous inbox link: the owner chooses the headline people see ("Are you my crush?"),
-- and a colour. Both are optional; a link with no prompt keeps the default "Send an anonymous message".
alter table public.anonymous_inbox_links
  add column if not exists prompt text check (prompt is null or char_length(prompt) between 1 and 140),
  add column if not exists prompt_theme text check (prompt_theme is null or prompt_theme in ('blue-hour', 'soft-sky', 'warm-glow', 'rose-note'));

-- Same functions, now also returning the prompt. New columns only, so existing callers keep working.
drop function if exists public.get_anonymous_inbox_link();
create or replace function public.get_anonymous_inbox_link()
returns table (token text, enabled boolean, prompt text, prompt_theme text)
language sql
stable
security definer
set search_path = public
as $$
  select link.token, link.enabled, link.prompt, link.prompt_theme
  from public.anonymous_inbox_links link
  where link.owner_id = auth.uid();
$$;
revoke execute on function public.get_anonymous_inbox_link() from public, anon;
grant execute on function public.get_anonymous_inbox_link() to authenticated;

drop function if exists public.get_anonymous_inbox_prompt(text);
create or replace function public.get_anonymous_inbox_prompt(p_token text)
returns table (enabled boolean, prompt text, prompt_theme text)
language sql
stable
security definer
set search_path = public
as $$
  select link.enabled, link.prompt, link.prompt_theme
  from public.anonymous_inbox_links link
  where link.token = p_token;
$$;
revoke execute on function public.get_anonymous_inbox_prompt(text) from public, anon;
grant execute on function public.get_anonymous_inbox_prompt(text) to authenticated;

create or replace function public.set_anonymous_inbox_prompt(p_prompt text, p_theme text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_prompt text := nullif(btrim(coalesce(p_prompt, '')), '');
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;
  if v_prompt is not null and char_length(v_prompt) > 140 then raise exception 'invalid_prompt'; end if;
  if p_theme is not null and p_theme not in ('blue-hour', 'soft-sky', 'warm-glow', 'rose-note') then raise exception 'invalid_prompt'; end if;
  update public.anonymous_inbox_links link set prompt = v_prompt, prompt_theme = case when v_prompt is null then null else p_theme end
  where link.owner_id = v_user_id;
  return found;
end;
$$;
revoke execute on function public.set_anonymous_inbox_prompt(text, text) from public, anon;
grant execute on function public.set_anonymous_inbox_prompt(text, text) to authenticated;

-- "Generate with AI" is limited to 10 tries an hour per person, so nobody can run up the AI bill.
create or replace function public.consume_prompt_generation()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.consume_anonymous_rate_limit('prompt_generate', 10, 3600);
end;
$$;
revoke execute on function public.consume_prompt_generation() from public, anon;
grant execute on function public.consume_prompt_generation() to authenticated;
