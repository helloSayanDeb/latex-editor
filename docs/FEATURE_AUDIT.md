# TeXStudio Local feature audit

Audit performed 8–10 October 2026 against the supplied implementation plan, walkthrough, conversation history, source code, local APIs, installed MiKTeX, and the running browser at localhost:2303. The documents are evidence of intended scope, not proof of completion.

**Verdict: the plan is partially implemented. The app is usable, but it is not feature-complete and cannot be described as perfectly implemented.** Passing the checks below does not establish every input, platform, provider, or concurrency scenario.

## Requested repairs

| Request | Result |
|---|---|
| Replace the old character | New Sage folded-paper owl, implemented with SVG paths and reduced-motion support; browser visually inspected. |
| Unique logo and matching favicon | Pen nib between mathematical braces; the header and favicon use the same SVG asset. |
| Rename AI Copilot | TeX Sage in the toolbar and drawer. |
| Cancel Git commit | Prepare commit opens a draft with Cancel. Browser verified that Cancel clears and closes it without committing. It does not undo an already submitted commit. |
| Broken Print | Removed as requested; PDF download remains. |
| Default-looking checkboxes | Custom mint checked state, dark unchecked state, and keyboard focus outline. Browser verified in Find & Replace. |
| Welcome spills onto two pages | Shared welcome source used for new/reset projects. Real pdfLaTeX, XeLaTeX, and LuaLaTeX output is exactly one A4 page, including the footer. Existing New document updated after saving a manual snapshot named “Before one-page welcome redesign”. |

## Plan coverage

“Verified” means the listed path was executed. “Present” means source inspection establishes implementation, with limited runtime coverage. “Partial” identifies a material difference from the plan.

