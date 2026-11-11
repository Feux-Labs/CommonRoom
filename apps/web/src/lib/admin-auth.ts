import { NextResponse } from 'next/server';
import { authenticateRequest, isAuthenticatedRequest, apiError } from './supabase-server';
import { prisma } from './prisma';
import { logSecurityEvent } from './request-log';
import type { User, SupabaseClient } from '@supabase/supabase-js';

/**
 * Who can do what in the admin dashboard. Access is a row in admin_roles (set from the dashboard), never an email in the
 * environment. Every admin API route names the permission it needs, and it is checked here on the server.
 */
export type AdminRole = 'owner' | 'admin' | 'moderator' | 'support' | 'analyst';
export type Permission =
  | 'analytics' | 'moderation' | 'users' | 'impersonate' | 'support' | 'ads' | 'flags' | 'broadcast' | 'security'
  | 'team' // create, change and remove admins; lock admin creation (owner only)
  | 'team_staff'; // create and manage moderators, support and analysts (admins)

const ALL: Permission[] = ['analytics', 'moderation', 'users', 'impersonate', 'support', 'ads', 'flags', 'broadcast', 'security', 'team', 'team_staff'];

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  owner: ALL,
  admin: ['analytics', 'moderation', 'users', 'impersonate', 'support', 'ads', 'flags', 'broadcast', 'security', 'team_staff'],
  moderator: ['moderation', 'support'],
  support: ['support', 'users'],
  analyst: ['analytics'],
};

export const ADMIN_ROLES = Object.keys(ROLE_PERMISSIONS) as AdminRole[];

export function can(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export type AdminAuth = {
  supabase: SupabaseClient;
  user: User;
  role: AdminRole;
};

export async function roleOf(userId: string): Promise<AdminRole | null> {
  const rows = await prisma.$queryRaw<Array<{ role: AdminRole }>>`select role from public.admin_roles where user_id = ${userId}::uuid`;
  return rows[0]?.role ?? null;
}

/** Signs the caller in as staff. Pass the permission the route needs; without one, any staff role is enough. */
export async function authenticateAdmin(request: Request, permission?: Permission): Promise<AdminAuth | NextResponse> {
  const auth = await authenticateRequest(request);
  if (!isAuthenticatedRequest(auth)) return auth;

  if (!auth.user.email_confirmed_at) return apiError('forbidden', 'Admin access required.', 403);
  const role = await roleOf(auth.user.id).catch(() => null);
  if (!role || (permission && !can(role, permission))) {
    logSecurityEvent(request, 'admin_denied', { userId: auth.user.id, status: 403, flag: role ? `role ${role} lacks ${permission}` : 'not staff' });
    return apiError('forbidden', 'Admin access required.', 403);
  }
  return { supabase: auth.supabase, user: auth.user, role };
}

export function isAdminAuthenticated(value: AdminAuth | NextResponse): value is AdminAuth {
  return !(value instanceof NextResponse);
}
