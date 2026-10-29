export type SearchHit = { file: string; line: number; column: number; text: string; length: number };
export function searchProject(files: Record<string, string>, query: string, options: { matchCase?: boolean; limit?: number } = {}): { hits: SearchHit[]; truncated: boolean } {
  const hits: SearchHit[] = [], limit = Math.max(1, Math.min(1000, options.limit || 300));
  if (!query.trim()) return { hits, truncated: false };
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), options.matchCase ? 'gu' : 'giu');
  for (const [file, content] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (content.startsWith('data:')) continue;
    for (const [index, text] of content.split(/\r?\n/).entries()) {
      expression.lastIndex = 0;
      for (const match of text.matchAll(expression)) {
        const at = match.index;
        if (hits.length === limit) return { hits, truncated: true };
        hits.push({ file, line: index + 1, column: at + 1, text: text.slice(Math.max(0, at - 100), at + query.length + 180), length: query.length });
      }
    }
  }
  return { hits, truncated: false };
}
