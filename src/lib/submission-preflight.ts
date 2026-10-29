import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { maskLatex, referenceDiagnostics } from './project-index';
import { sanitizePath, validateFilename } from './security';
import { resolveTool } from './lemmata-environment';
export type PreflightItem = { kind: 'class'|'package'|'file'|'font'|'submission'|'reference'; name: string; state: 'available'|'missing'|'manual'; file?: string; line?: number; detail: string };
export async function submissionPreflight(files: Record<string,string>, mainFile: string, required: string[]): Promise<PreflightItem[]> {
  if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 200 || !files[mainFile] || !mainFile.endsWith('.tex')) throw new Error('Choose a valid main .tex file.');
  let size = 0; for (const [name, text] of Object.entries(files)) { if (!validateFilename(name) || typeof text !== 'string' || (size += text.length) > 28_000_000) throw new Error('Invalid or oversized project.'); }
  if (!Array.isArray(required) || required.length > 50) throw new Error('Specify at most 50 required submission files.');
  const started = Date.now();
  const items: PreflightItem[] = [], dependencies = new Set<string>();
  const query = resolveTool('kpsewhich'), execute = promisify(execFile);
  for (const [file, text] of Object.entries(files).filter(([file]) => file.endsWith('.tex'))) {
    const source = maskLatex(text);
    for (const match of source.matchAll(/\\(documentclass|usepackage|RequirePackage)(?![A-Za-z@])\s*(?:\[[^\]]*\]\s*)?\{([^{}]+)\}/g)) {
      for (const value of match[2].split(',')) {
        const name = value.trim(), kind = match[1] === 'documentclass' ? 'class' : 'package', dependency = name + (kind === 'class' ? '.cls' : '.sty');
        if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name) || dependencies.has(dependency)) continue;
        if (dependencies.size >= 80) throw new Error('Inspect at most 80 packages/classes in one preflight.');
        dependencies.add(dependency);
        const local = [dependency, path.posix.join(path.posix.dirname(file), dependency)].some(name => files[name] !== undefined);
        let found = local; const canQuery = Boolean(query && Date.now()-started < 15000);
        if (!found && canQuery) try { found = Boolean((await execute(query!,[dependency],{ timeout: 5000, maxBuffer: 4096, windowsHide: true })).stdout.trim()); } catch { /* Missing or unqueryable. */ }
        items.push({ kind, name: dependency, state: found ? 'available' : canQuery ? 'missing' : 'manual', file, line: text.slice(0,match.index).split('\n').length, detail: local ? 'Provided by this project.' : found ? 'Found by kpsewhich.' : canQuery ? 'Not found in the current TeX search path.' : 'TeX lookup unavailable or time budget reached. Verify by compiling.' });
      }
    }
    for (const match of source.matchAll(/\\(input|include|includegraphics|bibliography|addbibresource)(?![A-Za-z@])\s*(?:\[[^\]]*\]\s*)?\{([^{}]+)\}/g)) {
      for (const value of match[2].split(',')) {
        const raw = value.trim(); if (raw.includes('\\') || raw.includes('#')) { items.push({ kind:'file',name:raw,state:'manual',file,detail:'Dynamic filename; inspect manually.' }); continue; }
        let safe: string; try { safe = sanitizePath(raw); } catch { items.push({kind:'file',name:raw,state:'missing',file,detail:'Reference leaves the supported project paths.'}); continue; }
        const extensions = match[1] === 'includegraphics' ? ['', '.pdf','.png','.jpg','.jpeg','.eps'] : match[1] === 'bibliography'||match[1] === 'addbibresource' ? ['', '.bib'] : ['', '.tex'];
        const candidates = [safe, path.posix.join(path.posix.dirname(mainFile),safe), path.posix.join(path.posix.dirname(file),safe)];
        const found = candidates.some(name => extensions.some(ext => files[name+ext] !== undefined));
        items.push({kind:'file',name:raw,state:found?'available':'missing',file,line:text.slice(0,match.index).split('\n').length,detail:found?'Referenced file is in the project.':'Referenced file is absent; search paths/macros may need manual review.'});
      }
    }
    for (const match of source.matchAll(/\\(?:setmainfont|setsansfont|setmonofont|newfontfamily)(?![A-Za-z@])(?:\s*\\[A-Za-z]+)?\s*(?:\[[^\]]*\]\s*)?\{([^{}]+)\}/g)) items.push({kind:'font',name:match[1],state:'manual',file,detail:'Font family availability and shaping must be verified by compilation.'});
  }
  for (const entry of required) {
    const name = sanitizePath(entry); items.push({kind:'submission',name,state:files[name]!==undefined?'available':'missing',detail:files[name]!==undefined?'Required file is present.':'Required submission file is missing.'});
  }
  for (const issue of referenceDiagnostics(files)) items.push({kind:'reference',name:issue.message,state:'missing',file:issue.file,line:issue.line,detail:'Static project reference check. Generated or external bibliography keys may need manual verification.'});
  return items;
}
