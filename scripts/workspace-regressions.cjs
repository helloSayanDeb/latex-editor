 
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
  return mod.exports;
}
const { buildProjectIndex, referenceContext, referenceDiagnostics, maskLatex } = load('src/lib/project-index.ts');
const files = {
  'main.tex': String.raw`\section{Intro}\label{sec:intro}
% \label{commented}
\verb|\label{literal}|
\begin{verbatim}\label{fake}\end{verbatim}
\citep[see][p. 2]{smith:2024,missing}\eqref{eq:good}\ref{missing-label}`,
  'chapters/math.tex': '\\label{eq:good}\n\\bibitem{inline}Example',
  'references.bib': `% @book{commented, title={Ignore}}
@string{publisher="Test"}
@comment{ @article{fake, title={ignore}} }
@article{smith:2024, author={Jane Smith}, title={A {Nested} Study}, year={2024}}
@book(other, title={Parentheses (inside) a title}, year=2025)
@article{unfinished, title={incomplete`
};
const index = buildProjectIndex(files);
assert.deepEqual(index.citations.map(item => item.key).sort(), ['inline','other','smith:2024']);
assert.deepEqual(index.labels.map(item => item.key).sort(), ['eq:good','sec:intro']);
assert.match(index.citations.find(item => item.key === 'smith:2024').detail, /Jane Smith.*2024.*Nested/);
assert.deepEqual(referenceContext('Text \\citep[see][p. 4]{smith:2024, ot'), { kind:'citations', fragment:'ot' });
assert.deepEqual(referenceContext('Text \\eqref{eq:'), { kind:'labels', fragment:'eq:' });
assert.equal(referenceContext('% \\cite{sm'), null);
assert.equal(referenceContext('\\verb|\\cite{sm|'), null);
assert.equal(referenceContext('\\verb|\\cite{sm'), null);
assert.equal(referenceContext('\\begin{verbatim}\n\\cite{sm'), null);
const missing = referenceDiagnostics(files, index);
assert.equal(missing.length,2); assert(missing.every(item=>item.file==='main.tex'&&item.line===5));
assert.equal(maskLatex('% comment\ntext').split('\n').length,2);
console.log('PASS nested/multiline BibTeX, inline bibliography, real label/citation context, comment/literal exclusion and unresolved references');
const { searchProject } = load('src/lib/project-search.ts');
const searched = { 'a.tex': 'First Foo\r\nfoo foo\n.* [test]', 'sub/b.tex': 'FOO', 'figure.png':'data:image/png;base64,foo' };
assert.equal(searchProject(searched,'foo').hits.length,4);
assert.equal(searchProject(searched,'foo',{matchCase:true}).hits.length,2);
assert.deepEqual(searchProject(searched,'.*').hits.map(hit=>[hit.file,hit.line,hit.column]),[['a.tex',3,1]]);
assert.equal(searchProject(searched,'foo',{limit:2}).truncated,true);
assert.equal(searchProject(searched,'').hits.length,0);
assert.equal(searchProject({'u.tex':'😀 café CAFÉ'},'café').hits[1].column,9);
console.log('PASS literal project search, CRLF/Unicode positions, case sensitivity, binary exclusion and bounded results');
const { parseCompileLog, explainCompileFailure } = load('src/lib/compile-diagnostics.ts');
let problems = parseCompileLog('main.tex:12: Undefined control sequence.\nchapters/math.tex:7:3: Missing $ inserted.',Object.keys(files));
assert.deepEqual(problems.map(item=>[item.file,item.line,item.column]),[['main.tex',12,undefined],['chapters/math.tex',7,3]]);
problems = parseCompileLog('(./main.tex\n(/usr/texmf/article.cls\n)\n(./chapters/math.tex\n! Undefined control sequence.\nl.8 \\bad\n)\nLaTeX Warning: Reference `x` undefined on input line 13.',Object.keys(files));
assert.equal(problems[0].file,'chapters/math.tex'); assert.equal(problems[0].line,8);
assert.equal(problems[1].file,'main.tex'); assert.equal(problems[1].line,13);
assert.equal(parseCompileLog('/usr/other/main.tex:3: error',Object.keys(files))[0].file,undefined);
assert.equal(parseCompileLog('C:\\Temp\\job\\main.tex:3: error',Object.keys(files),'main.tex','C:\\Temp\\job')[0].file,'main.tex');
assert.equal(parseCompileLog('pdflatex is not installed. Open Lemmata setup.',Object.keys(files))[0].severity,'error');
console.log('PASS compiler file/line diagnostics, nested input stack, warning locations, no external path guessing and installation errors');
const fontError=parseCompileLog('./main.tex:5: Package fontspec Error:\n\n(fontspec)                The font "Missing Family" cannot be found;\n(fontspec)                check its installation.\n\nFor immediate help type H.\nl.5 test',['main.tex']);
assert.match(fontError[0].message,/Missing Family.*cannot be found/);assert.equal(fontError[0].file,'main.tex');assert.equal(fontError[0].line,5);
const continuation=parseCompileLog('(./main.tex\n(./chapters/math.tex\n! Package demo Error:\n(demo) A useful explanation.\nl.8 broken\n)\nLaTeX Warning: Reference missing on input line 10.',['main.tex','chapters/math.tex']);
assert.equal(continuation[0].file,'chapters/math.tex');assert.equal(continuation[1].file,'main.tex');assert.match(continuation[0].message,/useful explanation/);
console.log('PASS multiline package/font errors retain useful detail and do not corrupt source-file tracking');

assert.match(explainCompileFailure('Package fontspec Error:\n(fontspec) The font "A long font name" cannot be\n(fontspec) found;\n(fontspec) not installed.'), /^A requested font/);
assert.match(explainCompileFailure('Package fontspec Error:\n(fontspec) The fontspec package requires either XeTeX or\n(fontspec) LuaTeX.'), /^This source uses fontspec/);
assert.match(explainCompileFailure("! LaTeX Error: File 'exam.cls' not found."), /^A required TeX package/);
