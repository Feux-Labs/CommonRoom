-- anonymous_post_owners links every anonymous post to its real author. It had no row security and the public
-- API roles could read it, which would let anyone unmask anonymous posters. Only the security-definer functions
-- (which run as the table owner) write to or read it, so deny everything else.
alter table public.anonymous_post_owners enable row level security;
revoke all on public.anonymous_post_owners from anon, authenticated;
