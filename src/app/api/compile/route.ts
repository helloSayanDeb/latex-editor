import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { configureTexEnv } from '@/lib/tex-env';
import { sanitizePath, sanitizeProjectId, validateFilename } from '@/lib/security';
import { logAuditEvent } from '@/lib/audit-logger';
const execute = promisify(execFile);

export async function POST(req: NextRequest) {
  configureTexEnv();
  const start = Date.now();
  let tmpDir = '';
  let projectId = 'default';
  let engine = 'pdflatex';
  try {
    const body = req.headers.get('content-type')?.includes('application/json') ? await req.json() : { files: { 'main.tex': await req.text() } };
    const files = body.files as Record<string,string>;
    const mainFile = sanitizePath(body.mainFile || 'main.tex');
    projectId = sanitizeProjectId(body.projectId || 'default');
    engine = body.engine || 'pdflatex';
    if (!['pdflatex','xelatex','lualatex'].includes(engine)) throw new Error('Unsupported compiler.');
    if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Project files are required.');
    for (const [name, content] of Object.entries(files)) {
      if (!validateFilename(name) || typeof content !== 'string') throw new Error('Invalid file: ' + name);
    }
    if (!mainFile.endsWith('.tex') || !files[mainFile]?.trim()) throw new Error('The main .tex file is missing or empty.');
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-'));
    for (const [name, content] of Object.entries(files)) {
      const target = path.join(tmpDir, sanitizePath(name));
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content.startsWith('data:') && content.includes(';base64,') ? Buffer.from(content.split(';base64,')[1], 'base64') : content);
    }
    const baseName = path.parse(mainFile).name;
    // No shell interpolation. TeX file IO restrictions complement disabled shell escape.
    const env = { ...process.env, openin_any: 'p', openout_any: 'p' };
    const run = (tool:string, args:string[]) => execute(tool,args,{cwd:tmpDir,timeout:90000,maxBuffer:8*1024*1024,env,windowsHide:true});
    const compile = () => run(engine,['-no-shell-escape','-interaction=nonstopmode','-halt-on-error',...(body.synctex === false ? [] : ['-synctex=1']), './' + mainFile]);
    try {
      await compile();
      const auxPath = path.join(tmpDir, baseName + '.aux');
      const aux = fs.existsSync(auxPath) ? fs.readFileSync(auxPath,'utf8') : '';
      if (fs.existsSync(path.join(tmpDir, baseName + '.bcf'))) {
        await run('biber',[baseName]);
        await compile();
      } else if (/\\bibdata\{/.test(aux)) {
        await run('bibtex',[baseName]);
        await compile();
      }
      await compile(); // Resolve cross-references even without a bibliography.
    } catch (err) {
      const logPath = path.join(tmpDir,baseName+'.log');
      const detail = err as Error & {stdout?:string;stderr?:string};
      const log = [detail.message,detail.stderr,fs.existsSync(logPath)?fs.readFileSync(logPath,'utf8'):detail.stdout].filter(Boolean).join('\n');
      logAuditEvent({action:'compile',project:projectId,engine,success:false,durationMs:Date.now()-start});
      return NextResponse.json({success:false,log,durationMs:Date.now()-start},{status:400});
    }
    const pdfPath = path.join(tmpDir,baseName+'.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('Compiler finished without a PDF.');
    const pdf = fs.readFileSync(pdfPath);
    const compilerBanner = fs.readFileSync(path.join(tmpDir,baseName+'.log'),'utf8').split(/\r?\n/)[0].replace(/[^\x20-\x7e]/g,'').slice(0,240);
    const synctex = path.join(tmpDir,baseName+'.synctex.gz');
    if (fs.existsSync(synctex) && fs.existsSync(path.join(process.cwd(),'projects',projectId,'project.json'))) {
      const cache = path.join(process.cwd(),'projects',projectId,'.synctex_cache');
      fs.mkdirSync(cache,{recursive:true});
      fs.copyFileSync(pdfPath,path.join(cache,baseName+'.pdf'));
      fs.copyFileSync(synctex,path.join(cache,baseName+'.synctex.gz'));
      fs.writeFileSync(path.join(cache,'source-root.json'),JSON.stringify({root:tmpDir}));
    }
    logAuditEvent({action:'compile',project:projectId,engine,success:true,durationMs:Date.now()-start});
    return new NextResponse(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${baseName}.pdf"`,'X-Compile-Time-Ms':String(Date.now()-start),'X-Compile-Engine':engine,'X-Compile-Compiler':compilerBanner}});
  } catch (err) {
    return NextResponse.json({success:false,log:(err as Error).message},{status:400});
  } finally {
    if (tmpDir) {
      const resolved = path.resolve(tmpDir);
      if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('latex-')) {
        try { fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3}); } catch { /* OS may still hold a compiler handle. */ }
      }
    }
  }
}
