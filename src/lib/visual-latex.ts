export type Region = { from: number; to: number; text: string; environment: string };
import { maskLatex } from './project-index';
import { escapeLatexText } from './latex-text';
export function environmentAt(source: string, cursor: number, names: string[]): Region | null {
  const stack: { name: string; from: number }[] = [], found: Region[] = [];
  // Ignore commented commands while retaining offsets.
  const masked = maskLatex(source);
  for (const match of masked.matchAll(/\\(begin|end)\{([a-zA-Z*]+)\}/g)) {
    if (match[1] === 'begin') stack.push({ name: match[2], from: match.index! });
    else {
      const start = stack.pop(); if (!start || start.name !== match[2]) continue;
      const to = match.index! + match[0].length;
      if (names.includes(start.name) && cursor >= start.from && cursor <= to) found.push({ from: start.from, to, text: source.slice(start.from, to), environment: start.name });
    }
  }
  return found.sort((a,b) => a.to - a.from - (b.to - b.from))[0] || null;
}
export function splitCells(source: string): string[][] {
  const rows: string[][] = [[]]; let cell = '', depth = 0;
  const flush = () => { rows.at(-1)!.push(cell.trim()); cell = ''; };
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\\' && source[i+1] === '\\' && depth === 0) { flush(); rows.push([]); i++; continue; }
    if (c === '\\' && source[i+1]) { cell += c + source[++i]; continue; }
    if (c === '{') depth++; if (c === '}') depth--;
    if (depth < 0) throw new Error('Unbalanced braces. Edit this structure in source.');
    if (c === '&' && depth === 0) flush(); else cell += c;
  }
  if (depth) throw new Error('Unbalanced braces. Edit this structure in source.');
  flush();
  return rows.filter(row => row.some(value => value.trim()));
}
export function parseTabular(text: string) {
  const match = text.match(/^\\begin\{tabular\}\{([lcr| ]+)\}([\s\S]*?)\\end\{tabular\}$/);
  if (!match || /\\(?:multicolumn|multirow|input|include)|\\\\\s*\[|(?<!\\)%/.test(text)) throw new Error('This table uses advanced layout. The visual editor supports simple l/c/r tabular cells; use source for this table.');
  const body = match[2].replace(/\\(?:toprule|midrule|bottomrule|hline)\b/g, '');
  const alignments = [...match[1].replace(/[| ]/g, '')]; const cells = splitCells(body);
  if (!cells.length || cells.length > 30 || alignments.length > 12 || cells.some(row => row.length !== alignments.length)) throw new Error('Unsupported or inconsistent table cells. Source was preserved.');
  return { cells, columns: match[1], booktabs: /\\toprule/.test(text) };
}
export function tableLatex(cells: string[][], columns: string, booktabs: boolean) {
  if (!/^[lcr| ]+$/.test(columns) || !cells.length || cells.some(row => row.length !== columns.replace(/[| ]/g, '').length)) throw new Error('Choose one l/c/r alignment for each column.');
  const rows = cells.map(row => row.join(' & ') + ' \\\\');
  if (booktabs) { rows.unshift('\\toprule'); rows.splice(2, 0, '\\midrule'); rows.push('\\bottomrule'); }
  return '\\begin{tabular}{' + columns + '}\n' + rows.join('\n') + '\n\\end{tabular}';
}
export function matrixLatex(cells: string[][], environment: string) {
  if (!['pmatrix','bmatrix','Bmatrix','vmatrix','Vmatrix','matrix'].includes(environment)) throw new Error('Unsupported matrix type.');
  if (!cells.length || cells.length > 12 || !cells[0].length || cells[0].length > 12 || cells.some(row => row.length !== cells[0].length)) throw new Error('Matrices need a rectangular grid of at most 12 × 12 cells.');
  return '\\begin{' + environment + '}\n' + cells.map(row => row.join(' & ')).join(' \\\\\n') + '\n\\end{' + environment + '}';
}
export type FigureOptions = { path: string; width: number; caption: string; label: string; placement: string; unit?: 'textwidth'; natural?: boolean; centered?: false };
export function parseFigure(text: string): FigureOptions {
  const graphic = text.match(/\\includegraphics(?:\[width=([\d.]+)\\(textwidth|linewidth)\])?\{([^{}]+)\}/);
  if (!graphic || (text.match(/\\includegraphics/g)||[]).length !== 1 || /\\(?:begin\{(?:subfigure|tikzpicture)|input|include\b|caption\[)/.test(text)) throw new Error('The visual editor supports one includegraphics figure. Complex figures remain in source.');
  const caption = (text.match(/\\caption\{([^{}]*)\}/)?.[1] || '').replace(/\\([&%_$#])/g, '$1');
  const label = text.match(/\\label\{([^{}]*)\}/)?.[1] || '';
  // Do not silently discard unknown figure commands or nested captions.
  const remaining = text.replace(/\\begin\{figure\}(?:\[[^\]]*\])?|\\end\{figure\}|\\centering|\\includegraphics(?:\[[^\]]*\])?\{[^{}]*\}|\\caption\{[^{}]*\}|\\label\{[^{}]*\}/g, '').trim();
  if (remaining || (graphic[0].includes('[') && !graphic[1])) throw new Error('This figure has custom options or nested content. Edit it in source to preserve them.');
  return { path: graphic[3], width: Math.round(Number(graphic[1] || 1) * 100), caption, label, placement: text.match(/\\begin\{figure\}\[([htbp!]+)\]/)?.[1] || '', ...(graphic[2] === 'textwidth' ? { unit: 'textwidth' as const } : {}), ...(!graphic[1] ? { natural: true } : {}), ...(!/\\centering\b/.test(text) ? { centered: false as const } : {}) };
}
export function figureLatex(figure: FigureOptions) {
  if (!/^[\p{L}\p{N}_ ./()-]+$/u.test(figure.path) || figure.path.split('/').some(part => part === '..') || /[{}\\]/.test(figure.caption) || !/^[\w:.-]*$/.test(figure.label) || !/^[htbp!]*$/.test(figure.placement) || !Number.isFinite(figure.width) || figure.width < 10 || figure.width > 100) throw new Error('Use a project image path, plain caption, valid label and width from 10–100%.');
  return `\\begin{figure}${figure.placement ? '[' + figure.placement + ']' : ''}\n${figure.centered === false ? '' : '  \\centering\n'}  \\includegraphics${figure.natural ? '' : '[width=' + figure.width / 100 + '\\' + (figure.unit || 'linewidth') + ']'}{${figure.path}}\n${figure.caption ? '  \\caption{' + escapeLatexText(figure.caption) + '}\n' : ''}${figure.label ? '  \\label{' + figure.label + '}\n' : ''}\\end{figure}`;
}
