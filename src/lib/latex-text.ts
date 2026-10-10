/** Escape plain user-authored text; raw LaTeX belongs in the source editor. */
export function escapeLatexText(text: string): string {
  const replacements: Record<string, string> = { '\\': '\\textbackslash{}', '&': '\\&', '%': '\\%', '$': '\\$', '#': '\\#', '_': '\\_', '{': '\\{', '}': '\\}', '~': '\\textasciitilde{}', '^': '\\textasciicircum{}' };
  return text.replace(/[\\&%$#_{}~^]/g, char => replacements[char]);
}

export function countLatex(source: string) {
  // Strip comments while retaining escaped percent signs.
  let text = source.replace(/(?<!\\)%.*$/gm, '');
  const body = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (body) text = body[1];
  const figures = (text.match(/\\begin\{figure\*?\}/g) || []).length;
  const tables = (text.match(/\\begin\{table\*?\}/g) || []).length;
  const math = /\$\$[\s\S]*?\$\$|(?<!\\)\$(?:\\.|[^$])*?(?<!\\)\$|(?<!\\)\\\[[\s\S]*?\\\]|(?<!\\)\\\([\s\S]*?\\\)|\\begin\{(equation\*?|align\*?|gather\*?|displaymath)\}[\s\S]*?\\end\{\1\}/g;
  const mathFormulas = (text.match(math) || []).length;
  text = text.replace(math, ' ')
    .replace(/\\(?:begin|end)\{[^}]+\}(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\(?:label|ref|cite|bibliography|bibliographystyle)\*?(?:\[[^\]]*\])?\{[^}]*\}/g, ' ')
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\([%&#_$])/g, '$1').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim();
  return { words: text ? text.split(/\s+/).length : 0, characters: text.replace(/\s/g, '').length, mathFormulas, figures, tables };
}
