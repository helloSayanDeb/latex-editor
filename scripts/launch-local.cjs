const { spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const mode = process.argv[2];
if (!['dev', 'start'].includes(mode)) throw new Error('Choose dev or start.');
const port = process.env.TEXSTUDIO_PORT || '2303';
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
const child = spawn(process.execPath, args, {
  cwd: root,
  stdio: 'inherit', windowsHide: true,
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: port, TEXSTUDIO_PORT: port, TEXSTUDIO_DATA_DIR: process.env.TEXSTUDIO_DATA_DIR || root, TEXSTUDIO_SESSION_TOKEN: randomBytes(32).toString('hex') },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code || 0; });
