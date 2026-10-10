// CI runners have no TeX distribution; validate packaged runtime and assets separately.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const output = path.resolve(__dirname, '..', 'dist-desktop');
const data = path.join(output, 'ci-smoke-data');
const binary = process.platform === 'win32' ? path.join(output, 'win-unpacked', 'TeXStudio Local.exe') : path.join(output, process.arch === 'arm64' ? 'mac-arm64' : 'mac', 'TeXStudio Local.app', 'Contents', 'MacOS', 'TeXStudio Local');
const child = spawn(binary, ['--smoke-test'], { env: { ...process.env, TEXSTUDIO_TEST_DATA: data, TEXSTUDIO_TEST_SKIP_TEX: '1' }, windowsHide: true, stdio: 'inherit' });
const deadline = setTimeout(() => { child.kill(); console.error('Packaged startup timed out'); process.exitCode = 1; }, 90000);
child.once('error', error => { clearTimeout(deadline); console.error(error); process.exitCode = 1; });
child.once('exit', code => {
  clearTimeout(deadline);
  try {
    if (code !== 0) throw new Error(`Packaged app exited ${code}`);
    const result = JSON.parse(fs.readFileSync(path.join(data, 'smoke-result.json'), 'utf8'));
    if (!result.packaged || !result.assets || !result.spelling || !result.git) throw new Error('Packaged smoke check incomplete');
    console.log('PASS packaged startup, persistent data, assets, spelling and Git', result);
  } catch (error) { console.error(error); process.exitCode = 1; }
});
