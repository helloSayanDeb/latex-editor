require('./local-test-session.cjs');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const pdfjs=require('pdfjs-dist/legacy/build/pdf.js');
const base='http://127.0.0.1:2303';
(async()=>{
  const system=await (await fetch(base+'/api/system')).json();
  const results=[];
  for(const engine of ['pdflatex','xelatex','lualatex']) {
    const expected={pdflatex:'PDFTEX',xelatex:'XETEX',lualatex:'LUATEX'}[engine];
    const condition={pdflatex:'ifPDFTeX',xelatex:'ifXeTeX',lualatex:'ifLuaTeX'}[engine];
    const tex=String.raw`\documentclass{article}
\usepackage{iftex}
${'\\'+condition} \else \errmessage{Wrong engine was invoked} \fi
${engine==='pdflatex'?'':String.raw`\usepackage{fontspec}\setmainfont{Latin Modern Roman}`}
\begin{document}
ENGINE IDENTITY: ${expected}
${engine==='pdflatex'?'':String.raw`Native fontspec text: café, naïve.`}
\end{document}`;
    const response=await fetch(base+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({engine,files:{'main.tex':tex},synctex:false})});
    if(!response.ok)throw new Error(engine+': '+await response.text());
    assert.equal(response.headers.get('X-Compile-Engine'),engine);
    const compiler=response.headers.get('X-Compile-Compiler');
    assert.match(compiler,{pdflatex:/pdfTeX/,xelatex:/XeTeX/,lualatex:/LuaHBTeX|LuaTeX/}[engine]);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const pdf=await pdfjs.getDocument({data:bytes}).promise;
    const page=await pdf.getPage(1);
    const text=(await page.getTextContent()).items.map(item=>item.str).join(' ');
    assert.ok(text.includes(expected));
    const metadata=await pdf.getMetadata();
    results.push({engine,status:'PASS',installedVersion:system.engineVersions[engine],compiler,producer:metadata.info.Producer,text});
    fs.writeFileSync('docs/engine-proof-'+engine+'.pdf',bytes);
    await pdf.destroy();
    console.log(engine,compiler,metadata.info.Producer);
  }
  fs.writeFileSync('docs/engine-identity-results.json',JSON.stringify(results,null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