| Phase / feature | Status | Evidence and remaining work |
|---|---|---|
| 0: Next.js migration, React, TypeScript, App Router, CSS | Present / build verified | Production build succeeds. Installed Next.js is 16.4 rather than the plan's initial 15. Vanilla CSS utilities and responsive workspace rules are present. Middleware convention is deprecated; source lint is not clean. |
| 1: Logo/favicon | Verified | Shared path-based SVG; no font dependency in the mark. |
| 1: Mascot reactions | Partial | Idle and compiling states are connected. Success/error SVG states exist but are not connected to compilation outcomes. |
| 2: CodeMirror syntax, cursor, file switching, snippets | Present | Editor and outline work in the browser. Cite/ref completion inserts placeholders; it does not enumerate bibliography keys or labels. |
| 2: Find/replace | Core verified / partial highlighting | Search count, next/previous, replace/all, literal and regex modes. Numbered and named capture groups now expand; invalid regex shows an error. Browser verified `Alpha-12 beta-34` becomes `12:Alpha 34:beta`. It highlights the current selection, not all matches. |
| 2/4: AI review diff | Partial | Side-by-side overlay with accept/reject, not the planned inline deletion/addition widgets. Acceptance now records a source range and refuses stale/project-switched documents. Esc rejection is connected. No persisted change annotations. |
| 2/14: Spell checking | Core English workflow verified | Local Hunspell dictionary via nspell; decorations, suggestion replacement, issue navigation and a personal ignore list. TeX commands, preamble, comments, math, citation/label keys and common code/diagram environments are excluded. Browser corrected `sentnce` to `sentence`. Heuristic exclusions are not a complete TeX parser; specialized macros may require ignoring words. |
| 3: PDF preview controls | Present / browser verified | Canvas preview, continuous pages, zoom, page navigation, fit modes, dark-paper mode, and PDF download. Print deliberately removed under the new request. |
| 3: Worker/GPU pipeline | Partial | PDF.js rasterizes into a detached HTML canvas on the main thread, then WebGL2 composites; CPU fallback exists. No OffscreenCanvas rendering worker, adaptive benchmarking, or guaranteed dedicated GPU. Actual browser reported Intel graphics despite an NVIDIA adapter being installed. Smoke-test wording corrected. |
| 4: Selection context and academic routing | Present | Context and keyword classifier wired. Insert/diff controls restricted to academic responses with fenced TeX code. Keyword classification is heuristic. |
| 4: Gemini/OpenAI/Ollama/LM Studio | Contracts verified; LM Studio live verified | Four adapters pass mocked contracts. LM Studio `google/gemma-4-e2b` returned a fenced LaTeX equation through the actual browser drawer. Local providers now use a loopback-only backend route to avoid browser CORS failures; LM Studio discovers a chat model when its ID is blank. Ollama was unreachable. Gemini/OpenAI have not been tested with live credentials. |
| 4/8: Saved key encryption | Verified at helper level | AES-GCM round trip and wrong-password rejection pass. UI now wires encryption; without a password the key stays session-only. Legacy plaintext is removed from stored config. This does not protect against compromised same-origin JavaScript; PBKDF2 salt is static. |
| 5: Three engines and bibliography | Verified | All three engines compiled the welcome; real BibTeX and Biber outputs contain resolved citations. Actual errors return logs. Engines use execFile arguments, shell escape disabled, restricted TeX file settings. |
| 5: Engine availability UI/system diagnostics | Verified | Menu now checks real executable versions, marks installed/unavailable compilers, and disables unavailable choices. The success label identifies the engine used for the current PDF, separately from the selected next engine. Actual TeX log banner is available on hover. Availability does not guarantee every optional package. |
| 6: Disk projects, API CRUD, autosave | Verified basic paths / partial plan | CRUD and project delete UI with Cancel/confirmation. Delayed writes cannot recreate deleted projects. Client saves are serialized and flushed before project switching, Git mutation and snapshot restore; stale project-load responses are ignored. Saves send full file sets, not changed files only. No project rename UI, transactional writes or conflict detection between separate tabs/clients. |
| 6: Files, uploads, outline | Present / selected paths verified | Nested-file creation and switching verified in browser; nested text and binary image round trips pass. Duplicate names are now rejected for creation and upload. File deletion, section outline and jumping exist. Upload dialog and binary edge cases were not exhaustively tested. |
| 7: Six template presets | Verified defaults / partial configuration | Article, circuit, math, exam, minimal and Beamer compile. Fixed Beamer geometry conflict, empty bibliography failures, and text escaping. Date picker, class override, dynamic section rows are absent. Article is not a publisher-certified IEEE/ACM template; math/minimal presets remain generic. |
| 8: Paths, arguments, headers, audit log | Verified selected checks / partial security | Traversal/hidden filenames and shell-style compiler paths rejected. Git and SyncTeX now use execFile. Headers are present; compiler errors are propagated. CSP still allows inline/eval; no authentication, rate limiting, OS sandbox, or complete security review. Treat as a personal local service. |
| 9/14: SyncTeX | Partial | Both forward and reverse API lookups tested on the current welcome: source line 30 round-trips. Removed shell interpolation, fabricated fallback matches, and basename-only source mapping. PDF-to-source UI exists. Editor Ctrl+Click to PDF is not connected; broader nested-source/rotation tests remain. |
| 10: Git | Partial | Isolated init, commit, log, diff and modified-file parsing tested. Draft Cancel and collapse verified. Internal cache/snapshots excluded. Status refreshes after each successful save; mutations flush pending edits. Browser verified a clean project becomes modified after a spelling correction. No push/pull or diff/history UI. |
| 11: Snapshots | Verified core / partial presentation | 52 automatic snapshots prune to 50 while manual snapshot survives. Manual creation and restore verified through UI; restore now awaits disk save and survives immediate reload. Snapshot IDs include UUIDs; 12 concurrent saves produce 12 distinct records. Footer count and quota enforcement are absent. |
| 12: Welcome | Verified | One page under all three engines; browser shows Page 1 / 1, with complete footer. Shared source removes inconsistent duplicated defaults. |
| 13: UI polish | Present / sampled browser verification | Stable split panes and layout modes from prior repair, distinct brand, clear empty state, searchable tools and custom controls. Not every promised Framer Motion transition exists. Full keyboard/screen-reader and cross-browser audit remains. |
| 14: Persistent track changes | Missing | Review overlay exists; no persistent annotations/gutter history. |
| Collaboration | Intentionally deferred | Not counted as a missing requirement because the supplied plan explicitly defers it. |

## Additional tools

| Tool | Finding |
|---|---|
| Table generator | Grid, dimensions, alignment, booktabs/classic generation present. Cells/caption now escape TeX special characters and labels are normalized. Booktabs package must be present in the target document; arbitrary math cells are treated as literal text. |
| Symbols and circuits | Search/categories and insertion callbacks present. Specialized snippets still require their corresponding TeX packages. |
| Word/equation statistics | Corrected body extraction that previously removed the entire document. Fixture verifies 3 words and 2 equations. Counts are approximate regex-based statistics, not a full TeX parser or multi-file document expansion. |
| ZIP export | Valid ZIP filenames verified, unsafe paths rejected. Generic source archive; does not certify publisher/arXiv compliance. |
| Setup and smoke test | Windows installed environment passed. macOS/Linux setup was inspected, not executed. Hardware inventory alone does not prove browser GPU acceleration. |

