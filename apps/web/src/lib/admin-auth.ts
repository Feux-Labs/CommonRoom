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

  const userEmail = auth.user.email?.trim().toLowerCase();
  const emailIsVerified = Boolean(auth.user.email_confirmed_at);

  if (emailIsVerified && userEmail === 'ibitoyrgideon79@gmail.com') {
    return { supabase: auth.supabase, user: auth.user };
  }

  return apiError('forbidden', 'Admin access required.', 403);
}

export function isAdminAuthenticated(value: AdminAuth | NextResponse): value is AdminAuth {
  return !(value instanceof NextResponse);
}
