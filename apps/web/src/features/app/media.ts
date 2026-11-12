'use client';

import type { Session } from '@supabase/supabase-js';
import { getBrowserSupabase } from '@/lib/supabase-browser';
import { apiRequest } from './api';

export const MEDIA_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
};

export function mediaExtension(file: File): string | undefined {
  return MEDIA_EXTENSIONS[file.type];
}

type UploadTicket = { path: string; url: string; uploadUrl: string; relayTicket?: string };

async function putToStorage(ticket: UploadTicket, file: File, session: Session): Promise<void> {
  let response: Response;
  try {
    response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  } catch {
    // The browser was not allowed to talk to storage directly (a blocked cross-site request looks like a network failure).
    // Send the file through our own server instead: slower, but it works from anywhere.
    if (!ticket.relayTicket) throw new Error('The upload failed. Check your connection and try again.');
    let relayed: Response;
    try {
      relayed = await fetch(`/api/v1/media/relay?ticket=${encodeURIComponent(ticket.relayTicket)}`, { method: 'PUT', headers: { 'Content-Type': file.type, Authorization: `Bearer ${session.access_token}` }, body: file });
    } catch {
      throw new Error('The upload failed. Check your connection and try again.');
    }
    if (!relayed.ok) throw new Error(relayed.status === 413 ? 'This file is too large to upload. Try a smaller one.' : 'The upload failed. Try again.');
    return;
  }
  if (!response.ok) throw new Error('The upload failed. Try again.');
}

/**
 * Uploads straight to Cloudflare R2 with a short-lived signed URL from our server, and returns the
 * stored path and public URL. `anonymous` uploads get an opaque path that carries no user id.
 */
export async function uploadUserMedia(
  session: Session,
  file: File,
  prefix = '',
  kind: 'user' | 'anonymous' = 'user',
): Promise<{ path: string; url: string }> {
  if (!mediaExtension(file)) throw new Error('This file type isn’t supported. Use JPG, PNG, WebP, MP4, MOV or WebM.');
  const ticket = await apiRequest<UploadTicket>('/api/v1/media/upload-url', {
    session,
    method: 'POST',
    body: { contentType: file.type, size: file.size, kind, prefix: kind === 'user' ? prefix : undefined },
  });
  await putToStorage(ticket, file, session);
  return { path: ticket.path, url: ticket.url };
}

/** Best-effort cleanup of uploads from a post that failed to publish. */
export async function removeUserMedia(paths: string[]): Promise<void> {
  if (!paths.length) return;
  try {
    const { data } = await getBrowserSupabase().auth.getSession();
    await apiRequest('/api/v1/media', { session: data.session, method: 'DELETE', body: { paths } });
  } catch (error) {
    console.error('Uploaded media could not be cleaned up.', error);
  }
}
