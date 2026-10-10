export type SearchMatch = { from: number; to: number; replacement: string };
export function findMatches(document: string, query: string, replacement: string, options: { regex: boolean; caseSensitive: boolean; wholeWord: boolean }): SearchMatch[] {
  let source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (options.wholeWord) source = `\\b(?:${source})\\b`;
  const pattern = new RegExp(source, options.caseSensitive ? 'g' : 'gi');
  const results: SearchMatch[] = [];
  // Native replace supplies captures, named groups and prefix/suffix semantics.
  document.replace(pattern, (...args: unknown[]) => {
    const hasGroups = typeof args[args.length - 1] === 'object';
    const offset = args[args.length - (hasGroups ? 3 : 2)] as number;
    const match = args[0] as string;
    let expanded = replacement;
    if (options.regex) {
      const captures = args.slice(1, args.length - (hasGroups ? 3 : 2)) as (string | undefined)[];
      const groups = hasGroups ? args[args.length - 1] as Record<string, string> : undefined;
      expanded = replacement.replace(/\$(\$|&|`|'|<[^>]+>|\d{1,2})/g, (token, key: string) => {
        if (key === '$') return '$';
        if (key === '&') return match;
        if (key === '`') return document.slice(0, offset);
        if (key === "'") return document.slice(offset + match.length);
        if (key.startsWith('<')) return groups ? groups[key.slice(1, -1)] || '' : token;
        const index = Number(key);
        if (index > 0 && index <= captures.length) return captures[index - 1] || '';
        const first = Number(key[0]);
        if (key.length === 2 && first > 0 && first <= captures.length) return (captures[first - 1] || '') + key[1];
        return token;
      });
    }
    results.push({ from: offset, to: offset + match.length, replacement: expanded });
    return match;
  });
  return results;
}
