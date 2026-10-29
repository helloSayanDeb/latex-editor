 
const assert = require('node:assert/strict');
const { chromium } = require(process.env.LEMMATA_PLAYWRIGHT_PATH || 'playwright');
const base = process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306';
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1651, height: 918 } });
  const page = await context.newPage(); let id;
  try {
    const startup = page.waitForResponse(response => response.url() === base + '/api/system');
    await page.goto(base + '/lemmata'); const system = await (await startup).json();
    if (!system.setupAcknowledged) { await page.getByRole('button', { name: 'Continue editing only' }).click(); await page.getByRole('dialog', { name: 'Welcome to Lemmata' }).waitFor({ state: 'hidden' }); }
    const status = await (await context.request.get(base + '/api/system')).json(); assert.equal(status.setupAcknowledged, true);
    const source = '\\documentclass{article}\n\\begin{document}\nOriginal claim.\n' + 'A long explanation '.repeat(60) + '\n\\end{document}';
    const created = await (await context.request.post(base + '/api/projects', { data: { name: 'Interaction test ' + Date.now(), files: { 'main.tex': source } } })).json(); id = created.id; assert(id);
    await page.reload();
    await page.locator('.cm-content').waitFor();
    await page.waitForFunction(() => document.querySelector('.cm-content')?.textContent?.includes('Original claim.'));
    await page.waitForTimeout(500); assert.equal(await page.getByRole('dialog', { name: 'Welcome to Lemmata' }).count(), 0);
    const wrap = page.getByRole('button', { name: 'Word wrap', exact: true });
    assert.equal(await wrap.getAttribute('aria-pressed'), 'true'); assert.equal(await page.locator('.cm-lineWrapping').count(), 1);
    await wrap.click(); assert.equal(await page.locator('.cm-lineWrapping').count(), 0);
    await wrap.click(); assert.equal(await page.locator('.cm-lineWrapping').count(), 1);
    await page.getByRole('button', { name: /Lemmata Assist/ }).first().click();
    await page.getByRole('button', { name: 'Assistant settings' }).click();
    await page.getByPlaceholder('Enter API Key...').fill('controlled-fixture-key');
    await page.getByRole('button', { name: 'Back to chat' }).click();
    await page.getByRole('log', { name: 'Assistant conversation' }).waitFor();
    let mode = 'ask', calls = 0;
    await page.route('https://generativelanguage.googleapis.com/**', route => {
      const body = route.request().postDataJSON(), text = body.contents.at(-1).parts[0].text;
      assert.match(text, mode === 'ask' ? /ASK MODE/ : /EDIT SOURCE MODE/); calls++;
      const result = mode === 'ask' ? 'Explain the claim carefully. A small example:\n```latex\n\\textbf{A claim}\n```' : JSON.stringify({ summary: 'Clarified the claim.', edits: [{ search: 'Original claim.', replace: 'Revised claim.' }] });
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ candidates: [{ content: { parts: [{ text: result }] } }] }) });
    });
    await page.getByRole('textbox', { name: 'Message Lemmata Assist' }).fill('Explain the idea.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.getByText('Explain the claim carefully.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: /Insert at Cursor|Preview in editor/ }).count(), 0);
    assert.equal(await page.locator('.cm-ai-review').count(), 0);
    mode = 'edit'; await page.getByRole('button', { name: 'Edit source', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message Lemmata Assist' }).fill('Improve the claim only.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.locator('.cm-ai-review').waitFor();
    const proposal = await page.locator('.cm-ai-proposed-code').textContent(); assert.match(proposal, /Revised claim/); assert(!proposal.includes('documentclass'));
    await page.getByRole('button', { name: /^Reject/ }).click();
    assert.match(await page.locator('.cm-content').textContent(), /Original claim/); assert.equal(calls, 2);
    await page.screenshot({ path: 'tmp/interaction-workspace.png' });
    console.log('PASS word wrap toggle, refresh retains engine setup acknowledgment, clear settings return, Ask without editor actions and focused inline Edit/Reject');
  } finally {
    if (id) { await page.waitForTimeout(1000).catch(() => {}); await page.close(); await context.request.delete(base + '/api/projects/' + id); }
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
