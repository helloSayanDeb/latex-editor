const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const base = 'http://127.0.0.1:2303';
async function api(url,body,method='POST') {
  const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  return r.json();
}
(async()=>{
  const results=[];
  const view=await api('/api/synctex',{action:'view',projectId:'new-document-muyhhxjf',line:30});
  assert.equal(view.ok,true,JSON.stringify(view));
  const edit=await api('/api/synctex',{action:'edit',projectId:'new-document-muyhhxjf',...view.result});
  assert.equal(edit.ok,true,JSON.stringify(edit));assert.equal(edit.result.file,'main.tex');assert.ok(edit.result.line>1);
  results.push({name:'SyncTeX forward and reverse API',status:'PASS',view:view.result,edit:edit.result});
  let id;
  try {
    const files={'main.tex':'Audit git file'};
    const project=await api('/api/projects',{name:'Disposable git audit '+Date.now(),files});id=project.id;assert.ok(id);
    assert.equal((await api('/api/git',{projectId:id,action:'init'})).ok,true);
    const cwd=path.resolve('projects',id);
    execFileSync('git',['config','user.name','Local audit'],{cwd});
    execFileSync('git',['config','user.email','audit@example.invalid'],{cwd});
    const commit=await api('/api/git',{projectId:id,action:'commit',message:'Audit literal "quotes" & text'});
    assert.equal(commit.ok,true,JSON.stringify(commit));
    const log=await api('/api/git',{projectId:id,action:'log'});assert.equal(log.commits.length,1);
    await api('/api/projects/'+id,{files:{'main.tex':'Changed audit file'}},'PUT');
    const diff=await api('/api/git',{projectId:id,action:'diff',file:'main.tex'});assert.match(diff.diff,/Changed audit file/);
    const status=await api('/api/git',{projectId:id,action:'status'});assert.ok(status.files.some(f=>f.name==='main.tex'&&f.status==='M'));
    results.push({name:'Git commit, log, diff and modified filename parsing',status:'PASS'});
  } finally {if(id) await fetch(base+'/api/projects/'+id,{method:'DELETE'});}
  fs.writeFileSync('docs/navigation-git-audit-results.json',JSON.stringify(results,null,2));
  console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
