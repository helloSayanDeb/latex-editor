import { MAX_REQUEST_BYTES } from './local-access';
export async function readRequestText(request: Request, limit = MAX_REQUEST_BYTES): Promise<string> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error('Request body exceeds the local size limit.'); }
      parts.push(decoder.decode(chunk.value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } finally { reader.releaseLock(); }
}
export async function readRequestJSON(request: Request, limit = MAX_REQUEST_BYTES) {
  return JSON.parse(await readRequestText(request, limit));
}

// Per-process resource bounds, not a multi-user rate-limit or security sandbox.
const active = new Map<string, number>();
export function acquireJob(kind: string, maximum: number): (() => void) | null {
  const count = active.get(kind) || 0;
  if (count >= maximum) return null;
  active.set(kind, count + 1);
  let released = false;
  return () => { if (!released) { released = true; active.set(kind, Math.max(0, (active.get(kind) || 1) - 1)); } };
}
