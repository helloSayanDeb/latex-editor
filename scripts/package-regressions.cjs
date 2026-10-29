const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),Module=require('node:module'),ts=require('typescript');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'lemmata-package-test-'));
let version='MiKTeX-pdfTeX 25.12',enginePath=path.join(root,'bin','windows',process.platform==='win32'?'pdflatex.exe':'pdflatex');
const calls=[];let fail=false;
const catalog='pgf|texmf/tex/latex/pgf/frontendlayer/tikz.sty;texmf/tex/generic/pgf/pgfcore.tex\ncircuitikz|texmf/tex/latex/circuitikz/circuitikz.sty\n';
function load(file,stubs={}){const filename=path.resolve(file),mod=new Module(filename,module);mod.filename=filename;mod.paths=module.paths;const req=mod.require.bind(mod);mod.require=name=>name in stubs?stubs[name]:req(name);mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return mod.exports;}
(async()=>{try{
 const parsed=load('src/lib/package-catalog.ts');
 assert.deepEqual(parsed.missingPackageFiles("main.tex:12: Package tikz Error: I did not find the tikz library 'shadows.blur'\n. I looked for files named tikzlibraryshadows.blur.code.tex and pgflibraryshado\nws.blur.code.tex, but neither could be found."),['tikzlibraryshadows.blur.code.tex']);
 assert.deepEqual(parsed.missingPackageFiles("Package pgf Error: I did not find the pgf library 'fpu'."),['pgflibraryfpu.code.tex']);
 assert.deepEqual(parsed.missingPackageFiles("I can't find file `tcbskins.code.tex'."),['tcbskins.code.tex']);
 assert.deepEqual(parsed.missingPackageFiles("I did not find the tikz library '../escape'.\nI can't find file `chapter.tex'."),[]);
 assert.deepEqual(parsed.miktexFilePackages('pgf-blur|texmf/tex/latex/pgf-blur/tikzlibraryshadows.blur.code.tex',['tikzlibraryshadows.blur.code.tex']),{'tikzlibraryshadows.blur.code.tex':['pgf-blur']});

 assert.deepEqual(parsed.missingPackageFiles("! LaTeX Error: File `tikz.sty' not found.\nLaTeX Error: File 'custom.cls' not found.\nFile `tikz.sty' not found."),['tikz.sty','custom.cls']);
 assert.deepEqual(parsed.missingPackageFiles("File `../evil.sty' not found\nFile `image.png' not found\nFile `chapter.tex' not found\nfontspec error: font missing"),[]);
 assert.deepEqual(parsed.miktexFilePackages(catalog,['tikz.sty','missing.cls']),{'tikz.sty':['pgf'],'missing.cls':[]});
 assert.deepEqual(parsed.texliveFilePackages('pgf:\n texmf-dist/tex/latex/pgf/frontendlayer/tikz.sty\nother:\n path/not-tikz.sty\n','tikz.sty'),['pgf']);
 fs.mkdirSync(path.dirname(enginePath),{recursive:true});fs.writeFileSync(path.join(path.dirname(enginePath),process.platform==='win32'?'miktex.exe':'miktex'),'fixture');
 if(process.platform==='win32'){fs.mkdirSync(path.join(root,'tlpkg','tlperl','bin'),{recursive:true});fs.writeFileSync(path.join(root,'tlpkg','tlperl','bin','perl.exe'),'fixture');fs.mkdirSync(path.join(root,'texmf-dist','scripts','texlive'),{recursive:true});fs.writeFileSync(path.join(root,'texmf-dist','scripts','texlive','tlmgr.pl'),'fixture');}else fs.writeFileSync(path.join(path.dirname(enginePath),'tlmgr'),'fixture');
 const manager=load('src/lib/package-manager.ts',{'./package-catalog':parsed,'./compile-policy':{compilerEnvironment:()=>({PATH:process.env.PATH})},'./lemmata-environment':{resolveTool:()=>enginePath},'node:child_process':{execFile:(file,args,options,callback)=>{calls.push({file,args,options});if(args[0]==='--version')return callback(null,{stdout:version,stderr:''});if(fail)return callback(Object.assign(new Error('permission denied'),{stderr:'permission denied'}));callback(null,{stdout:args.includes('list')?catalog:args.includes('search')?'pgf:\n texmf-dist/tex/latex/pgf/frontendlayer/tikz.sty\n':'installed',stderr:''});}}});
 // A callback mock must expose the same promisified shape as native execFile.
 // The shim above returns a single object, which promisify preserves.
 await assert.rejects(manager.lookupPackages('pdftex',['tikz.sty']),/supported/);
 await assert.rejects(manager.lookupPackages('pdflatex',['../evil.sty']),/valid/);
 const lookup=await manager.lookupPackages('pdflatex',['tikz.sty']);assert.deepEqual(lookup.packages,['pgf']);
 assert(!calls.some(call=>call.args.includes('install')),'lookup never installs');
 await assert.rejects(manager.installPackages(lookup.token,['shell-escape']),/approved/);
 await manager.installPackages(lookup.token,['pgf']);assert(calls.some(call=>call.args.join(' ')==='--disable-installer packages install pgf'));
 await assert.rejects(manager.installPackages(lookup.token,['pgf']),/expired/);
 const stale=await manager.lookupPackages('pdflatex',['tikz.sty']);const oldPath=enginePath;enginePath=path.join(root,'other','pdflatex.exe');fs.mkdirSync(path.dirname(enginePath),{recursive:true});fs.writeFileSync(path.join(path.dirname(enginePath),process.platform==='win32'?'miktex.exe':'miktex'),'x');await assert.rejects(manager.installPackages(stale.token,['pgf']),/changed/);enginePath=oldPath;
 version='pdfTeX (TeX Live 2026)';const tl=await manager.lookupPackages('pdflatex',['tikz.sty']);assert.equal(tl.distribution,'TeX Live');assert.deepEqual(tl.packages,['pgf']);assert(calls.some(call=>call.args.includes('/tikz\\.sty$')));await manager.installPackages(tl.token,['pgf']);
 fail=true;await assert.rejects(manager.lookupPackages('pdflatex',['tikz.sty']),/administrator permissions/);
 assert(calls.every(call=>!call.options.shell),'never use shell interpolation');
 console.log('PASS missing-file classification; real filename/package mapping; both vendor contracts; lookup-only behavior; approved tickets; replay, injection, switched distribution and permission handling');
 }finally{if(path.dirname(root)===os.tmpdir()&&path.basename(root).startsWith('lemmata-package-test-'))fs.rmSync(root,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
