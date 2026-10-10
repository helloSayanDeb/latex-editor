const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), assert = require('node:assert/strict'), ts = require('typescript');
function load(file) {
  const filename = path.resolve(file), m = new Module(filename, module);
  m.filename = filename; m.paths = module.paths;
  m.require = name => name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + '.ts')) : require(name);
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
  return m.exports;
}
const {sendAIPrompt} = load('src/lib/ai-providers.ts');
const {boundedHistory, latexBlocks, validEditTarget, minimalAIEdit} = load('src/lib/ai-conversation.ts');
const {EditorState} = require('@codemirror/state');
const {aiReviewField, setAIReview, protectAIReview} = load('src/lib/editor-ai-review.ts');
const {history, undo, isolateHistory} = require('@codemirror/commands');
(async () => {
  const turns = [{role:'user',content:'Generate a LaTeX matrix.'},{role:'assistant',content:'```latex\n\\begin{matrix}1 & 2\\end{matrix}\n```'}];
  const original = global.fetch;
  try {
    for (const provider of ['gemini','openai','lmstudio','ollama']) {
      global.fetch = async (url, options) => {
        const body = JSON.parse(options.body);
        const messages = provider === 'gemini' ? body.contents.map(turn => ({role:turn.role === 'model' ? 'assistant' : turn.role,content:turn.parts[0].text})) : body.messages.slice(1);
        assert.deepEqual(messages.slice(0,2), turns);
        assert.match(messages[2].content, /"kind":"active-document","file":"main.tex"/);
        assert.match(messages[2].content, /Add another row/);
        if (provider === 'ollama') assert.match(url, /\/api\/chat$/);
        return {ok:true,json:async()=>provider === 'gemini' ? {candidates:[{content:{parts:[{text:'updated'}]}}]} : provider === 'ollama' ? {message:{content:'updated'}} : {choices:[{message:{content:'updated'}}]}};
      };
      assert.equal(await sendAIPrompt({provider,apiKey:'mock',model:'mock'},'Add another row',{fullDocument:'current source',activeFile:'main.tex'},turns),'updated');
    }
    global.window = {};
    global.fetch = async (url, options) => { assert.equal(url,'/api/ai/local'); assert.deepEqual(JSON.parse(options.body).history,turns); return {ok:true,json:async()=>({text:'proxied'})}; };
    assert.equal(await sendAIPrompt({provider:'lmstudio'},'Fix this',{},turns),'proxied');
    delete global.window;
  } finally {global.fetch = original; delete global.window;}
  console.log('PASS: all four providers and local proxy retain ordered user/assistant history and current source');
  assert.equal(boundedHistory(Array.from({length:60},(_,i)=>({role:i%2?'assistant':'user',content:String(i)}))).length,40);
  assert.deepEqual(boundedHistory([{role:'assistant',content:'orphan'},{role:'user',content:'question'}]),[{role:'user',content:'question'}]);
  assert.deepEqual(latexBlocks('Explanation\n```latex\r\n  a\r\n```\n```tex\nb\n```\n```js\nc\n```'),['  a','b']);
  console.log('PASS: bounded history, multiple LaTeX blocks, CRLF, indentation and non-LaTeX exclusion');
  const source = 'first\nselected\nlast', target = {project:'p',file:'main.tex',document:source,from:6,to:14};
  assert(validEditTarget(target,'p','main.tex',source));
  assert(!validEditTarget(target,'other','main.tex',source));
  assert(!validEditTarget(target,'p','other.tex',source));
  assert(!validEditTarget(target,'p','main.tex',source+'changed'));
  let state = EditorState.create({doc:source,extensions:[history()]});
  state = state.update({selection:{anchor:0}}).state; // Moving the cursor cannot change captured target.
  state = state.update({changes:{from:target.from,to:target.to,insert:'replacement'},annotations:isolateHistory.of('full'),userEvent:'input.ai'}).state;
  assert.equal(state.doc.toString(),'first\nreplacement\nlast');
  assert(undo({state,dispatch:transaction=>{state=transaction.state;}}));
  assert.equal(state.doc.toString(),source);
  console.log('PASS: exact captured replacement, stale/wrong-file rejection and single-step undo');
  const wholeTarget = {...target,from:0,to:source.length};
  const minimal = minimalAIEdit(wholeTarget,'first\nreplacement\nlast');
  assert.equal(minimal.target.from,6);
  assert.equal(minimal.target.to,15);
  assert.equal(minimal.code,'replacement\n');
  assert.equal(source.slice(0,minimal.target.from)+minimal.code+source.slice(minimal.target.to),'first\nreplacement\nlast');
  const unchanged = minimalAIEdit(wholeTarget,source);
  assert.equal(unchanged.target.from,unchanged.target.to);assert.equal(unchanged.code,'');
  console.log('PASS: whole-file model replies reduce to changed lines, retaining untouched source');
  const fullSource = '\\documentclass{article}\n\\begin{document}\nold text\n\\end{document}';
  const fullReply = fullSource.replace('old text','new text');
  const wholeReplyEdit = minimalAIEdit({...target,document:fullSource,from:40,to:48},fullReply);
  assert.equal(wholeReplyEdit.code,'new text\n');
  assert.equal(fullSource.slice(0,wholeReplyEdit.target.from)+wholeReplyEdit.code+fullSource.slice(wholeReplyEdit.target.to),fullReply);
  state = EditorState.create({doc:source,extensions:[history(),aiReviewField,protectAIReview]});
  state = state.update({effects:setAIReview.of({from:target.from,to:target.to,code:'replacement',accept(){},reject(){}})}).state;
  assert.equal(state.doc.toString(),source);
  assert.equal(state.update({changes:{from:0,insert:'unexpected'}}).state.doc.toString(),source);
  state = state.update({effects:setAIReview.of(null)}).state;
  assert.equal(state.doc.toString(),source);
  state = state.update({effects:setAIReview.of({from:target.from,to:target.to,code:'replacement',accept(){},reject(){}})}).state;
  state = state.update({changes:{from:target.from,to:target.to,insert:'replacement'},effects:setAIReview.of(null),annotations:isolateHistory.of('full')}).state;
  assert.equal(state.doc.toString(),'first\nreplacement\nlast');
  assert.equal(state.field(aiReviewField),null);
  assert(undo({state,dispatch:transaction=>{state=transaction.state;}}));
  assert.equal(state.doc.toString(),source);
  console.log('PASS: inline preview leaves source untouched, rejects safely, blocks edits until resolved and accepts with one undo');
})().catch(error=>{console.error(error);process.exitCode=1;});
