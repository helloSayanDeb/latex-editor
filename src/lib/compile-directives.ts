import path from 'path';

export function resolveCompileDirectives(files: Record<string, string>, initial: string, engine: string): string {
  let current = initial;
  const seen = new Set<string>();
  while (true) {
    if (seen.has(current)) throw new Error('Circular TeX root directive: ' + current);
    seen.add(current);
    if (!Object.hasOwn(files, current)) throw new Error('TeX root file is missing from the project: ' + current);
    const source = files[current];
    const declared = source.match(/^\s*%\s*!\s*TeX\s+(?:program|engine)\s*=\s*(\S+)\s*$/im)?.[1].toLowerCase();
    if (declared && declared !== engine) throw new Error(`Engine directive in ${current} requests ${declared}, but ${engine} is selected. Change the project engine or correct the directive.`);
    const root = source.match(/^\s*%\s*!\s*TeX\s+root\s*=\s*(.+?)\s*$/im)?.[1];
    if (!root) return current;
    if (/^[\\/]|^[A-Za-z]:|\0/.test(root)) throw new Error('TeX root must be a project-relative path.');
    const next = path.posix.normalize(path.posix.join(path.posix.dirname(current), root.replace(/\\/g, '/')));
    if (next === '..' || next.startsWith('../') || !next.endsWith('.tex')) throw new Error('TeX root must reference a .tex file inside this project.');
    current = next;
  }
}
