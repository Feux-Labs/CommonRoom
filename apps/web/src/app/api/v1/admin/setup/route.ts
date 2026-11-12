import { apiError, apiSuccess, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';
import { logSecurityEvent } from '@/lib/request-log';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function ownerExists(): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from public.admin_roles where role = 'owner'`;
  return Number(rows[0]?.n ?? 0) > 0;
}

/** GET /api/v1/admin/setup: is the first-run owner setup still open? Public: it only says yes or no. */
export async function GET() {
  return apiSuccess({ open: !(await ownerExists()) });
}

/**
 * POST /api/v1/admin/setup: the very first person to arrive makes themselves the owner. Closed for good the moment an owner exists.
 * Either { email, password } to create a new account, or just a signed-in session to make that existing account the owner.
 */
export async function POST(request: Request) {
  if (await ownerExists()) {
    logSecurityEvent(request, 'admin_denied', { status: 403, flag: 'setup attempted after an owner exists' });
    return apiError('setup_closed', 'The owner account already exists.', 403);
  }
  const body = await parseJson(request);

  try {
    // Existing account: "make this account the owner".
    if (request.headers.get('authorization')) {
      const auth = await authenticateRequest(request);
      if (!isAuthenticatedRequest(auth)) return auth;
      if (auth.user.is_anonymous || !auth.user.email_confirmed_at) return apiError('account_required', 'Sign in with a confirmed email account.', 403);
      await prisma.$executeRaw`insert into public.admin_roles (user_id, role) values (${auth.user.id}::uuid, 'owner')`;
      return apiSuccess({ owner: auth.user.email ?? '' }, 201);
    }

    if (!isRecord(body) || typeof body.email !== 'string' || typeof body.password !== 'string') return apiError('invalid_body', 'Send an email and a password.', 400);
    const email = body.email.trim().toLowerCase();
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0, 60) : 'Owner';
    if (!emailPattern.test(email) || email.length > 120) return apiError('invalid_email', 'Enter a valid email address.', 422);
    if (body.password.length < 10 || body.password.length > 100) return apiError('weak_password', 'Use a password of at least 10 characters.', 422);
    const taken = await prisma.$queryRaw<Array<{ id: string }>>`select id::text as id from auth.users where lower(email) = ${email}`;
    if (taken[0]) return apiError('email_taken', 'That email already has an account. Sign in with it, then choose “Make this account the owner”.', 409);

    const created = await prisma.$queryRaw<Array<{ id: string }>>`
      insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${email}, extensions.crypt(${body.password}, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name', ${displayName}), now(), now(), '', '', '', '')
      returning id::text as id`;
    const id = created[0].id;
    await prisma.$executeRaw`
      insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
      values (gen_random_uuid(), ${id}::uuid, ${id}, jsonb_build_object('sub', ${id}::text, 'email', ${email}::text), 'email', now(), now(), now())`;
    try {
      await prisma.$executeRaw`insert into public.admin_roles (user_id, role) values (${id}::uuid, 'owner')`;
    } catch (roleError) {
      // Someone else became the owner in the same instant: undo this account.
      await prisma.$executeRaw`delete from auth.users where id = ${id}::uuid`;
      throw roleError;
    }
    return apiSuccess({ owner: email }, 201);
  } catch (error) {
    if (error instanceof Error && /admin_roles_one_owner|duplicate key/i.test(error.message)) return apiError('setup_closed', 'The owner account already exists.', 403);
    console.error('Owner setup failed.', error instanceof Error ? error.message : 'unknown');
    return apiError('setup_failed', 'The account could not be created.', 500);
  }
}
