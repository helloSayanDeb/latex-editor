# Implementation status

Last reviewed: 11 October 2026. This document describes the current implementation and the scope of previous verification. Passing a check does not establish every input, platform, model or security scenario.

## Implemented and checked

| Area | Current behavior and verification |
| --- | --- |
| Native compilation | pdfLaTeX, XeLaTeX and LuaLaTeX identity checks, one-page welcome, BibTeX/Biber passes and compiler diagnostics tested with installed MiKTeX. Packages/fonts remain the user's responsibility. |
| Editor | CodeMirror syntax/completion, file switching, outline, literal/regex find and replace, capture replacement, local English spelling, two-space formatting and undo checked. Formatting preserves literal environments and changes leading whitespace only. |
| Projects and files | Disk CRUD, deletion confirmation, ordered autosaves, duplicate-name rejection, nested/binary file round trips and unsafe-path rejection checked. Separate clients do not have conflict detection. |
| PDF preview | Canvas 2D with PDF.js parsing worker, nearby-page rendering, retained canvases during zoom, download, dark paper, compile overlay and recompile position restoration checked. No additional WebGL compositing pass. No controlled performance benchmark has been performed. |
| Source navigation | PDF-to-source Ctrl/Command-click uses SyncTeX with viewport coordinate conversion and stale-request guards. Nested source and custom main filenames tested. Precision is limited by TeX's recorded boxes. |
| TeX Sage | Recent conversation context, sanitized Markdown/math, provider-specific settings, custom menus and local model discovery implemented. LM Studio tested live. OpenAI/Ollama request contracts tested with mocks; this does not establish access to a live account or server. |
| AI editing | Inline additions/deletions and Accept/Reject checked. Selected snippets and follow-up ranges constrain edits; unchanged outer lines are trimmed. Compile and subsequent edit requests finalize pending proposals. Rejection is no longer available after finalization; undo/snapshots remain. |
| Workspace | Resizable source/PDF panels, docked assistant on wide layouts, narrow-screen slide-over, mobile welcome, custom prompt carousel and three-second settings toast sampled in the browser. |
| Git and snapshots | Local init, status, commits, cancellation, log/diff APIs and automatic/manual snapshot creation/restore checked. Automatic snapshots prune to 50; manual snapshots are retained. |
| Templates/tools | Six template defaults compile; table escaping, symbol insertion, approximate word/equation counts and source ZIP export checked. Snippets may require additional packages. |
| Distribution | Windows installer and one-command flow tested locally. Windows and both macOS architectures passed packaged startup checks in CI. See [desktop verification](DESKTOP_RELEASE.md) for platform limitations. |

## Remaining limitations

- Editor-to-PDF navigation UI, Git push/pull UI and persistent track-change annotations are unfinished.
- Citation/label completion does not enumerate actual bibliography keys or document labels. Find/replace does not highlight every match simultaneously.
- Template customization is limited; presets are not publisher-certified submission formats.
- No project rename UI, transactional multi-file writes, multi-client conflict resolution or storage quotas.
- Word counts and spell-check exclusions use heuristics, not a complete TeX parser. English spelling is not grammar checking.
- Accessibility, cross-browser behavior, every provider/model, macOS DMG installation and native compilation on a Mac have not been exhaustively tested. Source lint still has outstanding violations; middleware uses a deprecated convention.

## Security and privacy boundary

This is a trusted personal local workstation, not a secure multi-user hosting service. There is no application authentication, per-user authorization, rate limiting or OS-level TeX compilation sandbox. Disabling shell escape, temporary compilation directories and path validation are useful defenses but do not establish filesystem isolation. Do not expose the current backend publicly without redesigning these boundaries.

AI receives prompts, recent conversation and attached source context. Without a selection, the active document may be included. Switching providers can send retained conversation to the newly selected provider. Cloud providers receive this content remotely; local providers receive it through their loopback server. No model-facing filesystem or terminal tools are implemented. Treat generated LaTeX as untrusted before accepting/compiling it.

Saved keys can be encrypted with an optional master password; unlocked keys remain accessible to application JavaScript. Encryption is not protection against a compromised browser/app. No complete security audit is claimed.

## Reusable checks

From the repository root:

```sh
npm test
npm run build
node scripts/ai-conversation-regressions.cjs
node scripts/pdf-chat-regressions.cjs
node scripts/format-regressions.cjs
node scripts/workflow-regressions.cjs
```

Additional scripts cover API edge cases, engine identity and provider contracts. Live checks require the running app and appropriate installed TeX engines, Git or local model server. Scripts that create disposable projects clean up their own data. Local screenshots, PDFs, logs and machine-specific test results are excluded from Git.
