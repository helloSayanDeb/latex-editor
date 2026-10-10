const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { randomBytes } = require('node:crypto');
const sessionToken = randomBytes(32).toString('hex');
const localFetch = (url, options = {}) => fetch(url, { ...options, headers: { ...options.headers, 'x-texstudio-token': sessionToken } });
let server, window;
app.setName('TeXStudio Local');
app.setPath('userData', path.join(app.getPath('appData'), 'TeXStudio Local'));
const smoke = process.argv.includes('--smoke-test');
if (process.env.TEXSTUDIO_TEST_DATA) app.setPath('userData', process.env.TEXSTUDIO_TEST_DATA);
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { window?.show(); window?.focus(); });
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => server?.kill());
  app.whenReady().then(async () => {
    try {
      const port = await new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.once('error', reject);
        probe.listen(2304, '127.0.0.1', () => probe.close(() => resolve(2304)));
      });
      const root = app.isPackaged ? path.join(process.resourcesPath, 'server') : path.join(__dirname, '..', 'desktop-server');
      fs.mkdirSync(app.getPath('userData'), { recursive: true });
      const log = fs.openSync(path.join(app.getPath('userData'), 'server.log'), 'a');
      server = spawn(process.execPath, [path.join(root, 'server.js')], {
        cwd: root, windowsHide: true, stdio: ['ignore', log, log],
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production', HOSTNAME: '127.0.0.1', PORT: String(port), TEXSTUDIO_PORT: String(port), TEXSTUDIO_SESSION_TOKEN: sessionToken, TEXSTUDIO_DATA_DIR: app.getPath('userData') },
      });
      fs.closeSync(log);
      let exited = false;
      server.once('exit', () => { exited = true; });
      server.once('error', () => { exited = true; });
      const origin = `http://127.0.0.1:${port}`;
      let ready = false;
      for (let attempt = 0; attempt < 120; attempt++) {
        if (exited) throw new Error('The local server stopped. See server.log in your application data folder.');
        try { if ((await localFetch(origin, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!ready) throw new Error('The local server did not start within one minute.');
      window = new BrowserWindow({ width: 1500, height: 960, minWidth: 800, minHeight: 600, show: !smoke, backgroundColor: '#0c1016', icon: path.join(root, 'public', 'favicon.svg'), autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
      window.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents.getURL().startsWith(origin + '/') && permission === 'clipboard-sanitized-write'));
      window.webContents.session.setPermissionCheckHandler((_contents, permission, requestingOrigin) => requestingOrigin === origin && permission === 'clipboard-sanitized-write');
      window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
      window.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https://')) shell.openExternal(url);
        return { action: 'deny' };
      });
      await window.loadURL(origin);
      if (!smoke) {
        const system = await localFetch(origin + '/api/system').then(response => response.json());
        if (!Object.values(system.engines || {}).some(Boolean)) {
          const choice = await dialog.showMessageBox(window, { type: 'info', title: 'Install LaTeX to compile papers', message: 'Your editor is ready. PDF compilation needs a TeX distribution.', detail: process.platform === 'win32' ? 'Install MiKTeX using its installer, then restart TeXStudio Local.' : 'Install MacTeX, then restart TeXStudio Local.', buttons: ['Open TeX installer website', 'Continue editing'], defaultId: 0, cancelId: 1 });
          if (choice.response === 0) await shell.openExternal(process.platform === 'win32' ? 'https://miktex.org/download' : 'https://www.tug.org/mactex/');
        }
      }
      if (smoke) {
        const projects = await localFetch(origin + '/api/projects').then(r => r.json());
        if (!projects.ok || !fs.existsSync(path.join(app.getPath('userData'), 'projects', 'default', 'main.tex'))) throw new Error('Persistent project storage failed.');
        const html = await localFetch(origin).then(response => response.text());
        const asset = html.match(/src="([^\"]*\/_next\/static\/[^\"]+)"/);
        if (!asset || !(await localFetch(origin + asset[1])).ok) throw new Error('Client assets are missing.');
        const spelling = await localFetch(origin + '/api/spelling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: 'A misspelledd word.' }) }).then(response => response.json());
        if (!spelling.issues?.length) throw new Error('Packaged spelling dictionary failed.');
        const git = await localFetch(origin + '/api/git', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'init', projectId: 'default' }) }).then(response => response.json());
        if (!git.ok || !fs.existsSync(path.join(app.getPath('userData'), 'projects', 'default', '.git'))) throw new Error('Packaged Git uses an incorrect project directory.');
        const engines = [];
        for (const engine of process.env.TEXSTUDIO_TEST_SKIP_TEX === '1' ? [] : ['pdflatex', 'xelatex', 'lualatex']) {
          // The renderer may still be compiling its welcome document. Respect the single-job guard.
          let response;
          for (let attempt = 0; attempt < 120; attempt++) {
            response = await localFetch(origin + '/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ engine, files: { 'main.tex': '\\documentclass{article}\n\\begin{document}Desktop installer test\\end{document}' } }) });
            if (response.status !== 429) break;
            await response.body.cancel();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          if (!response.ok || !response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Packaged compilation failed: ' + await response.text());
          if (Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF output.');
          engines.push(engine);
        }
        fs.writeFileSync(path.join(app.getPath('userData'), 'smoke-result.json'), JSON.stringify({ ok: true, packaged: app.isPackaged, projects: projects.projects.length, engines, assets: true, spelling: true, git: true }));
        app.quit();
      }
    } catch (error) {
      if (smoke) { console.error(error); server?.kill(); app.exit(1); }
      else { dialog.showErrorBox('TeXStudio Local could not start', error.message + '\nClose another TeXStudio desktop instance if port 2304 is in use.'); app.quit(); }
    }
  });
}
