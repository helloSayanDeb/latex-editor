/** Pure validation shared by browser forms and server APIs. */
export function sanitizePath(userPath: string): string {
  if (typeof userPath !== 'string' || !userPath.trim()) throw new Error('A relative file path is required.');
  const normalized = userPath.replace(/\\/g, '/');
  if (normalized.startsWith('/') || !/^[\p{L}\p{N} _()./-]+$/u.test(normalized)) throw new Error('Invalid relative file path.');
  const segments = normalized.split('/');
  for (const segment of segments) {
    if (!segment || segment.startsWith('.') || /[. ]$/.test(segment) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment)) throw new Error('Hidden, reserved, or traversal paths are not allowed.');
  }
  return segments.join('/');
}
export function sanitizeProjectId(projectId: string): string {
  if (typeof projectId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(projectId)) throw new Error('Invalid project identifier.');
  return projectId;
}
export const ALLOWED_EXTENSIONS = new Set(['.tex','.bib','.sty','.cls','.bst','.txt','.csv','.dat','.png','.jpg','.jpeg','.pdf','.svg','.eps']);
export function validateFilename(name: string): boolean {
  try {
    const safe = sanitizePath(name);
    return ALLOWED_EXTENSIONS.has(safe.slice(safe.lastIndexOf('.')).toLowerCase());
  } catch { return false; }
}
