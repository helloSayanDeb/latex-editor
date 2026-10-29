const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {frame}=require('./setup-terminal.cjs'),ledger=require('./install-ledger.cjs'),{removeLocal,removeComponent}=require('./uninstall-wizard.cjs');
(async()=>{
 const options=Array.from({length:12},(_,i)=>({label:'Install selected distribution '+i,detail:'Download and install a distribution with a long explanation. '.repeat(10)}));
 for(const [width,height] of [[80,24],[35,10],[120,40],[25,8]])for(let i=0;i<200;i++){const lines=frame('Choose a distribution',options,i%options.length,width,height);assert(lines.length<height);assert(lines.every(line=>line.length<=width-2));assert(lines.filter(line=>line.startsWith(' >')).length<=1);}
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lemmata-ownership-check-')),old=process.env.LOCALAPPDATA;
 try {
  process.env.LOCALAPPDATA=path.join(root,'local');
  const target=ledger.claim(root,'tiny');fs.writeFileSync(path.join(target,'fixture'),'owned');
  assert.equal(ledger.assertOwned(root,ledger.read(root).components[0]),target);
  assert.throws(()=>ledger.claim(root,'../../escape'),/Invalid/);
  const outside=path.join(root,'existing-compiler');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'keep'),'existing');
  await assert.rejects(removeComponent(root,{id:'tiny',kind:'directory',path:outside}),/Ownership/);
  fs.writeFileSync(path.join(target,'.lemmata-owner'),'wrong');await assert.rejects(removeComponent(root,ledger.read(root).components[0]),/Ownership/);
  fs.writeFileSync(path.join(target,'.lemmata-owner'),ledger.read(root).id);await removeComponent(root,ledger.read(root).components[0]);
  assert(!fs.existsSync(target));assert(fs.existsSync(path.join(outside,'keep')));assert.equal(ledger.read(root).components.length,0);
  fs.mkdirSync(path.join(root,'node_modules'));fs.writeFileSync(path.join(root,'node_modules','fixture'),'x');removeLocal(root,'node_modules');assert(!fs.existsSync(path.join(root,'node_modules')));
  assert.throws(()=>removeLocal(root,'../other'),/Unapproved/);assert.throws(()=>removeLocal(root,'README.md'),/Unapproved/);
  console.log('PASS 800 bounded menu renders; owned-only uninstall, marker tampering, traversal and source preservation');
 }finally {if(old===undefined)delete process.env.LOCALAPPDATA;else process.env.LOCALAPPDATA=old;if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('lemmata-ownership-check-'))fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
