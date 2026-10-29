// Repeatable, fail-closed QA runner. Optional API/browser phases use disposable projects.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname,'..'), args = new Set(process.argv.slice(2)), results = [];
process.chdir(root); fs.mkdirSync('tmp',{recursive:true});
const checks = ['ai-conversation','ai-provider','pdf-chat','format','image','privacy','setup','workspace','review','review-visual','interaction'].map(name=>['scripts/'+name+'-regressions.cjs']);
checks.push(['scripts/journal-git-regressions.cjs']);
checks.push(['scripts/build-history-regressions.cjs']);
checks.push(['scripts/wizard-regressions.cjs']);
checks.push(['scripts/installer-regressions.cjs']);
checks.push(['scripts/package-regressions.cjs']);
checks.push(['scripts/compiler-foundation-regressions.cjs']);
checks.push([path.join(path.dirname(require.resolve('typescript/package.json')),'bin','tsc'),'--noEmit']);
checks.push([path.join(path.dirname(require.resolve('eslint/package.json')),'bin','eslint.js'),'.','--format','json','--output-file','tmp/qa-eslint.json']);
const env = { ...process.env, LEMMATA_TEST_URL: process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306' };
env.LEMMATA_PORT = new URL(env.LEMMATA_TEST_URL).port;
if(args.has('--api')) checks.push(...['workflow-regressions','edge-case-audit','engine-identity-audit','feature-audit','workspace-live-tests'].map(name=>['scripts/'+name+'.cjs']),['scripts/privacy-regressions.cjs','--live'],['scripts/format-regressions.cjs','--live']);
if(args.has('--browser')) checks.push(...['interaction','workspace','studio','premium','quality','ai','build-history'].map(name=>['scripts/'+name+'-browser-tests.cjs']));
for(const command of checks) {
  const started=Date.now(); console.log('\nCHECK '+command.join(' '));
  const result=spawnSync(process.execPath,command,{cwd:root,env,stdio:'inherit',windowsHide:true,timeout:600000});
  if(command[0].endsWith('eslint.js') && fs.existsSync('tmp/qa-eslint.json')) { const lint=JSON.parse(fs.readFileSync('tmp/qa-eslint.json','utf8')); console.log('Lint: '+lint.reduce((sum,file)=>sum+file.errorCount,0)+' errors, '+lint.reduce((sum,file)=>sum+file.warningCount,0)+' warnings.'); }
  results.push({ check: command.join(' '), status: result.status===0?'PASS':'FAIL', exitCode: result.status, milliseconds:Date.now()-started, ...(result.error?{error:result.error.message}:{}) });
}
const summary={ testedAt:new Date().toISOString(),node:process.version,platform:process.platform,results };
fs.writeFileSync('tmp/qa-results.json',JSON.stringify(summary,null,2));
console.log('\n'+results.filter(row=>row.status==='PASS').length+'/'+results.length+' QA groups passed. Evidence: tmp/qa-results.json');
if(results.some(row=>row.status==='FAIL'))process.exitCode=1;
