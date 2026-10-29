 
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { selectEngine } = require('./select-engine.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lemmata-setup-test-'));
const saved = { ...process.env };
(async () => {
  try {
    process.env.LEMMATA_DATA_DIR = directory;
    process.env.LEMMATA_TEX_BIN = path.join(directory, 'late-install');
    const filename = path.resolve('src/lib/lemmata-environment.ts');
    const mod = new Module(filename, module); mod.filename = filename; mod.paths = module.paths;
    const nativeRequire = mod.require.bind(mod);
    mod.require = name => {
      if (name !== './compiler-failure') return nativeRequire(name);
      const target = path.resolve('src/lib/compiler-failure.ts'), dependency = new Module(target, module);
      dependency._compile(ts.transpileModule(fs.readFileSync(target, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, target);
      return dependency.exports;
    };
    mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename);
    const { resolveTool, getToolVersion } = mod.exports;
    resolveTool('xelatex'); // Probe before installation: discovery must not cache this state.
    fs.mkdirSync(process.env.LEMMATA_TEX_BIN);
    const xetex = path.join(process.env.LEMMATA_TEX_BIN, process.platform === 'win32' ? 'xelatex.exe' : 'xelatex');
    fs.writeFileSync(xetex, '', { mode: 0o755 });
    assert.equal(resolveTool('xelatex'), xetex);
    assert.equal(getToolVersion('xelatex'), null, 'An unusable executable must not be reported as installed');
    const health = await mod.exports.inspectTool('xelatex');
    assert.equal(health.version, null); assert.equal(health.executable, xetex); assert.match(health.problem, /startup check/);
    assert.equal(mod.exports.resolveCompanionTool(xetex, 'makeindex'), null, 'Never fall back to a different distribution');
    assert.throws(() => resolveTool('../xelatex'), /Unsupported/);
    const custom = path.join(directory, 'custom'); fs.mkdirSync(custom);
    const lua = path.join(custom, process.platform === 'win32' ? 'lualatex.exe' : 'lualatex'); fs.writeFileSync(lua, '', { mode: 0o755 });
    fs.writeFileSync(path.join(directory, 'lemmata-settings.json'), JSON.stringify({ binDirectory: custom }));
    assert.equal(resolveTool('lualatex'), lua);
    assert.equal(resolveTool('xelatex'), xetex, 'Engine paths must remain separate');
    fs.writeFileSync(path.join(directory, 'lemmata-settings.json'), '{}');
    assert.notEqual(resolveTool('lualatex'), lua, 'Removing a custom directory must not retain it in PATH');
    fs.writeFileSync(path.join(directory, 'lemmata-settings.json'), JSON.stringify({ binDirectory: custom }));
    await selectEngine(['--engine', 'lualatex']);
    const settings = JSON.parse(fs.readFileSync(path.join(directory, 'lemmata-settings.json')));
    assert.equal(settings.defaultEngine, 'lualatex'); assert.equal(settings.binDirectory, custom);
    await assert.rejects(selectEngine(['--engine', 'shell']), /Unsupported/);
    console.log('PASS late TeX installation discovery, custom bin paths, invalid executable detection, independent engine paths and CLI default preservation');
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
    if (path.dirname(directory) === os.tmpdir() && path.basename(directory).startsWith('lemmata-setup-test-')) fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
