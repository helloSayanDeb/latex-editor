const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'desktop-server');
// Only replace this generated directory inside the repository.
if (path.dirname(destination) !== root) throw new Error('Invalid desktop output path');
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });
fs.cpSync(path.join(root, '.next/standalone'), destination, { recursive: true, dereference: true });
fs.cpSync(path.join(root, 'public'), path.join(destination, 'public'), { recursive: true });
fs.cpSync(path.join(root, '.next/static'), path.join(destination, '.next/static'), { recursive: true });
for (const entry of ['projects', '.env', '.env.local', '.git']) {
  if (fs.existsSync(path.join(destination, entry))) throw new Error('Private data present in desktop payload: ' + entry);
}
console.log('Desktop server prepared without project data.');
const appRoot = path.join(root, 'desktop-app');
fs.mkdirSync(path.join(appRoot, 'desktop'), { recursive: true });
fs.copyFileSync(path.join(root, 'desktop/main.cjs'), path.join(appRoot, 'desktop/main.cjs'));
const source = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(appRoot, 'package.json'), JSON.stringify({ name: 'texstudio-local', version: source.version, main: 'desktop/main.cjs', description: source.description, author: 'Sayan Deb', license: 'MIT' }, null, 2));
