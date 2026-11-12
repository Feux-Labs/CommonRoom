import { authenticateAdmin, can, isAdminAuthenticated } from '@/lib/admin-auth';
import { apiSuccess, apiError, parseJson, isRecord } from '@/lib/supabase-server';
import { prisma } from '@/lib/prisma';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Acting as someone is only allowed for moderator accounts (the seeded ones we created), never for people who signed up themselves. */
async function allSeeded(ids: string[]): Promise<boolean> {
  if (ids.some((id) => !UUID.test(id))) return false;
  const rows = await prisma.$queryRaw<Array<{ n: bigint }>>`select count(*) as n from auth.users where id = any(${ids}::uuid[]) and raw_user_meta_data->>'seeded' = 'true'`;
  return Number(rows[0]?.n ?? 0) === new Set(ids).size;
}

/**
 * POST /api/v1/admin/crud
 * Admin-only: Full CRUD operations for managing users, posts, comments, and impersonation.
 */
export async function POST(request: Request) {
  const auth = await authenticateAdmin(request, 'users');
  if (!isAdminAuthenticated(auth)) return auth;

  const body = await parseJson(request);
  if (!isRecord(body) || typeof body.action !== 'string') {
    return apiError('invalid_body', 'Provide an action.', 400);
  }

  const { action } = body;
  // Looking people up is for support; changing or impersonating them is for admins and the owner.
  if (action !== 'get_user_credentials' && !can(auth.role, 'impersonate')) return apiError('forbidden', 'Your role cannot do that.', 403);

  // Everything that acts as a person (sign in as, post, comment, reply, edit, match) works on moderator accounts only.
  const actingAs: Record<string, string[]> = {
    login_as: [String(body.userId ?? '')],
    create_post_as_user: [String(body.asUserId ?? '')],
    create_comment_as_user: [String(body.asUserId ?? '')],
    reply_as_user: [String(body.asUserId ?? '')],
    edit_post_as_user: [String(body.asUserId ?? '')],
    match_as_user: [String(body.fromUserId ?? ''), String(body.toUserId ?? '')],
  };
  if (actingAs[action] && !(await allSeeded(actingAs[action]))) return apiError('not_a_moderator_account', 'That only works on moderator accounts.', 403);

  try {
    // ─── 1. GET_USER_CREDENTIALS (Name, Email, Password upfront!) ───
    if (action === 'get_user_credentials') {
      const page = Math.max(1, Number(body.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(body.limit) || 20));
      const query = typeof body.query === 'string' ? body.query.trim() : '';
      const skip = (page - 1) * limit;

      const searchFilter = query ? `%${query}%` : null;

      const countResult: Array<{ count: number }> = searchFilter
        ? await prisma.$queryRawUnsafe(`
            SELECT count(*)::int as count
            FROM auth.users u
            LEFT JOIN public.profiles p ON p.id = u.id
            WHERE p.display_name ILIKE $1 
               OR p.username ILIKE $1 
               OR u.email ILIKE $1 
               OR p.school ILIKE $1
          `, searchFilter)
        : await prisma.$queryRawUnsafe(`
            SELECT count(*)::int as count FROM auth.users u
          `);
      const total = countResult[0]?.count || 0;

      const rows: Array<{
        id: string;
        email: string;
        password: string | null;
        display_name: string | null;
        username: string | null;
        school: string | null;
        course: string | null;
        year: string | null;
        avatar_url: string | null;
        created_at: Date;
        posts_count: number;
        comments_count: number;
      }> = searchFilter
        ? await prisma.$queryRawUnsafe(`
            SELECT 
              u.id, 
              u.email, 
              u.raw_user_meta_data->>'plain_password' as password,
              p.display_name, 
              p.username, 
              p.school, 
              p.course, 
              p.year, 
              p.avatar_url,
              u.created_at,
              (SELECT count(*)::int FROM public.posts WHERE author_id = u.id) as posts_count,
              (SELECT count(*)::int FROM public.post_comments WHERE author_id = u.id) as comments_count
            FROM auth.users u
            LEFT JOIN public.profiles p ON p.id = u.id
            WHERE p.display_name ILIKE $1 
               OR p.username ILIKE $1 
               OR u.email ILIKE $1 
               OR p.school ILIKE $1
            ORDER BY u.created_at DESC
            LIMIT $2 OFFSET $3
          `, searchFilter, limit, skip)
        : await prisma.$queryRawUnsafe(`
            SELECT 
              u.id, 
              u.email, 
              u.raw_user_meta_data->>'plain_password' as password,
              p.display_name, 
              p.username, 
              p.school, 
              p.course, 
              p.year, 
              p.avatar_url,
              u.created_at,
              (SELECT count(*)::int FROM public.posts WHERE author_id = u.id) as posts_count,
              (SELECT count(*)::int FROM public.post_comments WHERE author_id = u.id) as comments_count
            FROM auth.users u
            LEFT JOIN public.profiles p ON p.id = u.id
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
          `, limit, skip);

      return apiSuccess({
        users: rows.map((r) => ({
          id: r.id,
          email: r.email,
          password: can(auth.role, 'impersonate') ? r.password || '(manual / oauth)' : '(hidden for your role)',
          displayName: r.display_name || 'Member',
          username: r.username,
          school: r.school,
          course: r.course || '',
          year: r.year || '',
          avatarUrl: r.avatar_url,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          counts: {
            posts: r.posts_count || 0,
            comments: r.comments_count || 0,
          },
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    }

    // ─── 2. LOGIN_AS (Get full credentials to copy or switch) ───
    if (action === 'login_as') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);

      const rows: Array<{
        id: string;
        email: string;
        password: string | null;
        display_name: string | null;
        username: string | null;
      }> = await prisma.$queryRawUnsafe(`
        SELECT u.id, u.email, u.raw_user_meta_data->>'plain_password' as password, p.display_name, p.username
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id = $1::uuid
        LIMIT 1
      `, userId);

      if (!rows.length) return apiError('user_not_found', 'User not found.', 404);
      const user = rows[0];

      return apiSuccess({
        userId: user.id,
        email: user.email,
        password: user.password || '(not set via seed)',
        displayName: user.display_name || '',
        username: user.username || '',
      });
    }

    // ─── 3. CREATE_POST_AS_USER (Post in Room as any user!) ───
    if (action === 'create_post_as_user') {
      const asUserId = String(body.asUserId || '');
      const caption = String(body.caption || '').trim();
      if (!asUserId || !caption) return apiError('missing_fields', 'Provide asUserId and caption.', 400);

      const profile = await prisma.profile.findUnique({
        where: { id: asUserId },
        select: { displayName: true, username: true, school: true },
      });
      if (!profile) return apiError('user_not_found', 'User not found.', 404);

      const post = await prisma.post.create({
        data: {
          authorId: asUserId,
          authorName: profile.displayName || 'Member',
          authorUsername: profile.username || 'member',
          schoolLabel: profile.school || null,
          caption,
          mediaType: typeof body.mediaType === 'string' ? body.mediaType : 'text',
          mediaItems: Array.isArray(body.mediaItems) ? body.mediaItems : [],
          pollOptions: Array.isArray(body.pollOptions) ? body.pollOptions : [],
          audience: 'Public',
        },
      });
      return apiSuccess({ post });
    }

    // ─── 4. CREATE_COMMENT_AS_USER (Comment on any post as any user!) ───
    if (action === 'create_comment_as_user') {
      const postId = String(body.postId || '');
      const commentBody = String(body.body || '').trim();
      const asUserId = String(body.asUserId || '');
      if (!postId || !commentBody || !asUserId) {
        return apiError('missing_fields', 'Provide postId, body, and asUserId.', 400);
      }

      const comment = await prisma.postComment.create({
        data: {
          postId,
          authorId: asUserId,
          body: commentBody,
        },
      });
      return apiSuccess({ comment });
    }

    // ─── 4b. REPLY_AS_USER (reply to a comment as a moderator account) ───
    if (action === 'reply_as_user') {
      const postId = String(body.postId || '');
      const parentId = String(body.parentId || '');
      const replyBody = String(body.body || '').trim();
      const asUserId = String(body.asUserId || '');
      if (!UUID.test(postId) || !UUID.test(parentId) || !replyBody) return apiError('missing_fields', 'Provide postId, parentId and body.', 400);
      const parent = await prisma.postComment.findFirst({ where: { id: parentId, postId }, select: { id: true } });
      if (!parent) return apiError('comment_not_found', 'That comment is not on that post.', 404);
      const reply = await prisma.postComment.create({ data: { postId, parentId, authorId: asUserId, body: replyBody } });
      return apiSuccess({ comment: reply });
    }

    // ─── 4c. EDIT_POST_AS_USER (edit a post written by a moderator account) ───
    if (action === 'edit_post_as_user') {
      const postId = String(body.postId || '');
      const caption = String(body.caption || '').trim();
      const asUserId = String(body.asUserId || '');
      if (!UUID.test(postId) || !caption) return apiError('missing_fields', 'Provide postId and caption.', 400);
      const changed = await prisma.$executeRaw`update public.posts set caption = ${caption}, edited_at = now() where id = ${postId}::uuid and author_id = ${asUserId}::uuid`;
      if (changed === 0) return apiError('post_not_found', 'That account has no such post.', 404);
      return apiSuccess({ edited: true });
    }

    // ─── 4d. CREATE_MODERATOR_ACCOUNT (sign up a new moderator account) ───
    if (action === 'create_moderator_account') {
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const displayName = String(body.displayName || '').trim().slice(0, 60);
      const school = typeof body.school === 'string' ? body.school.trim().slice(0, 120) : '';
      if (!emailPattern.test(email) || email.length > 120) return apiError('invalid_email', 'Enter a valid email address.', 422);
      if (password.length < 10 || password.length > 100) return apiError('weak_password', 'Use a password of at least 10 characters.', 422);
      if (!displayName) return apiError('missing_name', 'Give the account a name.', 422);
      try {
        const created = await prisma.$queryRaw<Array<{ id: string }>>`
          insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change, email_change_token_new)
          values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', ${email}, extensions.crypt(${password}, extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('seeded', 'true', 'plain_password', ${password}::text, 'display_name', ${displayName}::text), now(), now(), '', '', '', '')
          returning id::text as id`;
        const id = created[0].id;
        await prisma.$executeRaw`
          insert into auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at)
          values (gen_random_uuid(), ${id}::uuid, ${id}, jsonb_build_object('sub', ${id}::text, 'email', ${email}::text), 'email', now(), now(), now())`;
        const handle = `${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 20) || 'member'}_${id.slice(0, 6)}`;
        await prisma.$executeRaw`
          insert into public.profiles (id, display_name, username, education_status, school, show_school_on_profile, age_eligibility_confirmed, interests)
          values (${id}::uuid, ${displayName}, ${handle}, ${school ? 'currently_in_school' : 'prefer_not_to_say'}, ${school || null}, ${Boolean(school)}, true, '{}')`;
        return apiSuccess({ userId: id, email, password, displayName }, 201);
      } catch (createError) {
        if (createError instanceof Error && /duplicate key|already exists|unique/i.test(createError.message)) return apiError('email_taken', 'An account with that email already exists.', 409);
        throw createError;
      }
    }

    // ─── 5. MATCH_AS_USER (Connect/Match any two users in Connect!) ───
    if (action === 'match_as_user') {
      const fromUserId = String(body.fromUserId || '');
      const toUserId = String(body.toUserId || '');
      if (!fromUserId || !toUserId || fromUserId === toUserId) {
        return apiError('invalid_ids', 'Provide distinct fromUserId and toUserId.', 400);
      }

      await prisma.$executeRawUnsafe(`
        INSERT INTO public.dating_likes (from_user_id, to_user_id, created_at)
        VALUES ($1::uuid, $2::uuid, now())
        ON CONFLICT DO NOTHING
      `, fromUserId, toUserId);

      // Mutual match makes them connected!
      await prisma.$executeRawUnsafe(`
        INSERT INTO public.dating_likes (from_user_id, to_user_id, created_at)
        VALUES ($1::uuid, $2::uuid, now())
        ON CONFLICT DO NOTHING
      `, toUserId, fromUserId);

      return apiSuccess({ matched: true, fromUserId, toUserId, mutual: true });
    }

    // ─── 6. DELETE_POST ───
    if (action === 'delete_post') {
      const postId = String(body.postId || '');
      if (!postId) return apiError('missing_post', 'Provide postId.', 400);
      await prisma.post.delete({ where: { id: postId } });
      return apiSuccess({ deleted: true, postId });
    }

    // ─── 7. DELETE_POSTS_BULK ───
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

    // ─── 8. DELETE_COMMENT ───
    if (action === 'delete_comment') {
      const commentId = String(body.commentId || '');
      if (!commentId) return apiError('missing_comment', 'Provide commentId.', 400);
      await prisma.postComment.delete({ where: { id: commentId } });
      return apiSuccess({ deleted: true, commentId });
    }

    // ─── 9. DELETE_USER ───
    if (action === 'delete_user') {
      const userId = String(body.userId || '');
      if (!userId) return apiError('missing_user', 'Provide userId.', 400);

      // Deleting from auth.users cascades to public.profiles, posts, etc.
      await prisma.$executeRawUnsafe(`DELETE FROM auth.users WHERE id = $1::uuid`, userId);
      return apiSuccess({ deleted: true, userId });
    }

    // ─── 10. BULK_DELETE_USERS ───
    if (action === 'bulk_delete_users') {
      const filter = String(body.filter || '');
      if (filter === 'seeded') {
        const count = await prisma.$executeRawUnsafe(`
          DELETE FROM auth.users WHERE raw_user_meta_data->>'seeded' = 'true'
        `);
        return apiSuccess({ deleted: count, scope: 'seeded' });
      }
      return apiError('invalid_filter', 'Provide filter: "seeded".', 400);
    }

    // ─── 11. UPDATE_PROFILE ───
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
