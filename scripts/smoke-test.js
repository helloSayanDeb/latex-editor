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
console.log('  ║        TeXStudio Local — Environment & Smoke Test Suite        ║');
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
    process.env.PATH = `${p};${process.env.PATH}`;
  }
}

let passedChecks = 0;
let totalChecks = 4;

// 1. Check Node.js runtime
console.log(`[1/4] Checking Node.js Runtime...`);
if (process.version) {
  console.log(`  ✓ Node.js version ${process.version} detected (${process.platform} ${process.arch})`);
  passedChecks++;
} else {
  console.error(`  ✕ Node.js runtime check failed.`);
}

// 2. Check TeX Distribution
console.log(`[2/4] Checking Local LaTeX Distribution...`);
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

// Check other optional engines
for (const eng of ['xelatex', 'lualatex']) {
  try {
    const v = execSync(`${eng} --version`, { env: process.env }).toString().split('\n')[0];
    console.log(`  ✓ Optional engine '${eng}': available`);
  } catch {
    console.log(`  - Optional engine '${eng}': not installed (optional)`);
  }
}

// 3. Perform Live Headless Compilation Test
console.log(`[3/4] Performing Live Compilation Test (CircuiTikZ & Math)...`);
if (pdflatexFound) {
  const tmpDir = path.join(os.tmpdir(), `smoke-test-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const testTex = `\\documentclass{article}
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

// 4. Verify Local Client Assets
console.log(`[4/4] Verifying Frontend Bundles & Offline Assets...`);
const requiredAssets = [
  'public/index.html',
  'public/cm.bundle.js',
  'public/vendor/pdf.min.js',
  'public/vendor/pdf.worker.min.js'
];

let assetsOk = true;
for (const asset of requiredAssets) {
  if (!fs.existsSync(asset)) {
    console.error(`  ✕ Missing asset: ${asset}`);
    assetsOk = false;
  }
}

if (assetsOk) {
  console.log(`  ✓ All CodeMirror and PDF.js offline bundles are present and ready.`);
  passedChecks++;
}

console.log('');
console.log('───────────────────────────────────────────────────────────────────');
if (passedChecks === totalChecks) {
  console.log(`  🎉 ALL CHECKS PASSED (${passedChecks}/${totalChecks})!`);
  console.log('  This computer is 100% ready to run TeXStudio Local.');
  console.log('  Start with: npm start');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');
  process.exit(0);
} else {
  console.error(`  ⚠️ Some checks failed (${passedChecks}/${totalChecks}). Please resolve warnings above.`);
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');
  process.exit(1);
}
