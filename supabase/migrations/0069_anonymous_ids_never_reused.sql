-- Anonymous IDs: never reused, never run out.
--  * Every ID that is ever given out is written to a permanent register. If the person deletes their account the ID stays reserved
--    for good, so nobody can later take it and look like the author of old posts and comments. Case does not matter:
--    "QuietFox1" and "quietfox1" are the same ID.
--  * suggest_anonymous_handle() always returns an ID nobody has ever had. It draws from big word lists with a random number; if that
--    keeps colliding it falls back to a counter that only ever goes up, so there is always a free one.
create table if not exists public.anonymous_handle_registry (
  handle_key text primary key,
  handle text not null,
  first_user uuid,
  created_at timestamptz not null default now()
);
alter table public.anonymous_handle_registry enable row level security;
revoke all on public.anonymous_handle_registry from anon, authenticated;

-- Everything handed out so far (live IDs, and any ID still printed on a post or comment) is reserved from now on.
insert into public.anonymous_handle_registry (handle_key, handle, first_user)
select lower(btrim(handle)), handle, user_id from public.anonymous_identities
on conflict (handle_key) do nothing;
insert into public.anonymous_handle_registry (handle_key, handle)
select lower(btrim(h)), h from (select distinct author_handle as h from public.anonymous_posts union select distinct author_handle from public.anonymous_post_comments) x
where lower(btrim(h)) <> 'anonymous' and h is not null
on conflict (handle_key) do nothing;

create unique index if not exists anonymous_identities_handle_lower_key on public.anonymous_identities (lower(handle));

create or replace function public.reserve_anonymous_handle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(btrim(new.handle));
begin
  if tg_op = 'UPDATE' and lower(btrim(old.handle)) = v_key then return new; end if;
  if exists (select 1 from public.anonymous_handle_registry r where r.handle_key = v_key) then
    raise exception 'anonymous_handle_taken' using errcode = '23505';
  end if;
  insert into public.anonymous_handle_registry (handle_key, handle, first_user) values (v_key, new.handle, new.user_id);
  return new;
end;
$$;
drop trigger if exists reserve_anonymous_handle on public.anonymous_identities;
create trigger reserve_anonymous_handle before insert or update of handle on public.anonymous_identities
  for each row execute function public.reserve_anonymous_handle();

