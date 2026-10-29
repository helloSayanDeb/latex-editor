export type ProjectEntry = { key: string; file: string; line: number; detail: string };
export type ProjectIndex = { citations: ProjectEntry[]; labels: ProjectEntry[] };
import type { CompileDiagnostic } from './compile-diagnostics';

function lineLookup(source: string) {
  const starts = [0];
  for (const match of source.matchAll(/\n/g)) starts.push(match.index + 1);
  return (offset: number) => {
    let low = 0, high = starts.length;
    while (low + 1 < high) { const middle = (low + high) >>> 1; if (starts[middle] <= offset) low = middle; else high = middle; }
    return low + 1;
  };
}

/** Mask comments and literal/code environments without moving source positions. */
export function maskLatex(source: string): string {
  return source.replace(/\\begin\{(verbatim\*?|Verbatim|lstlisting|minted)\}[\s\S]*?(?:\\end\{\1\}|$)/g, text => text.replace(/[^\r\n]/g, ' '))
    .replace(/\\verb\*?([^A-Za-z\s])[^\r\n]*?(?:\1|(?=\r?\n)|$)/g, text => text.replace(/[^\r\n]/g, ' '))
    .replace(/(^|[^\\])(?:\\\\)*%[^\r\n]*/gm, text => {
      const percent = text.indexOf('%'); return text.slice(0, percent) + ' '.repeat(text.length - percent);
    });
}

function bibliography(source: string, file: string): ProjectEntry[] {
  source = source.replace(/^[ \t]*%[^\r\n]*/gm, text => ' '.repeat(text.length));
  const lineAt = lineLookup(source);
  const result: ProjectEntry[] = [];
  // Entries need balanced braces: a nested title must not become a new citation.
  let position = 0;
  while (position < source.length && result.length < 5000) {
    const match = /@([a-z]+)\s*([{(])/ig; match.lastIndex = position;
    const start = match.exec(source); if (!start) break;
    const open = start[2], close = open === '{' ? '}' : ')';
    let depth = 1, quote = false, braceDepth = 0, cursor = match.lastIndex;
    const bodyStart = cursor;
    for (; cursor < source.length; cursor++) {
      if (source[cursor] === '\\') { cursor++; continue; }
      const char = source[cursor];
      if (char === '"' && depth === 1) quote = !quote;
      if (open === '(' && !quote) {
        if (char === '{') braceDepth++;
        if (char === '}') braceDepth--;
        if (braceDepth > 0 || char === '}') continue;
      }
      if (!quote && char === open) depth++;
      if (!quote && char === close && --depth === 0) break;
    }
    if (depth !== 0) break;
    position = cursor + 1;
    if (/^(comment|string|preamble)$/i.test(start[1])) continue;
    const body = source.slice(bodyStart, cursor);
    const key = body.match(/^\s*([^\s,{}()]+)\s*,/)?.[1]; if (!key) continue;
    const fields: string[] = [];
    for (const name of ['author', 'year', 'title']) {
      const value = body.match(new RegExp(`\\b${name}\\s*=\\s*(?:\\{([^]*?)\\}\\s*(?:,|$)|"([^]*?)"|([0-9]+))`, 'i'));
      if (value) fields.push((value[1] || value[2] || value[3]).replace(/[{}]/g, '').replace(/\s+/g, ' ').slice(0, 180));
    }
    result.push({ key, file, line: lineAt(start.index), detail: fields.join(' · ') || start[1] });
  }
  return result;
}

export function referenceDiagnostics(files: Record<string, string>, index = buildProjectIndex(files)): CompileDiagnostic[] {
  const output: CompileDiagnostic[] = [];
  const citations = new Set(index.citations.map(entry => entry.key)), labels = new Set(index.labels.map(entry => entry.key));
  for (const [file, source] of Object.entries(files)) {
    if (!/\.tex$/i.test(file) || source.startsWith('data:')) continue;
    const code = maskLatex(source);
    const lineAt = lineLookup(code);
    for (const match of code.matchAll(/\\(cite[a-zA-Z]*|[a-zA-Z]*cite|nocite|ref|eqref|pageref|autoref|[cC]ref|[vV]ref|nameref)\*?(?:\[[^\]]*\]){0,2}\{([^{}]*)\}/g)) {
      const citation = /cite/i.test(match[1]);
      if ((citation ? index.citations : index.labels).length >= 5000) continue; // A capped index cannot establish absence.
      for (const key of match[2].split(',').map(value => value.trim())) {
        if (!key || key === '*' || /[\\#]/.test(key) || (citation ? citations : labels).has(key)) continue;
        output.push({ severity: 'warning', file, line: lineAt(match.index), message: `${citation ? 'Citation' : 'Label'} '${key}' not found in project files.` });
        if (output.length >= 100) return output;
      }
    }
  }
  return output;
}

export function buildProjectIndex(files: Record<string, string>): ProjectIndex {
  const citations: ProjectEntry[] = [], labels: ProjectEntry[] = [];
  for (const [file, source] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    if (source.startsWith('data:')) continue;
    if (/\.bib$/i.test(file) && citations.length < 5000) citations.push(...bibliography(source, file).slice(0, 5000 - citations.length));
    if (!/\.tex$/i.test(file)) continue;
    const code = maskLatex(source);
    const lineAt = lineLookup(code), sourceLines = source.split('\n');
    for (const match of code.matchAll(/\\label\s*\{([^{}]+)\}/g)) {
      const line = lineAt(match.index);
      labels.push({ key: match[1].trim(), file, line, detail: sourceLines[line - 1]?.trim().slice(0, 180) || '' });
      if (labels.length >= 5000) break;
    }
    for (const match of code.matchAll(/\\bibitem\s*(?:\[[^\]]*\])?\s*\{([^{}]+)\}/g)) {
      if (citations.length >= 5000) break;
      citations.push({ key: match[1], file, line: lineAt(match.index), detail: 'Inline bibliography entry' });
    }
  }
  return { citations: citations.slice(0, 5000), labels: labels.slice(0, 5000) };
}

export function referenceContext(prefix: string): { kind: 'citations' | 'labels'; fragment: string } | null {
  const masked = maskLatex(prefix);
  const match = masked.match(/\\(cite[a-zA-Z]*|[a-zA-Z]*cite|nocite|ref|eqref|pageref|autoref|[cC]ref|[vV]ref|nameref)\*?(?:\[[^\]]*\]){0,2}\{([^{}]*)$/);
  if (!match) return null;
  const fragment = match[2].split(',').at(-1)!.trimStart();
  return { kind: /cite/i.test(match[1]) ? 'citations' : 'labels', fragment };
}
