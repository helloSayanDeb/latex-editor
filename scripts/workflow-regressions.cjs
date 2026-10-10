const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
function load(file) {
  const mod = new Module(require('node:path').resolve(file), module); mod.paths = module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
  return mod.exports;
}
const { SaveQueue } = load('src/lib/save-queue.ts');
const { findMatches } = load('src/lib/search.ts');
const { proseWords } = load('src/lib/latex-prose.ts');
(async () => {
  const q = new SaveQueue(); const events = []; let release;
  const first = q.enqueue(async () => { events.push('first-start'); await new Promise(done => { release = done; }); events.push('first-end'); });
  q.schedule(async () => { events.push('latest'); }, 10000);
  const flush = q.flush(); await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(events, ['first-start']); release(); await first; await flush;
  assert.deepEqual(events, ['first-start', 'first-end', 'latest']);
  console.log('PASS: delayed write cannot overtake earlier save; flush awaits both');
  q.schedule(async () => { events.push('obsolete'); },10000); q.schedule(async () => { events.push('replacement'); },10000); await q.flush(); assert.equal(events.at(-1),'replacement'); assert(!events.includes('obsolete'));
  console.log('PASS: debounce retains latest edit');
  await assert.rejects(q.enqueue(async () => { throw new Error('disk unavailable'); })); await assert.rejects(q.flush()); await q.enqueue(async () => {});
  console.log('PASS: failed save blocks navigation flush; queue can recover');
  const options = {regex:true,caseSensitive:true,wholeWord:false};
  assert.deepEqual(findMatches('alpha-12 beta-34', '(?<word>[a-z]+)-(\\d+)', '$<word>:$2:$$', options).map(m=>m.replacement), ['alpha:12:$','beta:34:$']);
  assert.equal(findMatches('abc','(a)(b)(c)','$12 $99 $&',options)[0].replacement,'a2 $99 abc');
  assert.throws(()=>findMatches('abc','[','',options));
  assert.equal(findMatches('alphabet alpha','alpha','$1',{...options,regex:false,wholeWord:true})[0].replacement,'$1');
  console.log('PASS: numbered/named capture replacement, literal mode, invalid regex');
  const doc = String.raw`\documentclass{article}
\begin{document}
This sentnce is wrong. \textbf{Bold prose} \cite{badkey} \label{otherkey}
% commment
$x_{typpo}$ \[equationtyppo\]
\begin{circuitikz}badcircuitword\end{circuitikz}
\end{document}`;
  const words = proseWords(doc); assert(words.some(w=>w.word==='sentnce')); assert(words.some(w=>w.word==='prose'));
  for (const excluded of ['article','badkey','otherkey','commment','typpo','equationtyppo','badcircuitword']) assert(!words.some(w=>w.word===excluded),excluded);
  for(const word of words) assert.equal(doc.slice(word.from,word.to),word.word);
  console.log('PASS: LaTeX exclusions preserve exact editor positions');
  const response = await fetch('http://localhost:2303/api/spelling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:doc})}); const data = await response.json(); assert(response.ok,JSON.stringify(data)); assert(data.issues.some(w=>w.word==='sentnce'));
  const suggestion = await fetch('http://localhost:2303/api/spelling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({word:'sentnce'})}).then(r=>r.json()); assert(suggestion.suggestions.includes('sentence'));
  const ignored = await fetch('http://localhost:2303/api/spelling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({document:doc,ignored:['sentnce']})}).then(r=>r.json()); assert(!ignored.issues.some(w=>w.word==='sentnce'));
  console.log('PASS: real dictionary spelling, corrections and ignore');
})().catch(error=>{console.error(error);process.exitCode=1});
