 
const assert = require('node:assert/strict');
const base=process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306';
(async()=>{
  const boot=await fetch(base); const cookie=boot.headers.get('set-cookie')?.match(/lemmata_session=[a-f0-9]{64}/)?.[0]; assert(cookie);
  const request=(route,data,method=data?'POST':'GET')=>fetch(base+route,{method,headers:{cookie,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});
  let id;
  try {
    if(process.env.LEMMATA_TEST_TEX_BIN){const configured=await request('/api/system',{action:'configure',binDirectory:process.env.LEMMATA_TEST_TEX_BIN});assert.equal(configured.status,200);}
    const system=await (await request('/api/system')).json();
    assert(['pdflatex','xelatex','lualatex'].every(engine=>system.engines[engine]),'Install all three engines for this native test, or set LEMMATA_TEST_TEX_BIN to a portable distribution.');
    const files={'src/paper.tex':'\\documentclass{article}\n\\usepackage{iftex}\n\\begin{document}\nRoot text.\n\\input{parts/results}\n\\end{document}', 'parts/results.tex':'\\section{Results}\\label{sec:results}\nNative source anchor text.\n\\newpage\nSecond page text.'};
    const created=await (await request('/api/projects',{name:'Native workspace test '+Date.now(),files})).json(); assert(created.ok);id=created.id;
    for(const engine of ['pdflatex','xelatex','lualatex']){
      const condition={pdflatex:'ifPDFTeX',xelatex:'ifXeTeX',lualatex:'ifLuaTeX'}[engine];
      const compiledFiles={...files,'src/paper.tex':files['src/paper.tex'].replace('\\begin{document}',`\\${condition}\\else\\errmessage{Wrong engine}\\fi\n\\begin{document}`)};
      const response=await request('/api/compile',{engine,files:compiledFiles,mainFile:'src/paper.tex',projectId:id});
      if(!response.ok)throw new Error(engine+': '+await response.text());
      assert.equal(response.headers.get('X-Compile-Engine'),engine);
      assert.match(response.headers.get('X-Compile-Compiler'),{pdflatex:/pdfTeX/,xelatex:/XeTeX/,lualatex:/LuaHBTeX|LuaTeX/}[engine]);
      assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
      const forward=await (await request('/api/synctex',{action:'view',projectId:id,pdfFile:'paper.pdf',sourceFile:'parts/results.tex',line:2,column:1})).json();
      assert.equal(forward.ok,true,JSON.stringify(forward));assert.equal(forward.result.page,1);assert(Number.isFinite(forward.result.x)&&Number.isFinite(forward.result.y));
      const inverse=await (await request('/api/synctex',{action:'edit',projectId:id,pdfFile:'paper.pdf',page:forward.result.page,x:forward.result.x,y:forward.result.y})).json();
      assert.equal(inverse.ok,true,JSON.stringify(inverse));assert.equal(inverse.result.file,'parts/results.tex');assert(inverse.result.line>=1&&inverse.result.line<=3);
      console.log('PASS real '+engine+' identity, nested main/input, PDF and forward/inverse SyncTeX');
    }
    const broken={...files,'parts/results.tex':'\\section{Results}\n\\UndefinedLemmataCommand\n'};
    const response=await request('/api/compile',{engine:'pdflatex',files:broken,mainFile:'src/paper.tex',projectId:id}); assert.equal(response.status,400);
    const failure=await response.json();assert(failure.diagnostics.some(item=>item.file==='parts/results.tex'&&item.line===2),JSON.stringify(failure.diagnostics));
    console.log('PASS real nested-file error diagnostics with exact file/line');
    const fontSource='\\documentclass{article}\n\\usepackage{fontspec}\n\\setmainfont{LemmataMissingFontForAudit}\n\\begin{document}Test.\\end{document}';
    const wrongEngine=await request('/api/compile',{engine:'pdflatex',files:{'main.tex':fontSource},synctex:false});assert.equal(wrongEngine.status,400);assert.match((await wrongEngine.json()).log,/requires XeLaTeX or LuaLaTeX/);
    const missingFont=await request('/api/compile',{engine:'xelatex',files:{'main.tex':fontSource},synctex:false});assert.equal(missingFont.status,400);const fontFailure=await missingFont.json();assert.match(fontFailure.log,/requested font could not be resolved/);assert(fontFailure.diagnostics.some(item=>item.message.includes('LemmataMissingFontForAudit')));
    console.log('PASS wrong-engine vs missing-font guidance and detailed source-linked font diagnostics');
    for(const dependency of ['custom.def','notes.txt']){const blocked=await request('/api/compile',{engine:'lualatex',files:{'main.tex':'\\documentclass{article}\n\\begin{document}\\input{'+dependency+'}\\end{document}',[dependency]:'\\directlua{print("blocked")}'},synctex:false});assert.equal(blocked.status,400);assert.match((await blocked.json()).log,/Restricted/);}
    console.log('PASS live rejection of restricted primitives in imported resources and literal text inputs');
  } finally {if(id)await request('/api/projects/'+id,undefined,'DELETE');}
})().catch(error=>{console.error(error);process.exitCode=1;});
