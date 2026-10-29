const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict'),ts=require('typescript');
function load(file){const filename=path.resolve(file),m=new Module(filename,module);m.filename=filename;m.paths=module.paths;m.require=name=>name.startsWith('.')?load(path.resolve(path.dirname(filename),name+'.ts')):require(name);m._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,filename);return m.exports;}
const {compilerFailure}=load('src/lib/compiler-failure.ts'),{resolveCompileDirectives:resolve}=load('src/lib/compile-directives.ts'),{runBuildRecipe}=load('src/lib/build-settings.ts');
assert.match(compilerFailure({code:3221225781},'pdflatex','compiler.exe'),/DLL.*missing/);
assert.match(compilerFailure({code:-1073741515},'pdflatex','compiler.exe'),/0xC0000135/);
assert.match(compilerFailure({code:'ENOENT'},'biber','biber.exe'),/executable is missing/);
assert.match(compilerFailure({killed:true},'makeindex','makeindex.exe'),/execution or output limit/);
assert.equal(resolve({'chapters/a.tex':'% !TeX root = ../main.tex','main.tex':'% !TEX program = xelatex'},'chapters/a.tex','xelatex'),'main.tex');
assert.throws(()=>resolve({'main.tex':'% !TeX engine = xelatex'},'main.tex','pdflatex'),/requests xelatex/);
assert.throws(()=>resolve({'main.tex':'% !TeX root = ../private.tex'},'main.tex','pdflatex'),/inside this project/);
assert.throws(()=>resolve({'main.tex':'% !TeX root = a.tex','a.tex':'% !TeX root = main.tex'},'main.tex','pdflatex'),/Circular/);
assert.throws(()=>resolve({'main.tex':'% !TeX root = missing.tex'},'main.tex','pdflatex'),/missing/);
(async()=>{
 const stages=[];
 await runBuildRecipe('standard',async()=>stages.push('engine'),async()=>{stages.push('bib');return true;},()=>'',async()=>{stages.push('index');return true;});
 assert.deepEqual(stages,['engine','bib','index','engine','engine']);
 await runBuildRecipe('quick',async()=>{},async()=>{throw Error('unexpected bibliography');},()=>'',async()=>{throw Error('unexpected index');});
 await assert.rejects(runBuildRecipe('standard',async()=>{},async()=>false,()=>'',async()=>{throw Error('index failed');}),/index failed/);
 console.log('PASS compiler startup diagnostics, safe root/program directives, index/bibliography orchestration and quick-build isolation');
})().catch(error=>{console.error(error);process.exitCode=1;});
