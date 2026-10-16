import { NextResponse } from 'next/server';
import { authenticateRequest, isAuthenticatedRequest, apiError } from './supabase-server';
import type { User, SupabaseClient } from '@supabase/supabase-js';

export type AdminAuth = {
  supabase: SupabaseClient;
  user: User;
};

export async function authenticateAdmin(request: Request): Promise<AdminAuth | NextResponse> {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) {
    return auth;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || 'admin@commonroom.app,ibitoyrgideon79@gmail.com')
    .split(',')
    .map((e) => e.trim().toLowerCase());
  const userEmail = auth.user.email?.toLowerCase();
  const isAdminClaim = Boolean(auth.user.app_metadata?.claims_admin || auth.user.user_metadata?.is_admin);

  if (process.env.NODE_ENV === 'development' || isAdminClaim || (userEmail && adminEmails.includes(userEmail))) {
    return { supabase: auth.supabase, user: auth.user };
  }

  return apiError('forbidden', 'Admin access required.', 403);
}

export function isAdminAuthenticated(value: AdminAuth | NextResponse): value is AdminAuth {
  return !(value instanceof NextResponse);
}
