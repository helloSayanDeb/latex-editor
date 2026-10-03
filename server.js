// =============================================================================
// server.js — TeXStudio Local High-Performance LaTeX Workstation Backend
// =============================================================================
// Features:
//   1. Serves static frontend from ./public
//   2. Multi-file & binary asset project compilation (JSON & text payloads)
//   3. Multi-engine support: pdflatex, xelatex, lualatex
//   4. SyncTeX integration (-synctex=1)
//   5. One-click ZIP project export via archiver
//   6. Academic LaTeX word count analyzer
//   7. System health and LaTeX distribution auto-discovery API
// =============================================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec, execSync } = require('child_process');
const archiver = require('archiver');

const app = express();
const PORT = 2303;

// ---------------------------------------------------------------------------
// Auto-detect and register TeX engine paths
// ---------------------------------------------------------------------------
const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');
const userMiktex = localAppData ? path.join(localAppData, 'Programs', 'MiKTeX', 'miktex', 'bin', 'x64') : null;

const commonTexPaths = [
  userMiktex,
  'C:\\Program Files\\MiKTeX\\miktex\\bin\\x64',
  'C:\\Program Files (x86)\\MiKTeX\\miktex\\bin',
  'C:\\texlive\\2026\\bin\\windows',
  'C:\\texlive\\2025\\bin\\windows',
  'C:\\texlive\\2024\\bin\\windows',
  '/Library/TeX/texbin',
  '/usr/local/bin',
  '/usr/bin'
].filter(Boolean);

for (const p of commonTexPaths) {
  if (fs.existsSync(p) && !process.env.PATH.includes(p)) {
    process.env.PATH = `${p};${process.env.PATH}`;
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: ['text/*', 'application/x-tex'], limit: '20mb' }));

// ---------------------------------------------------------------------------
// Utility: recursive directory cleanup with retry
// ---------------------------------------------------------------------------
function cleanup(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
  } catch (err) {
    console.warn(`[cleanup] Failed to remove ${dirPath}:`, err.message);
  }
}

// ---------------------------------------------------------------------------
// Helper: Check command availability
// ---------------------------------------------------------------------------
function isToolAvailable(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'ignore', env: process.env });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// GET /api/system — System health, engine availability & environment info
// ---------------------------------------------------------------------------
app.get('/api/system', (req, res) => {
  const pdflatex = isToolAvailable('pdflatex');
  const xelatex = isToolAvailable('xelatex');
  const lualatex = isToolAvailable('lualatex');
  const synctex = isToolAvailable('synctex');
  const git = isToolAvailable('git');

  res.json({
    ok: true,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    engines: {
      pdflatex,
      xelatex,
      lualatex
    },
    tools: {
      synctex,
      git
    }
  });
});

// ---------------------------------------------------------------------------
// POST /compile — Compile single-file or multi-file project
// ---------------------------------------------------------------------------
app.post('/compile', (req, res) => {
  let files = {};
  let mainFile = 'main.tex';
  let engine = 'pdflatex';
  let enableSynctex = true;

  // Handle incoming payload (JSON object vs Raw Text)
  if (typeof req.body === 'string') {
    // Single file raw string
    files['main.tex'] = req.body;
  } else if (typeof req.body === 'object' && req.body !== null) {
    // Project JSON payload
    files = req.body.files || {};
    mainFile = req.body.mainFile || 'main.tex';
    engine = ['pdflatex', 'xelatex', 'lualatex'].includes(req.body.engine) ? req.body.engine : 'pdflatex';
    enableSynctex = req.body.synctex !== false;
  }

  // Basic validation
  if (!files[mainFile] || typeof files[mainFile] !== 'string' || files[mainFile].trim().length === 0) {
    return res.status(400).json({
      success: false,
      log: `Error: Entry point '${mainFile}' not found or is empty in project files.`
    });
  }

  // Create isolated temp workspace
  const tmpDir = path.join(
    os.tmpdir(),
    `latex-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  fs.mkdirSync(tmpDir, { recursive: true });

  // Write all project files & assets to temp folder
  for (const [relPath, content] of Object.entries(files)) {
    const filePath = path.join(tmpDir, relPath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    if (typeof content === 'string' && content.startsWith('data:') && content.includes(';base64,')) {
      // Decode Base64 binary image/asset
      const base64Data = content.split(';base64,')[1];
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    } else if (typeof content === 'string') {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }

  console.log(`[compile] Using engine: ${engine} in ${tmpDir}`);

  // Base output name (e.g. main.pdf from main.tex)
  const baseName = path.parse(mainFile).name;
  const synctexFlag = enableSynctex ? '-synctex=1' : '';
  const cmd = `${engine} -interaction=nonstopmode -halt-on-error ${synctexFlag} "${mainFile}"`;

  // Allow up to 180 seconds for heavy CircuiTikZ / PGF / Math compilation
  exec(cmd, { cwd: tmpDir, timeout: 180000, env: process.env }, (error, stdout, stderr) => {
    const pdfPath = path.join(tmpDir, `${baseName}.pdf`);
    const logPath = path.join(tmpDir, `${baseName}.log`);

    if (fs.existsSync(pdfPath)) {
      console.log(`[compile] Success with ${engine} — sending PDF`);

      try {
        const pdfBuffer = fs.readFileSync(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${baseName}.pdf"`);
        res.send(pdfBuffer);
      } catch (readErr) {
        console.error('[compile] Error reading generated PDF:', readErr.message);
        res.status(500).json({ success: false, log: 'Error reading generated PDF: ' + readErr.message });
      } finally {
        setTimeout(() => cleanup(tmpDir), 1500);
      }
    } else {
      console.log(`[compile] Failed with ${engine} — parsing error log`);

      let logContent = '';
      if (fs.existsSync(logPath)) {
        logContent = fs.readFileSync(logPath, 'utf-8');
      } else {
        logContent = stdout || stderr || 'Unknown compilation error. No log file generated.';
      }

      if (error && error.killed) {
        logContent = 'Compilation timed out after 180 seconds.\n\n' + logContent;
      }

      res.status(400).json({
        success: false,
        log: logContent
      });

      setTimeout(() => cleanup(tmpDir), 1500);
    }
  });
});

