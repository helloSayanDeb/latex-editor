#!/usr/bin/env node
// =============================================================================
// scripts/smoke-test.js — Automated Device Environment & TeX Pipeline Test
// =============================================================================
// Run by automated setup scripts to verify that any computer can compile LaTeX
// documents cleanly before launching the full app.
// =============================================================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('');
console.log('  ╔═════════════════════════════════════════════════════════════════╗');
console.log('  ║        Lemmata — Environment & Smoke Test Suite        ║');
console.log('  ╚═════════════════════════════════════════════════════════════════╝');
console.log('');

// Register common TeX distribution paths
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
    process.env.PATH = `${p}${path.delimiter}${process.env.PATH}`;
  }
}

let passedChecks = 0;
let totalChecks = 5;

// 1. Check Node.js runtime
console.log(`[1/5] Checking Node.js Runtime...`);
if (process.version) {
  console.log(`  ✓ Node.js version ${process.version} detected (${process.platform} ${process.arch})`);
  passedChecks++;
} else {
  console.error(`  ✕ Node.js runtime check failed.`);
}

// 2. Check TeX Distribution
console.log(`[2/5] Checking Local LaTeX Distribution...`);
let pdflatexFound = false;
try {
  const versionOut = execSync('pdflatex --version', { env: process.env }).toString().split('\n')[0];
  console.log(`  ✓ Found primary TeX engine: ${versionOut}`);
  pdflatexFound = true;
  passedChecks++;
} catch (e) {
  console.error(`  ✕ 'pdflatex' command not found in system PATH.`);
  console.error(`    Remedy: Install MiKTeX (Windows), MacTeX (macOS), or TeX Live (Linux).`);
}

// Check other optional engines & tools
for (const eng of ['xelatex', 'lualatex', 'bibtex', 'synctex']) {
  try {
    const v = execSync(`${eng} ${eng === 'synctex' ? 'help' : '--version'}`, { env: process.env, stdio: ['ignore','pipe','ignore'] }).toString().split('\n')[0];
    console.log(`  ✓ Engine / Tool '${eng}': available (${v})`);
  } catch {
    console.log(`  - Engine / Tool '${eng}': not installed (optional)`);
  }
}

// 3. Perform Live Headless Compilation Test
console.log(`[3/5] Performing Base-LaTeX Compilation Test...`);
if (pdflatexFound) {
  const tmpDir = path.join(os.tmpdir(), `smoke-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const advancedTex = `\\documentclass{article}
\\usepackage{amsmath, amssymb}
\\usepackage{circuitikz}
\\begin{document}
\\title{Smoke Test Document}
\\maketitle
\\section{Validation}
Testing live typesetting of mathematical expression:
\\[
  \\int_0^\\infty e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}
\\]
\\begin{center}
\\begin{circuitikz}
  \\draw (0,0) to[R, l=$R$] (2,0);
\\end{circuitikz}
\\end{center}
\\end{document}`;

  const testTex = process.argv.includes('--advanced') ? advancedTex : String.raw`\documentclass{article}
\begin{document}
Lemmata compilation check.
\[ E = mc^2 \]
\begin{tabular}{lr}
Check & Ready \\
\end{tabular}
\end{document}`;
  const texFile = path.join(tmpDir, 'test.tex');
  fs.writeFileSync(texFile, testTex, 'utf-8');

  try {
    const start = Date.now();
    execSync('pdflatex -interaction=nonstopmode -halt-on-error test.tex', {
      cwd: tmpDir,
      env: process.env,
      stdio: 'pipe',
      timeout: 60000
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    const pdfFile = path.join(tmpDir, 'test.pdf');

    if (fs.existsSync(pdfFile) && fs.statSync(pdfFile).size > 1000) {
      console.log(`  ✓ Compilation succeeded in ${elapsed}s (Output PDF: ${fs.statSync(pdfFile).size} bytes)`);
      passedChecks++;
    } else {
      console.error(`  ✕ PDF output missing or empty.`);
    }
  } catch (err) {
    console.error(`  ✕ Compilation failed:`, err.message);
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

// 4. Verify Local Client Assets & Next.js Scaffolding
console.log(`[4/5] Verifying Client Assets & Next.js Workstation...`);
const requiredAssets = [
  'public/favicon.svg',
  'public/vendor/pdf.min.mjs',
  'public/vendor/pdf.worker.min.mjs',
  'src/app/page.tsx',
  'src/app/layout.tsx'
];

let assetsOk = true;
for (const asset of requiredAssets) {
  if (!fs.existsSync(asset)) {
    console.error(`  ✕ Missing asset: ${asset}`);
    assetsOk = false;
  }
}

if (assetsOk) {
  console.log(`  ✓ Next.js App Router workspace and PDF.js offline bundles are present.`);
  passedChecks++;
}

// 5. Check GPU Rendering Pipeline Capability
console.log(`[5/5] Checking optional display information...`);
// System GPU detection via powershell on Windows, or lspci on Linux
let gpuDetected = false;
try {
  if (process.platform === 'win32') {
    const gpuOut = execSync('powershell -Command "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Caption"', { timeout: 8000 }).toString().trim();
    const gpus = gpuOut.split('\n').map(g => g.trim()).filter(Boolean);
    console.log(`  ✓ Detected System Display Adapter(s): ${gpus.join(', ')}`);
    const isDedicated = gpus.some(g => /NVIDIA|AMD|Radeon|GeForce|RTX|GTX/i.test(g));
    if (isDedicated) {
      console.log(`  ✓ Dedicated GPU installed; the browser decides which adapter WebGL uses`);
    } else {
      console.log(`  ✓ Display adapter detected; verify WebGL support in the browser`);
    }
    gpuDetected = true;
  } else {
    console.log(`  - PDF preview uses Canvas 2D; decorative landing WebGL is optional`);
    gpuDetected = true;
  }
} catch {
  console.log(`  - Adapter detection unavailable; browser WebGL capability remains unverified`);
  gpuDetected = true;
}

if (gpuDetected) {
  passedChecks++;
}

console.log('');
console.log('───────────────────────────────────────────────────────────────────');
if (passedChecks === totalChecks) {
  console.log(`  🎉 ALL CHECKS PASSED (${passedChecks}/${totalChecks})!`);
  console.log('  Environment checks passed. Browser features require separate verification.');
  console.log('  Start with: npm run dev');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');
  process.exit(0);
} else {
  console.error(`  ⚠️ Some checks failed (${passedChecks}/${totalChecks}). Please resolve warnings above.`);
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');
  process.exit(1);
}
