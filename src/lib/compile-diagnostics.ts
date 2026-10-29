import { missingPackageFiles } from './package-catalog';
export type CompileDiagnostic = { severity: 'error' | 'warning' | 'info'; message: string; file?: string; line?: number; column?: number };

export function explainCompileFailure(log: string): string {
  // TeX wraps long error lines and repeats "(package)" on continuations.
  const flat=log.replace(/\r?\n\s*\([A-Za-z][\w.-]*\)\s*/g,' ').replace(/\s+/g,' ');
  let guidance='';
  if (/can't find the format file|could not (?:find|load).*format|failed to (?:create|load).*format/i.test(flat)) return 'The engine started, but its format files are missing or could not be initialized. Repair or regenerate formats in the selected distribution manager, then verify the engine in Lemmata setup.\n\n' + log;
  if(/fontspec.{0,160}requires.{0,100}(?:XeTeX|LuaTeX)/i.test(flat)) guidance='This source uses fontspec and requires XeLaTeX or LuaLaTeX. Select a compatible engine in the toolbar and compile again.';
  else if(/fontspec.{0,300}cannot be found|font-not-found/i.test(flat)) guidance='A requested font could not be resolved. Check the family name and your TeX/system font installation or font cache. An installed TeX font can also be selected by its exact .otf filename. This is a font-availability problem, not evidence that the selected engine is missing.';
  else if(missingPackageFiles(log).length) guidance='A required TeX package or library is missing. Use Find packages in the recovery dialog to locate them, then approve installation and retry.';
  else if(/File [^\r\n]+\.(?:sty|cls)[^\r\n]* not found|could not be found|not installed/i.test(log)) guidance='A required TeX package or class is missing. Open your distribution package manager (MiKTeX Console or TeX Live Utility/tlmgr), install the named package, then use Tools → Lemmata setup → Check again.';
  return guidance?guidance+'\n\n'+log:log;
}

/** Only attach navigable locations to exact project files, never guessed external paths. */
export function parseCompileLog(log: string, files: string[], mainFile = 'main.tex', sourceRoot?: string): CompileDiagnostic[] {
  const items: CompileDiagnostic[] = [], seen = new Set<string>();
  const known = new Set(files);
  const normalize = (candidate: string) => {
    const value = candidate.trim().replace(/^"|"$/g, '').replace(/\\/g, '/').replace(/^\.\//, '');
    if (known.has(value)) return value;
    const root = sourceRoot?.replace(/\\/g, '/').replace(/\/$/, '') + '/';
    const relative = sourceRoot && value.startsWith(root) ? value.slice(root.length) : undefined;
    return relative && known.has(relative) ? relative : undefined;
  };
  const add = (item: CompileDiagnostic) => {
    const key = JSON.stringify(item); if (!seen.has(key) && items.length < 500) { seen.add(key); items.push(item); }
  };
  const stack: (string | undefined)[] = [];
  let pending: CompileDiagnostic | null = null;
  let current = known.has(mainFile) ? mainFile : undefined;
  const lines = log.replace(/\r\n/g, '\n').split('\n');
  const messageAt = (start: number, first: string) => {
    let message=first.trim(), end=start;
    for(let offset=1;offset<=14&&start+offset<lines.length;offset++) {
      const next=lines[start+offset];
      if(!next.trim()&&/^\([A-Za-z][\w.-]*\)/.test(lines[start+offset+1]||'')) { end=start+offset;continue; }
      const continuation=next.match(/^\([A-Za-z][\w.-]*\)\s*(.*)$/);
      if(!continuation)break;
      if(continuation[1])message+=' '+continuation[1].trim();
      end=start+offset;
    }
    return { message:message.slice(0,700), end };
  };
  for (let index = 0; index < lines.length; index++) {
    const text = lines[index];
    // TeX's parenthesized input stack, including packages, so closing an include restores its parent.
    if (!/^\([A-Za-z][\w.-]*\)(?:\s|$)/.test(text) && (/^[()\s.\/\\A-Za-z0-9_:\-" ]+\.(?:tex|sty|cls)/.test(text) || /^\s*[()]/.test(text))) {
      for (const token of text.matchAll(/\(("[^"\n]+\.(?:tex|sty|cls)"|[^()\s]+\.(?:tex|sty|cls))|\)/g)) {
        if (token[1]) { stack.push(current); current = normalize(token[1]); }
        else if (stack.length) current = stack.pop();
      }
    }
    const located = text.match(/^(.+?\.\w+):(\d+)(?::(\d+))?:\s*(.+)$/);
    if (located) {
      const detail = messageAt(index,located[4]), message = detail.message; index=detail.end;
      add({ severity: /warning/i.test(message) ? 'warning' : 'error', message, file: normalize(located[1]), line: Number(located[2]), ...(located[3] ? { column: Number(located[3]) } : {}) });
      pending = null; continue;
    }
    if (/^!\s/.test(text)) {
      if (pending) add(pending);
      const detail=messageAt(index,text.replace(/^!\s*/,''));index=detail.end;
      pending = { severity: 'error', message: detail.message, file: current };
      continue;
    }
    const number = text.match(/^l\.(\d+)\s*(.*)/);
    if (number && pending) { pending.line = Number(number[1]); add(pending); pending = null; continue; }
    if (/(?:LaTeX|Package .+|Class .+) Warning:|^(?:Over|Under)full \\[hv]box/.test(text)) {
      let message = text.trim();
      if (!/\.$/.test(message) && lines[index + 1] && !/^\s*$|^[!([]/.test(lines[index + 1])) message += ' ' + lines[++index].trim();
      const number = message.match(/(?:input line|at lines?)\s+(\d+)/);
      add({ severity: 'warning', message, ...(current && number ? { file: current, line: Number(number[1]) } : {}) });
    }
  }
  if (pending) add(pending);
  if (!items.length && log.trim()) add({ severity: /not installed|could not be found|missing|ENOENT|failed|error|limit|timed out/i.test(log) ? 'error' : 'info', message: log.trim().split('\n').find(Boolean)!.slice(0, 700) });
  return items;
}