## Test evidence

- `scripts/feature-audit.cjs`: **25/25 passed**. Actual API calls and TeX processes, disposable project cleaned up. AI adapters mocked explicitly.
- `scripts/navigation-git-audit.cjs`: **2/2 passed**. Real SyncTeX API round-trip and disposable Git commit/log/diff/status.
- `scripts/engine-identity-audit.cjs`: **3/3 passed**. Each fixture rejects the wrong engine with iftex; XeLaTeX and LuaLaTeX also use fontspec. Real compiler banners and PDF producers confirm pdfTeX 1.40.28, XeTeX 0.999997, and LuaHBTeX 1.24.0. See `engine-identity-results.json` and `engine-proof-*.pdf`.
- Follow-up engine UI check: user's 10-page circuit assignment compiled through the selector using XeLaTeX (3.44 s) and LuaLaTeX (4.01 s). Browser footer and server audit agree. Screenshots: `xelatex-ui-verified.png` and `engines-ui-verified.png`. The menu previously showed unconditional names, and selecting an engine did not distinguish the existing PDF's compiler; both presentation issues are repaired.
- `npm test`: **5/5 environment checks passed** on Windows/MiKTeX. This is not a complete UI test suite.
- `npm run build`: production compilation and TypeScript passed; warnings for deprecated middleware and dynamic filesystem tracing.
- `npx tsc --noEmit`: passed after the main repairs; final production build also passed TypeScript after subsequent changes.
- `npx eslint src`: **16 errors and 22 warnings**. See `eslint-audit.json`; includes React effect rules, explicit-any types, and unused imports. The source is not lint-clean.
- Browser evidence: `welcome-ui-verified.png` and `sage-empty-state.png`. Verified one-page rendering, custom checkbox state, search count, Git Cancel, branding and TeX Sage name. Download PDF produced a local PDF; Tools opened the statistics modal. Empty-project switching now remains idle rather than showing an automatic compilation error.
- Targeted statistics regression passed: a line break such as `\\[5pt]` no longer gets mistaken for a display-math opener and swallows subsequent prose.
- `feature-audit-results.json` and `navigation-git-audit-results.json` contain machine-readable results. `welcome-verified.pdf` is the actual compiled one-page artifact.

## Fixes made during the audit

Besides the requested visual repairs: persisted file deletion; filename validation before saving; safer compiler/Git/SyncTeX process arguments; real compilation failures; BibTeX/Biber sequencing; template escaping/bibliography defaults; literal table text escaping; body-aware statistics; connected key encryption; guarded diff acceptance; suppressed obsolete compilation results after project switches; empty projects no longer auto-compile into an immediate error.

## Design research

