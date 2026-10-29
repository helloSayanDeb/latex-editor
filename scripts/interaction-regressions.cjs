 
const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  m.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return m.exports;
}
const { parseFocusedEdit, contextualPrompt } = load('src/lib/ai-conversation.ts');
const document = '\\documentclass{article}\n\\begin{document}\nFirst result.\nSecond result.\n\\end{document}';
const target = { project: 'p', file: 'main.tex', document, from: 0, to: document.length };
const response = edits => JSON.stringify({ summary: 'Clarify the result.', edits });
const proposed = parseFocusedEdit(response([{ search: 'First result.', replace: 'Improved result.' }]), target);
assert.equal(proposed.code, document.replace('First result.', 'Improved result.'));
assert.throws(() => parseFocusedEdit(response([{ search: 'missing', replace: 'x' }]), target), /uniquely/);
assert.throws(() => parseFocusedEdit(response([{ search: 'result.', replace: 'x' }]), target), /uniquely/);
assert.throws(() => parseFocusedEdit(response([{ search: 'First result.', replace: 'x' }, { search: 'First', replace: 'y' }]), target), /Overlapping/);
const selection = { ...target, from: document.indexOf('First'), to: document.indexOf('Second') };
assert.throws(() => parseFocusedEdit(response([{ search: 'Second result.', replace: 'x' }]), selection), /uniquely/);
assert.equal(parseFocusedEdit(response([]), target).code, document);
assert.match(contextualPrompt('Explain', { mode: 'ask' }), /ASK MODE.*Explain/);
assert.match(contextualPrompt('Fix this', { mode: 'edit', fullDocument: document }), /EDIT SOURCE MODE/);
const values = { 'previous_ai_config': '{"provider":"gemini"}' };
global.localStorage = { ...values, getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value; } };
const { readPreference } = load('src/lib/preferences.ts');
assert.equal(readPreference('lemmata_ai_config'), values.previous_ai_config);
assert.equal(values.lemmata_ai_config, values.previous_ai_config);
assert.equal(readPreference('lemmata_other'), null);
delete global.localStorage;
console.log('PASS focused patches, ambiguous/stale/out-of-selection rejection, preserved unrelated source, Ask/Edit modes and preference migration');