-- Registering: a session that already has an ID gets it back unchanged (nothing new is reserved).
create or replace function public.register_anonymous_identity(p_handle text)
returns table (handle text, created_at timestamptz, recovery_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_handle text := btrim(p_handle);
  v_code text := public.make_recovery_code();
begin
  if v_user_id is null then raise exception 'anonymous_auth_required'; end if;

  if exists (select 1 from public.anonymous_identities i where i.user_id = v_user_id) then
    return query select i.handle, i.created_at, null::text from public.anonymous_identities i where i.user_id = v_user_id;
    return;
  end if;

  if v_handle !~ '^[A-Za-z0-9_ ]{3,24}$' then raise exception 'invalid_anonymous_handle'; end if;
  perform public.consume_anonymous_rate_limit('identity', 8, 3600);

  insert into public.anonymous_identities (user_id, handle, recovery_hash)
  values (v_user_id, v_handle, extensions.crypt(replace(v_code, '-', ''), extensions.gen_salt('bf')));

  return query
  select identity.handle, identity.created_at, v_code
  from public.anonymous_identities identity
  where identity.user_id = v_user_id;
exception
  when unique_violation then raise exception 'anonymous_handle_taken';
end;
$$;
revoke execute on function public.register_anonymous_identity(text) from public, anon;
grant execute on function public.register_anonymous_identity(text) to authenticated;

-- Word lists for suggested IDs (clean, friendly words; nothing official-sounding).
create table if not exists public.anonymous_id_words (
  kind text not null check (kind in ('adjective', 'noun')),
  word text not null check (word ~ '^[a-z]{3,10}$'),
  primary key (kind, word)
);
alter table public.anonymous_id_words enable row level security;
revoke all on public.anonymous_id_words from anon, authenticated;

insert into public.anonymous_id_words (kind, word)
select 'adjective', unnest(string_to_array(
  'quiet brave lucky sleepy swift bright calm witty bold cosmic mellow jolly sunny zesty chill clever gentle rapid nimble steady great happy lively noble smooth cheeky dreamy amber ancient arctic azure balmy breezy brisk bubbly candid cheery chilly civil cozy crisp curious dapper deft dusky eager early earnest easy elegant epic fancy fearless fiery fluffy fond fresh frosty funky gallant giddy glad gleaming glossy golden graceful grand hearty honest humble icy ivory jazzy jovial keen kind leafy light lilac lofty loyal lucid lunar magic merry midnight mighty minty misty modest mossy neat nifty night oaken olive orange patient peachy pearly perky placid plucky polar polite poised proud quick quirky radiant rainy ready regal rosy royal rustic sandy savvy serene shiny silent silver sincere snowy solar solid sparky speedy spicy spry stellar stormy sturdy sublime sunlit super sweet tender tidy tiny tropic trusty upbeat velvet vivid warm wavy wild windy wise woolly young zany zen',
  ' '))
on conflict do nothing;

insert into public.anonymous_id_words (kind, word)
select 'noun', unnest(string_to_array(
  'fox owl lion falcon mango comet river drum panda ember cedar pixel nomad scholar ranger danfo baobab sparrow tiger cloud spark jin zebra raven maple orbit echo nova acorn antelope badger beacon bison breeze bridge brook buffalo canyon cheetah cinder clover coral cricket crow dawn delta dolphin dove dune eagle elephant fern finch firefly flame forest frog galaxy gazelle giraffe glacier gorilla harbor hawk heron hippo horizon ibis island jaguar jackal kite koala lagoon lantern leopard lotus lynx magnet marble meadow meerkat meteor moon moth mountain nectar oasis ocean orchid otter panther parrot peak pebble pelican phoenix pigeon planet plum pond prairie puma quail rabbit rainbow raindrop reef rhino ridge robin rocket sable safari sage savanna seal shadow shore sky sloth snail spruce star stork storm summit sunbeam sunrise sunset swan tamarind thunder toucan tulip turtle valley violet voyage whale willow wolf zephyr kola suya jollof akara zobo plantain cassava iroko harmattan ankara',
  ' '))
on conflict do nothing;

create sequence if not exists public.anonymous_handle_seq start 10000;

create or replace function public.suggest_anonymous_handle(p_attempts integer default 8)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adjective text;
  v_noun text;
  v_number text;
  v_try text;
  i integer;
begin
  if auth.uid() is null then raise exception 'anonymous_auth_required'; end if;
  perform public.consume_anonymous_rate_limit('suggest', 120, 3600);

  -- A random pair of words and a random number: millions of combinations.
  for i in 1..greatest(p_attempts, 0) loop
    select word into v_adjective from public.anonymous_id_words where kind = 'adjective' order by random() limit 1;
    select word into v_noun from public.anonymous_id_words where kind = 'noun' order by random() limit 1;
    v_number := (10 + floor(random() * 9990))::integer::text;
    continue when v_number ~ '(88|69|420|666|1488)';
    v_try := v_adjective || v_noun || v_number;
    continue when length(v_try) > 20;
    if not exists (select 1 from public.anonymous_handle_registry r where r.handle_key = v_try) then return v_try; end if;
  end loop;

  -- Never run out: a number that only ever goes up cannot repeat.
  loop
    select word into v_adjective from public.anonymous_id_words where kind = 'adjective' order by random() limit 1;
    select word into v_noun from public.anonymous_id_words where kind = 'noun' order by random() limit 1;
    v_number := nextval('public.anonymous_handle_seq')::text;
    continue when v_number ~ '(88|69|420|666|1488)';
    v_try := v_adjective || v_noun || v_number;
    continue when length(v_try) > 24;
    exit when not exists (select 1 from public.anonymous_handle_registry r where r.handle_key = v_try);
  end loop;
  return v_try;
end;
$$;
revoke execute on function public.suggest_anonymous_handle(integer) from public, anon;
grant execute on function public.suggest_anonymous_handle(integer) to authenticated;
