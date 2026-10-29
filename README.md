<div align="center">

  <img src="public/favicon.svg" width="72" height="72" alt="Lemmata logo" />

  <h1>Lemmata</h1>

  <p><strong>A space for better papers.</strong><br />Write locally. Typeset beautifully. Keep your work yours.</p>

  <p>

    <a href="https://github.com/helloSayanDeb/latex-editor/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/helloSayanDeb/latex-editor?color=68aa87" /></a>

    <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-68aa87" /></a>

    <img alt="Local web app" src="https://img.shields.io/badge/local%20web%20app-Windows%20%7C%20macOS%20%7C%20Linux-343e48" />

  </p>

  <p><a href="#guided-terminal-installation"><strong>Install Lemmata</strong></a> · <a href="#developer-setup">Developer setup</a> · <a href="#lemmata-assist">Lemmata Assist</a> · <a href="#architecture-and-privacy">Privacy</a> · <a href="docs/FEATURE_AUDIT.md">Feature status</a></p>

</div>



A personal LaTeX workspace with a CodeMirror editor, fast PDF preview and optional Lemmata Assist assistance. Run it locally in your browser. Your installed TeX distribution handles compilation; a separately configured AI provider handles AI requests.



> **Lemmata is under active development.** It runs as a local web app and includes guided terminal installers for Windows and Apple Silicon macOS. It does not ship an EXE or DMG desktop application.



### Lemmata setup and engine switching



On startup, choose an engine in the shared setup screen, then run **Verify engine**. **Check welcome packages** tests the default document. Open **Tools → Lemmata setup & engine checks** any time to refresh detection, inspect executable paths or set a custom TeX bin directory. Mac users can choose MacTeX or BasicTeX guidance; Windows users can choose MiKTeX or TeX Live. Downloads and system installation remain explicit user actions. The initial welcome document uses only base LaTeX packages.



The app resolves each selected engine separately, launches a fresh process for each job and checks the response's engine identity. No app restart is required for engine changes. Installation discovery is repeated after Lemmata setup. Documents using packages/fonts not installed on your machine still need distribution-specific setup.



An interactive terminal launch (`npm run dev` or `npm start`) asks for the default engine for new projects. Use `npm run dev -- --engine xelatex` to choose explicitly, or `--no-engine-prompt` to skip. CI and noninteractive shells never wait for input. Existing projects keep their saved engine; the startup screen lets you change it.



Local API identifiers and preferences use Lemmata. Recognized browser preferences migrate on read, and legacy encrypted keys remain decryptable. Local scripts use environment names prefixed `LEMMATA_`.



| Write | Typeset | Get help |

| --- | --- | --- |

| Syntax highlighting, completion, formatting and local spelling | Native pdfLaTeX, XeLaTeX and LuaLaTeX with SyncTeX navigation | Text or reference images, explicit source sharing and inline AI edit review |



### Missing package recovery

A working compiler can still need extra `.sty`, `.cls`, TikZ/PGF `.code.tex` libraries or other LaTeX support files. When compilation reports one missing, Lemmata opens a recovery prompt with the exact filename. Choose **Find packages**, inspect the catalog match, then **Install packages & retry**. Lookup itself never installs. Ambiguous matches require a selection; missing custom journal files may have no catalog match and must be supplied with the template.

The selected engine determines the package manager: MiKTeX uses `miktex packages`; TeX Live, TinyTeX, BasicTeX and MacTeX use `tlmgr`. File catalog contents map filenames to package IDs rather than guessing from filenames. MiKTeX catalog refresh is available in the dialog. Installation uses the configured repository and may include dependencies. Internet access, a compatible repository and writable installation folders are needed. Lemmata never requests an administrator password or runs `sudo`: administrator-only installations need the vendor package manager. System fonts, images, project `.tex` files and syntax errors are separate problems.

