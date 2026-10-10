type Token = { opening: boolean; key: string; from: number; to: number };
const literalEnvironments = new Set(['verbatim', 'verbatim*', 'Verbatim', 'Verbatim*', 'BVerbatim', 'LVerbatim', 'lstlisting', 'minted', 'comment', 'filecontents', 'filecontents*', 'luacode', 'luacode*', 'pycode', 'python']);

function tokens(line: string, displayOpen: boolean): Token[] {
  const result: Token[] = [];
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (char === '%') break;
    if (char === '\\') {
      const remaining = line.slice(index);
      const inline = remaining.match(/^\\(?:verb\*?|lstinline\*?)(?:\[[^\]]*\])?/);
      if (inline) {
        const delimiter = index + inline[0].length;
        const end = line.indexOf(line[delimiter], delimiter + 1);
        index = end < 0 ? line.length : end;
        continue;
      }
      const environment = remaining.match(/^\\(begin|end)\s*\{([A-Za-z@][A-Za-z0-9@*_-]*)\}/);
      if (environment) {
        const opening = environment[1] === 'begin';
        const end = index + environment[0].length;
        result.push({ opening, key: environment[2], from: index, to: end });
        index = end - 1;
        if (opening && literalEnvironments.has(environment[2])) {
          const closing = `\\end{${environment[2]}}`;
          const rawEnd = line.indexOf(closing, end);
          if (rawEnd < 0) break;
          result.push({ opening: false, key: environment[2], from: rawEnd, to: rawEnd + closing.length });
          index = rawEnd + closing.length - 1;
        }
        continue;
      }
      if (line[index + 1] === '[' || line[index + 1] === ']') {
        result.push({ opening: line[index + 1] === '[', key: 'display-math', from: index, to: index + 2 });
        index++;
        continue;
      }
      const command = remaining.match(/^\\[A-Za-z@]+\*?/);
      index += command ? command[0].length - 1 : 1; // Escaped braces, percent signs and \\ are not structure.
    } else if (char === '$' && line[index + 1] === '$') {
      result.push({ opening: !displayOpen, key: 'dollar-display', from: index, to: index + 2 });
      displayOpen = !displayOpen;
      index++;
    } else if (char === '{' || char === '}') {
      result.push({ opening: char === '{', key: 'brace', from: index, to: index + 1 });
    }
  }
  return result;
}

function close(stack: string[], key: string) {
  // An unfinished/mismatched environment must not drive indentation below zero.
  const index = stack.lastIndexOf(key);
  if (index >= 0) stack.splice(index);
}

/** Format indentation only: no wrapping, command rewriting or literal-code changes. */
export function formatLatex(source: string): string {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const stack: string[] = [];
  let literal: string | undefined;
  return source.split(/\r?\n/).map(line => {
    if (literal) {
      const closing = `\\end{${literal}}`;
      const trimmed = line.trimStart();
      if (trimmed.startsWith(closing) && /^(?:\s*(?:%.*)?)$/.test(trimmed.slice(closing.length))) {
        close(stack, literal);
        literal = undefined;
        // Leading spaces before a literal terminator may be part of the literal text.
        return line;
      }
      return line;
    }
    if (!line.trim()) return '';
    const structure = tokens(line, stack.includes('dollar-display'));
    const leadingStack = [...stack];
    let position = 0;
    for (const token of structure) {
      if (token.opening || line.slice(position, token.from).trim()) break;
      close(leadingStack, token.key);
      position = token.to;
    }
    const formatted = '  '.repeat(leadingStack.length) + line.trimStart();
    for (const token of structure) {
      if (token.opening) stack.push(token.key);
      else close(stack, token.key);
    }
    const last = stack[stack.length - 1];
    if (literalEnvironments.has(last)) literal = last;
    return formatted;
  }).join(newline);
}
