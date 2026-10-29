const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { selectEngine } = require('./select-engine.cjs');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Choose dev or start.');
const port = process.env.LEMMATA_PORT || '2303';
if (!/^\d+$/.test(port) || Number(port) < 1024 || Number(port) > 65535) throw new Error('Invalid local port.');
let args = [require.resolve('next/dist/bin/next'), 'dev', '-H', '127.0.0.1', '-p', port];
if (mode === 'start') {
  const standalone = path.join(root, '.next', 'standalone');
  const server = path.join(standalone, 'server.js');
  if (!fs.existsSync(server)) throw new Error('Run npm run build before npm start.');
  fs.cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
  fs.cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true });
  args = [server];
}
async function launch() {
await selectEngine();
const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: port, LEMMATA_PORT: port, LEMMATA_DATA_DIR: process.env.LEMMATA_DATA_DIR || root, LEMMATA_SESSION_TOKEN: randomBytes(32).toString('hex'), LEMMATA_RUN_ID: randomBytes(16).toString('hex'), LEMMATA_SETUP_ACKNOWLEDGED: process.argv.includes('--setup-verified') ? '1' : '0' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
}
launch().catch(error => { console.error(error.message); process.exitCode = 1; });
