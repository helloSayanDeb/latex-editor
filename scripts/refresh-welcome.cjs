// One-time, backed-up refresh of the legacy welcome document identified in the UI.
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const mod = new Module('welcome');
mod._compile(ts.transpileModule(fs.readFileSync('src/lib/welcome-document.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,'welcome.js');
const base = 'http://127.0.0.1:2303/api/projects/new-document-muyhhxjf';
async function request(url, method, body) {
  const r = await fetch(url, {method, ...(body ? {headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})});
  const d = await r.json(); if (!r.ok || !d.ok) throw new Error(JSON.stringify(d)); return d;
}
(async () => {
  const {project} = await request(base, 'GET');
  const old = project.files['main.tex'];
  if (!old.includes('Welcome to TeXStudio Local') || !old.includes('Your High-Performance Personal LaTeX Workstation')) throw new Error('Legacy welcome signature does not match; no changes made.');
  await request(base+'/snapshots','POST',{name:'Before one-page welcome redesign',type:'manual',files:project.files,activeFile:'main.tex'});
  await request(base,'PUT',{...project.metadata,files:{...project.files,'main.tex':mod.exports.WELCOME_LATEX_CONTENT}});
  console.log('Legacy welcome refreshed; original preserved in a manual snapshot.');
})().catch(e=>{console.error(e);process.exitCode=1;});
