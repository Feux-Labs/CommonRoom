import { apiError, apiSuccess, authenticateRequest, createPublicSupabase, isAuthenticatedRequest } from '@/lib/supabase-server';
import { anonymousInvalidBody, anonymousRpcError, authenticateAnonymousRequest, parseAnonymousBody } from '@/lib/anonymous-api';

const scopes = ['school', 'all_nigerian_schools'];
const cardThemes = ['blue-hour', 'soft-sky', 'warm-glow', 'rose-note'];
const pageSize = 25;
const cursorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PostCursor = { createdAt: string; id: string };

function decodeCursor(value: string | null): PostCursor | null | undefined {
  if (!value) return null;
  try {
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<PostCursor>;
    if (typeof cursor.createdAt !== 'string' || !Number.isFinite(Date.parse(cursor.createdAt))
      || typeof cursor.id !== 'string' || !cursorIdPattern.test(cursor.id)) {
      return undefined;
    }
    return { createdAt: cursor.createdAt, id: cursor.id };
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const auth = request.headers.has('authorization') ? await authenticateRequest(request) : null;
  if (auth && !isAuthenticatedRequest(auth)) return auth;
  const supabase = auth ? auth.supabase : createPublicSupabase();
  const params = new URL(request.url).searchParams;
  const scope = auth
    ? params.get('scope') ?? 'all_nigerian_schools'
    : 'all_nigerian_schools';

  if (params.has('page')) {
    if (!scopes.includes(scope)) return apiError('invalid_anonymous_scope', 'Choose a valid audience.', 422);
    const cursor = decodeCursor(params.get('cursor'));
    if (cursor === undefined) return apiError('invalid_anonymous_cursor', 'The feed continuation token is invalid. Refresh the feed to continue.', 400);

    const { data, error } = auth
      ? await supabase.rpc('get_anonymous_posts_page', {
        p_scope: scope === 'all_nigerian_schools' ? 'all' : scope,
        p_before_created_at: cursor?.createdAt ?? null,
        p_before_id: cursor?.id ?? null,
        p_limit: pageSize + 1,
        p_post_id: null,
      })
      : await supabase.rpc('get_public_anonymous_posts_page', {
        p_before_created_at: cursor?.createdAt ?? null,
        p_before_id: cursor?.id ?? null,
        p_limit: pageSize + 1,
        p_post_id: null,
      });
    if (error) return anonymousRpcError(error, 'Anonymous posts could not be loaded.');

    const rows = data ?? [];
    const hasMore = rows.length > pageSize;
    const posts = rows.slice(0, pageSize);
    const lastPost = posts.at(-1);
    const nextCursor = hasMore && lastPost
      ? Buffer.from(JSON.stringify({ createdAt: lastPost.created_at, id: lastPost.id })).toString('base64url')
      : null;
    return apiSuccess({ posts, hasMore, nextCursor });
  }

  if (params.has('id')) {
    const { data: posts, error: mediaError } = auth
      ? await supabase.rpc('get_anonymous_posts_page', {
        p_scope: scope === 'all_nigerian_schools' ? 'all' : scope,
        p_before_created_at: null,
        p_before_id: null,
        p_limit: 1,
        p_post_id: params.get('id'),
      })
      : await supabase.rpc('get_public_anonymous_posts_page', {
        p_before_created_at: null,
        p_before_id: null,
        p_limit: 1,
        p_post_id: params.get('id'),
      });
    if (mediaError) return anonymousRpcError(mediaError, 'Anonymous posts could not be loaded.');
    return apiSuccess(posts ?? []);
  }
  const { data, error } = auth
    ? await supabase.rpc('get_anonymous_posts', {
      p_scope: scope === 'all_nigerian_schools' ? 'all' : scope,
    })
    : await supabase.rpc('get_public_anonymous_posts_page', {
      p_before_created_at: null,
      p_before_id: null,
      p_limit: 51,
      p_post_id: null,
    });
  if (error) return anonymousRpcError(error, 'Anonymous posts could not be loaded.');
  return apiSuccess(data ?? []);
}

export async function POST(request: Request) {
  const body = await parseAnonymousBody(request);
  if (!body || typeof body.scope !== 'string' || !scopes.includes(body.scope)
    || typeof body.title !== 'string' || typeof body.body !== 'string'
    || (body.cardTheme !== undefined && (typeof body.cardTheme !== 'string' || !cardThemes.includes(body.cardTheme)))
    || (body.mediaItems !== undefined && (!Array.isArray(body.mediaItems)
      || body.mediaItems.some((item) => typeof item !== 'object' || item === null || Array.isArray(item)
      || typeof item.path !== 'string' || (item.mediaType !== 'photo' && item.mediaType !== 'video'))))) {
    return anonymousInvalidBody('Send a title, message, audience, and valid media items.');
  }
  const context = await authenticateAnonymousRequest(request);
  if ('response' in context) return context.response;
  const { data, error } = await context.supabase.rpc('create_anonymous_post_with_media', {
    p_scope: body.scope,
    p_title: body.title,
    p_body: body.body,
    p_media_items: body.mediaItems ?? [],
    p_card_theme: body.cardTheme ?? 'blue-hour',
  });
  if (error) return anonymousRpcError(error, 'Your anonymous post could not be published.');
  return apiSuccess(Array.isArray(data) ? data[0] ?? null : null, 201);
}
