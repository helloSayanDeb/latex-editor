import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { sanitizeProjectId, sanitizePath } from '@/lib/security';

const execAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId = 'default', message, file } = body;
    const cleanId = sanitizeProjectId(projectId);
    const projDir = path.join(process.cwd(), 'projects', cleanId);

    if (!fs.existsSync(projDir)) {
      return NextResponse.json({ ok: false, error: 'Project directory not found' }, { status: 404 });
    }

    const runGit = async (args: string[]) => {
      return execAsync('git', args, { cwd: projDir, timeout: 15000, env: process.env, windowsHide: true });
    };

    if (action === 'init') {
      await runGit(['init']);
      return NextResponse.json({ ok: true, message: 'Initialized empty Git repository' });
    }

    // Check if .git exists
    if (!fs.existsSync(path.join(projDir, '.git'))) {
      return NextResponse.json({ ok: false, isRepo: false, message: 'Git not initialized in this project' });
    }

    if (action === 'status') {
      let branch = 'main';
      try {
        const { stdout } = await runGit(['branch','--show-current']);
        branch = stdout.trim() || 'HEAD';
      } catch {}

      const { stdout: statusOut } = await runGit(['status','--porcelain','--','.',':(exclude).snapshots',':(exclude).synctex_cache']);
      const files = statusOut
        .split('\n')
                .filter(Boolean)
        .map(l => {
          const status = l.slice(0, 2).trim();
          const name = l.slice(3).trim();
          return { status, name };
        });

      return NextResponse.json({ ok: true, isRepo: true, branch, files });
    } else if (action === 'commit') {
      const commitMsg = typeof message === 'string' ? message.trim() : '';
      if (!commitMsg) throw new Error('A commit message is required.');
      await runGit(['add','--all','--','.',':(exclude).snapshots',':(exclude).synctex_cache']);
      const { stdout } = await runGit(['commit','-m',commitMsg]);
      return NextResponse.json({ ok: true, message: stdout.trim() });
    } else if (action === 'log') {
      const { stdout } = await runGit(['log','-n','15','--pretty=format:%h|%an|%ar|%s']);
      const commits = stdout
        .split('\n')
        .filter(Boolean)
        .map(line => {
          const [hash, author, date, msg] = line.split('|');
          return { hash, author, date, msg };
        });
      return NextResponse.json({ ok: true, commits });
    } else if (action === 'diff') {
      const { stdout } = await runGit(['diff','--', ...(file ? [sanitizePath(file)] : [])]);
      return NextResponse.json({ ok: true, diff: stdout });
    }

    return NextResponse.json({ ok: false, error: 'Unknown git action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
