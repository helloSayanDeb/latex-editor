const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  m.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return m.exports;
}
const { validateAIImages, cloudVisionSupport } = load('src/lib/ai-images.ts');
const { sendAIPrompt } = load('src/lib/ai-providers.ts');
const { localModelDetails } = load('src/lib/local-ai.ts');
const image = { name: 'Reference image', mimeType: 'image/png', width: 1, height: 1, data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNa0AAAAASUVORK5CYII=' };
(async () => {
  assert.equal(validateAIImages([image]).length, 1);
  for (const invalid of [[{ ...image, mimeType: 'application/pdf' }], [{ ...image, data: 'https://example.invalid/a.png' }], [{ ...image, width: 200 }], [image, image], [{ ...image, data: 'a'.repeat(6 * 1024 * 1024) }]]) assert.throws(() => validateAIImages(invalid));
  assert.equal(cloudVisionSupport('openai', 'arbitrary-model'), 'unknown');
  assert.equal(cloudVisionSupport('openai', 'gpt-4o-mini'), 'vision');
  console.log('PASS image-only bytes, dimensions/size/count limits and unknown cloud models');
  const original = global.fetch;
  try {
    for (const provider of ['gemini', 'openai', 'lmstudio', 'ollama']) {
      global.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        if (provider === 'gemini') {
          assert.equal(body.contents.at(-1).parts[1].inlineData.data, image.data);
          assert.equal(body.contents[0].parts.length, 1);
          return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'equation' }] } }] }) };
        }
        if (provider === 'ollama') assert.deepEqual(body.messages.at(-1).images, [image.data]);
        else assert.equal(body.messages.at(-1).content[1].image_url.url, 'data:image/png;base64,' + image.data);
        assert.equal(body.messages[1].images, undefined);
        assert.equal(typeof body.messages[1].content, 'string');
        return { ok: true, json: async () => provider === 'ollama' ? { message: { content: 'equation' } } : { choices: [{ message: { content: 'equation' } }] } };
      };
      assert.equal(await sendAIPrompt({ provider, apiKey: 'test-key', model: 'test-model' }, 'transcribe', undefined, [{ role: 'user', content: 'earlier', images: [image] }], [image]), 'equation');
    }
    console.log('PASS all four multimodal request contracts; historical images are never resent');
    global.fetch = async () => ({ ok: true, json: async () => ({ models: [{ type: 'llm', key: 'vision', capabilities: { vision: true }, loaded_instances: [{ id: 'instance' }] }, { type: 'llm', key: 'text', capabilities: { vision: false } }, { type: 'embedding', key: 'embed' }] }) });
    const lm = await localModelDetails('lmstudio');
    assert.deepEqual(lm.map(item => [item.id, item.vision]), [['instance', 'vision'], ['text', 'text']]);
    global.fetch = async (url, options) => ({ ok: true, json: async () => url.endsWith('/api/tags') ? { models: [{ name: 'vision' }, { name: 'text' }] } : { capabilities: JSON.parse(options.body).model === 'vision' ? ['completion', 'vision'] : ['completion'] } });
    assert.deepEqual((await localModelDetails('ollama')).map(item => item.vision), ['vision', 'text']);
    global.fetch = async () => ({ ok: true, json: async () => ({ data: [{ id: 'named-vision-but-unverified' }] }) });
    assert.equal((await localModelDetails('lmstudio'))[0].vision, 'unknown');
    console.log('PASS authoritative LM Studio/Ollama capabilities, embedding exclusion and safe legacy fallback');
  } finally { global.fetch = original; }
  if (process.argv.includes('--live')) {
    const file = fs.readFileSync(path.join(__dirname, 'fixtures', 'vision-equation.png'));
    const reference = { name: 'Reference image', mimeType: 'image/png', width: 640, height: 160, data: file.toString('base64') };
    const models = await localModelDetails('lmstudio');
    const model = models.find(item => item.vision === 'vision' && item.loaded);
    assert.ok(model, 'A loaded vision model is needed for the live check.');
    const result = await sendAIPrompt({ provider: 'lmstudio', model: model.id }, 'Transcribe the equation in the attached image into LaTeX. Return only one fenced LaTeX equation.', undefined, [], [reference]);
    assert.match(result, /mc(?:\^|\s*\^)/i);
    console.log('PASS live local vision transcription:', result);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
