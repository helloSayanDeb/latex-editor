# Implementation status

Last reviewed: 28 October 2026. Current source changes are unreleased; historical installer checks below refer to v2.0.2. This document describes the current implementation and the scope of previous verification. Passing a check does not establish every input, platform, model or security scenario.

## Implemented and checked

| Area | Current behavior and verification |
| --- | --- |
| Native compilation | pdfLaTeX, XeLaTeX and LuaLaTeX identity checks, one-page welcome, BibTeX/Biber passes and compiler diagnostics tested with installed MiKTeX. Packages/fonts remain the user's responsibility. |
| Editor | CodeMirror syntax/completion, file switching, outline, literal/regex find and replace, capture replacement, local English spelling, two-space formatting and undo checked. Formatting preserves literal environments and changes leading whitespace only. |
| Projects and files | Disk CRUD, deletion confirmation, ordered autosaves, duplicate-name rejection, nested/binary file round trips and unsafe-path rejection checked. Separate clients do not have conflict detection. |
| PDF preview | Canvas 2D with PDF.js parsing worker, nearby-page rendering, retained canvases during zoom, download, dark paper, compile overlay and recompile position restoration checked. No additional WebGL compositing pass. No controlled performance benchmark has been performed. |
| Source navigation | Editor-to-PDF action/highlight and PDF-to-source Ctrl/Command-click use SyncTeX with viewport coordinate conversion and stale-request guards. Nested source and custom main filenames tested. Precision is limited by TeX's recorded boxes. |
| Lemmata Assist | Explicit source sharing, destination-separated conversations, sanitized Markdown/math and model capability badges. One PNG/JPEG/WebP image per request; metadata removed and images are not resent. LM Studio Gemma text/image transcription tested live. All four provider text/image contracts tested with mocks; this does not establish cloud account or live Ollama access. |
| AI editing | Inline additions/deletions and Accept/Reject checked. Selected snippets and follow-up ranges constrain edits; unchanged outer lines are trimmed. Compile and subsequent edit requests finalize pending proposals. Rejection is no longer available after finalization; undo/snapshots remain. |
| Workspace | Resizable source/PDF panels, docked assistant on wide layouts, narrow-screen slide-over, mobile welcome, custom prompt carousel and three-second settings toast sampled in the browser. |
| Git and snapshots | Local init, status, commits, cancellation, log/diff APIs and automatic/manual snapshot creation/restore checked. Automatic snapshots prune to 50; manual snapshots are retained. |
| Templates/tools | Six template defaults compile; table escaping, symbol insertion, approximate word/equation counts and source ZIP export checked. Snippets may require additional packages. |
| Distribution | Source-based local web app. Use setup.ps1/setup.sh or npm build/start; native installer tooling has been removed. |

## Current unreleased verification

- Production build, TypeScript, focused lint and setup/workspace/review regressions pass. Existing privacy, AI editing, PDF/chat, image and formatter regressions pass; this is not a complete security audit.
- Production browser tests cover command palette, quick files, project search, real citation/label completion, Problems navigation and both source highlight/stale-map behavior. PDF responses in browser tests are fixtures; separate native tests cover real pdfLaTeX, XeLaTeX and LuaLaTeX with nested files and forward/inverse SyncTeX using isolated TinyTeX.
- Built-in Paper review supports Gemini, OpenAI, Claude, LM Studio and Ollama with explicit source approval, optional research, evidence metadata and checked source anchors. Provider contracts are tested with fixtures. Real Crawl4AI retrieval through the production API passed with a controlled model; no live cloud account or current local inference server was used.
- Setup now re-discovers engines after installation, resolves each executable independently and exposes missing auxiliary tools. Fresh macOS installation and rebuilt installer artifacts remain unverified. See [development setup](DEVELOPMENT.md) and [paper review guide](PAPER_REVIEW_GUIDE.md).

## Remaining limitations

