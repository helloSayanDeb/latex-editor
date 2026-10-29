import path from 'path';
import fs from 'fs';
import { execFileSync, execFile } from 'child_process';
import { promisify } from 'util';
import { compilerFailure } from './compiler-failure';
const execute = promisify(execFile);
let managedPaths = new Set<string>();


export function configureCompilerEnvironment(): void {
  let savedBin: string | undefined;
  try { savedBin = JSON.parse(fs.readFileSync(path.join(process.env.LEMMATA_DATA_DIR || process.cwd(), 'lemmata-settings.json'), 'utf8')).binDirectory; } catch { /* No custom installation yet. */ }

  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
  const userMiktex = localAppData ? path.join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64') : null;

  const commonTexPaths = [
    savedBin,
    path.join(localAppData, 'Lemmata', 'TeXLive', 'bin', 'windows'),
    path.join(process.env.APPDATA || '', 'TinyTeX', 'bin', 'windows'),
    process.env.HOME && path.join(process.env.HOME, 'Library', 'TinyTeX', 'bin', 'universal-darwin'),
    process.env.HOME && path.join(process.env.HOME, '.TinyTeX', 'bin', process.arch === 'arm64' ? 'aarch64-linux' : 'x86_64-linux'),
    process.env.LEMMATA_TEX_BIN,
    process.env.USERPROFILE && path.join(process.env.USERPROFILE, 'AppData', 'Local', 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64'),
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

  if (process.platform === 'win32') {
    try { for (const year of fs.readdirSync('C:\\texlive').filter(name => /^\d{4}$/.test(name)).sort().reverse()) commonTexPaths.push(path.join('C:\\texlive', year, 'bin', 'windows')); } catch { /* TeX Live is optional. */ }
  }

  const directories = commonTexPaths.filter(p => typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p));
  const inherited = (process.env.PATH || '').split(path.delimiter).filter(p => !managedPaths.has(p));
  managedPaths = new Set(directories.filter(p => !inherited.includes(p)));
  process.env.PATH = [...new Set([...directories, ...inherited])].join(path.delimiter);

}

export function resolveTool(cmd: string): string | null {
  if (!/^(pdflatex|xelatex|lualatex|bibtex|biber|makeindex|synctex|kpsewhich|git)$/.test(cmd)) throw new Error('Unsupported TeX tool.');
  configureCompilerEnvironment();
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!path.isAbsolute(dir)) continue;
    const candidate = path.join(dir, cmd + (process.platform === 'win32' ? '.exe' : ''));
    try { fs.accessSync(candidate, process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK); if (fs.statSync(candidate).isFile()) return candidate; } catch { /* Try next directory. */ }
  }
  return null;
}

export function isToolAvailable(cmd: string): boolean {
  return getToolVersion(cmd) !== null;
}

// Never silently mix auxiliary tools from a different installed distribution.
export function resolveCompanionTool(enginePath: string, tool: string): string | null {
  if (!/^(bibtex|biber|makeindex|synctex|kpsewhich)$/.test(tool)) throw new Error('Unsupported companion tool.');
  const candidate = path.join(path.dirname(enginePath), tool + (process.platform === 'win32' ? '.exe' : ''));
  try {
    fs.accessSync(candidate, process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK);
    return fs.statSync(candidate).isFile() ? candidate : null;
  } catch { return null; }
}

export async function getToolVersionAsync(cmd: string): Promise<string | null> {
  return (await inspectTool(cmd)).version;
}

export async function inspectTool(cmd: string): Promise<{ executable: string | null; version: string | null; problem: string | null }> {
  const executable = resolveTool(cmd);
  if (!executable) return { executable, version: null, problem: 'No executable found. Install a distribution or select its bin directory.' };
  try {
    const { stdout } = await execute(executable, ['--version'], { encoding: 'utf8', env: process.env, timeout: 5000, maxBuffer: 256 * 1024, windowsHide: true });
    const version = stdout.split(/\r?\n/).find(line => line.trim())?.trim() || null;
    return { executable, version, problem: version ? null : 'Executable returned no version information. Verify or repair this installation.' };
  } catch (error) { return { executable, version: null, problem: compilerFailure(error, cmd + ' startup check', executable) }; }
}

export function getToolVersion(cmd: string): string | null {
  configureCompilerEnvironment();
  try {
    const executable = resolveTool(cmd);
    if (!executable) return null;
    const out = execFileSync(executable, ['--version'], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'], env: process.env, timeout: 5000, windowsHide: true });
    return out.split(/\r?\n/).find(line => line.trim())?.trim() || null;
  } catch {
    return null;
  }
}
