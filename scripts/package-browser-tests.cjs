const assert=require('node:assert/strict');
const {chromium}=require(process.env.LEMMATA_PLAYWRIGHT_PATH||'playwright');
const base=process.env.LEMMATA_TEST_URL||'http://127.0.0.1:2306';
(async()=>{
 const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1500,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let id;
 try {
  await page.goto(base+'/lemmata');const setup=page.getByRole('button',{name:'Continue editing only'});if(await setup.isVisible({timeout:5000}))await setup.click();
  const source='\\documentclass{article}\n\\usepackage{esint}\n\\begin{document}\nMissing package recovery test: $\\oiint_A f$.\n\\end{document}';
  const created=await(await context.request.post(base+'/api/projects',{data:{name:'Package recovery QA '+Date.now(),files:{'main.tex':source}}})).json();assert(created.ok);id=created.id;
  const failure=await context.request.post(base+'/api/compile',{data:{engine:'pdflatex',projectId:id,files:{'main.tex':source}}});
  if(failure.ok())throw Error('The esint test package is already installed; use a fresh test distribution or adjust the explicit fixture.');
  const payload=await failure.json();assert(payload.missingPackages.includes('esint.sty'));assert(payload.log.includes('esint.sty'));
  await page.reload();if(await setup.isVisible())await setup.click();await page.locator('.cm-content').waitFor();await page.getByRole('button',{name:/^Compile/}).first().click();
  const dialog=page.getByRole('dialog',{name:'This document needs extra packages'});await dialog.waitFor();assert(await dialog.getByText('esint.sty',{exact:true}).isVisible());
  let installs=0;page.on('request',r=>{if(r.url().endsWith('/api/packages')&&r.postDataJSON()?.action==='install')installs++;});
  await dialog.getByRole('button',{name:'Find packages',exact:true}).click();await dialog.getByRole('button',{name:'Install packages & retry'}).waitFor();assert.equal(installs,0);assert(await dialog.getByText('esint',{exact:true}).isVisible());
  await page.screenshot({path:'tmp/package-recovery.png'});
  if(process.argv.includes('--install')) {
   await dialog.getByRole('button',{name:'Install packages & retry'}).click();await dialog.waitFor({state:'hidden',timeout:480000});await page.locator('[data-page-num="1"] canvas').waitFor({timeout:90000});assert.equal(installs,1);assert(await page.getByText(/Compiled with pdflatex/).isVisible());
  } else await dialog.getByRole('button',{name:'Back to editor'}).click();
  // Unknown custom classes should explain the missing file without inventing an installable package.
  const response=await context.request.post(base+'/api/packages',{data:{action:'lookup',engine:'pdflatex',files:['lemmata-nonexistent-fixture.cls']}});assert(response.ok());const unknown=await response.json();assert.deepEqual(unknown.packages,[]);
  const rejected=await context.request.post(base+'/api/packages',{data:{action:'install',token:unknown.token,packages:['pgf'],approved:true}});assert.equal(rejected.status(),400);
  assert.deepEqual(errors,[]);console.log('PASS real missing-package diagnostics, automatic browser prompt, catalog lookup, no download before approval, '+(process.argv.includes('--install')?'approved MiKTeX installation and automatic PDF retry, ':'')+'unknown custom class and invalid installation refusal');
 } finally {if(id)await context.request.delete(base+'/api/projects/'+id);await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
