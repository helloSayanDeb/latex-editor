import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface SyncTexViewResult {
  page: number;
  x: number;
  y: number;
}

export interface SyncTexEditResult {
  file: string;
  line: number;
  column: number;
}

/**
 * Source -> PDF: find page & coordinates for a given line in a source file
 */
export function querySyncTexView(
  workDir: string,
  pdfFile: string,
  sourceFile: string,
  line: number
): SyncTexViewResult | null {
  try {
    const fullPdf = path.join(workDir, pdfFile);
    if (!fs.existsSync(fullPdf)) return null;

    const rootFile = path.join(workDir, 'source-root.json');
    const root = fs.existsSync(rootFile) ? JSON.parse(fs.readFileSync(rootFile, 'utf8')).root : workDir;
    const out = execFileSync('synctex', ['view', '-i', `${line}:1:${path.join(root, sourceFile)}`, '-o', pdfFile], { cwd: workDir, timeout: 5000, env: process.env }).toString();

    let page = 1;
    let x = 0;
    let y = 0;

    const pageMatch = out.match(/Page:(\d+)/i);
    if (!pageMatch) return null;
    if (pageMatch) page = parseInt(pageMatch[1], 10);

    const xMatch = out.match(/x:([\d.]+)/i);
    if (xMatch) x = parseFloat(xMatch[1]);

    const yMatch = out.match(/y:([\d.]+)/i);
    if (yMatch) y = parseFloat(yMatch[1]);

    return { page, x, y };
  } catch {
    return null;
  }
}

/**
 * PDF -> Source: find source file and line for clicked page and coordinates
 */
export function querySyncTexEdit(
  workDir: string,
  pdfFile: string,
  page: number,
  x: number,
  y: number
): SyncTexEditResult | null {
  try {
    const fullPdf = path.join(workDir, pdfFile);
    if (!fs.existsSync(fullPdf)) return null;

    const out = execFileSync('synctex', ['edit', '-o', `${page}:${x}:${y}:${pdfFile}`], { cwd: workDir, timeout: 5000, env: process.env }).toString();

    let line = 1;
    let column = 1;
    let file = 'main.tex';

    const lineMatch = out.match(/Line:(\d+)/i);
    if (!lineMatch) return null;
    if (lineMatch) line = parseInt(lineMatch[1], 10);

    const colMatch = out.match(/Column:(\d+)/i);
    if (colMatch) column = parseInt(colMatch[1], 10);

    const fileMatch = out.match(/Input:([^\r\n]+)/i);
    if (!fileMatch) return null;
    if (fileMatch) {
      const rootFile = path.join(workDir, 'source-root.json');
      if (!fs.existsSync(rootFile)) return null;
      const root = JSON.parse(fs.readFileSync(rootFile, 'utf8')).root;
      file = path.relative(root, fileMatch[1].trim()).replace(/\\/g, '/');
      if (file.startsWith('../') || path.isAbsolute(file)) return null;
    }

    return { file, line, column };
  } catch {
    return null;
  }
}
