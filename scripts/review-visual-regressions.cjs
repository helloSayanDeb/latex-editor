 
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module); m.filename = filename; m.paths = module.paths;
  m.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename); return m.exports;
}
const v = load('src/lib/visual-latex.ts');
const table = '\\begin{tabular}{lc}\n\\toprule\nName & Value \\\\\n\\midrule\nA \\& B & 2 \\\\\n\\bottomrule\n\\end{tabular}';
const parsed = v.parseTabular(table); assert.equal(parsed.cells[1][0], 'A \\& B'); assert.equal(parsed.columns, 'lc');
assert.deepEqual(v.parseTabular(v.tableLatex(parsed.cells, parsed.columns, true)).cells, parsed.cells);
assert.deepEqual(v.splitCells('a & {b & c} \\\\ d & e'), [['a','{b & c}'],['d','e']]);
assert.equal(v.matrixLatex([['a','b'],['c','d']], 'pmatrix'), '\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}');
assert.throws(() => v.parseTabular('\\begin{tabular}{cc}\\multicolumn{2}{c}{X}\\end{tabular}'), /advanced/);
assert.throws(() => v.parseTabular('\\begin{tabular}{cc}a & b % comment\n\\end{tabular}'), /advanced/);
const source = 'Before.\n' + table + '\nAfter.'; const region = v.environmentAt(source, source.indexOf('Value'), ['tabular']); assert.equal(region.text, table); assert.equal(source.slice(0,region.from), 'Before.\n');
const figure = { path: 'figures/result.png', width: 60, caption: 'A result', label: 'fig:result', placement: 'htbp' };
assert.deepEqual(v.parseFigure(v.figureLatex(figure)), figure);
assert.deepEqual(v.parseFigure(v.figureLatex({ ...figure, caption: 'A & B: 50%' })).caption, 'A & B: 50%');
const natural = v.parseFigure('\\begin{figure}\\includegraphics{a.png}\\caption{Original}\\end{figure}');
assert.equal(natural.natural, true); assert.equal(natural.centered, false); assert.equal(natural.placement, '');
assert(!v.figureLatex({ ...natural, caption: 'Changed' }).includes('centering')); assert(!v.figureLatex(natural).includes('width='));
assert.equal(v.parseFigure('\\begin{figure}\\includegraphics[width=0.6\\textwidth]{a.png}\\end{figure}').unit, 'textwidth');
assert.throws(() => v.parseFigure('\\begin{figure}\\includegraphics[angle=90]{a.png}\\end{figure}'), /Complex|options/);
assert.throws(() => v.figureLatex({ ...figure, path: '../private.png' }), /project image/);
fs.mkdirSync(path.resolve('tmp'), { recursive: true });
const root = fs.mkdtempSync(path.join(path.resolve('tmp'), 'review-store-test-'));
process.env.LEMMATA_DATA_DIR = root;
try {
  const project = path.join(root, 'projects', 'sample'); fs.mkdirSync(project, { recursive: true }); fs.writeFileSync(path.join(project, 'project.json'), '{}');
  const store = load('src/lib/review-store.ts');
  let state = store.mutateReviews('sample', { revision: 0, action: 'add', note: { file: 'main.tex', line: 2, quote: 'Claim', message: 'Explain this.', edit: { search: 'Claim', replace: 'Supported claim' } } });
  const id = state.notes[0].id; assert.equal(store.readReviews('sample').notes[0].message, 'Explain this.');
  assert.throws(() => store.mutateReviews('sample', { revision: 0, action: 'status', id, status: 'resolved' }), /another window/);
  state = store.mutateReviews('sample', { revision: 1, action: 'reply', id, text: 'Added evidence.' });
  state = store.mutateReviews('sample', { revision: 2, action: 'decision', id, decision: 'accepted' });
  assert.equal(state.notes[0].decision, 'accepted'); assert.equal(state.notes[0].replies.length, 1); assert.equal(state.notes[0].status, 'resolved');
  assert.throws(() => store.mutateReviews('../outside', { revision: 0 }), /identifier/);
  assert.equal(fs.existsSync(path.join(project, '.lemmata', 'reviews.json')), true);
} finally { if (root.startsWith(path.resolve('tmp') + path.sep) && path.basename(root).startsWith('review-store-test-')) fs.rmSync(root, { recursive: true, force: true }); delete process.env.LEMMATA_DATA_DIR; }
const { contextualPrompt } = load('src/lib/ai-conversation.ts');
assert(!contextualPrompt('Explain', { mode: 'ask', compilerErrors: 'PRIVATE_ERROR' }).includes('PRIVATE_ERROR'));
assert(contextualPrompt('Fix', { mode: 'edit', compilerErrors: 'APPROVED_ERROR' }).includes('APPROVED_ERROR'));
console.log('PASS visual table/matrix/figure round trips, safe unsupported-layout rejection, source regions, persistent notes/replies/decisions, optimistic concurrency and opt-in diagnostic context');
