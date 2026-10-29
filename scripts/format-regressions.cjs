require('./local-test-session.cjs');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript');
const filename=path.resolve('src/lib/latex-format.ts'),m=new Module(filename,module);m.paths=module.paths;m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {formatLatex}=m.exports;
const nested=String.raw`\begin{document}
\begin{itemize}
\item One
\begin{enumerate}
\item Two
\end{enumerate}
\end{itemize}
\end{document}`;
assert.equal(formatLatex(nested),String.raw`\begin{document}
  \begin{itemize}
    \item One
    \begin{enumerate}
      \item Two
    \end{enumerate}
  \end{itemize}
\end{document}`);
assert.equal(formatLatex(formatLatex(nested)),formatLatex(nested));
console.log('PASS nested environments and idempotence');
const braces=String.raw`\newcommand{\sample}{
some text \{escaped\} \% literal percent % } ignored closing brace
\verb|{ raw % text }| and \lstinline|{raw}|
}
\[
x^2
\]`;
assert.equal(formatLatex(braces),String.raw`\newcommand{\sample}{
  some text \{escaped\} \% literal percent % } ignored closing brace
  \verb|{ raw % text }| and \lstinline|{raw}|
}
\[
  x^2
\]`);
console.log('PASS multiline braces, escaped syntax, comments, inline literals and display math');
assert.equal(formatLatex('$$\nx^2\n$$\nnext'), '$$\n  x^2\n$$\nnext');
assert.equal(formatLatex('$$x^2$$\nnext'), '$$x^2$$\nnext');
for(const env of ['verbatim','Verbatim','minted','lstlisting','filecontents*','luacode']) {
 const raw=`  raw { unmatched % \\begin{fake}\n\tkeep tabs and spaces  \n   \n}`;
 const input=`\\begin{document}\n\\begin{${env}}\n${raw}\n\\end{${env}}\ntext\n\\end{document}`;
 const formatted=formatLatex(input);
 assert(formatted.includes('\n'+raw+'\n'));assert(formatted.includes('\n  text\n'));
 assert(formatted.includes(`\n\\end{${env}}\n`));
 assert.equal(formatLatex(formatted),formatted);
}
console.log('PASS literal/code block contents retained byte-for-byte');
assert.equal(formatLatex('\\begin{center}x\\end{center}\nnext\n'),'\\begin{center}x\\end{center}\nnext\n');
assert.equal(formatLatex('\\begin{document}\r\ntext\r\n\\end{document}\r\n'),'\\begin{document}\r\n  text\r\n\\end{document}\r\n');
assert.doesNotThrow(()=>formatLatex('\\end{unmatched}\n}\n\\begin{unfinished}\ntext'));
console.log('PASS inline environments, newline preservation and incomplete source');
if(process.argv.includes('--live')) (async()=>{
 const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const source=String.raw`\documentclass{article}
\usepackage{amsmath}
\begin{document}
\begin{enumerate}
\item First text.
\item Second text.
\end{enumerate}
\[
x^2+y^2=1
\]
\begin{verbatim}
  raw { code % exactly
\end{verbatim}
\newpage
Second page.
\end{document}`;
 async function inspect(text){
  const response=await fetch((process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2303')+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({projectId:'format-regression-no-project',mainFile:'main.tex',engine:'pdflatex',files:{'main.tex':text}})});
  assert(response.ok,await (response.ok?Promise.resolve(''):response.text()));
  const doc=await pdfjs.getDocument({data:new Uint8Array(await response.arrayBuffer()),disableFontFace:true,useSystemFonts:true}).promise;
  try {const result=[];for(let n=1;n<=doc.numPages;n++){const page=await doc.getPage(n);const content=await page.getTextContent();result.push(content.items.map(item=>({text:item.str,transform:item.transform})));}return result;}finally{await doc.destroy();}
 }
 assert.deepEqual(await inspect(formatLatex(source)),await inspect(source));
 console.log('PASS formatted and original two-page PDFs have identical text and positions');
})().catch(error=>{console.error(error);process.exitCode=1;});
