import { sanitizePath, validateFilename } from './security';
export function validateCompileFiles(files: Record<string, string>) {
  if (Object.keys(files).length > 150) throw new Error('Compilation supports up to 150 project files.');
  let bytes = 0;
  for (const [name, content] of Object.entries(files)) {
    if (!validateFilename(name) || typeof content !== 'string') throw new Error('Invalid project file.');
    const size = Buffer.byteLength(content);
    bytes += size;
    if (size > 8 * 1024 * 1024 || bytes > 20 * 1024 * 1024) throw new Error('Compile input exceeds the 8 MB per-file or 20 MB project limit.');
    if (!/\.(?:tex|sty|cls|bst|bib)$/i.test(name)) continue;
    if (content.startsWith('data:')) throw new Error('TeX source files must contain plain source text, not encoded attachments.');
    const code = content.replace(/(?<!\\)%[^\r\n]*/g, '');
    // Defense in depth for imported/generated source. This is intentionally not a TeX sandbox.
    if (/\^\^|\\(?:directlua|latelua|luafunction|luaexec|openin|openout|read|readline|write|csname|catcode|pdfobj|pdffiledump|pdfextension|special)(?![A-Za-z])/.test(code)) throw new Error('Restricted TeX primitive in ' + name + '. Direct Lua, file IO, shell/dynamic primitives and raw PDF specials are not supported. Use ordinary LaTeX packages and project-relative input files.');
    for (const match of code.matchAll(/\\(?:input|include|includegraphics|addbibresource|bibliography|lstinputlisting|verbatiminput)\s*(?:\[[^\]]*\]\s*)?(?:\{([^}]*)\}|([^\s{}]+))/g)) {
      for (const value of (match[1] || match[2]).split(',')) sanitizePath(value.trim());
    }
  }
}

export function compilerEnvironment(input: NodeJS.ProcessEnv, directory: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };
  for (const [key, value] of Object.entries(input)) if (/^(?:PATH|PATHEXT|SystemRoot|WINDIR|ComSpec|HOME|USERPROFILE|HOMEDRIVE|HOMEPATH|APPDATA|LOCALAPPDATA|LANG|LC_[A-Z_]+|FONTCONFIG_PATH|FONTCONFIG_FILE)$/i.test(key)) env[key] = value;
  return { ...env, TMP: directory, TEMP: directory, TMPDIR: directory, openin_any: 'p', openout_any: 'p', shell_escape: 'f', TEXMFOUTPUT: directory };
}
