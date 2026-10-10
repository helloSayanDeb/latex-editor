// Runs the real Windows installer through the one-command script in an isolated directory.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist-desktop');
const name = 'TeXStudio-Local-windows-x64.exe';
const checksum = crypto.createHash('sha256').update(fs.readFileSync(path.join(output, name))).digest('hex');
const installDir = path.join(output, 'test-installed');
const dataDir = path.join(output, 'test-installed-data');
const server = http.createServer((request, response) => {
  if (request.url === '/SHA256SUMS.txt') response.end(`${checksum}  ${name}\n`);
  else if (request.url === '/' + name) fs.createReadStream(path.join(output, name)).pipe(response);
  else { response.statusCode = 404; response.end(); }
});
const run = (file, args) => new Promise((resolve, reject) => {
  const child = spawn(file, args, { env: { ...process.env, TEXSTUDIO_TEST_DATA: dataDir }, windowsHide: true, stdio: 'inherit' });
  child.once('error', reject);
  const deadline = setTimeout(() => { child.kill(); reject(new Error('Installer test timed out')); }, 180000);
  child.once('exit', () => clearTimeout(deadline));
  child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`)));
});
(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    fs.rmSync(path.join(dataDir, 'smoke-result.json'), { force: true });
    await run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'install.ps1'), '-ReleaseRoot', origin, '-InstallDirectory', installDir, '-LaunchArguments', '--smoke-test']);
    const result = JSON.parse(fs.readFileSync(path.join(dataDir, 'smoke-result.json'), 'utf8'));
    assert.equal(result.ok, true);
    assert.equal(result.packaged, true);
    const marker = path.join(dataDir, 'projects', 'persistence-test.txt');
    fs.writeFileSync(marker, 'retained on restart');
    await run(path.join(installDir, 'TeXStudio Local.exe'), ['--smoke-test']);
    assert.equal(fs.readFileSync(marker, 'utf8'), 'retained on restart');
    // A stopped app must leave no listening server behind.
    await assert.rejects(fetch('http://127.0.0.1:2304', { signal: AbortSignal.timeout(2000) }));
    console.log('PASS installer download/checksum, per-user installation, packaged startup, compilation, persistence, restart and shutdown', result);
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
