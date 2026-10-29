 
const assert = require('node:assert/strict');
const { chromium } = require(process.env.LEMMATA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1651, height: 1000 } });
  const page = await context.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('response', async response => { if (response.url().endsWith('/api/compile') && response.status() >= 400) console.log('Compile diagnostic:', (await response.text()).slice(-1800)); }); let id;
  let source = '\\documentclass{article}\n\\usepackage{amsmath,graphicx}\n\\begin{document}\nResearch claim.\n\\begin{tabular}{lc}\nA & Value \\\\\nB & 2 \\\\\n\\end{tabular}\n\\[\n\\begin{pmatrix}\n1 & 2 \\\\\n3 & 4\n\\end{pmatrix}\n\\]\n\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=0.8\\linewidth]{sample.png}\n\\caption{Original figure}\n\\label{fig:sample}\n\\end{figure}\n\\BrokenCommand\n\\end{document}';
  async function cursorAt(text) {
    await page.locator('.cm-content').click(); await page.keyboard.press('Control+Home');
    const line = source.split('\n').findIndex(value => value.includes(text)); assert(line >= 0, text);
    for (let i = 0; i < line; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Home');
  }
  async function visual(name) { await page.locator('.tools-menu > summary').click(); await page.getByRole('button', { name, exact: true }).click(); return page.getByRole('dialog').filter({ has: page.locator('#visual-title') }); }
  async function notebook() { await page.getByRole('button', { name: 'Open paper review' }).click(); await page.getByRole('button', { name: 'Persistent notes', exact: true }).click(); }
  try {
    const startup = page.waitForResponse(response => response.url() === base + '/api/system'); await page.goto(base + '/lemmata');
    if (!(await (await startup).json()).setupAcknowledged) { await page.getByRole('button', { name: 'Continue editing only' }).click(); await page.getByRole('dialog', { name: 'Welcome to Lemmata' }).waitFor({ state: 'hidden' }); }
    if (process.env.LEMMATA_TEST_TEX_BIN) assert.equal((await context.request.post(base + '/api/system', { data: { action: 'configure', binDirectory: process.env.LEMMATA_TEST_TEX_BIN } })).status(), 200);
    const image = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 40; const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d6b28a'; ctx.fillRect(0,0,64,40); return canvas.toDataURL('image/png'); });
    const created = await (await context.request.post(base + '/api/projects', { data: { name: 'Studio test ' + Date.now(), files: { 'main.tex': source, 'sample.png': image } } })).json(); id = created.id; assert(id);
    await page.reload(); await page.waitForFunction(() => document.querySelector('.cm-content')?.textContent?.includes('Research claim.'));
    await cursorAt('B & 2'); let editor = await visual('Edit table at cursor');
    await editor.getByRole('textbox', { name: 'Row 2 column 2' }).fill('42'); await editor.getByRole('button', { name: 'Apply changes' }).click();
    source = source.replace('B & 2', 'B & 42'); assert.match(await page.locator('.cm-content').textContent(), /B & 42/);
    await cursorAt('1 & 2'); editor = await visual('Visual equation & matrix editor');
    await editor.getByRole('textbox', { name: 'Row 1 column 1' }).fill('\\alpha');
    await editor.getByRole('button', { name: 'Apply changes' }).click(); source = source.replace('1 & 2', '\\alpha & 2');
    assert.match(await page.locator('.cm-content').textContent(), /\\alpha & 2/);
    await cursorAt('includegraphics'); editor = await visual('Edit figure at cursor');
    await editor.getByLabel('Caption (plain text)').fill('Updated figure'); await editor.getByRole('button', { name: 'Apply changes' }).click(); source = source.replace('Original figure', 'Updated figure');
    assert.match(await page.locator('.cm-content').textContent(), /caption\{Updated figure\}/);
    await cursorAt('Research claim.'); await page.getByRole('button', { name: /Lemmata Assist/ }).first().click(); await notebook();
    await page.getByLabel(/Add a note at/).fill('Explain the evidence for this claim.'); await page.getByRole('button', { name: 'Save note', exact: true }).click(); await page.getByText('Explain the evidence for this claim.', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Review reply' }).fill('Added the supporting source.'); await page.getByRole('button', { name: 'Reply', exact: true }).click(); await page.getByText('Added the supporting source.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Resolve', exact: true }).click(); await page.getByRole('button', { name: 'resolved', exact: true }).click(); await page.getByText('Explain the evidence for this claim.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Close paper review' }).click(); await page.waitForTimeout(1200); await page.reload(); await page.locator('.cm-content').waitFor();
    await page.getByRole('button', { name: /Lemmata Assist/ }).first().click(); await notebook(); await page.getByRole('button', { name: 'resolved', exact: true }).click(); await page.getByText('Added the supporting source.', { exact: true }).waitFor(); await page.getByRole('button', { name: 'Close paper review' }).click();
    await page.getByRole('button', { name: 'Assistant settings' }).click(); await page.getByPlaceholder('Enter API Key...').fill('studio-fixture-key'); await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.getByRole('button', { name: /^Compile/ }).first().click(); await page.locator('.problem-row').filter({ hasText: 'Undefined control sequence' }).waitFor({ timeout: 60000 });
    await page.locator('.repair-controls > summary').click(); await page.getByRole('button', { name: 'Prepare focused repair' }).click();
    let modelCalls = 0;
    await page.route('https://generativelanguage.googleapis.com/**', route => {
      const prompt = route.request().postDataJSON().contents.at(-1).parts[0].text; assert.match(prompt, /APPROVED_COMPILER_ERRORS_UNTRUSTED_DATA/); assert.match(prompt, /Undefined control sequence/); modelCalls++;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: 'Replaced the undefined command only.', edits: [{ search: '\\BrokenCommand', replace: 'Repaired text.' }] }) }] } }] }) });
    });
    await page.getByRole('button', { name: 'Send message', exact: true }).click(); await page.locator('.cm-ai-review').waitFor();
    await page.getByText(/Candidate compiled successfully with pdflatex/).waitFor({ timeout: 60000 }); assert.equal(modelCalls, 1);
    await page.getByRole('button', { name: 'Save proposed change for later review' }).click(); await page.getByText(/Proposal saved in Paper review/).waitFor();
    await page.getByRole('button', { name: /^Reject$/ }).click(); assert.match(await page.locator('.cm-content').textContent(), /\\BrokenCommand/);
    await notebook(); await page.getByText('Saved source change · pending', { exact: true }).click(); await page.getByRole('button', { name: 'Apply saved change', exact: true }).click();
    await page.getByText('Saved source change · accepted', { exact: true }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'resolved', exact: true }).click(); await page.getByText('Saved source change · accepted', { exact: true }).waitFor();
    await page.screenshot({ path: 'tmp/studio-notebook.png' }); await page.getByRole('button', { name: 'Close paper review' }).click();
    assert(!((await page.locator('.cm-content').textContent()).includes('\\BrokenCommand')));
    await page.getByRole('button', { name: /^Compile/ }).first().click(); await page.locator('[data-page-num="1"]').waitFor({ timeout: 60000 });
    await page.waitForTimeout(300); await page.screenshot({ path: 'tmp/studio-workspace.png' });
    const state = await (await context.request.get(base + '/api/projects/' + id + '/reviews')).json(); assert.equal(state.notes.length, 2); assert(state.notes.some(note => note.decision === 'accepted'));
    const project = await (await context.request.get(base + '/api/projects/' + id)).json(); assert(!Object.keys(project.project.files).some(file => file.startsWith('.')));
    await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.waitForTimeout(300); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.emulateMedia({ reducedMotion: 'reduce' }); assert.equal(await page.locator('.mobile-welcome').evaluate(element => getComputedStyle(element).animationName), 'none');
    assert.deepEqual(errors, []);
    console.log('PASS visual table/matrix/figure editing; persistent notes, replies and decisions across reload; real compiler repair verification; saved proposal acceptance; final native PDF; mobile/reduced-motion and no browser errors');
    console.log('AI inference is a controlled fixture; compilation and storage are real.');
  } finally { if (id) { await page.waitForTimeout(1000).catch(() => {}); await page.close(); await context.request.delete(base + '/api/projects/' + id); } await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
