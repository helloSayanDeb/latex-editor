const fs=require('node:fs'),path=require('node:path');
const ledger=require('./install-ledger.cjs'),core=require('./setup-core.cjs'),{choose,question}=require('./setup-terminal.cjs');
const generated=['node_modules','.next','tmp','temp','out','tsconfig.tsbuildinfo','next-env.d.ts','Lemmata Setup.lnk','public/lemmata.ico','public/vendor/pdf.min.mjs','public/vendor/pdf.worker.min.mjs','public/vendor/pdfjs','public/vendor/PDFJS-LICENSE'];
function removeLocal(root,relative){if(![...generated,'projects','lemmata-settings.json'].includes(relative))throw new Error('Unapproved cleanup target.');const file=path.resolve(root,relative);if(!file.startsWith(path.resolve(root)+path.sep))throw new Error('Target escaped checkout.');if(fs.existsSync(file)){if(!fs.realpathSync(path.dirname(file)).startsWith(fs.realpathSync(root)+path.sep)&&fs.realpathSync(path.dirname(file))!==fs.realpathSync(root))throw new Error('Cleanup parent escaped checkout.');if(fs.lstatSync(file).isSymbolicLink())throw new Error('Refusing linked cleanup root.');fs.rmSync(file,{recursive:true,force:true,maxRetries:3});}}
async function removeComponent(root,item){
 if(item.kind==='directory'){
  if(!fs.existsSync(item.path)){ledger.forget(root,item.id);return;}
  const target=ledger.assertOwned(root,item);
  if(item.id==='node'&&process.execPath.startsWith(target+path.sep)&&process.platform==='win32'){
   const temp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'lemmata-remove-node-')),request=path.join(temp,'request.json');
   fs.writeFileSync(request,JSON.stringify({pid:process.pid,target,id:ledger.read(root).id,root}));
   ledger.record(root,{id:'node',status:'removal-pending'});
   const child=require('node:child_process').spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'uninstall-runtime.ps1'),'-Request',request],{detached:true,stdio:'ignore',windowsHide:true});child.unref();console.log('Owned Node removal is scheduled after this uninstaller exits. The receipt stays marked removal-pending; keep it if manual recovery is needed.');return;
  }
  fs.rmSync(target,{recursive:true,force:true,maxRetries:3});ledger.forget(root,item.id);return;
 }
 if(item.kind==='winget'&&item.id==='miktex'&&item.packageId==='MiKTeX.MiKTeX'){await core.run('winget',['uninstall','--exact','--id',item.packageId,'--silent','--accept-source-agreements']);ledger.forget(root,item.id);return;}
 if(item.kind==='mac-package'&&['basictex','mactex'].includes(item.id)&&process.platform==='darwin'){
  if(!item.paths?.length)throw new Error('No verified created paths were recorded. Use the vendor repair/uninstall tools.');
  for(const target of item.paths){if(!/^\/usr\/local\/texlive\/\d{4}(basic)?$/.test(target)||!fs.existsSync(target)||fs.lstatSync(target).isSymbolicLink())throw new Error('Invalid or changed package path.');await core.run('sudo',['/bin/rm','-rf','--',target]);}
  ledger.forget(root,item.id);console.log('Compiler files removed. Shared system links, package receipts and companion GUI apps are retained; manage those with macOS vendor tools.');return;
 }
 throw new Error('This component cannot be safely removed automatically.');
}
async function main(){const root=path.resolve(__dirname,'..'),data=process.env.LEMMATA_DATA_DIR||root;console.log('Lemmata uninstall / cleanup. Pre-existing and untracked external tools are preserved. Stop the Lemmata server first.');
 if(process.argv.includes('--list')){console.log(JSON.stringify(ledger.read(root).components.map(({id,kind,status})=>({id,kind,status})),null,2));return;}
 await new Promise((resolve,reject)=>{const server=require('node:net').createServer();server.once('error',()=>reject(new Error('Stop the Lemmata server before cleanup. The configured port is occupied.')));server.listen(Number(process.env.LEMMATA_PORT||2303),'127.0.0.1',()=>server.close(resolve));});
 for(;;){const choice=await choose('What would you like to remove?',[{value:'generated',label:'Application dependencies and generated builds',detail:'Remove node_modules, build/test output and generated shortcut/icon. Keep source, settings and papers.'},{value:'engines',label:'Setup-owned compiler installations',detail:'Choose individually. Existing/untracked installations are never selected automatically.'},{value:'settings',label:'Reset application settings',detail:'Remove this checkout’s settings. Browser AI preferences are separate; clear them in your browser if needed.'},{value:'papers',label:'Delete saved projects and papers',detail:'Permanent deletion including snapshots and reviews. Requires typed confirmation.'},{value:'node',label:'Setup-owned Node runtime',detail:'Only a private runtime logged by this installation. Your pre-existing system Node.js and Git are preserved.'},{value:'done',label:'Finish',detail:'Leave the remaining files unchanged.'}]);
  if(choice==='done')break;
  try{if(choice==='generated'){if(await choose('Remove generated application files?',[{value:'yes',label:'Remove',detail:generated.join(', ')},{value:'no',label:'Keep',detail:'No changes.'}])==='yes')for(const item of generated)removeLocal(root,item);}
  else if(choice==='settings'||choice==='papers'){const phrase=choice==='papers'?'DELETE PAPERS':'RESET SETTINGS';if(await question('Type '+phrase+' to confirm:')!==phrase)continue;removeLocal(data,choice==='papers'?'projects':'lemmata-settings.json');}
  else{const entries=ledger.read(root).components.filter(item=>choice==='node'?item.id==='node':['tiny','texlive','miktex','basictex','mactex'].includes(item.id));if(!entries.length){console.log('No setup-owned components recorded. Nothing external was removed.');continue;}const id=await choose('Choose a recorded component',[...entries.map(item=>({value:item.id,label:item.id+' / '+item.status,detail:item.path||'Vendor installation recorded by this checkout.'})),{value:'back',label:'Back',detail:'No changes.'}]);if(id==='back')continue;if(await question('Type REMOVE '+id+' to confirm:')!=='REMOVE '+id)continue;await removeComponent(root,entries.find(item=>item.id===id));}
  console.log('Selected cleanup completed.');}catch(error){console.error('Cleanup stopped: '+error.message);}
 }
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={removeLocal,removeComponent};
