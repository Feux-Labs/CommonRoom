-- Marketplace chat: a private conversation between one buyer and one seller about one listing.
-- Everything goes through the functions below; people can only read their own conversations.
create table if not exists public.market_threads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default timezone('utc', now()),
  buyer_read_at timestamptz,
  seller_read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.market_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists market_threads_buyer_idx on public.market_threads (buyer_id, last_message_at desc);
create index if not exists market_threads_seller_idx on public.market_threads (seller_id, last_message_at desc);
create index if not exists market_messages_thread_idx on public.market_messages (thread_id, created_at desc);

alter table public.market_threads enable row level security;
alter table public.market_messages enable row level security;
revoke all on public.market_threads from anon, authenticated;
revoke all on public.market_messages from anon, authenticated;
grant select on public.market_threads to authenticated;
grant select on public.market_messages to authenticated;

drop policy if exists "Participants read their market threads" on public.market_threads;
create policy "Participants read their market threads" on public.market_threads for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
drop policy if exists "Participants read their market messages" on public.market_messages;
create policy "Participants read their market messages" on public.market_messages for select to authenticated
  using (exists (select 1 from public.market_threads t where t.id = thread_id and (select auth.uid()) in (t.buyer_id, t.seller_id)));

-- Start (or reopen) a conversation about a listing. Returns the thread id.
create or replace function public.start_market_thread(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_seller uuid;
  v_status text;
  v_thread uuid;
begin
  if v_user is null or not exists (select 1 from public.profiles where id = v_user) then raise exception 'account_required'; end if;
  select seller_id, status into v_seller, v_status from public.marketplace_listings where id = p_listing_id;
  if v_seller is null or v_status = 'removed' then raise exception 'listing_not_found'; end if;
  if v_seller = v_user then raise exception 'own_listing'; end if;

  select id into v_thread from public.market_threads where listing_id = p_listing_id and buyer_id = v_user;
  if v_thread is null then
    perform public.consume_anonymous_rate_limit('market_thread_start', 20, 3600);
    insert into public.market_threads (listing_id, buyer_id, seller_id) values (p_listing_id, v_user, v_seller) returning id into v_thread;
  end if;
  return v_thread;
end;
$$;

-- Send a message. The listing must still be available; the other person is notified (one unread notice per thread).
create or replace function public.send_market_message(p_thread_id uuid, p_body text)
returns table (id uuid, sender_id uuid, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_thread public.market_threads%rowtype;
  v_status text;
  v_title text;
  v_text text := btrim(coalesce(p_body, ''));
  v_to uuid;
  v_name text;
begin
  if v_user is null then raise exception 'account_required'; end if;
  select * into v_thread from public.market_threads t where t.id = p_thread_id and v_user in (t.buyer_id, t.seller_id);
  if not found then raise exception 'thread_not_found'; end if;
  if char_length(v_text) not between 1 and 1000 then raise exception 'invalid_message'; end if;
  select l.status, l.title into v_status, v_title from public.marketplace_listings l where l.id = v_thread.listing_id;
  if v_status is distinct from 'available' then raise exception 'listing_unavailable'; end if;

  perform public.consume_anonymous_rate_limit('market_message', 30, 60);

  return query
  insert into public.market_messages (thread_id, sender_id, body) values (p_thread_id, v_user, v_text)
  returning market_messages.id, market_messages.sender_id, market_messages.body, market_messages.created_at;

  update public.market_threads set last_message_at = timezone('utc', now()),
    buyer_read_at = case when v_user = buyer_id then timezone('utc', now()) else buyer_read_at end,
    seller_read_at = case when v_user = seller_id then timezone('utc', now()) else seller_read_at end
  where market_threads.id = p_thread_id;

  v_to := case when v_user = v_thread.buyer_id then v_thread.seller_id else v_thread.buyer_id end;
  begin
    if not exists (select 1 from public.notifications n where n.user_id = v_to and n.kind = 'market_message' and n.read_at is null and n.link = '/marketplace/messages/' || p_thread_id::text) then
      select display_name into v_name from public.profiles where profiles.id = v_user;
      insert into public.notifications (user_id, kind, title, link, preview)
      values (v_to, 'market_message', coalesce(nullif(v_name, ''), 'Someone') || ' sent you a message about ' || left(v_title, 60), '/marketplace/messages/' || p_thread_id::text, left(v_text, 80));
    end if;
  exception when others then null;
  end;
end;
$$;

create or replace function public.mark_market_thread_read(p_thread_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.market_threads set
    buyer_read_at = case when auth.uid() = buyer_id then timezone('utc', now()) else buyer_read_at end,
    seller_read_at = case when auth.uid() = seller_id then timezone('utc', now()) else seller_read_at end
  where id = p_thread_id and auth.uid() in (buyer_id, seller_id);
$$;

-- My conversations, newest first, with the other person, the listing and whether something is unread.
create or replace function public.list_my_market_threads()
returns table (
  id uuid, listing_id uuid, listing_title text, listing_image text, listing_status text,
  other_id uuid, other_name text, other_avatar text, i_am_seller boolean,
  last_message text, last_message_at timestamptz, last_from_me boolean, unread boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.listing_id, l.title, l.images->>0, l.status,
    o.id, coalesce(nullif(o.display_name, ''), 'Student'), o.avatar_url, (t.seller_id = auth.uid()),
    m.body, t.last_message_at, (m.sender_id = auth.uid()),
    coalesce(m.sender_id <> auth.uid() and t.last_message_at > coalesce(case when t.buyer_id = auth.uid() then t.buyer_read_at else t.seller_read_at end, '-infinity'::timestamptz), false)
  from public.market_threads t
  join public.marketplace_listings l on l.id = t.listing_id
  join public.profiles o on o.id = case when t.buyer_id = auth.uid() then t.seller_id else t.buyer_id end
  left join lateral (select mm.body, mm.sender_id from public.market_messages mm where mm.thread_id = t.id order by mm.created_at desc limit 1) m on true
  where auth.uid() in (t.buyer_id, t.seller_id)
  order by t.last_message_at desc
  limit 100;
$$;

-- One conversation's header: who it is with, what it is about, and whether replying is still possible.
create or replace function public.get_market_thread(p_thread_id uuid)
returns table (
  id uuid, listing_id uuid, listing_title text, listing_image text, listing_status text, listing_price numeric,
  other_id uuid, other_name text, other_avatar text, i_am_seller boolean, can_reply boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select t.id, t.listing_id, l.title, l.images->>0, l.status, l.price,
    o.id, coalesce(nullif(o.display_name, ''), 'Student'), o.avatar_url, (t.seller_id = auth.uid()), (l.status = 'available')
  from public.market_threads t
  join public.marketplace_listings l on l.id = t.listing_id
  join public.profiles o on o.id = case when t.buyer_id = auth.uid() then t.seller_id else t.buyer_id end
  where t.id = p_thread_id and auth.uid() in (t.buyer_id, t.seller_id);
$$;

revoke all on function public.start_market_thread(uuid), public.send_market_message(uuid, text), public.mark_market_thread_read(uuid),
  public.list_my_market_threads(), public.get_market_thread(uuid) from public, anon;
grant execute on function public.start_market_thread(uuid), public.send_market_message(uuid, text), public.mark_market_thread_read(uuid),
  public.list_my_market_threads(), public.get_market_thread(uuid) to authenticated;
