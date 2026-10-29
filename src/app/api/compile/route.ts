import { buildRecipe, runBuildRecipe } from '@/lib/build-settings';
import { PROJECTS_DIR } from '@/lib/data-path';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { runCompiler } from '@/lib/compiler-process';
import { configureCompilerEnvironment, resolveTool, resolveCompanionTool, getToolVersionAsync } from '@/lib/lemmata-environment';
import { compilerFailure } from '@/lib/compiler-failure';
import { resolveCompileDirectives } from '@/lib/compile-directives';
import { sanitizePath, sanitizeProjectId, validateFilename } from '@/lib/security';
import { logAuditEvent } from '@/lib/audit-logger';
import { readRequestJSON, readRequestText, acquireJob } from '@/lib/request-limits';
import { compilerEnvironment, validateCompileFiles } from '@/lib/compile-policy';
import { parseCompileLog, explainCompileFailure } from '@/lib/compile-diagnostics';
import { missingPackageFiles } from '@/lib/package-catalog';

export async function POST(req: NextRequest) {
  const release = acquireJob('compile', 1);
  if (!release) return NextResponse.json({ success: false, log: 'Another compilation is running. Try again when it finishes.' }, { status: 429, headers: { 'Retry-After': '3' } });
  configureCompilerEnvironment();
  const start = Date.now();
  let tmpDir = '';
  let projectId = 'default';
  let engine = 'pdflatex';
  try {
    const body = req.headers.get('content-type')?.includes('application/json') ? await readRequestJSON(req) : { files: { 'main.tex': await readRequestText(req) } };
    const recipe = buildRecipe(body.recipe);
    const files = body.files as Record<string,string>;
    let mainFile = sanitizePath(body.mainFile || 'main.tex');
    projectId = sanitizeProjectId(body.projectId || 'default');
    engine = body.engine || 'pdflatex';
    if (!['pdflatex','xelatex','lualatex'].includes(engine)) throw new Error('Unsupported compiler.');
    const enginePath = resolveTool(engine);
    if (!enginePath) throw new Error(`${engine} is not installed or could not be found. Open Tools → Lemmata setup, install a distribution or choose its bin directory, then Check again.`);
    if (!files || typeof files !== 'object' || Array.isArray(files)) throw new Error('Project files are required.');
    validateCompileFiles(files);
    mainFile = resolveCompileDirectives(files, mainFile, engine);
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
    const env = compilerEnvironment(process.env, tmpDir);
    const sourceDirectory = path.dirname(path.join(tmpDir, mainFile));
    env.TEXINPUTS = `${sourceDirectory}${path.delimiter}${tmpDir}//${path.delimiter}`;
    env.BIBINPUTS = `${tmpDir}//${path.delimiter}`;
    env.BSTINPUTS = `${tmpDir}//${path.delimiter}`;
    const deadline = Date.now() + 120000;
    let failedStage = engine;
    let failedExecutable = enginePath;
    const run = (tool:string, args:string[]) => {
      failedStage = tool;
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('Compilation exceeded the two-minute job limit.');
      const executable = tool === engine ? enginePath : resolveCompanionTool(enginePath, tool);
      failedExecutable = executable || path.join(path.dirname(enginePath), tool);
      if (!executable) throw new Error(`${tool} is unavailable. Open Lemmata setup to check your distribution.`);
      return runCompiler(executable,args,{cwd:tool === engine ? sourceDirectory : tmpDir,timeout:Math.min(90000, remaining),env,signal:req.signal});
    };
    // Handle package consent in Lemmata instead of an invisible vendor prompt.
    const miktex = /MiKTeX/i.test(await getToolVersionAsync(engine) || '');
    const compile = () => run(engine,[...(miktex ? ['--disable-installer'] : []),'-no-shell-escape','-file-line-error','-interaction=nonstopmode','-halt-on-error','-output-directory=' + tmpDir,...(body.synctex === false ? [] : ['-synctex=1']), './' + path.basename(mainFile)]);
    let passes = 0;
    const buildLog = () => { const file = path.join(tmpDir,baseName+'.log'); return fs.existsSync(file) ? fs.readFileSync(file,'utf8') : ''; };
    try {
      passes = await runBuildRecipe(recipe, compile, async () => {
        const auxPath = path.join(tmpDir, baseName + '.aux');
        const aux = fs.existsSync(auxPath) ? fs.readFileSync(auxPath,'utf8') : '';
        if (fs.existsSync(path.join(tmpDir, baseName + '.bcf'))) { await run('biber',[baseName]); return true; }
        if (/\\bibdata\{/.test(aux)) { await run('bibtex',[baseName]); return true; }
        return false;
      }, buildLog, async () => {
        const indexPath = path.join(tmpDir, baseName + '.idx');
        if (!fs.existsSync(indexPath) || !fs.readFileSync(indexPath, 'utf8').trim()) return false;
        await run('makeindex', [baseName + '.idx']);
        return true;
      });
    } catch (err) {
      const logPath = path.join(tmpDir,baseName+'.log');
      const detail = err as Error & {stdout?:string;stderr?:string};
      let log = [compilerFailure(err, failedStage, failedExecutable), detail.message, detail.stderr, detail.stdout, fs.existsSync(logPath)?fs.readFileSync(logPath,'utf8'):''].filter(Boolean).join('\n');
      log = explainCompileFailure(log);
      if ((err as { killed?: boolean; code?: string }).killed && (err as { code?: string }).code !== 'CANCELLED') log = 'The compiler exceeded its execution or output limit. First-time package downloads or format initialization may still be needed. Complete setup in the TeX distribution manager, then retry.\n\n' + log;
      logAuditEvent({action:'compile',project:projectId,engine,success:false,durationMs:Date.now()-start});
      return NextResponse.json({success:false,log,missingPackages:missingPackageFiles(log),diagnostics:parseCompileLog(log,Object.keys(files),mainFile,tmpDir),durationMs:Date.now()-start},{status:400});
    }
    const pdfPath = path.join(tmpDir,baseName+'.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('Compiler finished without a PDF.');
    const pdf = fs.readFileSync(pdfPath);
    const completeLog = fs.readFileSync(path.join(tmpDir,baseName+'.log'),'utf8');
    const warnings = parseCompileLog(completeLog,Object.keys(files),mainFile,tmpDir).filter(item => item.severity === 'warning');
    // Metadata is bounded; the PDF remains a binary response.
    const summary = warnings.slice(0, 12).map(item => ({ ...item, message: item.message.slice(0, 240) }));
    while (Buffer.byteLength(JSON.stringify(summary)) > 3500) summary.pop();
    const encodedDiagnostics = Buffer.from(JSON.stringify(summary)).toString('base64');
    const compilerBanner = fs.readFileSync(path.join(tmpDir,baseName+'.log'),'utf8').split(/\r?\n/)[0].replace(/[^\x20-\x7e]/g,'').slice(0,240);
    const synctex = path.join(tmpDir,baseName+'.synctex.gz');
    if (fs.existsSync(synctex) && fs.existsSync(path.join(PROJECTS_DIR,projectId,'project.json'))) {
      const cache = path.join(PROJECTS_DIR,projectId,'.synctex_cache');
      fs.mkdirSync(cache,{recursive:true});
      fs.copyFileSync(pdfPath,path.join(cache,baseName+'.pdf'));
      fs.copyFileSync(synctex,path.join(cache,baseName+'.synctex.gz'));
      fs.writeFileSync(path.join(cache,'source-root.json'),JSON.stringify({root:tmpDir}));
    }
    logAuditEvent({action:'compile',project:projectId,engine,success:true,durationMs:Date.now()-start});
    return new NextResponse(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename="${baseName}.pdf"`,'X-Compile-Time-Ms':String(Date.now()-start),'X-Compile-Engine':engine,'X-Compile-Main':encodeURIComponent(mainFile),'X-Build-Recipe':recipe,'X-Build-Passes':String(passes),'X-Compile-Compiler':compilerBanner,'X-Compile-Diagnostics':encodedDiagnostics}});
  } catch (err) {
    return NextResponse.json({success:false,log:(err as Error).message},{status:400});
  } finally {
    release();
    if (tmpDir) {
      const resolved = path.resolve(/* turbopackIgnore: true */ tmpDir);
      if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) && path.basename(resolved).startsWith('latex-')) {
        try { fs.rmSync(resolved,{recursive:true,force:true,maxRetries:3}); } catch { /* OS may still hold a compiler handle. */ }
      }
    }
  }
}
