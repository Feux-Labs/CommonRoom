-- There can only ever be one owner, and the first-run setup screen at /admin can only create it while none exists.
create unique index if not exists admin_roles_one_owner on public.admin_roles ((true)) where role = 'owner';
