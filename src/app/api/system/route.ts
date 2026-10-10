import { NextResponse } from 'next/server';
import { isToolAvailable, getToolVersion, configureTexEnv } from '@/lib/tex-env';
import os from 'os';

export async function GET() {
  configureTexEnv();

  const engineVersions = { pdflatex: getToolVersion('pdflatex'), xelatex: getToolVersion('xelatex'), lualatex: getToolVersion('lualatex') };
  const pdflatex = Boolean(engineVersions.pdflatex);
  const xelatex = Boolean(engineVersions.xelatex);
  const lualatex = Boolean(engineVersions.lualatex);
  const bibtex = isToolAvailable('bibtex');
  const biber = isToolAvailable('biber');
  const synctex = isToolAvailable('synctex');
  const git = isToolAvailable('git');

  return NextResponse.json({
    ok: true,
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
    },
    engineVersions,
  });
}
