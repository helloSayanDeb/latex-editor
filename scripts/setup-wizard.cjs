const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const ledger=require('./install-ledger.cjs');
const core=require('./setup-core.cjs'),{choose,question,amber}=require('./setup-terminal.cjs');
const root=path.resolve(__dirname,'..'),data=process.env.LEMMATA_DATA_DIR||root,flags=new Set(process.argv.slice(2));
async function main(){
 console.log(amber('\n  L E M M A T A\n  LOCAL WORKSPACE / GUIDED SETUP\n'));
 if(Number(process.versions.node.split('.')[0])<22)throw new Error('Use Node.js 22 or newer.');
 if(flags.has('--check')){const results=await core.verifyAll(data);if(!results.every(result=>result.ok))process.exitCode=1;return;}
 if(process.platform==='darwin'&&core.hostArch()!=='arm64')throw new Error('Automatic Mac setup targets Apple Silicon. Configure an existing compiler directory manually.');
 if(process.platform==='win32'&&!['x64','arm64'].includes(core.hostArch()))throw new Error('Automatic setup requires Windows x64 or ARM64.');
 if(!process.stdin.isTTY)throw new Error('Run setup in an interactive terminal, or use --check.');
 if(!flags.has('--no-launch')){const port=Number(process.env.LEMMATA_PORT||2303);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid LEMMATA_PORT.');await new Promise((resolve,reject)=>{const test=net.createServer();test.once('error',()=>reject(new Error(`Port ${port} is occupied. Stop the existing server before setup, or choose LEMMATA_PORT.`)));test.listen(port,'127.0.0.1',()=>test.close(resolve));});}
 ledger.record(root,{id:'workspace',kind:'workspace',status:'prepared'});
 console.log('  1 / 5  Prepare the application');
 if(!flags.has('--skip-build')){if(process.platform==='win32')await core.run('powershell.exe',['-NoProfile','-Command','& npm.cmd ci --no-audit --no-fund; exit $LASTEXITCODE'],{cwd:root});else await core.run('npm',['ci','--no-audit','--no-fund'],{cwd:root});await core.run(process.execPath,[path.join(__dirname,'sync-pdf-assets.cjs')],{cwd:root});await core.run(process.execPath,[path.join(root,'node_modules','next','dist','bin','next'),'build'],{cwd:root});}
 console.log('\n  2 / 5  Check actual PDF compilation');let results=await core.verifyAll(data);
 while(!results.every(result=>result.ok)){
  console.log('\n  Available disk space and package sizes vary. Estimates below include growth, not a guaranteed download size.');
  try{const free=fs.statfsSync(data);console.log('  Free space on the data volume: '+Math.round(Number(free.bavail)*Number(free.bsize)/1024**3)+' GB');}catch{}
  const choice=await choose('Choose a compiler installation',[...core.distributions(),{value:'custom',label:'Use an existing compiler directory',detail:'Keep your installation. Supply the absolute bin folder containing the engines.'},{value:'retry',label:'Check again',detail:'Use after repairing packages or finishing an installation.'},...(results.some(result=>result.ok)?[{value:'partial',label:'Continue with verified engines only',detail:'Failed engines remain unavailable; installation is not reported as fully verified.'}]:[]),{value:'editing',label:'Continue with editing only',detail:'No default compiler is marked verified. Install a distribution later in Lemmata setup.'}]);
  if(choice==='editing'){results=[];break;}if(choice==='partial')break;
  try{if(choice==='custom'){const directory=await question('Absolute compiler bin directory:');if(!path.isAbsolute(directory)||!fs.statSync(directory).isDirectory())throw new Error('Choose an existing absolute directory.');core.saveSettings(data,{binDirectory:directory});}
  else if(choice!=='retry'){const option=core.distributions().find(item=>item.value===choice);const confirmation=await choose('Download and install '+option.label+'?',[{value:'yes',label:'Install selected distribution',detail:option.detail+' Official vendor downloads; OS approval may be required.'},{value:'no',label:'Back',detail:'No download or installation.'}]);if(confirmation==='no')continue;console.log('  3 / 5  Download / install — vendor progress follows');await core.install(choice,root,data);}
  console.log('\n  4 / 5  Verify all three engines again');results=await core.verifyAll(data);
  }catch(error){console.error('\n  Installation/check failed: '+error.message+'\n  You can retry, choose an existing directory or continue editing.');}
 }
 const verified=results.filter(result=>result.ok);
 if(verified.length){const engine=await choose('Choose the default engine',verified.map(result=>({value:result.engine,label:result.engine,detail:result.engine==='pdflatex'?'Fast conventional documents; standard LaTeX fonts.':result.engine==='xelatex'?'Unicode, system/OpenType fonts and multilingual documents.':'Unicode/OpenType fonts and Lua-based typesetting.'})));const selected=verified.find(result=>result.engine===engine);core.saveSettings(data,{defaultEngine:engine,binDirectory:path.dirname(selected.file)});console.log(amber(verified.length===3?'\n  All three engines verified successfully.':'\n  Partial setup: '+verified.length+'/3 engines verified.'));}
 if(process.platform==='darwin'){try{fs.chmodSync(path.join(root,'Lemmata Setup.command'),0o755);}catch{}}
 if(process.platform==='win32'&&!flags.has('--no-shortcut')){try{await require('./setup-shortcut.cjs').createShortcut(root);}catch(error){console.log('  Shortcut could not be created: '+error.message);}}
 if(flags.has('--no-launch'))return;
 console.log('\n  5 / 5  Start Lemmata and open your browser');
 const port=Number(process.env.LEMMATA_PORT||2303);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid LEMMATA_PORT.');
 await new Promise((resolve,reject)=>{const test=net.createServer();test.once('error',()=>reject(new Error(`Port ${port} is occupied. Stop that server or choose LEMMATA_PORT.`)));test.listen(port,'127.0.0.1',()=>test.close(resolve));});
 const child=require('node:child_process').spawn(process.execPath,[path.join(__dirname,'launch-local.cjs'),'start','--no-engine-prompt',...(verified.length?['--setup-verified']:[])],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,LEMMATA_DATA_DIR:data}});
 let exited=false;child.once('error',error=>{exited=true;console.error(error.message);});child.once('exit',()=>{exited=true;});
 const stop=()=>{child.kill();};process.once('SIGINT',stop);process.once('SIGTERM',stop);
 try{let ready=false;for(let i=0;i<120&&!exited;i++){try{const response=await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1000)});await response.body?.cancel();if(response.ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}if(!ready)throw new Error('Local server did not become ready.');const url=`http://127.0.0.1:${port}/`;if(process.platform==='win32')await core.run('rundll32.exe',['url.dll,FileProtocolHandler',url]);else await core.run(process.platform==='darwin'?'open':'xdg-open',[url]);console.log(amber('\n  Lemmata is ready: '+url+'\n  Keep this terminal open. Ctrl+C stops the server.'));await new Promise(resolve=>{if(exited)resolve();else child.once('exit',resolve);});}catch(error){child.kill();throw error;}finally{process.removeListener('SIGINT',stop);process.removeListener('SIGTERM',stop);}
}
if(require.main===module)main().catch(error=>{console.error('\n  '+error.message);process.exitCode=1;});
module.exports={main};
