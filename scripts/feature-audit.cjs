require('./local-test-session.cjs');
/* eslint-disable @typescript-eslint/no-require-imports */
// Repeatable audit: only creates/mutates its own disposable project.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const ts = require('typescript');
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
const base = process.env.AUDIT_URL || 'http://127.0.0.1:2303';
const results = [];
function load(file) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename; mod.paths = module.paths;
  mod.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText, filename);
  return mod.exports;
}
async function json(url, body, method = 'POST') {
  const r = await fetch(base+url,{method:body === undefined ? 'GET' : method,...(body === undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  return { status:r.status, data:await r.json() };
}
async function check(name, fn) {
  try { const evidence = await fn(); results.push({name,status:'PASS',evidence}); console.log('PASS',name,evidence || ''); }
  catch(e) { results.push({name,status:'FAIL',evidence:e.message}); console.log('FAIL',name,e.message.slice(0,700)); }
}
async function inspectPdf(response) {
  if (!response.ok) throw new Error((await response.text()).slice(-1800));
  const bytes = new Uint8Array(await response.arrayBuffer());
  const doc = await pdfjs.getDocument({data:bytes,disableFontFace:true,useSystemFonts:true}).promise;
  const pages=doc.numPages; let text='';
  for(let i=1;i<=pages;i++){const p=await doc.getPage(i);text+=(await p.getTextContent()).items.map(x=>x.str).join(' ');}
  await doc.destroy(); return {bytes,pages,text};
}
(async()=>{
  const welcome=load('src/lib/welcome-document.ts');
  const {generateTemplate}=load('src/lib/templates.ts');
  let id;
  const simple='\\documentclass{article}\n\\begin{document}\nHello audit world.\\label{sec:test}\n\\end{document}';
  const compile=(files,engine='pdflatex')=>fetch(base+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,engine,projectId:id,mainFile:'main.tex'})});
  try {
    const created=await json('/api/projects',{name:'Disposable feature audit '+Date.now(),files:{'main.tex':simple,'notes.tex':'temporary'}});
    assert.equal(created.data.ok,true);id=created.data.id;
    await check('Project create/read',async()=>{assert.equal((await json('/api/projects/'+id)).data.project.files['notes.tex'],'temporary');return id;});
    await check('Save/delete/reload',async()=>{assert.equal((await json('/api/projects/'+id,{files:{'main.tex':simple},mainFile:'main.tex'},'PUT')).data.ok,true);assert.equal((await json('/api/projects/'+id)).data.project.files['notes.tex'],undefined);});
    await check('Word and formula counts',async()=>{const d=(await json('/api/wordcount',{text:'\\documentclass{article}\n\\begin{document}Hello audit world. $x=1$ \\[y=2\\]\\end{document}'})).data;assert.equal(d.words,3);assert.equal(d.mathFormulas,2);return JSON.stringify(d);});
    for(const engine of ['pdflatex','xelatex','lualatex']) await check('Welcome: one A4 page / '+engine,async()=>{const p=await inspectPdf(await compile({'main.tex':welcome.WELCOME_LATEX_CONTENT},engine));assert.equal(p.pages,1);assert.match(p.text,/Tools within reach/);assert.match(p.text,/Make room/);if(engine==='pdflatex')fs.writeFileSync('docs/welcome-verified.pdf',p.bytes);return p.pages+' page; all footer content present';});
    const bib='@article{audit,author={Test, Ada},title={Audit Reference},journal={Test Journal},year={2026}}';
    await check('BibTeX resolves citation',async()=>{const p=await inspectPdf(await compile({'main.tex':'\\documentclass{article}\n\\begin{document}Citation \\cite{audit}.\\bibliographystyle{plain}\\bibliography{refs}\\end{document}','refs.bib':bib}));assert.match(p.text,/Audit Reference/i);assert.doesNotMatch(p.text,/\[\?\]/);});
    await check('Biber resolves citation',async()=>{const p=await inspectPdf(await compile({'main.tex':'\\documentclass{article}\n\\usepackage[backend=biber]{biblatex}\n\\addbibresource{refs.bib}\n\\begin{document}Citation \\cite{audit}.\\printbibliography\\end{document}','refs.bib':bib}));assert.match(p.text,/Audit Reference/i);});
    const presets=[['article','article',['amsmath','amssymb','graphicx','booktabs','hyperref','cite']],['circuit','article',['amsmath','circuitikz','graphicx','siunitx']],['math','article',['amsmath','amssymb','amsthm','mathtools']],['exam','exam',['amsmath','amssymb','geometry']],['minimal','article',[]],['beamer','beamer',['amsmath','graphicx','booktabs']]];
    for(const [templateId,docClass,selectedPackages] of presets) await check('Template compiles: '+templateId,async()=>{const tex=generateTemplate({templateId,docClass,selectedPackages,title:'Audit & 50% result',author:'Test_Author',fontSize:'11pt',margin:'0.85in',sections:'Introduction, Results'});const p=await inspectPdf(await compile({'main.tex':tex,'references.bib':welcome.WELCOME_BIB_CONTENT}));assert.ok(p.pages>=1);return p.pages+' page(s)';});
    await check('Compiler errors return a useful log',async()=>{const r=await compile({'main.tex':'\\documentclass{article}\\begin{document}\\undefinedAuditCommand\\end{document}'});assert.equal(r.status,400);assert.match((await r.json()).log,/Undefined control sequence/);});
    await check('Compiler rejects traversal and shell-style filenames',async()=>{for(const name of ['../escape.tex','bad"&.tex','.git/config']){const r=await compile({'main.tex':simple,[name]:'x'});assert.equal(r.status,400);}});
    await check('Project rejects hidden/traversal paths',async()=>{const r=await json('/api/projects/'+id,{files:{'../escape.tex':'x'}},'PUT');assert.equal(r.data.ok,false);});
    await check('ZIP export preserves contents',async()=>{const r=await fetch(base+'/api/export-zip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files:{'main.tex':simple,'refs.bib':bib}})});const b=Buffer.from(await r.arrayBuffer());assert.equal(r.status,200);assert.equal(b.readUInt32LE(0),0x04034b50);assert.ok(b.includes(Buffer.from('main.tex'))&&b.includes(Buffer.from('refs.bib')));return b.length+' bytes';});
    await check('ZIP rejects unsafe paths',async()=>{const r=await json('/api/export-zip',{files:{'../outside.tex':'x'}});assert.equal(r.data.ok,false);});
    await check('Snapshots preserve manual and prune to 50 auto',async()=>{await json('/api/projects/'+id+'/snapshots',{type:'manual',name:'Keep me',files:{'main.tex':simple}});for(let i=0;i<52;i++)await json('/api/projects/'+id+'/snapshots',{type:'auto',files:{'main.tex':simple+'\n% '+i}});const d=(await json('/api/projects/'+id+'/snapshots')).data;assert.equal(d.autoCount,50);assert.equal(d.manualCount,1);assert.ok(d.totalSizeBytes>0);return '50 auto + 1 manual';});
    await check('Snapshot restore data round-trip',async()=>{const snap=(await json('/api/projects/'+id+'/snapshots')).data.items.find(x=>x.type==='manual');await json('/api/projects/'+id,{files:snap.files,mainFile:'main.tex'},'PUT');assert.equal((await json('/api/projects/'+id)).data.project.files['main.tex'],simple);});
    await check('Git init and status (isolated project)',async()=>{assert.equal((await json('/api/git',{action:'init',projectId:id})).data.ok,true);const d=(await json('/api/git',{action:'status',projectId:id})).data;assert.ok(d.isRepo);assert.ok(d.files.some(f=>f.name==='main.tex'));return d.branch;});
    await check('Security response headers',async()=>{const r=await fetch(base);for(const header of ['content-security-policy','x-content-type-options','x-frame-options'])assert.ok(r.headers.get(header));});
    await check('Provider request/response contracts (mocked)',async()=>{const api=load('src/lib/ai-providers.ts');const original=global.fetch;try { for(const provider of ['gemini','openai','ollama','lmstudio']){global.fetch=async(url,opts)=>{const b=JSON.parse(opts.body);assert.match(JSON.stringify(b),/selected equation/);return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'verified'}]}}],choices:[{message:{content:'verified'}}],message:{content:'verified'}})};};assert.equal(await api.sendAIPrompt({provider,apiKey:'test-key',model:'test-model'},'fix equation',{selectedText:'selected equation'}),'verified');} }finally{global.fetch=original;}return '4 provider adapters; no external request sent';});
    await check('API key encryption and wrong-password rejection',async()=>{global.window={crypto:global.crypto};const api=load('src/lib/ai-providers.ts');const cipher=await api.encryptApiKey('dummy-audit-key','test-password');assert.notEqual(cipher,'dummy-audit-key');assert.equal(await api.decryptApiKey(cipher,'test-password'),'dummy-audit-key');await assert.rejects(api.decryptApiKey(cipher,'wrong'));delete global.window;});
  } finally {
    if(id){const r=await fetch(base+'/api/projects/'+id,{method:'DELETE'});console.log('Temporary project cleanup:',r.status);}
    fs.writeFileSync('docs/feature-audit-results.json',JSON.stringify({testedAt:new Date().toISOString(),results},null,2));
  }
  console.log(`${results.filter(x=>x.status==='PASS').length}/${results.length} audit checks passed`);
  if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
