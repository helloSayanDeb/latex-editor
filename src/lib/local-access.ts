import { timingSafeEqual } from 'node:crypto';
export const SESSION_COOKIE = 'lemmata_session';
export const MAX_REQUEST_BYTES = 24 * 1024 * 1024;
export function checkLocalBoundary(headers: Headers, expectedPort: string, context?: { method?: string; pathname?: string }): string | null {
  const host = headers.get('host') || '';
  let origin: string;
  try {
    const url = new URL(`http://${host}`);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.port !== expectedPort || url.username || url.password || url.pathname !== '/') return 'Only the local workstation address is allowed.';
    origin = url.origin;
  } catch { return 'Invalid workstation address.'; }
  const requestOrigin = headers.get('origin');
  if (requestOrigin && requestOrigin !== origin) return 'Requests from another website are not allowed.';
  const site = headers.get('sec-fetch-site');
  const mode = headers.get('sec-fetch-mode');
  const dest = headers.get('sec-fetch-dest');

  // Top-level browser link navigation (e.g. user clicking from the hosted showcase to their local instance in a new tab)
  const isTopLevelDocNav = context?.method === 'GET' &&
    context.pathname &&
    !context.pathname.startsWith('/api/') &&
    mode === 'navigate' &&
    dest === 'document';

  if (site && !['same-origin', 'none'].includes(site)) {
    if (!isTopLevelDocNav) return 'Cross-site requests are not allowed.';
  }
  const referer = headers.get('referer');
  if (referer) {
    try {
      if (new URL(referer).origin !== origin && !isTopLevelDocNav) return 'Cross-origin requests are not allowed.';
    } catch { return 'Invalid request origin.'; }
  }
  if (headers.get('x-forwarded-host') && headers.get('x-forwarded-host') !== host) return 'Forwarded host does not match the local workstation.';
  return null;
}
export function validSession(token: string | undefined, expected: string | undefined) {
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || !token || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
