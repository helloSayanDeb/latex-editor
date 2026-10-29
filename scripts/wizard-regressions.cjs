const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const core=require('./setup-core.cjs');
(async()=>{
 assert.deepEqual(core.distributions('win32','arm64').map(item=>item.value),['texlive']);
 assert.equal(core.distributions('win32','x64').length,3);
 assert.deepEqual(core.distributions('darwin','arm64').map(item=>item.value),['tiny','basictex','mactex']);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lemmata-wizard-check-'));
 try{
  core.saveSettings(dir,{binDirectory:'preserved',extra:true});core.saveSettings(dir,{defaultEngine:'xelatex'});
  assert.deepEqual(core.readSettings(dir),{binDirectory:'preserved',extra:true,defaultEngine:'xelatex'});
  assert.equal((await core.verifyEngine('pdflatex',null)).ok,false);
  assert.equal((await core.verifyEngine('xelatex',process.execPath)).ok,false);
  await assert.rejects(core.verifyEngine('arbitrary',null),/Unknown/);
  await assert.rejects(core.install('not-an-installer',dir),/unavailable/);
  console.log('PASS wizard architecture menus, preserved settings, missing/broken compiler checks and installer allowlist');
 }finally{if(path.dirname(dir)===os.tmpdir()&&path.basename(dir).startsWith('lemmata-wizard-check-'))fs.rmSync(dir,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
