 
// Requires an isolated app and bridge; uses a controlled local model, not paid AI.
const assert = require('node:assert/strict');
const http = require('node:http');
const app = process.env.LEMMATA_TEST_URL || 'http://127.0.0.1:2306';
const bridge = process.env.LEMMATA_TEST_CRAWLER || 'http://127.0.0.1:8771';
const token = process.env.LEMMATA_TEST_CRAWLER_TOKEN;
(async () => {
  assert(token, 'Set LEMMATA_TEST_CRAWLER_TOKEN to the running test bridge token.');
  assert.equal((await fetch(bridge + '/health')).status, 401);
  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  assert.equal((await fetch(bridge + '/health', { headers })).status, 200);
  assert.equal((await fetch(bridge + '/evidence', { method: 'POST', headers, body: JSON.stringify({ urls: ['https://127.0.0.1/'] }) })).status, 400);
  let modelCalls = 0;
  const model = http.createServer(async (request, response) => {
    try {
      let raw = ''; for await (const chunk of request) raw += chunk;
      const body = JSON.parse(raw), prompt = body.messages[0].content;
      assert.match(prompt, /domain.*documentation/i);
      assert.match(prompt, /Example claim/);
      assert(!prompt.includes(token), 'Crawler token must not enter model context.');
      modelCalls++;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ findings: [{ file: 'paper.tex', line: 1, quote: 'Example claim', category: 'citation', severity: 'info', explanation: 'Controlled model response after real retrieval.', suggestion: 'Check the source.', source_ids: ['S1'] }] }) } }] }));
    } catch (error) { response.statusCode = 500; response.end(JSON.stringify({ error: error.message })); }
  });
  await new Promise(resolve => model.listen(0, '127.0.0.1', resolve));
  try {
    const boot = await fetch(app);
    const cookie = boot.headers.get('set-cookie')?.match(/lemmata_session=[a-f0-9]{64}/)?.[0]; assert(cookie);
    const response = await fetch(app + '/api/review', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({
      config: { provider: 'lmstudio', model: 'controlled-test-model', baseUrl: `http://127.0.0.1:${model.address().port}/v1` },
      sources: [{ file: 'paper.tex', text: 'Example claim' }], consent: true, web: true,
      urls: ['https://example.com/'], crawler: { endpoint: bridge, token },
    }) });
    const result = await response.json(); assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(modelCalls, 1); assert.equal(result.researchUsed, true);
    assert.equal(result.findings[0].locationValid, true); assert.deepEqual(result.findings[0].sourceIds, ['S1']);
    assert.equal(result.evidence[0].url, 'https://example.com/'); assert(!JSON.stringify(result).includes(token));
    console.log('PASS real Crawl4AI retrieval through protected review API, source anchors, evidence links, token isolation and private-URL rejection');
    console.log('Inference is a controlled local model fixture; this does not test model accuracy or cloud accounts.');
  } finally { await new Promise(resolve => model.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
