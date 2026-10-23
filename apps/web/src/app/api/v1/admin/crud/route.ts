import { authenticateAdmin, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError, parseJson, isRecord } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v1/admin/crud
 * Admin-only: Full CRUD operations for managing users, posts, comments, and bulk actions.
 *
 * Body shape:
 *   { action: string, ...params }
 *
 * Actions:
 *   - "get_user_credentials"     → list all seeded users with passwords (paginated)
 *   - "delete_post"              → { postId }
 *   - "delete_posts_bulk"        → { postIds: string[] } or { authorId } or { all: true }
 *   - "create_comment"           → { postId, body, asUserId }
 *   - "delete_comment"           → { commentId }
 *   - "delete_user"              → { userId }
 *   - "login_as"                 → { userId } — returns the user's email & plain password
 *   - "get_user_detail"          → { userId } — full user detail with password
 *   - "bulk_delete_users"        → { filter: "seeded" | "all" }
 *   - "update_profile"           → { userId, ...fields }
 */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request);
  if (!isAdminAuthenticated(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.action !== 'string') {
    return apiError('invalid_body', 'Provide an action.', 400);
  }

  const { action } = body;

  try {
    // ─── GET_USER_CREDENTIALS ───
    if (action === 'get_user_credentials') {
      const page = Math.max(1, Number(body.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(body.limit) || 50));
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const skip = (page - 1) * limit;

      // Query auth.users via Supabase admin SQL
      const { data: rawUsers, error: sqlErr } = await auth.supabase.rpc('admin_get_seeded_users', {
        p_query: query,
        p_limit: limit,
        p_offset: skip,
      });

      // Fallback: if RPC doesn't exist, query profiles via Prisma
      if (sqlErr) {
        // Direct Prisma query with profile data
        const where = query
          ? {
              OR: [
                { displayName: { contains: query, mode: 'insensitive' as const } },
                { username: { contains: query, mode: 'insensitive' as const } },
                { school: { contains: query, mode: 'insensitive' as const } },
              ],
            }
          : {};

        const [total, profiles] = await Promise.all([
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
              createdAt: true,
            },
          }),
        ]);

        // Get passwords from auth.users metadata via raw SQL
        const userIds = profiles.map((p) => p.id);
        let passwordMap: Record<string, string> = {};

        if (userIds.length > 0) {
          const { data: authData } = await auth.supabase
            .from('users_with_passwords')
            .select('id, email, plain_password')
            .in('id', userIds);

          // If view doesn't exist, try raw RPC
          if (!authData) {
            // We'll handle this below with a separate query approach
            const placeholders = userIds.map((_, i) => `$${i + 1}`).join(',');
            const { data: rawData } = await auth.supabase.rpc('get_user_passwords', {
              p_user_ids: userIds,
            });
            if (rawData && Array.isArray(rawData)) {
              for (const row of rawData) {
                passwordMap[row.id] = row.plain_password || '';
              }
            }
          } else if (Array.isArray(authData)) {
            for (const row of authData) {
              passwordMap[row.id] = row.plain_password || '';
            }
          }
        }

        return apiSuccess({
          users: profiles.map((p) => ({
            id: p.id,
            displayName: p.displayName,
            username: p.username,
            school: p.school,
            course: p.course,
            year: p.year,
            avatarUrl: p.avatarUrl,
            email: `${p.username || p.id}@commonroom.ng`,
            password: passwordMap[p.id] || '(not available)',
            createdAt: p.createdAt.toISOString(),
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
        });
      }

      return apiSuccess({ users: rawUsers ?? [] });
    }

    // ─── LOGIN_AS ───
    if (action === 'login_as') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);

      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        select: { displayName: true, username: true },
      });
      if (!profile) return apiError('user_not_found', 'User not found.', 404);

      // Get email and password from auth metadata
      const { data: authData } = await auth.supabase.rpc('get_user_passwords', {
        p_user_ids: [userId],
      });

      let email = `${profile.username || userId}@commonroom.ng`;
      let password = '(not available)';

      if (authData && Array.isArray(authData) && authData.length > 0) {
        email = authData[0].email || email;
        password = authData[0].plain_password || password;
      }

      return apiSuccess({
        userId,
        displayName: profile.displayName,
        username: profile.username,
        email,
        password,
      });
    }

    // ─── DELETE_POST ───
    if (action === 'delete_post') {
      const postId = String(body.postId || '');
      if (!postId) return apiError('missing_post', 'Provide postId.', 400);
      await prisma.post.delete({ where: { id: postId } });
      return apiSuccess({ deleted: true, postId });
    }

    // ─── DELETE_POSTS_BULK ───
    if (action === 'delete_posts_bulk') {
      if (body.all === true) {
        const result = await prisma.post.deleteMany({});
        return apiSuccess({ deleted: result.count, scope: 'all' });
      }
      if (typeof body.authorId === 'string') {
        const result = await prisma.post.deleteMany({ where: { authorId: body.authorId } });
        return apiSuccess({ deleted: result.count, scope: 'author', authorId: body.authorId });
      }
      if (Array.isArray(body.postIds)) {
        const result = await prisma.post.deleteMany({ where: { id: { in: body.postIds } } });
        return apiSuccess({ deleted: result.count, scope: 'selected' });
      }
      return apiError('invalid_params', 'Provide all:true, authorId, or postIds[].', 400);
    }

    // ─── CREATE_COMMENT ───
    if (action === 'create_comment') {
      const postId = String(body.postId || '');
      const commentBody = String(body.body || '').trim();
      const asUserId = String(body.asUserId || auth.user.id);
      if (!postId || !commentBody) return apiError('missing_fields', 'Provide postId and body.', 400);

      const comment = await prisma.postComment.create({
        data: {
          postId,
          authorId: asUserId,
          body: commentBody,
        },
      });
      return apiSuccess({ comment });
    }

    // ─── DELETE_COMMENT ───
    if (action === 'delete_comment') {
      const commentId = String(body.commentId || '');
      if (!commentId) return apiError('missing_comment', 'Provide commentId.', 400);
      await prisma.postComment.delete({ where: { id: commentId } });
      return apiSuccess({ deleted: true, commentId });
    }

    // ─── DELETE_USER ───
    if (action === 'delete_user') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);
      // Delete profile (cascades to posts, likes, etc.)
      await prisma.profile.delete({ where: { id: userId } }).catch(() => {});
      // Delete from auth.users via Supabase admin
      const { error: delErr } = await auth.supabase.auth.admin.deleteUser(userId);
      if (delErr) return apiError('delete_failed', delErr.message, 500);
      return apiSuccess({ deleted: true, userId });
    }

    // ─── BULK_DELETE_USERS ───
    if (action === 'bulk_delete_users') {
      const filter = String(body.filter || '');
      if (filter === 'seeded') {
        // Delete all seeded users
        const { data: seededIds, error: fetchErr } = await auth.supabase.rpc('get_seeded_user_ids', {});
        if (fetchErr) {
          // Fallback: delete via raw profile query
          const result = await prisma.profile.deleteMany({});
          return apiSuccess({ deleted: result.count, method: 'profiles_only' });
        }
        let deleted = 0;
        if (Array.isArray(seededIds)) {
          for (const row of seededIds) {
            await prisma.profile.delete({ where: { id: row.id } }).catch(() => {});
            await auth.supabase.auth.admin.deleteUser(row.id).catch(() => {});
            deleted++;
          }
        }
        return apiSuccess({ deleted, scope: 'seeded' });
      }
      return apiError('invalid_filter', 'Provide filter: "seeded".', 400);
    }

    // ─── GET_USER_DETAIL ───
    if (action === 'get_user_detail') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);

      const profile = await prisma.profile.findUnique({
        where: { id: userId },
        include: {
          _count: { select: { posts: true, comments: true, likes: true } },
          datingProfile: true,
        },
      });
      if (!profile) return apiError('user_not_found', 'User not found.', 404);

      // Get auth details
      const { data: authData } = await auth.supabase.rpc('get_user_passwords', { p_user_ids: [userId] });
      const authInfo = authData?.[0] || {};

      return apiSuccess({
        ...profile,
        email: authInfo.email || `${profile.username || userId}@commonroom.ng`,
        password: authInfo.plain_password || '(not available)',
      });
    }

    // ─── UPDATE_PROFILE ───
    if (action === 'update_profile') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);

      const updateData: Record<string, unknown> = {};
      if (typeof body.displayName === 'string') updateData.displayName = body.displayName;
      if (typeof body.username === 'string') updateData.username = body.username;
      if (typeof body.school === 'string') updateData.school = body.school;
      if (typeof body.bio === 'string') updateData.bio = body.bio;
      if (typeof body.course === 'string') updateData.course = body.course;
      if (typeof body.year === 'string') updateData.year = body.year;

      const updated = await prisma.profile.update({
        where: { id: userId },
        data: updateData,
      });
      return apiSuccess({ updated });
    }

    return apiError('unknown_action', `Unknown action: ${action}`, 400);
  } catch (err) {
    return apiError(
      'admin_crud_error',
      err instanceof Error ? err.message : 'Admin operation failed.',
      500
    );
  }
}