Normal MiKTeX compile jobs disable its hidden/unattended installer for that invocation only; Lemmata presents its own approval prompt. Successful installation retries compilation; another missing dependency may produce another prompt. Recovery does not rewrite source. Installation events are recorded in the local audit log. Adding a package does not make a pre-existing distribution owned by the Lemmata uninstaller.

Vendor references: [MiKTeX package commands](https://docs.miktex.org/manual/miktex-packages.html), [MiKTeX installer flags](https://docs.miktex.org/manual/miktex-pdftex.html), [TeX Live package manager](https://tug.org/texlive/tlmgr.html).

### New in 2.0.2



- Image references through upload **or clipboard paste**, with model capability badges.

- Explicit source sharing, optional history, conversations separated by provider/endpoint and stronger saved-key encryption.

- Protected loopback APIs and bounded compiler jobs. This remains a trusted local tool, **not an OS-sandboxed compiler**.

- Compact sharing controls, consistent custom checkboxes/settings fields and a shorter message composer.



See the [QA report](docs/QA_REPORT.md) for verification and compatibility limits.



See the [development guide](docs/DEVELOPMENT.md) for the source layout and optional future work, and the [feature audit](docs/FEATURE_AUDIT.md) for supported behavior and limitations.



### Workspace tools in the current source



- **Problems**: compiler errors/warnings with file-line navigation, severity filters, compile details and a stale-source notice. Source checks flag citation/label keys missing from project files. Successful PDF responses carry a bounded summary of up to 12 compiler warnings.

- **Citation/reference completion**: actual keys from project `.bib` files, inline `\bibitem` entries and `\label` commands, with source/metadata previews. Comments and common literal environments are excluded. This is a lightweight index, not a complete TeX/BibTeX interpreter.

- **Show source in PDF**: source-toolbar button, command palette action or **Ctrl/Cmd + Alt + J**. The existing inverse PDF-to-source action remains. Recompile after source changes; locations depend on TeX's SyncTeX map.

- **Commands and project search**: **Ctrl/Cmd + Shift + P** opens commands, **Ctrl/Cmd + P** finds files, **Ctrl/Cmd + Shift + S** searches text across the project, and **Ctrl/Cmd + Shift + M** toggles Problems. Project search is literal, optionally case-sensitive, excludes binary attachments and caps results at 300. Keyboard navigation and Escape are supported.



**Built-in paper review:** open Lemmata Assist and click the book icon. Choose source files, preview sharing, approve the destination and run a source-linked review. Web research is off by default. Review supports Gemini search grounding, OpenAI Responses web search and Claude web search; Claude is available in review, not general chat. Local review supports LM Studio/Ollama plus an optional token-protected Crawl4AI bridge for up to five explicitly approved URLs. No model can edit files automatically from this panel. Stale/unverifiable source anchors cannot be clicked, and external sources require confirmation.



Read the [research-backed paper review guide](docs/PAPER_REVIEW_GUIDE.md) for provider/model requirements, crawler setup, budgets and privacy. A cloud key alone does not enable browsing: the review panel's research toggle does. Ordinary chat still has no browsing tools. Local URL retrieval is not automatic literature discovery; a search service would be an additional integration.



Verification commands: `node scripts/workspace-regressions.cjs` and optional `node scripts/workspace-browser-tests.cjs`. The browser harness needs Playwright/Chromium, an isolated running app (default `http://127.0.0.1:2306`) and optionally `LEMMATA_PLAYWRIGHT_PATH` for a separate Playwright installation. It creates/deletes its own fixture project and mocks PDF/SyncTeX responses to test UI wiring; it does not establish native TeX correctness.



`node scripts/review-regressions.cjs` checks all five review adapters with mocks, provenance, consent and secret redaction. `node scripts/workspace-live-tests.cjs` checks real engines and SyncTeX against an isolated running app; set `LEMMATA_TEST_TEX_BIN` to a portable TeX bin directory if needed. The optional crawler bridge is `scripts/crawl4ai-bridge.py`. Python/Crawl4AI and local models are optional external dependencies, not bundled runtimes. The real crawler integration harness is `scripts/review-live-tests.cjs`; see [development and test setup](docs/DEVELOPMENT.md).



## Guided terminal installation



**Already downloaded the repository?** Double-click **Lemmata Setup.cmd** on Windows. On Apple Silicon macOS, open **Lemmata Setup.command** (Finder may require approval and executable permission). Both open the guided terminal setup; no `cd` command is needed. The full-screen amber menu supports arrow keys, Enter and terminal resizing without accumulating duplicated options.



**Fresh download:** `Install Lemmata.cmd` is a standalone Windows bootstrap; `Install Lemmata.command` is its Mac counterpart. They download this repository at a fixed commit into a new dedicated folder, then run guided setup. The folder must not already exist. Default locations are `%LOCALAPPDATA%/Lemmata/source` and `~/Applications/Lemmata`. These entry points require the updated bootstrap and wizard to be published to `main`; local changes alone do not update the public download.



After publishing, the Windows terminal alternative is:



```powershell

irm https://raw.githubusercontent.com/helloSayanDeb/latex-editor/main/bootstrap.ps1 | iex

```



This executes the repository’s installer: review it before running it. Downloads, OS approval and setup prompts still require a network connection and user interaction.



For an explicit script launch from a downloaded checkout:



```powershell

# Windows x64 / Windows 11 ARM64

powershell -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1

```



```sh

# Apple Silicon macOS; Linux can use the TinyTeX path

bash setup.sh

```



The launcher reuses Node.js 22+ if available. Otherwise it offers a private, checksum-verified official Node.js runtime for Windows x64/ARM64 or Apple Silicon macOS. It does not install Git or replace a shared system Node runtime. The shared terminal wizard then:



1. Installs application dependencies and builds Lemmata.

2. Tests actual PDF generation separately with pdfLaTeX, XeLaTeX and LuaLaTeX.

3. If any checks fail, offers an arrow-key menu with distribution explanations and approximate download/disk requirements, an existing compiler directory, retry, or editing-only mode.

4. Downloads/installs the selected distribution after confirmation, then re-tests all engines. OS administrator approval may still be required. Failed checks never count as verified; users may explicitly continue with only the engines that passed.

5. Lets you choose a verified default engine for new projects, saves `lemmata-settings.json`, starts the local server and opens your default browser after it responds. Keep the terminal open; Ctrl+C stops the server.



TinyTeX uses a checksum-verified official release archive extracted into an installation-owned directory, without replacing another TinyTeX directory or adding a permanent global PATH entry. Windows x64 offers TinyTeX, MiKTeX (requires winget), or full TeX Live. Windows ARM64 offers TeX Live through Windows 11 x64 emulation; it is not native ARM support. Apple Silicon offers TinyTeX, BasicTeX or full MacTeX. Choose one distribution, not all of them. Sizes are estimates and additional document packages/fonts need extra storage and downloads. Existing working compilers are reused. A missing winget or blocked vendor installer is reported, with retry/custom-directory/editing-only options.



After Windows setup, **Lemmata Setup.lnk** uses an icon generated from the same SVG as the favicon. Plain PowerShell/shell files retain the OS file-type icon; no global file associations are changed. On macOS, setup enables **Lemmata Setup.command** as a double-click terminal launcher; Finder may still require first-run approval, and it uses the standard terminal icon. Its custom icon is not automatically assigned.



Advanced checks: `npm run setup -- --check` performs real compiler tests only. `--skip-build --no-launch --no-shortcut` rechecks an already prepared checkout interactively. A noninteractive invocation without `--check` fails instead of choosing/installing software silently.



Your projects remain under `projects/` (or `LEMMATA_DATA_DIR`), and settings remain in `lemmata-settings.json`. Keep these when updating. Native application EXE/DMG packaging is not included.



### Uninstall or reset



Stop Lemmata, then double-click **Lemmata Uninstall.cmd** (Windows) or **Lemmata Uninstall.command** (macOS). Choose what to remove:



- Application dependencies and generated builds, keeping source and papers.

- Individual setup-owned compiler installations.

- Settings, or projects including snapshots/reviews, with typed confirmation.

- The private Node runtime installed by this checkout, if any.



The local `.lemmata-install.json` receipt records component ownership and stays out of Git. Keep it for cleanup. Existing system Node, Git and untracked compilers are preserved, including installations made before receipt tracking was introduced. Managed directories require matching ownership markers before removal. Windows private Node removal finishes after the uninstaller exits; failures leave a recovery log in the temporary helper directory.



BasicTeX/MacTeX cleanup removes only recorded new compiler directories; shared system links, macOS package receipts and companion applications remain for vendor-managed cleanup. Browser preferences are separate: clear Lemmata site data in your browser to remove them. Source files and the repository remain for reuse or manual deletion after cleanup. `node scripts/uninstall-wizard.cjs --list` shows the recorded components without removing anything.



## Developer requirements



- Node.js **22 or newer** and npm for the guided setup.

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



Open `http://localhost:2303` for the landing page, or `http://localhost:2303/lemmata` for the editor. For development, use `npm run dev`. These commands bind to loopback and generate a private session token for the local API. Use these launchers rather than invoking `next start`/`next dev` directly. Set `LEMMATA_PORT` to use another port.



Windows users can run `./setup.ps1`; macOS/Linux users can run `./setup.sh`. These scripts install dependencies, build the application, run environment checks and launch it. Inspect them before running; distribution installation may require administrator access and internet connectivity.



## Features



- Native pdfLaTeX, XeLaTeX and LuaLaTeX compilation with bibliography passes and compiler diagnostics.

- CodeMirror 6 syntax highlighting, command completion, find/replace, document outline, local English spelling and two-space LaTeX formatting.

- PDF.js parsing worker and Canvas 2D preview, nearby-page rendering, retained canvases during zoom, fit controls, dark paper and PDF download. Recompiling preserves the visible page and scroll position. No additional WebGL compositing pass.

- Ctrl/Command-click PDF to jump to source using SyncTeX. Mapping accuracy depends on the boxes recorded by TeX.

- Multiple projects and files, debounced ordered autosaves, project deletion, submission ZIP export, compile snapshots and manual snapshots.

- Templates, a table generator and math/symbol tools.

- Lemmata Assist beside the editor/PDF on wide workspaces, or in a slide-over on narrower ones. Resizable desktop panel with remembered width.

- A mobile welcome recommending tablet/desktop and landscape orientation. Continue here is remembered in browser storage until cleared.



## Lemmata Assist



Supports Google Gemini, OpenAI, LM Studio and Ollama. Configure the provider in assistant settings.



- **LM Studio:** start its local server, load a chat model, then choose the detected model. Default endpoint: `http://localhost:1234/v1`.

- **Ollama:** run the local server with an available chat model, then choose it from the detected list. Default endpoint: `http://localhost:11434`.

- **Gemini/OpenAI:** supply your API key and model. Keys remain in the tab unless encrypted with your optional master password. Local providers need no API key or master password.



**Ask + No source is the default.** Expand the compact Sharing row to choose Selection or Active document and preview the source before sending. Other project files are never automatically attached. Include recent chat can be switched off; prior replies may contain source you previously shared. Conversations are kept in memory, separated by provider and endpoint, and can be cleared. They are not automatically transferred when you switch providers.



Attach one **PNG, JPEG or WebP reference image** to transcribe an equation, explain a diagram or help write LaTeX. Use the upload button or paste a copied screenshot into chat with Ctrl/Cmd + V. PDFs and other attachments are unsupported. Images must be at most 8 MB and 16 megapixels; they are resized to a maximum 2048-pixel side and re-encoded as PNG to remove metadata. The prepared payload must be at most 4 MB. Original filenames are not sent. Images remain in chat memory, are sent only with their current request, and are not automatically resent with follow-ups.



Local model menus retain text models and show **Text, Vision or Unverified** capability badges. Upload is enabled only for verified vision support. LM Studio's native model metadata and Ollama's model capabilities determine support; older servers without this metadata can still chat, but cannot attach images. Cloud vision support uses a conservative model-name registry at the official endpoint; availability still depends on your account and chosen model. Unknown/custom models keep text chat with upload disabled.



Replies render Markdown, code blocks and math. **Ask** explains, diagnoses and brainstorms with small illustrative examples; it offers Copy, with no insert/replace controls. **Edit source** shares the selected snippet, or the active document when nothing is selected, with the scope visible before sending. The model returns focused search/replacement pairs. Each search must match uniquely inside the approved source; ambiguous, overlapping or out-of-selection changes are rejected. Valid proposals appear inline for Accept/Reject. No complete-document rewrite is required for a localized fix.



Accept applies one undoable change. Reject/Escape discards the preview. **Compile accepts a pending edit and compiles the updated source**, removing its Reject controls. A subsequent edit request also finalizes the previous pending proposal before refining it. Successful compilations create snapshots. Ask examples remain copyable; focused Edit proposals appear directly in the source editor. Quick prompts use circular previous/next buttons.



LM Studio text and image transcription have been tested live with a loaded `google/gemma-4-e2b` vision model. Cloud providers and Ollama have text/image request contract tests; those do not guarantee access for every account or model. Model context limits, image interpretation and model-generated code can still require shorter conversations or manual correction.



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

node scripts/image-regressions.cjs

node scripts/privacy-regressions.cjs

```



Additional live audit scripts require the running app and, for AI tests, a configured local LM Studio server. See [the feature audit](docs/FEATURE_AUDIT.md) for checks, limitations and remaining work. Source-to-PDF navigation, remote Git synchronization/conflict resolution and persistent review notes/proposals are available in source. These are personal local workflows, not real-time co-author collaboration.



## Architecture and privacy



The current app uses **Next.js 16 App Router, React 19 and TypeScript**, with local route handlers for compilation, projects, snapshots, Git, spelling, exports and local AI. Documents live in `projects/`; that directory, build output and local verification images/PDFs are excluded from Git. `npm start` runs the Next.js app; the obsolete vanilla/Express implementation has been removed.



The public repository includes application source/assets, build configuration, the dependency lockfile, developer setup scripts, reusable regression tests, license and current documentation. These let contributors reproduce and maintain the app. Local coding-agent instructions (`AGENTS.md`), generated Next.js declarations (`next-env.d.ts`), workspace-specific maintenance scripts and historical repair notes are excluded. Next.js regenerates its declaration file during development/build.



Compilation and spell checking run locally. AI sends your message, enabled recent chat, explicitly selected source context and current image to the chosen provider. Cloud AI sends this remotely; LM Studio/Ollama send it to your loopback model server. The interface has no analytics or remote font requests. First dependency installation and missing TeX package installation can require internet access.



The local API checks the exact loopback host, Origin/Fetch Metadata and a per-launch session cookie (HttpOnly, SameSite=Strict). This blocks ordinary cross-site API requests and DNS-rebinding hosts. It is a local access guard, not a user account system or protection against malicious software already running as your user. The local launch scripts generate the session token.



Optional saved-key encryption uses AES-GCM with a random salt/IV and PBKDF2-SHA256 (600,000 iterations). Legacy encrypted keys remain readable; unlock and save settings to upgrade them. Without a master password, new keys stay in tab memory. Unlocked keys remain accessible to app JavaScript, so encryption cannot protect a compromised app or browser. Gemini keys travel in a request header, not the URL; provider errors redact keys.



AI has no filesystem or terminal tools. Reference content is labelled untrusted, remote Markdown images are blocked, and generated external links require confirmation. Prompt injection can still affect model answers; these measures do not guarantee model obedience. Review generated code before compiling.



Compilation disables shell escape, validates paths, restricts risky source primitives (including direct Lua/file I/O), strips unrelated environment secrets and limits requests, files, concurrency, time and compiler output. **This is not an OS sandbox.** Advanced documents using restricted primitives may fail; run only trusted projects. Ordinary pdfLaTeX, XeLaTeX and LuaLaTeX, fontspec, templates and bibliography flows are tested. The browser does not isolate the native TeX process.



This is designed as a trusted local workstation. Deploying to Vercel is not supported by the current native-compilation and disk-storage backend; a hosted deployment needs separate storage, authentication and a TeX compilation service. The mobile notice does not change these backend requirements.



## License



[MIT](LICENSE).



### Workspace interaction update



Word wrap is on by default; toggle it in the source toolbar. The project explorer has Files, Outline, History and search shortcuts; the top bar exposes Commands. Lemmata Assist settings have a Back to chat action, and Escape returns to chat. Engine setup is acknowledged once per local server run, survives refresh/new tabs, and returns on a new launcher run. Tools can reopen it anytime. Runtime environment variables, session cookie/header, saved preference names now use Lemmata. Recognized previous preferences are migrated without deleting rollback copies; legacy encrypted keys remain decryptable.



## Research and visual studio update



The dark workspace uses amber accents, charcoal/steel surfaces and restrained glass for menus and dialogs. Fonts are bundled for offline use; writing and PDF surfaces remain solid. Design and asset credits remain with the source and licenses.



- **Persistent review:** open Lemmata Assist → book icon → Persistent notes. Save source-anchored notes, reply, resolve/reopen, and retain AI findings. Use Save proposed change for later review after an Edit request to retain a focused patch, then apply or reject it from the notebook. Changed or ambiguous anchors do not silently jump. Revisions prevent concurrent-window overwrites.

- **Compiler repair:** compile first, expand Compiler repair pipeline in the assistant, inspect the errors, choose Prepare focused repair and send. This explicitly shares the displayed diagnostics and active source with the chosen provider. The proposed candidate is test-compiled locally without replacing the current PDF or applying source. Accept/reject inline, or save it for later review. A successful compilation is a syntax/build check, not proof the answer is correct.

- **Equations and matrices:** Tools → Visual equation & matrix editor. Put the cursor inside a supported equation/matrix to edit it, or insert a new one. Use expression helpers, a live KaTeX preview and a matrix grid. Matrix output needs amsmath.

- **Tables:** put the cursor inside a simple tabular, then Tools → Edit table at cursor. Edit cells/alignments/rules; the surrounding table/caption remain untouched. Advanced column specifications, multirow/multicolumn and commented/custom layouts are refused to preserve source. Cells accept LaTeX.

- **Figures:** put the cursor inside a single-image figure, then Tools → Edit figure at cursor. Choose an existing project image, change width, plain caption, label and placement. Requires graphicx. Subfigures, TikZ, nested captions and custom graphics options remain source-edited.



Each visual edit is one undoable change and refuses stale source. Notes live in `projects/<id>/.lemmata/reviews.json`, outside the compile/source-file set. They survive page refresh and source saves; ordinary source ZIP export does not include them. Back up the full project directory to retain reviews. Full AI reports can also be saved explicitly, including their approved source snapshot; unsaved reports and chat remain in memory. Current native checks use Windows portable TinyTeX; cloud inference is contract-tested, not verified against live paid accounts.



Additional checks: `node scripts/review-visual-regressions.cjs` and `node scripts/studio-browser-tests.cjs`. The latter needs an isolated running application, Playwright, all required TeX packages and optionally `LEMMATA_TEST_TEX_BIN`; model responses are controlled fixtures while storage and compilation are real.





## Current source: orbital interface and submission workflow



The local landing page at `/` uses an original high-DPI Canvas 2D orbital illustration and **Framer Motion** transitions. The `/lemmata` editor keeps source, PDF and assistant in their existing arrangement, with amber accents, steel surfaces, subtle transient glass, custom controls and a one-line growing chat input. Motion respects reduced-motion preferences; the landing canvas stops when offscreen or hidden and is destroyed when leaving the page. The PDF viewer continues using Canvas 2D, independently of the landing artwork.



- **Paper review:** save up to ten full reports per project, reload findings/evidence, filter by severity/category and jump to verified source anchors. Source snapshots remain local in `.lemmata/reviews.json`; changed source disables stale report links. Saving a report does not call AI.

- **Journal templates:** open **Tools → Journal templates & submission check**. Import a user-supplied ZIP into a new project (existing work is preserved), select its main file and inspect the supported files. Limits: 20 MB ZIP, 16 MB expanded total, 8 MB per file, 200 entries. Hidden metadata, unsupported files and executable types are excluded; traversal, duplicates and oversized archives are rejected. Templates must use UTF-8 source.

- **Submission preflight:** inspect project/system classes and packages using `kpsewhich`, referenced source/graphics/bibliography files, static citation/label diagnostics and your required-file checklist. Fonts, dynamic TeX paths and publisher-specific formatting require manual review and actual compilation. Preflight does not install packages or certify journal compliance.

- **Remote Git:** open the sidebar's **Git Versioning → Remote sync & conflicts**. Configure origin, fetch, push and fast-forward pull. For diverged branches, explicitly merge, inspect conflicts, keep a side or stage a manual text resolution, then finish or abort. Pull/merge create local snapshots and reload the editor. Use your OS credential manager or SSH agent; no embedded tokens/passwords, interactive authentication, force-push or destructive reset is supported. External Git clients are needed for linked worktrees, submodules and unsupported conflict types. Private notes, snapshots, SyncTeX cache and project metadata are excluded from new commits; already tracked private files require cleanup outside the app.



Run `node scripts/journal-git-regressions.cjs` for bounded ZIP/dependency/report tests and real disposable Git remote/conflict checks. `node scripts/premium-browser-tests.cjs` verifies the production landing/editor, composer, template import, report persistence and remote settings. It uses the same isolated browser setup as the other UI harnesses; set `LEMMATA_TEST_DATA_DIR` to that server's isolated data directory to additionally exercise a real UI pull/reload. Never point test-data variables at your personal project storage.



These changes are **unreleased source**. Native packaging has been removed; the supported distribution is the local web app. PDF.js, nested math renderers and development dependencies were updated. The complete npm audit reported zero known advisories on 28 October 2026; that is not a guarantee of zero bugs or complete security.



See the [full QA report](docs/QA_REPORT.md) for the request-by-request results, corrections and unverified platform/service paths. Run `npm run qa` for repeatable regression/type/lint checks, or `npm run qa -- --api --browser` against an isolated server with the documented test prerequisites. Tests preserve personal projects; do not point isolated test-data variables at personal storage.



### Project builds and selective history



Open **Project & build settings** beside Compile (also in Tools) to rename your project, choose its main document, select Standard / Quick preview / Final document, or enable auto-compile. Auto-compile is off by default; when enabled it waits 1.2 seconds after edits and pauses during setup, pending AI proposals, history review and Git operations. Quick preview skips bibliography and can leave unresolved references; Final runs bounded extra passes. Recipes never run custom shell commands.



Open **Version history → Compare** to inspect a snapshot against current files. Restore one changed region or select whole files, including binary assets. Each restore first saves a safety snapshot. Other current edits remain intact. Large differences may appear as one grouped change; the preview limit does not truncate restored content. Find/Replace now marks every nonempty match and highlights the active one.



Real-time collaboration (#14) remains outside this personal local tool's scope.
