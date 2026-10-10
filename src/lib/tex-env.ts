import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

let isEnvConfigured = false;

export function configureTexEnv(): void {
  if (isEnvConfigured) return;

  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
  const userMiktex = localAppData ? path.join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64') : null;

  const commonTexPaths = [
    userMiktex,
    'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64',
    'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin',
    'C:\\texlive\\2026\\bin\\windows',
    'C:\\texlive\\2025\\bin\\windows',
    'C:\\texlive\\2024\\bin\\windows',
    '/Library/TeX/texbin',
    '/usr/local/bin',
    '/usr/bin',
  ].filter(Boolean) as string[];

  for (const p of commonTexPaths) {
    if (fs.existsSync(p) && !process.env.PATH?.includes(p)) {
      process.env.PATH = `${p}${path.delimiter}${process.env.PATH || ''}`;
    }
  }

  isEnvConfigured = true;
}

export function isToolAvailable(cmd: string): boolean {
  return getToolVersion(cmd) !== null;
}

export function getToolVersion(cmd: string): string | null {
  configureTexEnv();
  try {
    const out = execFileSync(cmd, ['--version'], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], env: process.env, timeout: 5000, windowsHide: true });
    return out.split(/\r?\n/).find(line => line.trim())?.trim() || null;
  } catch {
    return null;
  }
}
