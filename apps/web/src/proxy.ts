import { after, NextResponse, type NextRequest } from 'next/server';
import { classifyRequest, rowFor, writeLog } from '@/lib/request-log';

/**
 * Sees every request to the API, and anything that looks like probing on other pages, and writes it to the request log the
 * admin Security tab reads. It never changes or blocks a request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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
