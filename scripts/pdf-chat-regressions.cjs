require('./local-test-session.cjs');
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module');
const assert = require('node:assert/strict'), ts = require('typescript');
const { pathToFileURL } = require('node:url');
const { renderToStaticMarkup } = require('react-dom/server');
const React = require('react');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  m.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return m.exports;
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) { for (let i = 0; i < 100; i++) { if (check()) return; await wait(10); } throw Error('Timed out'); }
(async () => {
  const { syncTexPoint } = load('src/lib/pdf-coordinates.ts');
  for (const zoom of [.4, 1, 2.7]) {
    const rect = { left: 30, top: 50, width: 600 * zoom, height: 800 * zoom };
    const point = syncTexPoint(30 + 123.45 * zoom, 50 + 345.67 * zoom, rect,
      { width: 600, height: 800, viewBox: [0, 0, 600, 800], convertToPdfPoint: (x, y) => [x, 800 - y] });
    assert(Math.abs(point.x - 123.45) < .0001); assert(Math.abs(point.y - 345.67) < .0001);
  }
  const rotated = syncTexPoint(100, 200, { left: 0, top: 0, width: 800, height: 600 },
    { width: 800, height: 600, viewBox: [10, 20, 610, 820], convertToPdfPoint: (x, y) => [y + 10, x + 20] });
  assert.deepEqual(rotated, { x: 200, y: 700 });
  console.log('PASS zoom-independent fractional SyncTeX points, rotation and crop offsets');

  // Exercise the actual React renderer, including sanitization and TeX delimiter normalization.
  const output = path.resolve('scripts/.chat-markdown-test.mjs');
  const dialogOutput = path.resolve('scripts/.chat-dialog-test.mjs');
  fs.writeFileSync(dialogOutput, ts.transpileModule(fs.readFileSync('src/components/AppDialog.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText);
  fs.writeFileSync(output, ts.transpileModule(fs.readFileSync('src/components/ai/ChatMarkdown.tsx', 'utf8').replace('@/components/AppDialog', './.chat-dialog-test.mjs'),
    { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText);
  try {
    const { ChatMarkdown, normalizeChatMath } = await import(pathToFileURL(output));
    const sample = '**Bold** *italic* <u>underlined</u>\n\n- first\n- second\n\n1. step one\n2. step two\n\n```latex\nx^2\n```\n\n$$A = \\pi r^2$$\n\n\\(a+b\\)\n\n\\[c+d\\]';
    const html = renderToStaticMarkup(React.createElement(ChatMarkdown, { content: sample }));
    for (const tag of ['strong', 'em', 'u', 'ul', 'ol', 'pre', 'code']) assert.match(html, new RegExp('<' + tag + '(?:>| )'));
    assert.match(html, /katex-display/); assert.match(html, /katex-mathml/);
    assert.match(normalizeChatMath('`\\(code\\)` and \\(math\\)'), /`\\\(code\\\)` and \$math\$/);
    const hostile = renderToStaticMarkup(React.createElement(ChatMarkdown, { content: '<script>alert(1)</script><u onclick="alert(1)">safe</u>[bad](javascript:alert(1)) ![alt](https://example.invalid/track.png)' }));
    assert.doesNotMatch(hostile, /<script|onclick=|href="javascript:|<img/);
    const reference = renderToStaticMarkup(React.createElement(ChatMarkdown, { content: '[Reference](https://example.invalid/?source=private)' }));
    assert.match(reference, /<button[^>]*class="chat-reference-link"/);
    assert.doesNotMatch(reference, /<a\b|href=/);
    console.log('PASS real Markdown formatting, math, code preservation and unsafe HTML/URL stripping');
  } finally { fs.unlinkSync(output); fs.unlinkSync(dialogOutput); }

  // Controlled DOM/render tasks verify no blank zoom frames and no all-page rasterization.
  class Element {
    constructor(tag) { this.tag = tag; this.style = {}; this.dataset = {}; this.children = []; this.listeners = {}; this.classList = { toggle() {} }; }
    setAttribute() {} addEventListener(name, fn) { this.listeners[name] = fn; }
    append(...items) { for (const item of items) { if (item.tag === 'fragment') { this.append(...item.children); continue; } item.parent = this; this.children.push(item); } }
    prepend(item) { item.parent = this; this.children.unshift(item); }
    replaceChildren(...items) { this.children = []; this.append(...items); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
    getContext() { return {}; }
    getBoundingClientRect() { return { top: 0, left: 0, width: parseFloat(this.style.width) || 600, height: parseFloat(this.style.height) || 800 }; }
  }
  let observer, renders = 0, active = 0, maxActive = 0;
  global.IntersectionObserver = function Observer(fn) { const instance = { fn, observe() {}, disconnect() {} }; observer = instance; return instance; };
  global.document = { createElement: tag => new Element(tag), createDocumentFragment: () => new Element('fragment') };
  global.window = { devicePixelRatio: 2 };
  const doc = { numPages: 17, getPage: async number => ({
    getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale, viewBox: [0, 0, 600, 800], convertToPdfPoint: (x, y) => [x / scale, 800 - y / scale] }),
    render: () => {
      renders++; active++; maxActive = Math.max(maxActive, active);
      let cancel;
      const promise = new Promise((resolve, reject) => { const timer = setTimeout(resolve, 25); cancel = () => { clearTimeout(timer); reject(Object.assign(Error('cancelled'), { name: 'RenderingCancelledException' })); }; }).finally(() => active--);
      return { promise, cancel };
    },
  }) };
  const host = new Element('div'), scroll = new Element('div'); scroll.scrollTop = 0;
  const { PDFPageRenderer } = load('src/lib/pdf-page-renderer.ts');
  const renderer = new PDFPageRenderer(doc, host, scroll, 1, () => {}, message => { throw Error(message); });
  const canvases = () => host.children.flatMap(page => page.children.filter(c => c.tag === 'canvas'));
  await renderer.initialize(); await until(() => canvases().length === 1);
  assert.equal(renders, 1); assert.equal(host.children.length, 17);
  const oldCanvas = canvases()[0]; renderer.setScale(1.1); renderer.setScale(1.2);
  assert.equal(canvases()[0], oldCanvas); assert.equal(host.children[0].style.width, '720px');
  await until(() => host.children[0].dataset.renderedScale === '1.2');
  assert.notEqual(canvases()[0], oldCanvas); assert.equal(maxActive, 1);
  const beforeDark = renders; renderer.setDark(true); assert.equal(renders, beforeDark);
  for (let page = 1; page < 12; page++) {
    observer.fn(host.children.map((target, index) => ({ target, isIntersecting: index === page })));
    await until(() => !!host.children[page].dataset.renderedScale);
    assert(canvases().length <= 8);
  }
  renderer.destroy(); assert(canvases().every(canvas => canvas.width === 0));
  console.log('PASS visible-page priority, retained canvas during rapid zoom, serial rendering, dark-mode reuse, bounded cache and disposal');
  const {capturePDFPosition,restorePDFPosition}=load('src/lib/pdf-position.ts');
  const positionScroll={scrollTop:9*1024+300,scrollLeft:125,getBoundingClientRect:()=>({top:100})};
  const positionPages=Array.from({length:17},(_,index)=>({dataset:{pageNum:String(index+1)},clientHeight:1000,getBoundingClientRect:()=>({top:124+index*1024-positionScroll.scrollTop,bottom:1124+index*1024-positionScroll.scrollTop})}));
  const positionHost={querySelectorAll:()=>positionPages,querySelector:selector=>positionPages[Number(selector.match(/"(\d+)"/)[1])-1]};
  const position=capturePDFPosition(positionScroll,positionHost,1.25);
  assert.deepEqual(position,{page:10,offset:240,horizontal:100});
  const originalTop=positionScroll.scrollTop;
  positionScroll.scrollTop=0;positionScroll.scrollLeft=0;
  assert.equal(restorePDFPosition(position,positionScroll,positionHost,1.25,17),10);
  assert.equal(positionScroll.scrollTop,originalTop);assert.equal(positionScroll.scrollLeft,125);
  assert.equal(restorePDFPosition(position,positionScroll,positionHost,1.25,4),4);
  assert.equal(capturePDFPosition(positionScroll,{querySelectorAll:()=>[]},1),null);
  console.log('PASS exact page-10 vertical/horizontal position restoration and shortened-document clamping');
  if (process.argv.includes('--live')) {
    const base = 'http://127.0.0.1:2303';
    const json = async (url, body, method = 'POST') => {
      const response = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json(); assert(response.ok, JSON.stringify(data)); return data;
    };
    const files = { 'paper.tex': '\\documentclass{article}\n\\begin{document}\nFirst precise source location.\n\\newpage\n\\input{sections/part}\n\\end{document}', 'sections/part.tex': 'A separate source file with a unique sentence.\n' };
    const project = await json('/api/projects', { name: 'Disposable PDF sync regression ' + Date.now(), mainFile: 'paper.tex', files });
    try {
      const response = await fetch(base + '/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, mainFile: 'paper.tex', files, engine: 'pdflatex' }) });
      assert(response.ok, await response.text());
      for (const [sourceFile, line] of [['paper.tex', 3], ['sections/part.tex', 1]]) {
        const view = await json('/api/synctex', { action: 'view', projectId: project.id, pdfFile: 'paper.pdf', sourceFile, line });
        assert(view.ok, JSON.stringify(view));
        const edit = await json('/api/synctex', { action: 'edit', projectId: project.id, pdfFile: 'paper.pdf', ...view.result });
        assert(edit.ok, JSON.stringify(edit)); assert.equal(edit.result.file, sourceFile); assert.equal(edit.result.line, line);
      }
      console.log('PASS live SyncTeX round trips for custom main filename and nested secondary source');
    } finally { await json('/api/projects/' + project.id, {}, 'DELETE'); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
