# =============================================================================
# TeXStudio Local — Single-Command Setup & Launch Script (Windows PowerShell)
# =============================================================================
# This script automates everything:
#   1. Verifies/Installs Node.js runtime
#   2. Verifies/Installs MiKTeX (via winget if missing)
#   3. Installs project dependencies (npm install)
#   4. Builds offline frontend bundles (npm run build)
#   5. Runs the automated compilation & environment smoke test
#   6. Launches the application and opens your browser
# =============================================================================

$ErrorActionPreference = "Stop"

function Write-Banner {
    Write-Host ""
    Write-Host "  ╔═════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "  ║             TeXStudio Local — Setup & Launch Suite             ║" -ForegroundColor Cyan
    Write-Host "  ╚═════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step([string]$step, [string]$msg) {
    Write-Host "[$step] $msg" -ForegroundColor Yellow
}

function Write-Success([string]$msg) {
    Write-Host "  ✓ $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "  ! $msg" -ForegroundColor Magenta
}

function Write-Err([string]$msg) {
    Write-Host "  ✗ $msg" -ForegroundColor Red
}

Write-Banner

# -----------------------------------------------------------------------------
# 1. Check Node.js Runtime
# -----------------------------------------------------------------------------
Write-Step "1/5" "Verifying Node.js Runtime..."
$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    Write-Warn "Node.js not detected in PATH. Checking winget..."
    $wingetCmd = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Host "  Installing Node.js LTS via winget..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        $nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
    }
    
    if (-not $nodeCmd) {
        Write-Err "Node.js could not be installed automatically."
        Write-Host "  Please install Node.js (v18+) from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

$nodeVer = & node -v
Write-Success "Node.js $nodeVer is ready."

# -----------------------------------------------------------------------------
# 2. Check LaTeX Distribution (MiKTeX / TeX Live)
# -----------------------------------------------------------------------------
Write-Step "2/5" "Verifying Local LaTeX Distribution..."

# Common MiKTeX paths on Windows
$commonTexPaths = @(
    "$env:LOCALAPPDATA\Programs\MiKTeX\miktex\bin\x64",
    "C:\Program Files\MiKTeX\miktex\bin\x64",
    "C:\texlive\2026\bin\windows",
    "C:\texlive\2025\bin\windows",
    "C:\texlive\2024\bin\windows"
)

foreach ($tp in $commonTexPaths) {
    if (Test-Path $tp) {
        if (-not ($env:Path -like "*$tp*")) {
            $env:Path = "$tp;$env:Path"
        }
    }
}

$pdflatexCmd = Get-Command "pdflatex" -ErrorAction SilentlyContinue

if (-not $pdflatexCmd) {
    Write-Warn "No LaTeX compiler found in PATH. Checking winget for MiKTeX..."
    $wingetCmd = Get-Command "winget" -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        Write-Host "  Installing MiKTeX distribution (silent)..." -ForegroundColor Cyan
        winget install MiKTeX.MiKTeX --silent --accept-package-agreements --accept-source-agreements
        # Re-check paths
        foreach ($tp in $commonTexPaths) {
            if (Test-Path $tp) {
                $env:Path = "$tp;$env:Path"
            }
        }
        $pdflatexCmd = Get-Command "pdflatex" -ErrorAction SilentlyContinue
    }

    if (-not $pdflatexCmd) {
        Write-Err "LaTeX compiler (pdflatex) not found."
        Write-Host "  Please install MiKTeX from: https://miktex.org/download" -ForegroundColor Yellow
        Write-Host "  or run: winget install MiKTeX.MiKTeX" -ForegroundColor Yellow
        exit 1
    }
}

Write-Success "Found LaTeX compiler: $($pdflatexCmd.Source)"

# -----------------------------------------------------------------------------
# 3. Install NPM Dependencies
# -----------------------------------------------------------------------------
Write-Step "3/5" "Installing Dependencies (npm install)..."
$npmCmd = Get-Command "npm" -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Err "npm command not found. Please restart PowerShell if you just installed Node.js."
    exit 1
}

& npm install --no-audit --no-fund
Write-Success "Dependencies installed."

# -----------------------------------------------------------------------------
# 4. Build Offline CodeMirror Bundle
# -----------------------------------------------------------------------------
Write-Step "4/5" "Building Frontend Assets..."
& npm run build
Write-Success "Bundle public/cm.bundle.js built."

# -----------------------------------------------------------------------------
# 5. Run Verification Smoke Test Suite
# -----------------------------------------------------------------------------
Write-Step "5/5" "Executing Automated Test Suite..."
& node scripts/smoke-test.js
if ($LASTEXITCODE -ne 0) {
    Write-Err "Smoke test failed. Please check the logs above."
    exit 1
}

# -----------------------------------------------------------------------------
# Launch Application
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🎉 SETUP COMPLETE! Launching TeXStudio Local..." -ForegroundColor Green
Write-Host "  → Web Interface: http://localhost:2303" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C in this terminal window to stop the server." -ForegroundColor Yellow
Write-Host "  ═════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:2303"
& node server.js
