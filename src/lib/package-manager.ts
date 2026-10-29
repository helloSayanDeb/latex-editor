import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
import { resolveTool } from './lemmata-environment';
import { compilerEnvironment } from './compile-policy';
import { PACKAGE_FILE, PACKAGE_ID, miktexFilePackages, texliveFilePackages } from './package-catalog';
const execute = promisify(execFile);
type Manager = { kind: 'MiKTeX' | 'TeX Live'; enginePath: string; file: string; prefix: string[] };
type Ticket = { manager: Manager; engine: string; packages: string[]; expires: number };
const tickets = new Map<string, Ticket>();
function cleanTickets() { for (const [id, ticket] of tickets) if (ticket.expires < Date.now()) tickets.delete(id); }
export async function selectedManager(engine: string): Promise<Manager> {
  if (!['pdflatex','xelatex','lualatex'].includes(engine)) throw new Error('Choose a supported engine.');
  const enginePath = resolveTool(engine); if (!enginePath) throw new Error('Selected compiler was not found. Open Lemmata setup.');
  const env = compilerEnvironment(process.env, os.tmpdir());
  const { stdout, stderr } = await execute(enginePath, ['--version'], { env, windowsHide:true, timeout:8000, maxBuffer:256*1024 });
  const bin = path.dirname(enginePath);
  if (/MiKTeX/i.test(stdout + stderr)) {
    const file = path.join(bin, 'miktex' + (process.platform === 'win32' ? '.exe' : ''));
    if (fs.existsSync(file)) return { kind:'MiKTeX', enginePath, file, prefix:['--disable-installer', 'packages'] };
    throw new Error('MiKTeX package manager is missing beside the selected compiler. Repair it using MiKTeX Console.');
  }
  if (!/TeX Live/i.test(stdout + stderr)) throw new Error('This compiler distribution has no supported package manager. Install the named package using its vendor tools.');
  if (process.platform === 'win32') {
    const root = path.resolve(bin, '../..'), file = path.join(root, 'tlpkg','tlperl','bin','perl.exe'), script = path.join(root,'texmf-dist','scripts','texlive','tlmgr.pl');
    if (fs.existsSync(file) && fs.existsSync(script)) return { kind:'TeX Live', enginePath, file, prefix:[script] };
  } else {
    const file = path.join(bin,'tlmgr'); if (fs.existsSync(file)) return { kind:'TeX Live', enginePath, file, prefix:[] };
  }
  throw new Error('tlmgr was not found in the selected distribution. Use TeX Live Utility or your operating system package manager.');
}
async function run(manager: Manager, args: string[], install = false): Promise<string> {
  try {
    const { stdout } = await execute(manager.file, [...manager.prefix, ...args], { env: compilerEnvironment(process.env, os.tmpdir()), cwd:os.tmpdir(), windowsHide:true, timeout:install?480000:90000, maxBuffer:32*1024*1024 });
    return stdout;
  } catch (error) {
    const detail=error as Error & {stderr?:string;stdout?:string;killed?:boolean};
    const log=(detail.stderr || detail.stdout || detail.message).slice(-5000);
    const tip=/permission|not writable|administrator|access.{0,20}denied|privilege/i.test(log)?'This distribution requires administrator permissions. Install the listed packages in MiKTeX Console or TeX Live Utility; Lemmata does not elevate itself.':/older than|cross.release|Local TeX Live|remote repository/i.test(log)?'The installed TeX Live release may not match its repository. Repair the repository or upgrade using TeX Live tools.':detail.killed?'Package manager timed out. Check connectivity and its console before retrying.':'Check your connection, repository and distribution package database, then retry.';
    throw new Error(tip+'\n\n'+log);
  }
}
export async function lookupPackages(engine: string, input: unknown, refresh = false) {
  if (!Array.isArray(input) || input.length < 1 || input.length > 8 || input.some(file => typeof file !== 'string' || !PACKAGE_FILE.test(file))) throw new Error('Choose valid missing package filenames.');
  const files = [...new Set(input as string[])], manager = await selectedManager(engine);
  if (refresh) {
    if (manager.kind !== 'MiKTeX') throw new Error('Database refresh is offered for MiKTeX only. TeX Live searches the configured online repository.');
    await run(manager, ['update-package-database']);
  }
  let matches: Record<string,string[]>;
  if (manager.kind === 'MiKTeX') matches = miktexFilePackages(await run(manager, ['list','--template','{id}|{runFiles}\n']), files);
  else {
    matches = {};
    for (const file of files) {
      const escaped = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      matches[file] = texliveFilePackages(await run(manager, ['search','--global','--file',`/${escaped}$`]), file);
    }
  }
  const packages = [...new Set(Object.values(matches).flat())];
  cleanTickets(); if (tickets.size >= 32) tickets.delete(tickets.keys().next().value!);
  const token = crypto.randomUUID(); tickets.set(token, { manager, engine, packages, expires:Date.now()+10*60*1000 });
  return { token, distribution:manager.kind, matches, packages, note:manager.kind==='MiKTeX'?'Using the local MiKTeX package catalog. Refresh it if a package is not found.':'Using the configured TeX Live repository (TinyTeX, BasicTeX and MacTeX use tlmgr).', command:manager.kind==='MiKTeX'?'miktex packages install':'tlmgr install' };
}
export async function installPackages(token: unknown, input: unknown) {
  cleanTickets(); const ticket=typeof token==='string'?tickets.get(token):undefined;
  if (!ticket) throw new Error('Package lookup expired or server restarted. Find the packages again.');
  if (!Array.isArray(input) || input.length < 1 || input.length > 16 || input.some(id=>typeof id!=='string'||!PACKAGE_ID.test(id)||!ticket.packages.includes(id))) throw new Error('Install only packages from the approved lookup.');
  const manager=await selectedManager(ticket.engine);
  if (manager.enginePath!==ticket.manager.enginePath || manager.file!==ticket.manager.file) throw new Error('Compiler installation changed. Find packages again.');
  tickets.delete(token as string);
  const packages=[...new Set(input as string[])];
  await run(manager, ['install', ...packages], true);
  return { installed:packages, distribution:manager.kind };
}
