export const PACKAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9_.+-]{0,120}\.(?:sty|cls|def|clo|bbx|cbx|lbx|bst|ldf|fd|cfg|code\.tex)$/i;
export function missingPackageFiles(log: string): string[] {
  const files = new Set<string>();
  for (const match of log.matchAll(/(?:LaTeX Error:\s*)?File\s+[`'"\u2018\u2019]([^`'"\r\n\u2018\u2019]+)[`'"\u2018\u2019]\s+not found/gi)) {
    if (PACKAGE_FILE.test(match[1])) files.add(match[1]);
  }
  // TikZ/PGF uses a library-specific error instead of LaTeX's "File ... not found".
  // TeX may wrap the quoted library name or the subsequent filenames in its log.
  for (const match of log.matchAll(/I did not find the\s+(tikz|pgf)\s+library\s+[`'"\u2018\u2019]([^`'"\u2018\u2019]+)[`'"\u2018\u2019]/gi)) {
    const name = match[2].replace(/\r?\n/g, '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.+-]{0,80}$/.test(name)) continue;
    const file = `${match[1].toLowerCase()}library${name}.code.tex`;
    if (PACKAGE_FILE.test(file)) files.add(file);
  }
  for (const match of log.matchAll(/I can't find file\s+[`'"\u2018\u2019]([^`'"\r\n\u2018\u2019]+)[`'"\u2018\u2019]/gi)) {
    if (PACKAGE_FILE.test(match[1])) files.add(match[1]);
  }
  return [...files].slice(0, 8);
}
export const PACKAGE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_.+-]{0,100}$/;
/** Match actual catalog file paths; filenames and package IDs are not interchangeable. */
export function miktexFilePackages(catalog: string, files: string[]): Record<string, string[]> {
  const result: Record<string, string[]> = Object.fromEntries(files.map(file => [file, []]));
  for (const row of catalog.split(/\r?\n/)) {
    const separator = row.indexOf('|'); if (separator < 1) continue;
    const id = row.slice(0, separator); if (!PACKAGE_ID.test(id)) continue;
    const entries = row.slice(separator + 1).split(';').map(file => file.replace(/\\/g, '/').split('/').pop());
    for (const file of files) if (entries.includes(file) && !result[file].includes(id) && result[file].length < 12) result[file].push(id);
  }
  return result;
}
export function texliveFilePackages(catalog: string, file: string): string[] {
  let id = ''; const found = new Set<string>();
  for (const line of catalog.split(/\r?\n/)) {
    const header = line.match(/^([A-Za-z0-9][A-Za-z0-9_.+-]{0,100}):\s*$/);
    if (header) id = header[1];
    else if (id && line.trim().replace(/\\/g, '/').split('/').pop() === file) found.add(id);
  }
  return [...found].slice(0, 12);
}
