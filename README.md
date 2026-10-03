# 🚀 TeXStudio Local — High-Performance Personal LaTeX Workstation

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-indigo.svg)](https://github.com/helloSayanDeb/latex-editor)
[![LaTeX Distribution](https://img.shields.io/badge/LaTeX-MiKTeX%20%7C%20TeX%20Live-10b981.svg)](https://miktex.org)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline%20%26%20Local-6366f1.svg)](https://github.com/helloSayanDeb/latex-editor)
[![Docker](https://img.shields.io/badge/Docker-Not%20Required-blue.svg)](https://github.com/helloSayanDeb/latex-editor)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

> **A blazing-fast, lightweight personal LaTeX workstation that runs 100% on your local hardware.**
> Compile heavy academic papers, complex mathematical formulas, and CircuiTikZ analog schematics in **sub-second time** with pixel-perfect custom HTML5 Canvas rendering. **Zero monthly subscriptions, zero container bloat, and total privacy.**

---

## ⚡ 1-Minute Quick Start

Anyone on the internet can clone this repository and get the entire environment, dependencies, automated smoke tests, and editor running with a **single command**.

### 🪟 Windows (PowerShell)
Open PowerShell and run:
```powershell
git clone https://github.com/helloSayanDeb/latex-editor.git
cd latex-editor
.\setup.ps1
```

> **What `setup.ps1` does automatically:**
> 1. Verifies your Node.js runtime (or auto-installs Node.js LTS via `winget` if missing).
> 2. Verifies your LaTeX compiler (`pdflatex`, `xelatex`, `lualatex`). If missing, auto-installs MiKTeX silently via `winget`.
> 3. Installs project dependencies (`npm install`).
> 4. Builds the CodeMirror 6 unified editor bundle (`npm run build`).
> 5. Runs the automated verification suite (`node scripts/smoke-test.js`).
> 6. Launches the web app at `http://localhost:2303` and opens your default browser!

---

### 🍎 macOS & 🐧 Linux (Bash)
Open your terminal and run:
```bash
git clone https://github.com/helloSayanDeb/latex-editor.git
cd latex-editor
chmod +x setup.sh
./setup.sh
```

---

## 💎 Workstation Architecture & Capabilities

| Capability | Specification | Description |
| :--- | :---: | :--- |
| **Execution Environment** | 🔒 **100% Localhost** | All computation runs directly on your machine. Zero cloud dependency, zero data leaks. |
| **Hardware Compilation** | ⚡ **Sub-Second Speed** | Compiles heavy math, matrices, and CircuiTikZ schematics in under ~0.6s. |
| **TeX Engines Supported** | 🛠️ **Multi-Engine** | Native runtime switching between **pdfLaTeX**, **XeLaTeX**, and **LuaLaTeX**. |
| **PDF Rendering** | 🎯 **Vector Canvas** | High-DPI continuous multi-page HTML5 canvas with page jumping and dark paper mode. |
| **Project Architecture** | 📂 **Multi-File Tree** | Full project hierarchy support with drag-and-drop graphics management. |
| **Visual Table Studio** | 📊 **GUI Generator** | Interactive preview grid supporting both publication-grade **Booktabs** and classic styles. |
| **Symbol & Circuit Palette**| 🎨 **Click-to-Insert** | One-click insertion for Greek alphabet, calculus symbols, and analog circuit elements. |
| **Document Navigation** | 📑 **Dynamic Outline** | Automated document outline parser with synchronized viewport jumping. |
| **Intelligent Autocomplete**| 🔍 **Context-Aware** | Smart completion for `\cite{}` from `.bib` files, `\ref{}` from `\label{}`, and LaTeX commands. |
| **Version History** | 🕒 **Local Snapshots** | Automated compilation snapshots and custom revisions with 1-click restore. |
| **Academic Analysis** | 📈 **Deep Word Count** | Dedicated parser for body words, mathematical equations, figures, and tables. |
| **Publishing & Submission** | 📦 **ZIP Export** | Instant packaging ready for arXiv, IEEE, ACM, or Springer submissions. |
| **AI Academic Assistant** | 🤖 **Universal Engine** | Seamless integration with **LM Studio**, **Ollama**, **Gemini**, and **OpenAI**. |

---

## 🤖 Universal AI Academic Assistant Guide

TeXStudio Local includes a built-in **AI Academic Assistant Drawer** designed specifically for scientific writing and LaTeX troubleshooting. You can connect it to **100% offline local LLMs** or direct **cloud APIs** with zero telemetry.

Click the **AI** icon in the toolbar or navigation menu to open the assistant.

```
┌────────────────────────────────────────────────────────┐
│  AI Engine Provider:                                   │
│  [ Google Gemini / LM Studio / Ollama / OpenAI    ▼ ]  │
│                                                        │
│  Prompt: [ Fix LaTeX Error / Academic Tone / BibTeX ]  │
│  [ Ask AI ]  ─────────────► [ Insert at Cursor ]       │
└────────────────────────────────────────────────────────┘
```

---

### Option 1: 🖥️ LM Studio (100% Free, Private & Offline)
Run cutting-edge open-source LLMs locally on your GPU/CPU with **zero internet connection** and **zero data leaks**.

#### Step 1: Download & Install LM Studio
1. Download LM Studio for Windows, macOS, or Linux from [https://lmstudio.ai](https://lmstudio.ai).
2. Install and launch the application.

#### Step 2: Download an Academic / Coding Model
Inside LM Studio, search for any of the following high-performing models:
- **`Qwen2.5-Coder-7B-Instruct`** *(Recommended: Exceptional LaTeX, math, and TikZ generation)*
- **`DeepSeek-R1-Distill-Qwen-7B`** *(Recommended: Deep mathematical reasoning)*
- **`Llama-3.2-3B-Instruct`** *(Lightweight for laptops with 8 GB RAM)*
- **`Mistral-7B-Instruct-v0.3`**

Click **Download** on the GGUF quantization (e.g., `Q4_K_M` or `Q5_K_M`).

#### Step 3: Start the Local Developer Server
1. Click the **Developer / Local Server** tab in LM Studio (the `<->` icon on the left bar).
2. Select your downloaded model from the top dropdown.
3. In the right sidebar:
   - **Port**: `1234`
   - **CORS**: **Toggle ON "Cross-Origin Resource Sharing (CORS)"** *(Crucial for browser communication)*
4. Click **Start Server**. You will see:
   ```text
   Server running at http://localhost:1234
   ```

#### Step 4: Connect TeXStudio Local
1. In TeXStudio Local, click the **AI Assistant** button.
2. Under **AI Engine Provider**, select **LM Studio (Localhost:1234)**.
3. The endpoint is automatically set to `http://localhost:1234/v1`.
4. Type your prompt or click a quick chip (e.g. *"Fix LaTeX Error"*) and click **Ask AI**.
5. When the solution appears, click **Insert at Cursor** to instantly insert the LaTeX snippet into your editor!

---

### Option 2: 🦙 Ollama (Terminal & Background Daemon)
If you prefer running models via the terminal:

1. Install Ollama from [https://ollama.com](https://ollama.com).
2. Pull your model:
   ```bash
   ollama run llama3
   # or for coding:
   ollama run deepseek-coder:6.7b
   ```
3. Start the server with CORS enabled so your local browser can communicate with it:
   ```bash
   # Windows (PowerShell)
   $env:OLLAMA_ORIGINS="*"
   ollama serve

   # macOS / Linux (Bash)
   OLLAMA_ORIGINS="*" ollama serve
   ```
4. In TeXStudio Local AI drawer, select **Ollama (Localhost:11434)** and start querying!

---

### Option 3: ⚡ Google Gemini (Cloud Free Tier)
For instant cloud assistance without installing local LLMs:

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In TeXStudio Local, select **Google Gemini (Direct API Key)**.
3. Paste your key into the **Google Gemini API Key** field.
4. *Security guarantee*: Your API key is stored **only in your browser's private `localStorage`**—it is never sent to the backend server and never saved into Git!
5. Automatically supports multi-model fallback (`gemini-2.5-flash`, `gemini-3.1-flash-lite`, `gemini-2.5-pro`).

---

### Option 4: 🌐 OpenAI / Claude / Custom OpenAI-Compatible
1. Select **OpenAI / Claude / Compatible Custom API**.
2. Enter your endpoint (e.g. `https://api.openai.com/v1`).
3. Enter your API key (`sk-...`).
4. Works with any OpenAI-compatible server (vLLM, TextGen WebUI, Jan, LocalAI).

---

## 🎯 Key Workstation Features

### 1. 📂 Multi-File Project Tree & Drag-and-Drop Assets
- Split large documents into chapters (`chapter1.tex`, `macros.sty`, `references.bib`).
- **Drag-and-Drop Image Import**: Drop `.png`, `.jpg`, `.pdf`, or `.svg` files directly into the editor. They are saved in `figures/` and a properly configured `\begin{figure}` block is automatically placed at your cursor.

### 2. ⚡ Sub-Second Hardware Compilation
- Direct local compiler execution using your hardware CPU cores.
- Switch between **pdfLaTeX**, **XeLaTeX**, and **LuaLaTeX** on the fly.
- SyncTeX enabled by default (`-synctex=1`).
- Complex CircuiTikZ analog schematics, PGF plots, and heavy mathematical documents compile in **under 0.7 seconds**.

### 3. 🎨 High-DPI Vector Canvas PDF Viewer
- Custom PDF rendering pipeline built on PDF.js WebWorker.
- Continuous vertical scrolling with a visible scrollbar.
- Direct editable page jumper (`Page [ 2 ] of 12`).
- Fit-to-Width, Fit-to-Page, and zoom controls (50% to 300%).
- **Dark Paper Mode**: Invert document view for comfortable night-time writing without affecting the compiled PDF output.

### 4. 📊 Visual LaTeX Table Generator
- Intuitive modal interface to configure rows, columns, and cell alignment.
- Type headers and cell values directly into an interactive preview grid.
- Select between **Booktabs** (`\toprule \midrule \bottomrule`) for publication-grade academic papers or **Classic** border grids (`|c|c|`).
- Automatically formats clean `\begin{table} ... \end{table}` with captions and reference labels.

### 5. 🔍 Intelligent `\cite{}` and `\ref{}` Autocomplete
- Powered by CodeMirror 6.
- Typing `\cite{` scans all `.bib` files in your project and pops up a list of publication keys and paper titles.
- Typing `\ref{` scans all `\label{...}` entries across all `.tex` files in your project.
- Built-in completion for over 60 standard LaTeX commands (`\section`, `\textbf`, `\begin`, etc.).

### 6. 📑 Live Document Outline & Jump Navigation
- Automatically scans your active document for `\section`, `\subsection`, and `\subsubsection` headings.
- Click any outline node to smoothly scroll the editor to that section with centered viewport focus.

### 7. 🕒 Local Version History & Snapshot Timeline
- Takes an automated snapshot every time a document compiles successfully.
- Create manual snapshots with custom notes (e.g., *"Before rewriting Section 3"*).
- 1-click restore to any previous revision.

### 8. 📦 Submission ZIP Export
- 1-click download of your entire project as a clean `.zip` archive formatted for submission to **arXiv**, **IEEE**, or **ACM**.

---

## 🧪 Automated Smoke Test Suite

To verify that your computer has all prerequisites and can compile documents, run:
```bash
npm test
```

Expected output:
```text
  ╔═════════════════════════════════════════════════════════════════╗
  ║        TeXStudio Local — Environment & Smoke Test Suite        ║
  ╚═════════════════════════════════════════════════════════════════╝

[1/4] Checking Node.js Runtime...
  ✓ Node.js version v26.7.0 detected (win32 x64)
[2/4] Checking Local LaTeX Distribution...
  ✓ Found primary TeX engine: MiKTeX-pdfTeX 4.23 (MiKTeX 25.12)
  ✓ Optional engine 'xelatex': available
  ✓ Optional engine 'lualatex': available
[3/4] Performing Live Compilation Test (CircuiTikZ & Math)...
  ✓ Compilation succeeded in 0.60s (Output PDF: 108818 bytes)
[4/4] Verifying Frontend Bundles & Offline Assets...
  ✓ All CodeMirror and PDF.js offline bundles are present and ready.

───────────────────────────────────────────────────────────────────
  🎉 ALL CHECKS PASSED (4/4)!
  This computer is 100% ready to run TeXStudio Local.
  Start with: npm start
───────────────────────────────────────────────────────────────────
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Enter` / `Cmd + Enter` | **Compile LaTeX Document** |
| `Ctrl + B` / `Cmd + B` | **Toggle Sidebar (File Tree & Outline)** |
| `Ctrl + Space` | Trigger Intelligent Autocompletion (`\cite`, `\ref`, commands) |
| `Tab` | Indent LaTeX Code |
| `Shift + Tab` | Outdent LaTeX Code |

---

## 🏗️ Technical Architecture

- **Backend**: Node.js & Express (`server.js`)
  - Dynamic discovery of local TeX engines across Windows, macOS, and Linux without hardcoded paths.
  - Isolated temporary workspaces in `os.tmpdir()` with automated cleanup.
  - Multi-file assembly and Base64 binary decoding for graphics.
  - Streaming zip archive generation with `archiver`.
- **Frontend**: Vanilla HTML5, CSS Custom Properties, and ES2022.
  - **CodeMirror 6**: Unified bundler with `@codemirror/legacy-modes/mode/stex`, `@codemirror/theme-one-dark`, and `@codemirror/autocomplete`.
  - **PDF.js v3.11**: Local WebWorker rendering directly to high-DPI HTML5 canvas elements with continuous multi-page vertical scroll and custom dark paper mode.
  - **Zero external CDN dependencies** during normal operation.

---

## 🔒 Privacy & Security Guarantee

- **100% Localhost**: Your files and LaTeX code never leave your personal computer.
- **Zero Cloud Dependence**: Compiles without an internet connection.
- **No Telemetry**: No tracking scripts, no external analytics, no user tracking.
- **Safe Key Storage**: API keys are stored exclusively in your browser's local sandbox (`localStorage`).

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
