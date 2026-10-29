import { unzipSync } from 'fflate';
import { validateFilename, sanitizePath } from './security';
export function unpackTemplate(bytes: Uint8Array): { files: Record<string,string>; skipped: string[] } {
  if (bytes.length > 20 * 1024 * 1024) throw new Error('Choose a ZIP smaller than 20 MB.');
  const seen = new Set<string>(); let total = 0, count = 0;
  const entries = unzipSync(bytes, { filter(entry) {
    if (++count > 200) throw new Error('The ZIP contains too many entries (maximum 200).');
    if (entry.name.endsWith('/')) return false;
    if (entry.name.startsWith('__MACOSX/') || entry.name.split('/').some(part => part.startsWith('.'))) {
      if (entry.name.split('/').includes('..')) throw new Error('Traversal paths are not allowed.');
      return false;
    }
    sanitizePath(entry.name);
    const key = entry.name.toLowerCase(); if (seen.has(key)) throw new Error('Duplicate ZIP filenames are not supported.'); seen.add(key);
    total += entry.originalSize;
    if (entry.originalSize > 8 * 1024 * 1024 || total > 16 * 1024 * 1024) throw new Error('Expanded template exceeds the 8 MB per-file / 16 MB total limit.');
    return true;
  } });
  const names = Object.keys(entries), first = names[0]?.split('/')[0];
  const prefix = first && names.every(name => name.startsWith(first + '/')) ? first + '/' : '';
  const files: Record<string,string> = {}, skipped: string[] = [];
  for (const original of names) {
    const name = original.slice(prefix.length), data = entries[original];
    if (!validateFilename(name) || name.toLowerCase() === 'project.json') { skipped.push(name); continue; }
    const ext = name.split('.').pop()?.toLowerCase();
    if (['png','jpg','jpeg','pdf','eps'].includes(ext || '')) {
      let binary = ''; for (let i = 0; i < data.length; i += 8192) binary += String.fromCharCode(...data.subarray(i, i + 8192));
      const mime = ext === 'pdf' ? 'application/pdf' : ext === 'eps' ? 'application/postscript' : ext === 'png' ? 'image/png' : 'image/jpeg';
      files[name] = 'data:' + mime + ';base64,' + btoa(binary);
    } else files[name] = new TextDecoder('utf-8', { fatal: true }).decode(data);
  }
  if (!Object.keys(files).some(name => name.endsWith('.tex'))) throw new Error('The template must contain a UTF-8 .tex source file.');
  return { files, skipped };
}
