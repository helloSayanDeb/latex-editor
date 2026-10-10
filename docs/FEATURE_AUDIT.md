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
| TeX Sage | Explicit source sharing, destination-separated conversations, sanitized Markdown/math and model capability badges. One PNG/JPEG/WebP image per request; metadata removed and images are not resent. LM Studio Gemma text/image transcription tested live. All four provider text/image contracts tested with mocks; this does not establish cloud account or live Ollama access. |
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
- Accessibility, cross-browser behavior, every provider/model, macOS DMG installation and native compilation on a Mac have not been exhaustively tested. Source lint still has outstanding violations. The local access guard uses Next.js's current proxy convention.

## Security and privacy boundary

This is a trusted personal local workstation, not a multi-user hosting service. Loopback-only launchers, exact Host/Origin/Fetch Metadata validation and a per-launch HttpOnly/SameSite cookie guard the local APIs. Tests cover unauthenticated rejection, foreign-origin and DNS-rebinding host rejection, and successful local sessions. Request byte limits and concurrency limits apply. There are no user accounts, storage quotas or protection against malicious local software.

AI defaults to No source. Selection/Active document sharing is explicit and previewable. Recent chat is optional; previous answers may contain previously shared source. Conversations are separated by provider and endpoint. Only the current image is sent; historical images and raw source attachments are not automatically reattached. Cloud providers receive this content remotely; local providers receive it through their loopback server. No model-facing filesystem or terminal tools are implemented. Reference content is labelled untrusted, remote Markdown images are blocked, and external links require confirmation. Prompt injection may still influence model answers.

Saved keys use optional AES-GCM encryption with random salt/IV and PBKDF2-SHA256 at 600,000 iterations. Legacy ciphertext can be unlocked and upgraded on saving settings. Keys without a password remain session-only; unlocked keys remain accessible to application JavaScript. Gemini uses a header for credentials and cloud errors redact secrets. Encryption is not protection against a compromised browser/app.

TeX executes without shell escape with validated paths, restricted source primitives, bounded jobs/output and an environment that excludes unrelated credentials. Real pdfLaTeX/XeLaTeX/LuaLaTeX and the 25-check feature audit pass with these restrictions. Direct Lua/file-I/O or advanced primitive use may be rejected. **There is no OS-level TeX sandbox:** these checks do not prove filesystem isolation. Only compile trusted projects. No complete security audit is claimed, and the newly changed code is not automatically present in earlier published installers.

## Reusable checks

From the repository root:

```sh
npm test
npm run build
node scripts/ai-conversation-regressions.cjs
node scripts/pdf-chat-regressions.cjs
node scripts/format-regressions.cjs
node scripts/workflow-regressions.cjs
node scripts/image-regressions.cjs
node scripts/privacy-regressions.cjs
```

Additional scripts cover API edge cases, engine identity and provider contracts. `image-regressions.cjs --live` transcribes a synthetic image with the configured local LM Studio model; `privacy-regressions.cjs --live` verifies live local API guards. Live checks require the app launched with `npm run dev`/`npm start` and appropriate installed TeX engines, Git or local model server. Test helpers obtain a local session without printing its cookie. Scripts that create disposable projects clean up their own data. Local screenshots, PDFs, logs and machine-specific test results are excluded from Git.
