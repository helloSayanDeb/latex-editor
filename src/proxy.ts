import { NextResponse, type NextRequest } from 'next/server';
import { checkLocalBoundary, validSession, SESSION_COOKIE, MAX_REQUEST_BYTES } from './lib/local-access';
export function proxy(request: NextRequest) {
  const port = process.env.LEMMATA_PORT || process.env.PORT || '2303';
  const boundary = checkLocalBoundary(request.headers, port);
  if (boundary) return NextResponse.json({ error: boundary }, { status: 403 });
  const token = process.env.LEMMATA_SESSION_TOKEN;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.json({ error: 'Start Lemmata using npm run dev or npm start.' }, { status: 503 });
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!validSession(request.headers.get('x-lemmata-token') || request.cookies.get(SESSION_COOKIE)?.value, token)) return NextResponse.json({ error: 'Local session expired. Reload the workstation page.' }, { status: 401 });
    const size = request.headers.get('content-length');
    if (size && (!/^\d+$/.test(size) || Number(size) > MAX_REQUEST_BYTES)) return NextResponse.json({ error: 'Request exceeds the 24 MB workstation limit.' }, { status: 413 });
  }
  const response = NextResponse.next();
  if (!request.nextUrl.pathname.startsWith('/api/') && request.method === 'GET' && !validSession(request.cookies.get(SESSION_COOKIE)?.value, token)) response.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'strict', path: '/api', secure: request.nextUrl.protocol === 'https:', maxAge: 86400 });
  const csp = ["default-src 'self'", `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline'", "font-src 'self' data:", "connect-src 'self' http://localhost:* http://127.0.0.1:* https://generativelanguage.googleapis.com https://api.openai.com", "img-src 'self' data: blob:", "worker-src 'self' blob:", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'"].join('; ');
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (request.nextUrl.pathname.startsWith('/api/')) response.headers.set('Cache-Control', 'no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.svg|vendor).*)'] };
