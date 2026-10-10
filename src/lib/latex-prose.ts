/** Masks TeX syntax while retaining UTF-16 offsets for editor decorations. */
export function proseWords(document: string): { from: number; to: number; word: string }[] {
  let prose = document;
  const mask = (pattern: RegExp) => { prose = prose.replace(pattern, value => ' '.repeat(value.length)); };
  const start = prose.indexOf('\\begin{document}');
  if (start >= 0) prose = ' '.repeat(start) + prose.slice(start);
  mask(/(?<!\\)%[^\r\n]*/g);
  mask(/\\begin\{(equation\*?|align\*?|gather\*?|math|displaymath|tikzpicture|circuitikz|verbatim|lstlisting|minted)\}[\s\S]*?\\end\{\1\}/g);
  mask(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g);
  mask(/(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$[^$]*?(?<!\\)\$/g);
  mask(/\\(?:cite\w*|ref|eqref|label|url|includegraphics|input|include|bibliography|bibliographystyle|begin|end|documentclass|usepackage|usetikzlibrary)(?:\[[^\]]*\])?\{[^}]*\}/g);
  mask(/\\href\{[^}]*\}/g);
  mask(/\\[a-zA-Z@]+\*?(?:\[[^\]]*\])?|\\[^a-zA-Z]/g);
  mask(/https?:\/\/[^\s}]+/g);
  return Array.from(prose.matchAll(/[A-Za-z]+(?:['’][A-Za-z]+)*/g), match => ({ from: match.index!, to: match.index! + match[0].length, word: match[0] })).filter(item => item.word.length > 1 && !/^[A-Z]{2,}$/.test(item.word));
}
