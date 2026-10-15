import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apiError, authenticateRequest, isAuthenticatedRequest, isRecord, parseJson } from '@/lib/supabase-server';

type AnonymousRequestContext =
  | { supabase: SupabaseClient }
  | { response: NextResponse };

export async function authenticateAnonymousRequest(request: Request): Promise<AnonymousRequestContext> {
  const result = await authenticateRequest(request);
  return isAuthenticatedRequest(result) ? { supabase: result.supabase } : { response: result };
}

export async function parseAnonymousBody(request: Request) {
  const value = await parseJson(request);
  return isRecord(value) ? value : null;
}

export function anonymousRpcError(error: { code?: string; message?: string }, fallback: string) {
  const message = error.message ?? '';
  const knownErrors: Record<string, [string, number]> = {
    anonymous_auth_required: ['Continue with an anonymous session to use Anonymous.', 401],
    anonymous_identity_required: ['Choose your Anonymous name before continuing.', 409],
    anonymous_handle_taken: ['That Anonymous name is already in use. Try another.', 409],
    invalid_anonymous_handle: ['Choose a name with 3–24 letters, numbers, spaces, or underscores.', 422],
    invalid_anonymous_scope: ['Choose a valid audience.', 422],
    invalid_anonymous_cursor: ['The feed continuation token is invalid. Refresh the feed to continue.', 400],
    invalid_anonymous_title: ['Add a title of up to 120 characters.', 422],
    invalid_anonymous_body: ['Add a post of up to 3,000 characters.', 422],
    invalid_anonymous_media: ['Choose up to 10 supported photos or one supported video.', 422],
    invalid_anonymous_comment: ['Add a comment of up to 2,000 characters.', 422],
    invalid_anonymous_comment_parent: ['Replies can only be added to a top-level comment on this post.', 422],
    invalid_anonymous_message: ['Add a message of up to 2,000 characters.', 422],
    anonymous_school_required: ['Choose the wider audience or add your school to your profile.', 409],
    anonymous_post_not_found: ['That post could not be found.', 404],
    anonymous_thread_forbidden: ['This private conversation is unavailable.', 404],
    anonymous_inbox_link_unavailable: ['This anonymous link is unavailable or has been turned off.', 404],
    anonymous_inbox_self_message: ['You cannot send an anonymous message to your own link.', 422],
    anonymous_inbox_blocked: ['This conversation is no longer available.', 403],
    anonymous_message_not_found: ['That message could not be found.', 404],
    invalid_report_target: ['Choose content that can be reported.', 422],
    invalid_report_reason: ['Add a report reason of up to 500 characters.', 422],
    anonymous_rate_limit_exceeded: ['You’re doing that too often. Please try again later.', 429],
  };

  const known = Object.entries(knownErrors).find(([code]) => message.includes(code));
  if (known) return apiError(known[0], known[1][0], known[1][1]);
  console.error('Anonymous API database request failed.', { code: error.code ?? 'unknown' });
  return apiError('anonymous_request_failed', fallback, 500);
}

export function anonymousInvalidBody(message: string) {
  return apiError('invalid_body', message, 400);
}
