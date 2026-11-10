-- Notifications can now carry their own text and link, so new features can notify people without touching the
-- fixed list of kinds in the app. New kinds are allowed up front.
alter table public.notifications
  add column if not exists title text check (title is null or char_length(title) <= 200),
  add column if not exists link text check (link is null or (link like '/%' and link not like '//%' and char_length(link) <= 300));

alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'like', 'comment', 'reply', 'follow', 'anon_comment', 'anon_reply', 'inbox_message',
  'market_message', 'room_join', 'room_post', 'rank_up', 'reveal_request', 'reveal_response',
  'ad_status', 'restriction', 'system'
));