- Git remote synchronization/conflict resolution is implemented and tested against disposable local bare remotes. Actual hosted Git credentials and macOS native behavior remain unverified. Real-time collaborative track changes are not implemented.
- Citation/label completion now indexes project BibTeX keys, inline bibliography entries and labels with lightweight parsing; arbitrary TeX/BibTeX macros are not fully interpreted. Find/replace highlights all nonempty matches and distinguishes the active match.
- Template customization is limited; presets are not publisher-certified submission formats.
- Project rename is available in Project & build settings. Transactional multi-file writes, multi-client conflict resolution and storage quotas remain absent.
- Word counts and spell-check exclusions use heuristics, not a complete TeX parser. English spelling is not grammar checking.
- Accessibility, cross-browser behavior, every provider/model, macOS DMG installation and native compilation on a Mac have not been exhaustively tested. Full lint now exits successfully with no errors; reviewed performance/reset and minor unused-code warnings remain. The local access guard uses Next.js's current proxy convention.

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
node scripts/setup-regressions.cjs
node scripts/workspace-regressions.cjs
node scripts/review-regressions.cjs
```

Additional scripts cover API edge cases, engine identity and provider contracts. `image-regressions.cjs --live` transcribes a synthetic image with the configured local LM Studio model; `privacy-regressions.cjs --live` verifies live local API guards. Live checks require the app launched with `npm run dev`/`npm start` and appropriate installed TeX engines, Git or local model server. Test helpers obtain a local session without printing its cookie. Scripts that create disposable projects clean up their own data. Local screenshots, PDFs, logs and machine-specific test results are excluded from Git.

## Interaction update — 28 October 2026

Editor wrapping defaults on and toggles without changing source. Setup acknowledgment is server-run state, reset by the local/desktop launcher and retained across browser refreshes. The assistant is now Lemmata Assist. Ask has explanatory prompting and no insertion/patch controls; Edit source uses validated exact-match replacements within the approved selection/document. Browser fixtures cover the mode contracts, settings return action and inline rejection; real model instruction compliance still varies. Runtime IDs, environment variables, cookie/header and installer paths use Lemmata. Previous preference values are copied when uniquely recognized. Existing browser preferences and encrypted keys retain compatibility.

## Studio verification — 28 October 2026

Production build and focused lint pass (the local image-preview component has a framework image-optimization warning). The studio browser harness edited existing table/matrix/figure structures, restored notes/replies/resolutions after reload, submitted an approved diagnostic/source request to a controlled model fixture, verified the resulting candidate with real pdfLaTeX, saved and later accepted the patch, and compiled the final PDF. It also checked mobile overflow, reduced motion and browser errors. The path validator now matches complete file-access command names, fixing normal includegraphics rejection while retaining traversal rejection.

Regression checks cover supported structure round trips, refusal of advanced layouts, bounded saved notes/replies/patches, revision conflicts and opt-in compiler context. These checks do not establish universal TeX parsing, model correctness or an OS sandbox. Review storage is intentionally excluded from source compilation and ordinary source ZIP export.


## Orbital source update verification

The source adds separate landing (`/`) and editor (`/lemmata`) routes, an original high-DPI Canvas 2D landing illustration with Framer Motion, compact growing chat input and consistent amber selections. Full review reports and approved source snapshots can be explicitly saved/reloaded, independently of notebook notes. Journal ZIP import creates a new project with path/size/type checks. Submission preflight inspects static dependencies, missing files, references and a user-supplied checklist; it does not certify journal compliance. Remote Git adds noninteractive OS-credential authentication, fetch, normal push, fast-forward pull and explicit merge/resolution/abort. Worktree changes reload the editor after flushing saves; private review/snapshot/cache folders and project metadata are excluded from new commits.

`journal-git-regressions.cjs` passed real local bare-remote fetch/push/pull, diverged merge, manual/side resolution, abort and private-file exclusion, plus ZIP/dependency/report validation. Existing privacy, focused-edit, workspace and review regressions passed. Production browser checks cover routes, reduced motion/mobile overflow, composer growth, ZIP import, real package lookup, saved-report reload/source navigation and Git settings; a separate isolated-data mode covers UI pull/reload. No hosted Git account, paid cloud review, macOS installation or new desktop artifact is established by these checks.

The QA pass replaced PDF.js 3.x and its legacy worker with 4.10.38 modules, local font/CMap data, updated math/development dependencies and consistent build-time assets. The complete npm audit reported zero known advisories on 28 October 2026. This is not a security proof. See [the full QA report](QA_REPORT.md) for 29/29 consolidated groups, the separate 25/25 feature audit and remaining limitations.

## Remaining plan items — 28 October 2026

- **#5 — Build recipes and auto-compile:** Project & build settings selects the main `.tex` document and a fixed Standard, Quick preview or Final document pipeline. Quick runs one TeX pass and skips bibliography; Standard resolves references and uses detected BibTeX/Biber; Final permits up to five TeX passes when rerun warnings remain. Existing time/output limits and no-shell-escape policy apply. No arbitrary shell recipe is accepted. The selected engine still resolves independently for each build.
- **Auto-compile defaults off**, is stored per project and debounces source/configuration changes for 1.2 seconds. It pauses for setup, Git, history/settings review and pending AI proposals. It never accepts a proposal automatically. Opening/reloading a project does not start compilation. Switching projects invalidates queued work.
- **#7 — Selective history:** Compare a snapshot with live current files, inspect separate changed regions, restore one region or selected whole files, and keep unrelated files/regions. Binary files restore as whole files. Restores create a manual safety snapshot first, reject stale comparisons and retain a valid main document. Very large divergent spans are grouped for bounded comparison work; preview text is truncated while restoration retains full content.
- **Remaining editor details:** All-match Find/Replace highlighting clears on close/file changes and follows source edits. Project naming is editable in Project & build settings.
- **#14 — Collaboration:** Excluded by the user. No shared editing, accounts or collaboration server were added.
