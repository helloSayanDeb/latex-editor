process.env.LEMMATA_TEST_URL ||= 'http://127.0.0.1:2306';
require('./local-test-session.cjs');
const assert=require('node:assert/strict');
const url=process.env.LEMMATA_TEST_URL;
async function compile(files,extra={}) {
 const response=await fetch(url+'/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({files,mainFile:'main.tex',engine:'pdflatex',...extra})});
 if(!response.ok)throw Error(await response.text());
 assert.equal(response.headers.get('content-type'),'application/pdf');
 assert((await response.arrayBuffer()).byteLength>500);
 return response;
}
(async()=>{
 for(const engine of ['pdflatex','xelatex','lualatex']) {
  await compile({'main.tex':'\\documentclass{article}\n\\begin{document}Engine verification.\\end{document}'},{engine});
  console.log('PASS real '+engine);
 }
 const indexed=await compile({'main.tex':'\\documentclass{article}\n\\usepackage{makeidx}\n\\makeindex\n\\begin{document}Alphabet\\index{Alphabet}\\printindex\\end{document}'});
 assert.equal(indexed.headers.get('x-build-passes'),'3'); console.log('PASS real MakeIndex build');
 await compile({'paper/main.tex':'\\documentclass{article}\n\\begin{document}\\input{section}\\cite{example}\\bibliographystyle{plain}\\bibliography{references}\\end{document}','paper/section.tex':'Nested source.','paper/references.bib':'@book{example,author={A. Writer},title={Example},year={2026},publisher={Press}}'},{mainFile:'paper/main.tex'});console.log('PASS nested source and real BibTeX');
 await compile({'main.tex':'% !TeX root = paper.tex','paper.tex':'\\documentclass{article}\n\\begin{document}Root resolved.\\end{document}'});console.log('PASS root document');
 const controller=new AbortController();
 const pending=fetch(url+'/api/compile',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({engine:'pdflatex',files:{'main.tex':'\\documentclass{article}\n\\begin{document}\\def\\forever{\\forever}\\forever\\end{document}'}})});
 setTimeout(()=>controller.abort(),1200);
 await assert.rejects(pending,/abort/i);
 let last;
 for(let i=0;i<20;i++){try{await compile({'main.tex':'\\documentclass{article}\n\\begin{document}After cancellation.\\end{document}'});last=null;break;}catch(error){last=error;if(!/Another compilation/.test(error.message))throw error;await new Promise(resolve=>setTimeout(resolve,250));}}
 if(last)throw last;
 console.log('PASS cancellation releases native process and next build succeeds');
})().catch(error=>{console.error(error);process.exitCode=1;});
