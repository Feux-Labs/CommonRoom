import { Prisma } from '@prisma/client';
import { authenticateAdmin, can, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/v1/admin/users
 * Admin-only: paginated, searchable directory. ?kind=normal (default: people who signed up themselves) or ?kind=seeded (the moderator accounts we
 * created, the only ones that have a stored password). A normal member's password is never in the response, and never exists in readable form.
 */
export async function GET(request: Request) {
  const auth = await authenticateAdmin(request, 'users');
  if (!isAdminAuthenticated(auth)) return auth;

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('query')?.trim() ?? '';
    const school = url.searchParams.get('school')?.trim() ?? '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10) || 20));
    const skip = (page - 1) * limit;

    const kind = url.searchParams.get('kind') === 'seeded' ? 'seeded' : 'normal';
    // Moderator accounts are the seeded ones; seeded accounts are the only ones that keep a readable password.
    if (kind === 'seeded' && !can(auth.role, 'impersonate')) return apiError('forbidden', 'Your role cannot open moderator accounts.', 403);
    const seededRows: Array<{ id: string }> = await prisma.$queryRaw`select id::text as id from auth.users where raw_user_meta_data->>'seeded' = 'true'`;
    const seededIds = seededRows.map((row) => row.id);

    const where: Prisma.ProfileWhereInput = kind === 'seeded' ? { id: { in: seededIds } } : { id: { notIn: seededIds } };

    if (query) {
      where.OR = [
        { displayName: { contains: query, mode: 'insensitive' } },
        { username: { contains: query, mode: 'insensitive' } },
        { school: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (school) {
      where.school = { contains: school, mode: 'insensitive' };
    }

    const [total, users] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          displayName: true,
          username: true,
          school: true,
          course: true,
          year: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              marketplaceListings: true,
              reports: true,
            },
          },
        },
      }),
    ]);

    // Fetch credentials (email & plaintext password from raw_user_meta_data)
    const userIds = users.map((u) => u.id);
    const credsMap: Record<string, { email: string; password: string | null }> = {};
    if (userIds.length > 0) {
      const authRows: Array<{ id: string; email: string; pwd: string | null }> = await prisma.$queryRawUnsafe(`
        SELECT id, email, raw_user_meta_data->>'plain_password' as pwd
        FROM auth.users
        WHERE id = ANY($1::uuid[])
      `, userIds);
      for (const row of authRows) {
        credsMap[row.id] = { email: row.email, password: row.pwd };
      }
    }

    return apiSuccess({
      users: users.map((u) => ({
        id: u.id,
        displayName: u.displayName || 'Unnamed User',
        username: u.username,
        email: credsMap[u.id]?.email || `${u.username || u.id}@commonroom.ng`,
        seeded: kind === 'seeded',
        // Only moderator accounts have a password to show, and only to roles allowed to sign in as them.
        ...(kind === 'seeded' && can(auth.role, 'impersonate') ? { password: credsMap[u.id]?.password ?? null } : {}),
        school: u.school,
        course: u.course,
        year: u.year,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        createdAt: u.createdAt.toISOString(),
        counts: {
          posts: u._count.posts,
          listings: u._count.marketplaceListings,
          reportsMade: u._count.reports,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    return apiError(
      'user_fetch_failed',
      error instanceof Error ? error.message : 'Unable to query user directory.',
      500
    );
  }
}
