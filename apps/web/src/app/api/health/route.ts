import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET /api/health: for uptime monitors. Says whether the app and its database are up. No secrets, no details. */
export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
