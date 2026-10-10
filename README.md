# TeXStudio Local

A personal LaTeX workspace with a CodeMirror editor, PDF preview and TeX Sage assistant. Use the desktop app or run it locally in your browser. Compilation uses your installed TeX distribution.

## Easy installation

### 1. Desktop app

Download an installer from [GitHub Releases](https://github.com/helloSayanDeb/latex-editor/releases/latest). Windows: run `TeXStudio-Local-windows-x64.exe`, then open the desktop shortcut. macOS: choose the Apple Silicon (`arm64`) or Intel (`x64`) DMG and drag TeXStudio Local to Applications. macOS assets are built by the release workflow; check the release for availability.

The app bundles its runtime and starts/stops its local server automatically. **No Node.js, npm or terminal is needed to open the desktop app.** It listens only on `127.0.0.1:2304`; close another app occupying that port if startup fails. Windows installers are per-user. Installers are currently unsigned, so Windows/macOS may ask you to approve them.

For PDF compilation, install [MiKTeX on Windows](https://miktex.org/download) or [MacTeX on macOS](https://www.tug.org/mactex/), then restart the app. If no engine is found, the desktop app offers the download website. TeX is not bundled; first-time packages/fonts can need internet access. Editing is available without TeX. Local AI remains optional and requires its own running server.

Local versioning additionally needs Git installed. Desktop installation does not install Git, AI models or a TeX distribution.

### 2. One-command installation

Windows: paste this into PowerShell:

```powershell
& ([scriptblock]::Create((Invoke-WebRequest -UseBasicParsing 'https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/install.ps1').Content))
```

macOS: paste this into Terminal:

```sh
curl -fsSL https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/install.sh | sh
```

These scripts download the latest published desktop installer, verify its SHA-256 checksum, install for the current user and launch it. You can inspect [install.ps1](install.ps1) or [install.sh](install.sh) before running. They need internet and an existing release with the appropriate installer and `SHA256SUMS.txt`; they do not install TeX or bypass operating-system security approvals. The macOS script installs to `~/Applications`. Linux currently uses the developer setup below.

Desktop documents and snapshots live under Electron's user-data directory (`%APPDATA%/TeXStudio Local` on Windows; `~/Library/Application Support/TeXStudio Local` on macOS). Updates preserve this data. Existing browser-install projects are not automatically migrated. To migrate, close both apps and copy your existing `projects/` folder into the desktop data folder, keeping the originals backed up. Browser storage, including AI settings, is separate from your existing `localhost:2303` session.

## Developer requirements

- Node.js **20.9 or newer** and npm.
- MiKTeX or TeX Live with the engines you want to use: `pdflatex`, `xelatex`, `lualatex`.
- Packages and fonts required by your documents. Selecting an engine does not install missing fonts or repair invalid LaTeX.

## Developer setup

```sh
git clone https://github.com/helloSayanDeb/latex-editor.git
cd latex-editor
npm install
npm run build
npm start
```

Open `http://localhost:2303`. For development, use `npm run dev`.

Windows users can run `./setup.ps1`; macOS/Linux users can run `./setup.sh`. These scripts install dependencies, build the application, run environment checks and launch it. Inspect them before running; distribution installation may require administrator access and internet connectivity.

## Features

- Native pdfLaTeX, XeLaTeX and LuaLaTeX compilation with bibliography passes and compiler diagnostics.
- CodeMirror 6 syntax highlighting, command completion, find/replace, document outline, local English spelling and two-space LaTeX formatting.
- PDF.js parsing worker and Canvas 2D preview, nearby-page rendering, retained canvases during zoom, fit controls, dark paper and PDF download. Recompiling preserves the visible page and scroll position. No additional WebGL compositing pass.
- Ctrl/Command-click PDF to jump to source using SyncTeX. Mapping accuracy depends on the boxes recorded by TeX.
- Multiple projects and files, debounced ordered autosaves, project deletion, submission ZIP export, compile snapshots and manual snapshots.
- Templates, a table generator and math/symbol tools.
- TeX Sage beside the editor/PDF on wide workspaces, or in a slide-over on narrower ones. Resizable desktop panel with remembered width.
- A mobile welcome recommending tablet/desktop and landscape orientation. Continue here is remembered in browser storage until cleared.

## TeX Sage

Supports Google Gemini, OpenAI, LM Studio and Ollama. Configure the provider in assistant settings.

- **LM Studio:** start its local server, load a chat model, then choose the detected model. Default endpoint: `http://localhost:1234/v1`.
- **Ollama:** run the local server with an available chat model, then choose it from the detected list. Default endpoint: `http://localhost:11434`.
- **Gemini/OpenAI:** supply your API key and model. Keys remain in the tab unless encrypted with your optional master password. Local providers need no API key or master password.

Recent conversation turns accompany follow-ups. Replies render Markdown, code blocks and math. Ask mode keeps answers in chat. Edit source mode automatically previews a single LaTeX code block inline, with removed code in red, proposed code in green and Accept/Reject beneath it. Select a snippet to constrain the request; follow-ups retain the last accepted edit range. Unchanged outer lines are trimmed even when the model returns a complete document.

Accept applies one undoable change. Reject/Escape discards the preview. **Compile accepts a pending edit and compiles the updated source**, removing its Reject controls. A subsequent edit request also finalizes the previous pending proposal before refining it. Successful compilations create snapshots. Multiple returned code blocks have individual preview actions. Quick prompts use circular previous/next buttons.

LM Studio has been tested live locally. Cloud providers and Ollama have request/response contract tests; those do not guarantee access for every account or model. Model context limits and model-generated code can still require shorter conversations or manual correction.

## Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl/Cmd + Enter | Compile, accepting any pending AI edit |
| Ctrl/Cmd + B | Toggle file sidebar |
| Ctrl/Cmd + F / H | Find / replace |
| Ctrl/Cmd + Shift + F | Format active LaTeX source |
| Ctrl + Space | Command completion |
| Ctrl/Cmd + click PDF | Jump to source |
| Escape in editor | Reject pending AI edit |
| Ctrl/Cmd + Z | Undo accepted edit or formatting |

## Verification and implementation status

```sh
npm test
npm run build
node scripts/ai-conversation-regressions.cjs
node scripts/pdf-chat-regressions.cjs
node scripts/format-regressions.cjs
```

Additional live audit scripts require the running app and, for AI tests, a configured local LM Studio server. See [the feature audit](docs/FEATURE_AUDIT.md) for checks, limitations and remaining work. The overhaul is not complete: source-to-PDF navigation UI, Git push/pull UI and persistent track changes remain unfinished. Local Git initialization and commits are available.

## Architecture and privacy

The current app uses **Next.js 16 App Router, React 19 and TypeScript**, with local route handlers for compilation, projects, snapshots, Git, spelling, exports and local AI. Documents live in `projects/`; that directory, build output and local verification images/PDFs are excluded from Git. The initial vanilla/Express implementation remains in the repository for reference; npm start runs the Next.js app.

The desktop wrapper uses Electron with a sandboxed browser window, Node integration disabled, and an isolated Next.js standalone server. Desktop documents use a writable data folder outside the installation; set `TEXSTUDIO_DATA_DIR` to override the server data root.

## Building installers

Use Node.js 22.12 or newer for desktop packaging, then:

```sh
npm ci
node node_modules/electron/install.js
npm run desktop:build
```

Build on Windows for NSIS or macOS for DMG. Output goes to `dist-desktop/`. `npm run desktop:prepare` builds and copies the standalone server; `npm run desktop:start` runs it in Electron. The `Desktop installers` GitHub workflow builds Windows x64 and macOS Intel/Apple Silicon; a `v*` tag publishes installers and checksums, while manual dispatch produces downloadable workflow artifacts. macOS builds require verification on an actual Mac; Windows testing does not establish macOS compatibility. Releases are unsigned until signing credentials are configured.

After building a Windows installer, `node scripts/test-desktop.cjs` tests the one-command installer against local release assets, installs into an isolated `dist-desktop/test-installed` directory, and checks bundled runtime startup, static assets, spelling, all three native TeX engines, Git storage, data persistence and server shutdown. This test requires the three engines and Git on the test machine; end users can install only the engines they use. AI/PDF/formatter regression commands above remain separate checks.

Release **2.0.1** built and passed packaged startup checks on Windows x64, Intel macOS and Apple Silicon macOS in [GitHub Actions](https://github.com/helloSayanDeb/latex-editor/actions/runs/38086418929). The Windows installer and one-command flow were tested locally with all three TeX engines, spelling, Git, persistent data and shutdown. macOS DMG installation, security approvals and native TeX compilation still need manual testing on a Mac. See [distribution verification](docs/DESKTOP_RELEASE.md) for the precise test scope.

Compilation and spell checking run locally. Cloud AI sends your prompts, recent conversation and attached source context to the chosen provider; local AI sends it to your local model server. The interface has no analytics tracking. First dependency installation and missing TeX package installation can require internet access. TeX runs without shell escape and with isolated temporary workspaces and validated file paths.

This is designed as a trusted local workstation. Deploying to Vercel is not supported by the current native-compilation and disk-storage backend; a hosted deployment needs separate storage, authentication and a TeX compilation service. The mobile notice does not change these backend requirements.

## License

[MIT](LICENSE).