// ---------------------------------------------------------------------------
// POST /api/export-zip — Download full project as submission-ready ZIP
// ---------------------------------------------------------------------------
app.post('/api/export-zip', (req, res) => {
  const { files = {}, projectName = 'latex-project' } = req.body;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('error', (err) => {
    console.error('[export-zip] Archiver error:', err.message);
    res.status(500).send({ error: err.message });
  });

  archive.pipe(res);

  // Append each file to the zip
  for (const [relPath, content] of Object.entries(files)) {
    if (typeof content === 'string' && content.startsWith('data:') && content.includes(';base64,')) {
      const base64Data = content.split(';base64,')[1];
      archive.append(Buffer.from(base64Data, 'base64'), { name: relPath });
    } else if (typeof content === 'string') {
      archive.append(content, { name: relPath });
    }
  }

  archive.finalize();
});

// ---------------------------------------------------------------------------
// POST /api/wordcount — Academic word & formula count analysis
// ---------------------------------------------------------------------------
app.post('/api/wordcount', (req, res) => {
  const source = typeof req.body === 'string' ? req.body : req.body.text || '';

  // 1. Remove comments
  let text = source.replace(/%.*$/gm, '');

  // 2. Count inline math ($...$) and display math (\[...\], \begin{equation}...)
  const inlineMathMatches = text.match(/\$[^$]+\$/g) || [];
  const displayMathMatches = text.match(/(\\\[[\s\S]*?\\\]|\\begin\{equation[\s\S]*?\\end\{equation\*?\}|\\begin\{align[\s\S]*?\\end\{align\*?\})/g) || [];
  const totalMath = inlineMathMatches.length + displayMathMatches.length;

  // Remove math blocks before word counting
  text = text.replace(/\$[^$]+\$/g, ' ');
  text = text.replace(/(\\\[[\s\S]*?\\\]|\\begin\{[\w*]+\}[\s\S]*?\\end\{[\w*]+\})/g, ' ');

  // 3. Count figures and tables
  const figureCount = (source.match(/\\begin\{figure/g) || []).length;
  const tableCount = (source.match(/\\begin\{table/g) || []).length;

  // 4. Remove preamble (everything before \begin{document})
  const docStart = text.indexOf('\\begin{document}');
  if (docStart !== -1) {
    text = text.substring(docStart + 16);
  }
  const docEnd = text.indexOf('\\end{document}');
  if (docEnd !== -1) {
    text = text.substring(0, docEnd);
  }

  // 5. Strip LaTeX commands (\command{...} or \command)
  const cleanBody = text
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{([^}]*)\})?/g, '$1')
    .replace(/[{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleanBody.length > 0 ? cleanBody.split(/\s+/).filter(w => w.length > 0).length : 0;
  const characters = cleanBody.replace(/\s/g, '').length;

  res.json({
    words,
    characters,
    mathFormulas: totalMath,
    figures: figureCount,
    tables: tableCount
  });
});

// ---------------------------------------------------------------------------
// Start Server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═════════════════════════════════════════════════════════════════╗');
  console.log('  ║             TeXStudio Local — High Performance LaTeX            ║');
  console.log('  ╠═════════════════════════════════════════════════════════════════╣');
  console.log(`  ║  → Live Editor: http://localhost:${PORT}                           ║`);
  console.log('  ║  Features: Multi-File, CircuiTikZ, SyncTeX, PDF.js, Zip Export  ║');
  console.log('  ║  Engines: pdfLaTeX, XeLaTeX, LuaLaTeX                           ║');
  console.log('  ║  Press Ctrl+C to stop                                           ║');
  console.log('  ╚═════════════════════════════════════════════════════════════════╝');
  console.log('');
});