Used the established resizable source/PDF arrangement and clear layout controls described in [Overleaf's editor layout documentation](https://docs.overleaf.com/navigating-in-the-editor/working-with-the-pdf-viewer/editor-and-pdf-layout-and-sizing), and reviewed [TeXstudio's integrated editor/viewer feature set](https://texstudio.org/). The new brand and owl are original SVG artwork. These references informed interaction priorities; they are not claims of feature parity.

## Remaining priorities

1. Complete bidirectional UI navigation and remaining template configuration promises; expand spell-checking exclusions for specialized macros as needed.
2. Complete inline review/track changes, Git diff/history/remote flows and template configuration.
3. Address lint errors and remaining save/compile races with targeted regression coverage. Duplicate-file protection and snapshot ID collisions were fixed in the resumed audit.
4. Validate live AI providers, uploads, nested projects, long documents, accessibility and other browsers/platforms.
5. Implement worker-based rendering only with measured performance tests; harden isolation/authentication before any public hosting.

## Resumed workflow audit — 10 October

Additional real-browser tests used a separate project named **Disposable UI audit**; user documents were not edited by these tests.

| Workflow | Result |
|---|---|
| New Project | Found native `prompt()` unsupported in the in-app browser. Replaced with a styled HTML dialog with focus management, Escape/Cancel, and a named input. UI project creation passed. |
| Whole-word replace all | `Alpha alpha alphabet alpha.` became `beta beta alphabet beta.`; substring `alphabet` stayed intact. |
| Duplicate file creation | `main.tex` was rejected with a visible error and existing contents retained. Equivalent protection added to upload. |
| Table insertion and compilation | Default table percentages and caption `Results & 50% improvement` were escaped and rendered correctly. |
| Symbol search/insertion | Searched `alpha`, inserted `\alpha` inside math delimiters, and compiled successfully. |
| Nested file creation/switching | Created `chapters/notes.tex`, then returned to `main.tex`; file persisted. |
| Manual snapshot UI | Named snapshot created and manual filter verified. |
| Restore/reload | Initially failed: immediate reload beat the delayed autosave. Fixed by awaiting the restore PUT before closing; immediate reload and disk inspection now retain restored text. Stale PDF is cleared. |
| Confirmations | Snapshot restore and reset now use in-app HTML dialogs instead of unsupported native confirm calls. Reset confirmation implementation inspected; destructive reset not exercised against user documents. |
| Additional API cases | **5/5 passed**: punctuation/Unicode project name, nested/binary round-trip, nested compilation and SyncTeX source identity, concurrent snapshot IDs, rejection before partial writes. See `edge-case-audit-results.json`. |
| Regression | Full **25/25** feature audit rerun passed; production build passed. Source lint remains **16 errors / 22 warnings**. |

Screenshot: `workflow-tests.png`. Reusable additional checks: `scripts/edge-case-audit.cjs`. This run does not change the overall partial-completion verdict or mark untested AI/accessibility/platform paths as verified.

## Remaining-bug repairs — 11 October

The six issues listed in the follow-up conversation were addressed: latest-request project loading, ordered autosaves, empty-main compilation, regex replacement/error reporting, real English spelling, and Git status refresh. The empty main document is no longer replaced by whichever secondary file happens to be open. Client saves are ordered within one workspace; separate browser tabs still lack conflict detection.

`node scripts/workflow-regressions.cjs` passed six targeted checks, including artificially delayed saves and save-failure recovery. Browser checks confirmed dictionary suggestions/underlines, correction insertion, Git refresh, capture replacement, invalid-regex feedback, empty-main behavior, and persistence across a project switch. `scripts/feature-audit.cjs` was rerun: **25/25 passed**. Production build and TypeScript passed. Existing middleware/filesystem-tracing warnings remain.

A live LM Studio test exposed a browser CORS failure despite successful backend requests. Fixed by routing local providers through `/api/ai/local`, restricting destinations to loopback URLs, rejecting redirects, and discovering a loaded chat model when no LM Studio model ID is supplied. The actual drawer then returned `A = \\pi r^2` from `google/gemma-4-e2b`. Ollama did not respond. No cloud-provider credentials were used.

Evidence: `spelling-git-verified.png`, `local-ai-browser-verified.png`, `live-lmstudio-result.txt`. English spelling uses [nspell's documented dictionary/correction API](https://github.com/wooorm/nspell). This repair does not complete the broader plan items still marked partial or missing above.

## Local AI and provider settings repair — 11 October

Found an additional credential-isolation bug: `handleSend` decrypted a saved cloud key for every provider, including local models. Local configurations now bypass cloud keys entirely. Each provider retains its own endpoint, model and encrypted-key profile; plaintext keys remain session-only. Local settings show neither API-key nor master-password fields.

LM Studio and Ollama model lists are detected through the local backend route and shown in custom model menus with refresh/status/error states. Embedding models are excluded. LM Studio accepts either a root server URL or `/v1`; localhost is normalized to IPv4 for servers bound only to 127.0.0.1. Provider, model, project, engine and Tools menus dismiss on outside clicks; provider/model menus also support keyboard navigation and Escape. Gemini's default is the exact user-requested `gemini-3.8-flash`; old `gemini-1.5-flash` defaults are migrated in the UI. Its availability is not established by this code change.

`node scripts/ai-provider-regressions.cjs`: **8 checks passed**, including locked-cloud-key isolation for local providers, endpoint normalization, discovery, OpenAI/Ollama request contracts, empty/error responses, requested Gemini default, and live LM Studio inference. OpenAI and Ollama tests used mocked responses, with no key acquisition or software installation. The browser selected `google/gemma-4-e2b` from the detected menu, saved its local profile and received `A = \\pi r^2` without entering any credential. Production build and TypeScript passed.

Evidence: `ai-provider-custom-menu.png`, `lmstudio-model-menu.png`, `lmstudio-no-key-chat-verified.png`, `lmstudio-live-latest.txt`.

Contract references: [LM Studio compatible endpoints](https://lmstudio.ai/docs/developer/openai-compat), [Ollama model listing](https://docs.ollama.com/api/tags), [Ollama generation](https://docs.ollama.com/api/generate), and [official OpenAI Chat Completions reference](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create). Mocked contract checks do not establish live account access or every model's parameter support.

## PDF responsiveness, source navigation and AI formatting — 11 October

Removed the viewer's extra WebGL texture upload/compositing pass. PDF.js still uses its bundled parsing worker and renders into Canvas 2D; browser-managed hardware acceleration remains available. Completed canvases stay visible and resize immediately during zoom; replacements swap in only after rasterization finishes. A 120 ms settling window coalesces rapid zoom changes. Nearby pages are prioritized with IntersectionObserver and one active render, eight resident canvases, and an eight-million-pixel cap per page. Dark-paper mode reuses pixels through a CSS filter. Document loading tasks are destroyed on replacement/unmount.

Ctrl/Command-click maps displayed bounds through the PDF viewport transform into fractional top-left PDF points, including rotation/crop offsets. Custom main PDF filenames are used. Latest-request/project/compile guards prevent stale replies from moving the editor; a source file is selected and its editor mounted before jumping. Source edits that invalidate the compiled map produce a recompile message. A click marker and the existing source-line flash identify the location. SyncTeX still has the line/box granularity supplied by TeX; this does not promise character-level mapping within every equation or TikZ diagram.

Assistant replies now render sanitized Markdown: fenced/inline code, bold, italic, underline (`<u>`), bullets, numbered lists, headings, quotes, links, tables and KaTeX math. Dollar and common TeX math delimiters are supported outside code. Generated images do not trigger network loads. Copy/insert/diff actions retain the original source text. Added a keyboard-focusable conversation log.

Validation: `node scripts/pdf-chat-regressions.cjs --live` passed coordinate, actual Markdown/math sanitization, rendering lifecycle/cache tests and real SyncTeX round trips for a custom main filename and a nested secondary source. Production build and TypeScript passed (existing middleware/filesystem-tracing warnings remain). Browser checks on the user's unchanged 17-page document showed two canvases initially, retained pages after zoom, the same source line 55 from Ctrl-click at two zoom levels, and page 10 rendered on navigation. A live LM Studio answer contained three bold spans, four italic spans, two bullets, two numbered steps and one rendered equation; a separate reply retained its fenced code. No controlled before/after timing benchmark was performed.

Evidence: `chat-formatting-verified.png`, `pdf-navigation-verified.png`. The visible-page approach follows [PDF.js guidance on rendering long documents](https://github.com/mozilla/pdf.js/wiki/Frequently-Asked-Questions); Markdown rendering uses [react-markdown's documented plugin pipeline](https://github.com/remarkjs/react-markdown).

## TeX Sage workspace layout — 11 October

The assistant now docks as a third panel beside the source and PDF when the available workbench width is at least 1040px. The header and status bar remain visible. Its divider supports pointer dragging, keyboard arrows/Home/End and double-click reset; width is bounded to 320–480px and remembered locally. Opening/closing the panel reallocates workspace space and the PDF's existing fit-width observer adjusts the page. The editor/PDF divider retains usable minimum widths with the assistant docked. Editor-only/PDF-only modes also work beside the assistant.

Narrow workspaces use a contained slide-over with a dismissible backdrop. Opening the file sidebar can trigger this fallback based on actual remaining width, rather than viewport alone. Escape closes the panel and close/backdrop actions return focus to the toolbar. The toolbar button toggles the panel and exposes its expanded state. Drafts and conversation state remain mounted across closing, resizing and breakpoint changes.

Browser validation at the default 1224px viewport showed non-overlapping source/PDF/assistant widths of 428.5/421.5/360px. Closing restored the full 1224px workbench. Keyboard resizing, both single-pane modes, sidebar-triggered overlay, draft retention, backdrop dismissal and mobile Escape dismissal passed. At 390px the panel remained within the viewport (left 24px, width 366px); the viewport override was reset. A live LM Studio reply rendered in the docked panel. Production build, TypeScript and diff whitespace checks passed. Screenshots: `sage-layout-desktop.png`, `sage-layout-mobile.png`.

## Compile overlay and Format Code — 11 October

The compile overlay now lives in a stationary viewport frame, outside the PDF scroll container. It covers the complete visible page area even after scrolling and blocks page clicks while compiling, while leaving the toolbar/status area visible. A browser check at scrollTop 407px confirmed identical overlay/frame bounds and captured `compile-overlay-verified.png`.

Added Format Code in the source toolbar and Ctrl/Cmd+Shift+F. It applies two-space indentation for nested LaTeX environments, multiline brace groups and display math, without reflowing prose or rewriting commands. Comments, escaped delimiters and inline literals are recognized; literal/code block contents and terminators retain their original whitespace. Incomplete/mismatched structures do not cause negative indentation. Formatting changes only leading whitespace in one CodeMirror transaction, maps existing selections, uses the regular autosave flow and is isolated as one undo step. It is available for `.tex` files and disabled during project loading.

`node scripts/format-regressions.cjs --live` passed five groups: nested/idempotent indentation; braces/math/comments/escapes; literal preservation; newline/incomplete-source handling; and identical text/positions in a two-page PDF before and after formatting. The Node PDF parser emitted optional canvas-polyfill warnings; this check extracts text/positions and does not render images. Browser button and shortcut checks succeeded, and single-step Ctrl+Z restored prior indentation. Browser formatting trials were undone. TypeScript and production build passed, with existing build warnings unchanged. Screenshot: `format-code-verified.png`.

Spell checking remains local `nspell` with `dictionary-en`, plus LaTeX prose masking and the user's ignored-word list. This is English spelling/correction, not grammar checking, and does not send document text to a cloud service.

## Mobile welcome and recompile position — 11 October

Added a mobile welcome overlay recommending tablet or desktop use, with a Continue here action remembered in localStorage until browser storage is cleared. Narrow portrait screens and short touch-screen landscape viewports are covered. Tablet/desktop workspaces remain directly accessible.

Recompilation captures the visible PDF page and its vertical/horizontal offsets in PDF points. Replacement page geometry is staged and swapped atomically, then the previous position is restored before rendering nearby pages. If the document becomes shorter, the position is clamped to the nearest remaining page. Fresh projects still start normally.

Validation: PDF/chat regression checks and the production build passed. Browser verification on the unchanged 17-page document retained page 10 with scrollTop 7410px before and after compilation (zero pixel drift). At 390px, Continue here dismissed the welcome and the choice persisted after reload; the viewport was then restored. Evidence: `mobile-welcome-verified.png`, `pdf-page10-position-verified.png`.

## TeX Sage conversation context and edit review — 11 October

Every provider now receives ordered recent user/assistant history (up to 40 turns and 100,000 characters), excluding the welcome and error replies. Selected source context is retained with earlier requests; current source is attached separately. Gemini maps assistant turns to model contents; OpenAI and LM Studio use chat messages; Ollama now uses /api/chat. The local proxy validates and forwards history. Conversations reset on project changes and remain in memory across closing/reopening the assistant.

Suggestions capture project, file, original document and selected range at request time; without a selection, the current file is the target. Follow-ups reuse the previous captured range while its source remains valid. Review no longer depends on the live cursor selection. Each LaTeX code block has separate insert/review actions, preserving indentation. The preview names its file and whether it replaces a selection or the entire file. On narrow workspaces the assistant closes to expose the review. Accept performs one isolated CodeMirror transaction and restores editor focus; Reject/Escape makes no changes. Changed sources or different files/projects reject stale edits instead of overwriting them.

Validation: conversation regressions verify all four provider payloads, local forwarding, bounded history, multi-block/CRLF extraction, target guards, actual CodeMirror replacement and single-step undo. Provider regressions pass with live LM Studio inference and mocked cloud/Ollama contracts. Browser LM Studio follow-up changed an earlier 11pt suggestion to 12pt without a selection. Browser review after moving the cursor succeeded; Reject retained 10pt, Accept changed only the captured line to 11pt, and one Ctrl+Z restored 10pt. A subsequent source edit was correctly blocked as stale; all browser test edits were undone. Production build and TypeScript passed, with existing middleware/tracing warnings. Evidence: ai-edit-review-verified.png.

Contracts: [Gemini conversation history](https://ai.google.dev/gemini-api/docs/text-generation), [OpenAI chat messages](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Ollama chat messages](https://docs.ollama.com/api/chat).

## Automatic inline AI edits — 11 October

Replaced the floating side-by-side review popup with a CodeMirror inline preview. Edit source mode is selected by default: a single LaTeX code block automatically appears at the captured source range, with the original highlighted red, proposed code green, and Accept/Reject buttons directly underneath. Ask mode keeps replies in chat; multi-block answers expose individual preview actions. Narrow assistant overlays close to reveal the edit.

The preview is a decoration/widget and does not modify or save the underlying document until Accept. The source is protected from typing/undo while approval is pending. Reject/Escape removes only the preview; Accept/Ctrl+Enter makes one isolated undoable document change through normal autosave. File/project changes clear the pending preview, and source identity checks protect against late replies after switching projects. Browser validation with live LM Studio showed automatic 11pt-to-12pt inline preview, Accept changed only that line, and one undo restored 11pt. Reject removed an earlier preview without changing source. Regression checks cover actual CodeMirror preview state, rejected edits, protected transactions and accept/undo. Production build and TypeScript passed with existing warnings. Screenshot: ai-inline-edit-verified.png.

## Compile finalization, focused follow-ups and chat spacing — 11 October

Compile (button or Ctrl/Cmd+Enter) now accepts the pending inline proposal before reading the editor source and submitting it, removes the review controls, and retains normal autosave/snapshot behavior. A subsequent edit request also finalizes the previous unrejected proposal so it can refine the updated range. Accepted proposals retain their revised source range for follow-ups. Model replies are trimmed of unchanged leading/trailing lines; complete document replies are compared against the complete source even when a snippet was targeted. Thus an otherwise identical whole-file reply highlights only its changed lines. No-op replies open no preview. A response with several separated changes still uses a contiguous review range between the first and last changed lines.

Added bottom padding to Ask/Edit mode, space around quick prompts, and thin horizontal/vertical assistant scrollbars. Browser verification with live LM Studio: a 10pt-to-11pt pending proposal was compiled without clicking Accept, source became 11pt and review disappeared; compilation succeeded. Without selecting code again, a 12pt follow-up produced a one-line preview of the same documentclass, retaining the rest of the file. The follow-up was rejected and the accepted test edit undone, restoring 10pt; the restored document was recompiled. Regression checks cover unchanged-line trimming, complete-document replies for snippet targets, no-op results and preview acceptance/undo. Production build and TypeScript passed with existing warnings. Evidence: ai-followup-range-verified.png, sage-chat-spacing-verified.png.

## Prompt carousel and landscape recommendation — 11 October

Replaced the quick-prompt scrollbar with circular previous/next controls around a horizontally scrollable chip row. Buttons disable at the ends; touch/trackpad scrolling and keyboard focus remain available. ResizeObserver updates overflow state, and reduced-motion preferences disable smooth scrolling. Browser checks moved right, enabled the left arrow, and returned to scrollLeft 0; the track has scrollbar-width none. Tablet/phone illustration icons now appear in landscape orientation, and the mobile welcome recommends rotating the device for more room.

README rewritten for the current Next.js/React implementation, native engines, Canvas 2D viewer, local/cloud AI privacy, inline edit finalization, setup and known gaps. Local project directories, Next.js build output and local verification artifacts are ignored. Node requirement matches Next.js (20.9+), with a dependency lockfile for reproducible installs. Build, environment checks, AI conversation, PDF/chat and formatting regressions passed. Evidence retained locally: prompt-carousel-verified.png.

## Settings confirmation toast — 11 October

Provider settings success now uses a floating toast instead of a permanent line below Ask/Edit. It auto-dismisses after the user's requested 30 milliseconds; errors and key-storage guidance remain visible where action is needed. Browser save verification found no lingering Settings saved text. Production build and TypeScript passed. Evidence retained locally: settings-toast-dismissed.png.

## Settings toast duration — 11 October

Changed success-toast dismissal from 30 milliseconds to 3 seconds. Browser verification observed the toast immediately after saving and its removal at approximately 3084ms, with no persistent settings-success line. Production build/TypeScript, environment smoke checks, AI conversation, PDF/chat and formatting regressions passed. All three engines passed live identity compilation; LM Studio discovery/inference passed live, while cloud/Ollama provider contracts passed with mocks. Existing middleware/tracing and optional Node PDF canvas-polyfill warnings remain. Evidence retained locally: settings-toast-three-seconds.png.
