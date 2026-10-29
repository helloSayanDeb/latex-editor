import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { configureCompilerEnvironment, resolveTool } from './lemmata-environment';

export interface SyncTexEditResult {
  file: string;
  line: number;
  column: number;
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
  configureCompilerEnvironment();
  try {
    const fullPdf = path.join(workDir, pdfFile);
    if (!fs.existsSync(fullPdf)) return null;

    const executable = resolveTool('synctex'); if (!executable) return null;
    const out = execFileSync(executable, ['edit', '-o', `${page}:${x}:${y}:${pdfFile}`], { cwd: workDir, timeout: 5000, windowsHide: true, env: process.env }).toString();

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
