 
const assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const { chromium } = require(process.env.LEMMATA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306';
function pdfFixture() {
  const text = 'BT /F1 18 Tf 80 700 Td (Lemmata navigation fixture) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${text.length} >>\nstream\n${text}\nendstream`];
  let output='%PDF-1.4\n'; const offsets=[0];
  objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(output));output+=`${index+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(output); output+=`xref\n0 7\n0000000000 65535 f \n`+offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(output);
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1500,height:1000}}), page=await context.newPage();
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  let id, forwardCalls=0;
  try {
    const initialSystem = page.waitForResponse(response => response.url() === base + '/api/system');
    await page.goto(base + '/lemmata');
    if (!(await (await initialSystem).json()).setupAcknowledged) { await page.getByRole('button',{name:'Continue editing only'}).click({timeout:60000}); await page.getByRole('dialog',{name:'Welcome to Lemmata'}).waitFor({state:'hidden'}); }
    const response=await context.request.post(base+'/api/projects',{data:{name:'Workspace browser test '+Date.now(),files:{
      'main.tex':'\\documentclass{article}\n\\begin{document}\n\\section{Alpha}\\label{sec:alpha}\nIntro MAGIC_NEEDLE\n\\end{document}',
      'parts/results.tex':'\\section{Results}\\label{sec:results}\nMore MAGIC_NEEDLE\n\\eqref{eq:missing}',
      'references.bib':'@article{smith2024, author={Jane Smith}, title={A Study}, year={2024}}',
      'image.png':'data:image/png;base64,'+Buffer.from('MAGIC_NEEDLE').toString('base64'),
    }}}); const created=await response.json(); assert.equal(created.ok,true); id=created.id;
    await page.reload(); await page.locator('.cm-content').waitFor();
    await page.locator('.cm-content').waitFor();
    await page.keyboard.press('Control+Shift+p');
    await page.getByRole('combobox',{name:'Find command'}).fill('Search across'); await page.keyboard.press('Enter');
    await page.getByRole('combobox',{name:'Search project',exact:true}).fill('MAGIC_NEEDLE');
    await page.locator('.navigator-results button').first().waitFor(); assert.equal(await page.locator('.navigator-results button').count(),2);
    await page.locator('.navigator-results button').filter({hasText:'parts/results.tex:2'}).click();
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent?.includes('More MAGIC_NEEDLE'));
    await page.waitForFunction(()=>document.querySelector('footer')?.textContent?.includes('Ln 2'));
    await page.keyboard.press('Control+p'); await page.getByRole('combobox',{name:'Find file'}).fill('main.tex'); await page.keyboard.press('Enter');
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent?.includes('Intro MAGIC_NEEDLE'));
    await page.locator('.cm-content').click(); await page.keyboard.press('Control+End'); await page.keyboard.type('\n\\cite{sm'); await page.keyboard.press('Control+Space');
    await page.getByRole('option',{name:/smith2024/}).waitFor(); await page.waitForTimeout(100); await page.keyboard.press('Enter');
    assert.match(await page.locator('.cm-content').textContent(),/\\cite\{smith2024/);
    await page.keyboard.press('Escape'); await page.keyboard.type('}\n\\ref{sec:r'); await page.keyboard.press('Control+Space');
    await page.getByRole('option',{name:/sec:results/}).waitFor(); await page.waitForTimeout(100); await page.keyboard.press('Enter'); await page.keyboard.type('}');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+Shift+m');
    await page.getByRole('region',{name:'Problems'}).waitFor();
    await page.locator('.problem-row').filter({hasText:"Label 'eq:missing'"}).click();
    await page.waitForFunction(()=>document.querySelector('.cm-content')?.textContent?.includes('More MAGIC_NEEDLE'));
    await page.route('**/api/compile',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({success:false,log:'parts/results.tex:2: Undefined control sequence.'})}));
    await page.getByRole('button',{name:/^Compile/}).first().click();
    await page.locator('.problem-row').filter({hasText:'Undefined control sequence'}).waitFor();
    await page.getByRole('button',{name:'Errors',exact:true}).click(); assert.equal(await page.locator('.problem-row').count(),1);
    await page.locator('.problem-row').click(); await page.waitForFunction(()=>document.querySelector('footer')?.textContent?.includes('Ln 2'));
    await page.getByRole('button',{name:'Close Problems'}).click();
    await page.unroute('**/api/compile');
    await page.route('**/api/compile',route=>route.fulfill({status:200,headers:{'content-type':'application/pdf','X-Compile-Engine':'pdflatex'},body:pdfFixture()}));
    await page.keyboard.press('Control+Shift+p'); await page.getByRole('combobox',{name:'Find command'}).fill('no-such-command');
    await page.getByText('No matches.',{exact:true}).waitFor(); await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog',{name:'Workspace navigator'}).count(),0);
    await page.getByRole('button',{name:/Lemmata Assist/}).first().click();
    await page.getByRole('button',{name:'Open paper review'}).click();
    const review=page.getByRole('dialog',{name:'Paper review'});
    await review.waitFor();
    assert.equal(await review.getByRole('checkbox',{name:'Enable web research'}).isChecked(),false);
    assert.equal(await review.getByRole('button',{name:'Run paper review'}).isDisabled(),true);
    await review.getByLabel('Model',{exact:true}).fill('test-review-model');
    await review.getByLabel(/API key/).fill('test-review-key');
    await review.getByRole('checkbox',{name:/I approve sending/}).check();
    let reviewCalls=0;
    await page.route('**/api/review',route=>{
      const body=route.request().postDataJSON();assert.equal(body.consent,true);assert.equal(body.web,false);assert.equal(body.sources.length,1);assert.equal(body.sources[0].file,'parts/results.tex');reviewCalls++;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({provider:'gemini',researchUsed:false,evidence:[{id:'S1',url:'https://example.com/',title:'Example source'}],findings:[{file:'parts/results.tex',line:2,quote:'More MAGIC_NEEDLE',category:'clarity',severity:'info',explanation:'Explain the result.',suggestion:'Add context.',sourceIds:['S1'],locationValid:true}]})});
    });
    await review.getByRole('button',{name:'Run paper review'}).click();
    await review.getByText('Explain the result.',{exact:true}).waitFor();assert.equal(reviewCalls,1);
    await review.getByRole('button',{name:/parts\/results.tex:2.*Show source/}).click();
    await page.waitForFunction(()=>document.querySelector('footer')?.textContent?.includes('Ln 2'));
    await page.getByRole('button',{name:'Open paper review'}).click();await review.waitFor();
    assert.equal(await review.getByText('Explain the result.',{exact:true}).count(),1);
    await review.getByRole('button',{name:'S1: Example source'}).click();
    await page.getByRole('dialog',{name:'Open research source?'}).waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('dialog',{name:'Open research source?'}).count(),0);
    assert.equal(await review.count(),1);
    if(process.env.LEMMATA_TEST_SCREENSHOT)await page.screenshot({path:process.env.LEMMATA_TEST_SCREENSHOT.replace('.png','-review.png')});
    await review.getByRole('button',{name:'Close paper review'}).click();
    await page.locator('.cm-content').click();await page.keyboard.type(' edited after review');
    await page.getByRole('button',{name:'Open paper review'}).click();
    assert.equal(await review.getByRole('button',{name:'Run paper review'}).isDisabled(),true);
    assert.equal(await review.getByRole('button',{name:'Source changed — rerun review'}).isDisabled(),true);
    await review.getByRole('button',{name:'Close paper review'}).click();
    if(process.env.LEMMATA_TEST_SCREENSHOT){ fs.mkdirSync(path.dirname(process.env.LEMMATA_TEST_SCREENSHOT),{recursive:true}); await page.screenshot({path:process.env.LEMMATA_TEST_SCREENSHOT}); }
    assert.deepEqual(errors,[]);
    console.log('PASS browser command palette, project search/file-line jumps, citation/label completion, Problems filtering/navigation, modal dismissal');
    console.log('PDF/SyncTeX responses are controlled fixtures: this verifies UI wiring, not a native TeX installation.');
    console.log('PASS built-in paper review consent, web-off default, exact scope, finding navigation, in-memory report retention, link confirmation and stale-source invalidation');
  } finally {
    // Allow this test's debounced save to settle before deleting its own project.
    if(id) { await page.waitForTimeout(1000).catch(()=>{}); await page.close(); await context.request.delete(base+'/api/projects/'+id); }
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
