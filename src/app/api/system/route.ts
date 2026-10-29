import { NextRequest, NextResponse } from 'next/server';
import { inspectTool, configureCompilerEnvironment, resolveTool } from '@/lib/lemmata-environment';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { readRequestJSON } from '@/lib/request-limits';
import { POST as compileDocument } from '../compile/route';
import { WELCOME_LATEX_CONTENT } from '@/lib/welcome-document';
const settingsPath = () => path.join(process.env.LEMMATA_DATA_DIR || process.cwd(), 'lemmata-settings.json');

function settings() { try { return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')); } catch { return {}; } }
let pendingVersions: Promise<Awaited<ReturnType<typeof inspectTool>>[]> | null = null;

export async function GET() {
  configureCompilerEnvironment();

  // Share concurrent checks from the navbar and setup screen; do not block the server.
  const health = await (pendingVersions ||= Promise.all(['pdflatex', 'xelatex', 'lualatex', 'bibtex', 'biber', 'synctex', 'git', 'makeindex'].map(inspectTool)).finally(() => { pendingVersions = null; }));
  const versions = health.map(item => item.version);
  const engineVersions = { pdflatex: versions[0], xelatex: versions[1], lualatex: versions[2] };
  const pdflatex = Boolean(engineVersions.pdflatex);
  const xelatex = Boolean(engineVersions.xelatex);
  const lualatex = Boolean(engineVersions.lualatex);
  const bibtex = Boolean(versions[3]);
  const biber = Boolean(versions[4]);
  const synctex = Boolean(versions[5]);
  const git = Boolean(versions[6]);

  return NextResponse.json({
    ok: true,
    runId: process.env.LEMMATA_RUN_ID || 'direct-server',
    setupAcknowledged: process.env.LEMMATA_SETUP_ACKNOWLEDGED === '1',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: os.cpus().length,
    freeMem: Math.round(os.freemem() / (1024 * 1024)),
    totalMem: Math.round(os.totalmem() / (1024 * 1024)),
    engines: {
      pdflatex,
      xelatex,
      lualatex,
    },
    tools: {
      bibtex,
      biber,
      synctex,
      git,
      makeindex: Boolean(versions[7]),
    },
    engineVersions,
    engineProblems: Object.fromEntries(['pdflatex', 'xelatex', 'lualatex'].map((engine, index) => [engine, health[index].problem])),
    enginePaths: Object.fromEntries(['pdflatex', 'xelatex', 'lualatex'].map(engine => [engine, resolveTool(engine)])),
    settings: settings(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await readRequestJSON(req);
    if (body.action === 'acknowledge') {
      if (body.runId !== (process.env.LEMMATA_RUN_ID || 'direct-server')) throw new Error('Server restarted. Reload the page.');
      process.env.LEMMATA_SETUP_ACKNOWLEDGED = '1';
      return NextResponse.json({ ok: true });
    }
    if (body.action === 'configure') {
      const next = settings();
      if (body.binDirectory !== undefined) {
        if (typeof body.binDirectory !== 'string' || (body.binDirectory && (!path.isAbsolute(body.binDirectory) || !fs.statSync(body.binDirectory).isDirectory()))) throw new Error('Enter an existing absolute TeX bin directory.');
        next.binDirectory = body.binDirectory;
      }
      if (body.defaultEngine !== undefined) {
        if (!['pdflatex', 'xelatex', 'lualatex'].includes(body.defaultEngine)) throw new Error('Unsupported engine.');
        next.defaultEngine = body.defaultEngine;
      }
      fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
      fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2));
      return NextResponse.json({ ok: true });
    }
    if (body.action !== 'verify' || !['pdflatex', 'xelatex', 'lualatex'].includes(body.engine)) throw new Error('Choose a supported engine to verify.');
    const source = body.probe === 'welcome' ? WELCOME_LATEX_CONTENT : '\\documentclass{article}\n\\begin{document}Lemmata engine verification.\\end{document}';
    const response = await compileDocument(new NextRequest('http://localhost/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine: body.engine, synctex: false, files: { 'main.tex': source } }) }));
    if (!response.ok) return NextResponse.json({ ok: false, ...(await response.json()) }, { status: response.status });
    await response.body?.cancel();
    return NextResponse.json({ ok: true, engine: body.engine, compiler: response.headers.get('X-Compile-Compiler'), probe: body.probe === 'welcome' ? 'welcome' : 'minimal' });
  } catch (error) { return NextResponse.json({ ok: false, error: (error as Error).message }, { status: 400 }); }
}
