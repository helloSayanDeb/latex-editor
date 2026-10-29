# Developing Lemmata

Lemmata is a local Next.js workspace served in your browser. EXE/DMG packaging is no longer included. Editing runs in CodeMirror, PDF parsing runs in a PDF.js worker, and an installed TeX distribution performs compilation. Source and PDF stay side by side; the assistant docks when space permits.

## Source layout

| Directory | Purpose |
| --- | --- |
| `src/app` | Landing page, `/lemmata` workspace, API routes and styles |
| `src/components` | Editor, preview, assistant and dialogs |
| `src/lib` | Compilation, storage, AI adapters, source analysis and editor integrations |
| `public` | Shared SVG branding, licensed fonts and offline PDF assets |
| `scripts` | Launchers, asset synchronization, packaging and repeatable checks |
| `docs` | Setup, supported features, QA and release documentation |

The PDF viewer uses Canvas 2D and a parsing worker. The landing illustration uses a separate high-DPI Canvas 2D scene. Build scripts synchronize the PDF module/worker/font data. The browser uses `public/favicon.svg`. Keep third-party licenses and design credits with their assets.

## Local data and generated files

`projects/` and `lemmata-settings.json` are private local data. Preserve them when cleaning a checkout. `node_modules/` is required to run/build from source. `.next/` is generated and required by the production launcher after a build.

Temporary test logs, screenshots, PDFs and machine-readable results belong in ignored `tmp/`, not in `docs/`. Test scripts create this directory as needed. They create disposable projects; always use isolated server storage for API/browser checks.

Installed TeX, Java/Ghidra and optional browser/research tools are external prerequisites, not application source. The local cleanup preserved development tools under the user's cache at `~/.cache/lemmata/development-tools`; that machine-specific location is not needed by other users or bundled in releases. `lemmata-settings.json` points to the configured TeX bin directory. Optional testing tools are selected with environment variables.

## Verification

```sh
npm ci
npm run build
npm run qa
npm run qa -- --api --browser
```

The last command requires an isolated running server, Playwright/Chromium, Git and the required TeX engines/packages. Use `LEMMATA_TEST_URL`, `LEMMATA_TEST_DATA_DIR`, `LEMMATA_TEST_TEX_BIN` and `LEMMATA_PLAYWRIGHT_PATH` to point at those prerequisites. Ordinary tests do not make paid AI calls; live model/crawler checks are opt-in.

See [QA results and limits](QA_REPORT.md), [feature status](FEATURE_AUDIT.md), [paper-review setup](PAPER_REVIEW_GUIDE.md).

## Scope and compatibility

Current source includes Problems, citation/reference completion, source/PDF navigation, commands/search, persistent reviews, visual equation/table/figure tools, focused compiler repair, journal-template import/preflight and Git synchronization/conflict resolution. Supported layouts and platform/service verification limits are documented in the feature audit.

Build recipes, opt-in automatic compilation and selective snapshot comparison/restoration are implemented. Real-time collaboration (#14) remains explicitly excluded. Public hosting and an OS-level TeX sandbox are not implemented.

Lemmata owns its runtime identifiers and visible branding. Schema-based preference migration and legacy ciphertext decoding remain intentional compatibility code; removing them would break existing user settings or saved keys.
