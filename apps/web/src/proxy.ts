import { after, NextResponse, type NextRequest } from 'next/server';
import { isBlocked } from '@/lib/ip-block';
import { classifyRequest, clientIp, rowFor, writeLog } from '@/lib/request-log';

/**
 * Sees every request to the API, and anything that looks like probing on other pages, and writes it to the request log the
 * admin Security tab reads. It turns away addresses the staff (or the automatic rule) blocked, and otherwise changes nothing.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const ip = clientIp(request.headers);
  if (await isBlocked(ip)) {
    const row = { ...rowFor(request, 'blocked'), flag: 'blocked address' };
    after(() => writeLog(row));
    return NextResponse.json({ error: { code: 'blocked', message: 'This address has been blocked.' } }, { status: 403 });
  }

  const isApi = pathname.startsWith('/api/');
  const flag = classifyRequest(pathname, search.replace(/^\?/, ''), request.headers.get('user-agent') ?? '');
  // Pages are only worth a row when something looks wrong; every API call is logged so you can see what is being used.
  if (isApi || (flag && flag.startsWith('attack'))) {
    const row = rowFor(request, 'request');
    after(() => writeLog(row));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|pwa-icon|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|woff2?|mp4|webm)$).*)'],
};
