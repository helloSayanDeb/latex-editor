require('./local-test-session.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const base=process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2303';
const results=[];
async function api(url,body,method='POST') {const response=await fetch(base+url,{method,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});return {status:response.status,data:await response.json()};}
async function check(name,fn){try{await fn();results.push({name,status:'PASS'});console.log('PASS',name);}catch(error){results.push({name,status:'FAIL',error:error.message});console.log('FAIL',name,error.message);}}
(async()=>{
 let id;
 const tex='\\documentclass{article}\n\\begin{document}\n\\input{chapters/intro}\n\\end{document}';
 const image='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=';
 const files={'main.tex':tex,'chapters/intro.tex':'Nested source audit.','figures/pixel.png':'data:image/png;base64,'+image};
 try {
  await check('Project name accepts punctuation and Unicode',async()=>{const r=await api('/api/projects',{name:'Disposable audit: 50% & বাংলা',files});assert.equal(r.data.ok,true,JSON.stringify(r.data));id=r.data.id;});
  if(!id)throw new Error('No disposable project created');
  await check('Nested source and binary image round-trip',async()=>{const r=await api('/api/projects/'+id,undefined,'GET');assert.equal(r.data.project.files['chapters/intro.tex'],files['chapters/intro.tex']);assert.equal(r.data.project.files['figures/pixel.png'],files['figures/pixel.png']);});
  await check('Compile nested source and SyncTeX keeps relative filename',async()=>{
    const r=await fetch(base+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,projectId:id,engine:'pdflatex'})});assert.equal(r.status,200,await(r.ok?Promise.resolve(''):r.text()));
    const view=await api('/api/synctex',{projectId:id,action:'view',sourceFile:'chapters/intro.tex',line:1});assert.equal(view.data.ok,true,JSON.stringify(view.data));
    const edit=await api('/api/synctex',{projectId:id,action:'edit',...view.data.result});assert.equal(edit.data.result.file,'chapters/intro.tex');
  });
  await check('Concurrent manual snapshots have unique IDs',async()=>{const snapshots=await Promise.all(Array.from({length:12},(_,i)=>api('/api/projects/'+id+'/snapshots',{type:'manual',name:'Concurrent '+i,files,activeFile:'main.tex'})));assert.ok(snapshots.every(r=>r.data.ok));const list=await api('/api/projects/'+id+'/snapshots',undefined,'GET');assert.equal(list.data.manualCount,12);assert.equal(new Set(list.data.items.map(s=>s.id)).size,12);});
  await check('Invalid file set rejected without partial writes',async()=>{const bad=await api('/api/projects/'+id,{files:{'main.tex':'should not save','../outside.tex':'invalid'}},'PUT');assert.equal(bad.data.ok,false);const after=await api('/api/projects/'+id,undefined,'GET');assert.equal(after.data.project.files['main.tex'],tex);});
 }finally{if(id)await fetch(base+'/api/projects/'+id,{method:'DELETE'});fs.writeFileSync('tmp/edge-case-audit-results.json',JSON.stringify(results,null,2));}
 if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});
