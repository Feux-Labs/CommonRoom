import { authenticateAdmin, can, isAdminAuthenticated, type AdminAuth, type AdminRole } from '@/lib/admin-auth';
import { apiError, apiSuccess, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

type TeamRow = { user_id: string; role: AdminRole; email: string | null; created_at: Date };

const CREATABLE = ['user', 'admin', 'moderator', 'support', 'analyst'] as const;
type Creatable = (typeof CREATABLE)[number];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function isLocked(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ value: string }>>`select value from public.admin_settings where key = 'admin_creation_locked'`;
  return rows[0]?.value === 'true';
}

/** Whether this staff member may create or change an account with that role. Owners are never created or changed here. */
function mayManage(auth: AdminAuth, role: string): boolean {
  if (role === 'user') return can(auth.role, 'impersonate');
  if (role === 'admin') return can(auth.role, 'team');
  if (role === 'moderator' || role === 'support' || role === 'analyst') return can(auth.role, 'team_staff');
  return false;
}

/** GET /api/v1/admin/team: everyone with a staff role. */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'team_staff');
  if (!isAdminAuthenticated(auth)) return auth;
  const rows = await prisma.$queryRaw<TeamRow[]>`
    select r.user_id::text as user_id, r.role, u.email, r.created_at
    from public.admin_roles r left join auth.users u on u.id = r.user_id order by r.created_at`;
  return apiSuccess({
    locked: await isLocked(),
    team: rows.map((row) => ({ userId: row.user_id, role: row.role, email: row.email, createdAt: row.created_at.toISOString(), you: row.user_id === auth.user.id })),
  });
}

/**
 * POST /api/v1/admin/team { email, password, role, displayName? }: create an account for a user, admin, moderator, support
 * person or analyst. Staff accounts stop being possible for good once the owner locks admin creation.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'team_staff');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.email !== 'string' || typeof body.password !== 'string' || typeof body.role !== 'string') {
    return apiError('invalid_body', 'Send an email, a password and a role.', 400);
  }
  const email = body.email.trim().toLowerCase();
  const role = body.role as Creatable;
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : '';
  if (!emailPattern.test(email) || email.length > 120) return apiError('invalid_email', 'Enter a valid email address.', 422);
  if (body.password.length < 10 || body.password.length > 100) return apiError('weak_password', 'Use a password of at least 10 characters.', 422);
  if (!CREATABLE.includes(role)) return apiError('invalid_role', 'Choose user, admin, moderator, support or analyst.', 422);
  if (!mayManage(auth, role)) return apiError('forbidden', 'Your role cannot create that kind of account.', 403);
  if (role !== 'user' && (await isLocked())) return apiError('admin_creation_locked', 'Creating staff accounts has been locked for good.', 423);

  try {
    const created = await prisma.$queryRaw<Array<{ id: string }>>`
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${email}, extensions.crypt(${body.password}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', ${displayName}, 'created_by_admin', true), now(), now(), '', '', '', '')
      returning id::text as id`;
    const id = created[0].id;
    await prisma.$executeRaw`
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
      values (gen_random_uuid(), ${id}::uuid, ${id}, jsonb_build_object('sub', ${id}::text, 'email', ${email}::text), 'email', now(), now(), now())`;
    if (role !== 'user') {
      await prisma.$executeRaw`insert into public.admin_roles (user_id, role, created_by) values (${id}::uuid, ${role}, ${auth.user.id}::uuid)`;
    }
    return apiSuccess({ userId: id, email, role }, 201);
  } catch (error) {
    if (error instanceof Error && /duplicate key|already exists|unique/i.test(error.message)) return apiError('email_taken', 'An account with that email already exists.', 409);
    console.error('Team account could not be created.', error instanceof Error ? error.message : 'unknown');
    return apiError('create_failed', 'The account could not be created.', 500);
  }
}

/** PATCH /api/v1/admin/team { userId, role }: change someone's staff role. Not allowed once creation is locked. */
export async function PATCH(request: Request) {
  const auth = await authenticateAdmin(request, 'team_staff');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || typeof body.role !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.userId)) return apiError('invalid_body', 'Send a userId and a role.', 400);
  if (body.userId === auth.user.id) return apiError('forbidden', 'You cannot change your own role.', 403);
  if (!['admin', 'moderator', 'support', 'analyst'].includes(body.role)) return apiError('invalid_role', 'Choose admin, moderator, support or analyst.', 422);
  const current = await prisma.$queryRaw<Array<{ role: AdminRole }>>`select role from public.admin_roles where user_id = ${body.userId}::uuid`;
  if (!current[0]) return apiError('not_found', 'That person is not on the team.', 404);
  if (current[0].role === 'owner') return apiError('forbidden', 'The owner’s role cannot be changed.', 403);
  if (!mayManage(auth, body.role) || !mayManage(auth, current[0].role)) return apiError('forbidden', 'Your role cannot make that change.', 403);
  if (await isLocked()) return apiError('admin_creation_locked', 'Staff roles are locked. You can still remove people.', 423);
  await prisma.$executeRaw`update public.admin_roles set role = ${body.role} where user_id = ${body.userId}::uuid`;
  return apiSuccess({ userId: body.userId, role: body.role });
}

/** DELETE /api/v1/admin/team { userId }: take away someone's staff role (their normal account stays). */
export async function DELETE(request: Request) {
  const auth = await authenticateAdmin(request, 'team_staff');
  if (!isAdminAuthenticated(auth)) return auth;
  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.userId)) return apiError('invalid_body', 'Send a userId.', 400);
  if (body.userId === auth.user.id) return apiError('forbidden', 'You cannot remove yourself.', 403);
  const current = await prisma.$queryRaw<Array<{ role: AdminRole }>>`select role from public.admin_roles where user_id = ${body.userId}::uuid`;
  if (!current[0]) return apiError('not_found', 'That person is not on the team.', 404);
  if (current[0].role === 'owner' || !mayManage(auth, current[0].role)) return apiError('forbidden', 'Your role cannot remove that person.', 403);
  await prisma.$executeRaw`delete from public.admin_roles where user_id = ${body.userId}::uuid`;
  return apiSuccess({ removed: true });
}
