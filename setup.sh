#!/usr/bin/env bash
# =============================================================================
# TeXStudio Local — Single-Command Setup & Launch Script (macOS & Linux)
# =============================================================================
# Automates:
#   1. Verifying Node.js & npm runtime
#   2. Verifying LaTeX distribution (pdflatex, xelatex, lualatex)
#   3. Installing project dependencies (npm install)
#   4. Building offline frontend bundles (npm run build)
#   5. Running the automated compilation test suite
#   6. Launching the web application & opening default browser
# =============================================================================

set -e

# Terminal Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}  ╔═════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║             TeXStudio Local — Setup & Launch Suite             ║${NC}"
echo -e "${CYAN}  ╚═════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# -----------------------------------------------------------------------------
# 1. Check Node.js
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[1/5] Verifying Node.js Runtime...${NC}"
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}  ✗ Node.js is not installed.${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "    Install with Homebrew: ${YELLOW}brew install node${NC}"
    elif command -v apt-get >/dev/null 2>&1; then
        echo -e "    Install on Ubuntu/Debian: ${YELLOW}sudo apt-get install -y nodejs npm${NC}"
    elif command -v pacman >/dev/null 2>&1; then
        echo -e "    Install on Arch Linux: ${YELLOW}sudo pacman -S nodejs npm${NC}"
    else
        echo -e "    Please install Node.js (v18+) from https://nodejs.org/${NC}"
    fi
    exit 1
fi

NODE_VER=$(node -v)
echo -e "${GREEN}  ✓ Node.js ${NODE_VER} detected.${NC}"

# -----------------------------------------------------------------------------
# 2. Check LaTeX Distribution
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[2/5] Verifying Local LaTeX Distribution...${NC}"

# Add TeX Live macOS & Linux standard bin paths to PATH if present
export PATH="/Library/TeX/texbin:/usr/local/texlive/2026/bin/x86_64-linux:/usr/local/texlive/2025/bin/x86_64-linux:/usr/local/texlive/2024/bin/x86_64-linux:$PATH"

if ! command -v pdflatex >/dev/null 2>&1; then
    echo -e "${RED}  ✗ No LaTeX compiler (pdflatex) found in PATH.${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "    Install on macOS: ${YELLOW}brew install --cask mactex-no-gui${NC}"
    elif command -v apt-get >/dev/null 2>&1; then
        echo -e "    Install on Ubuntu/Debian: ${YELLOW}sudo apt-get install -y texlive-latex-extra texlive-science${NC}"
    elif command -v pacman >/dev/null 2>&1; then
        echo -e "    Install on Arch Linux: ${YELLOW}sudo pacman -S texlive-most${NC}"
    elif command -v dnf >/dev/null 2>&1; then
        echo -e "    Install on Fedora: ${YELLOW}sudo dnf install -y texlive-scheme-medium${NC}"
    else
        echo -e "    Please install TeX Live from: https://tug.org/texlive/${NC}"
    fi
    exit 1
fi

PDFLATEX_PATH=$(command -v pdflatex)
echo -e "${GREEN}  ✓ Found LaTeX compiler: ${PDFLATEX_PATH}${NC}"

# -----------------------------------------------------------------------------
# 3. Install NPM Dependencies
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[3/5] Installing Dependencies (npm install)...${NC}"
npm install --no-audit --no-fund
echo -e "${GREEN}  ✓ Dependencies installed.${NC}"

# -----------------------------------------------------------------------------
# 4. Build Bundles
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[4/5] Building Frontend Assets...${NC}"
npm run build
echo -e "${GREEN}  ✓ Bundle public/cm.bundle.js built.${NC}"

# -----------------------------------------------------------------------------
# 5. Run Verification Smoke Test Suite
# -----------------------------------------------------------------------------
echo -e "${YELLOW}[5/5] Executing Automated Test Suite...${NC}"
node scripts/smoke-test.js

# -----------------------------------------------------------------------------
# Launch Application
# -----------------------------------------------------------------------------
echo ""
echo -e "${GREEN}  ═════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 SETUP COMPLETE! Launching TeXStudio Local...${NC}"
echo -e "${CYAN}  → Web Interface: http://localhost:2303${NC}"
echo -e "${YELLOW}  Press Ctrl+C in this terminal window to stop the server.${NC}"
echo -e "${GREEN}  ═════════════════════════════════════════════════════════════════${NC}"
echo ""

# Open default browser
if command -v open >/dev/null 2>&1; then
    open "http://localhost:2303" &
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:2303" &
fi

exec node server.js
