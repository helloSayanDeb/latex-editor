// Opt-in real compilation/recovery. The report stays local and its source is never rewritten.
const fs=require('node:fs'),path=require('node:path');
const base=process.env.LEMMATA_TEST_URL||'http://127.0.0.1:2306';
process.env.LEMMATA_TEST_URL=base;require('./local-test-session.cjs');
const input=process.argv.find((value,index)=>index>1&&!value.startsWith('--'));
(async()=>{
 if(!input)throw Error('Supply a local .tex/source-text file; --install explicitly permits installing catalog-matched dependencies.');
 const source=fs.readFileSync(input,'utf8');fs.mkdirSync('tmp',{recursive:true});const installed=[];
 for(let attempt=0;attempt<16;attempt++){
  const response=await fetch(base+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engine:'pdflatex',files:{'main.tex':source}})});
  if(response.ok){const bytes=Buffer.from(await response.arrayBuffer());if(bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Invalid PDF');fs.writeFileSync(path.resolve('tmp/report-verified.pdf'),bytes);console.log(JSON.stringify({result:'PASS',pdfBytes:bytes.length,installed}));return;}
  const failure=await response.json();fs.writeFileSync('tmp/report-compile.log',failure.log||'No log');
  if(!failure.missingPackages?.length)throw Error('Not a recognized missing-package failure: '+(failure.diagnostics?.[0]?.message||failure.log?.slice(-1400)||failure.error||response.status));
  console.log('Missing: '+failure.missingPackages.join(', '));
  const lookupResponse=await fetch(base+'/api/packages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'lookup',engine:'pdflatex',files:failure.missingPackages})});const lookup=await lookupResponse.json();
  if(!lookupResponse.ok)throw Error(lookup.error);
  if(Object.values(lookup.matches).some(options=>options.length!==1))throw Error('An unmatched or ambiguous dependency requires review: '+JSON.stringify(lookup.matches));
  console.log('Catalog match: '+lookup.packages.join(', '));if(!process.argv.includes('--install')){console.log('Lookup only; no installation requested.');return;}
  const install=await fetch(base+'/api/packages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'install',token:lookup.token,packages:lookup.packages,approved:true})});const result=await install.json();if(!install.ok)throw Error(result.error);installed.push(...result.installed);
 }
 throw Error('Stopped after 16 recovery attempts.');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
