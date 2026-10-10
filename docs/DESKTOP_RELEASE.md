# Desktop distribution verification

Verified on Windows x64, 11 October 2026.

## Version 2.0.2

The local privacy and image-assistance update adds per-launch session protection to the bundled server and its desktop API calls. Its production build, privacy/image regressions and 25-check feature audit pass locally. The Windows 2.0.2 installer is checked with the same isolated installation, native-engine, persistence and shutdown flow below. Release CI additionally runs privacy, image contract and conversation tests before packaging each platform. See [2.0.2 notes](releases/v2.0.2.md) for changes and security limits.

## Verification scope

- Production Next.js build and TypeScript checks passed.
- Existing environment, AI conversation/inline-edit, PDF-position/Markdown and formatter regression checks passed.
- NSIS installer built with the Electron runtime, app icon and per-user desktop shortcut.
- `node scripts/test-desktop.cjs` downloaded the installer from a local release server, verified SHA-256, installed it into an isolated folder and launched the installed executable.
- Installed application served static assets, loaded the English spelling dictionary, created projects in the writable data folder and initialized Git there.
- Native pdfLaTeX, XeLaTeX and LuaLaTeX each returned an actual PDF using the installed MiKTeX distribution.
- Restart retained stored data; closing the app stopped its server.
- `node scripts/test-packaged-startup.cjs` passed the lighter packaged-runtime check used by release CI.

The Windows test machine already had TeX and Git. This is not a clean-machine prerequisite-installation test. The application bundles Node.js; TeX, Git and local AI models remain separate installations. The missing-engine dialog directs users to MiKTeX/MacTeX.

macOS Intel and Apple Silicon builds run in GitHub Actions, including a packaged startup check for runtime dependencies, assets, spelling and Git. These runners do not test native TeX compilation, Gatekeeper approvals or the complete DMG/one-command installation flow on a user's Mac. Installers are unsigned and not notarized.

The first Apple Silicon CI startup check caught missing project API routes in the Git repository: an unanchored `projects/` ignore rule also excluded `src/app/api/projects/`. Version 2.0.1 anchors the private data directory ignore rule and tracks the project/snapshot API source, so fresh checkouts contain the routes tested locally.

The corrected [2.0.1 release workflow](https://github.com/helloSayanDeb/latex-editor/actions/runs/38086418929) succeeded on Windows x64, Intel macOS and Apple Silicon macOS and published all three installers with SHA-256 checksums. Each packaged app passed startup, project storage, static asset, spelling dictionary and Git initialization checks in a fresh checkout.

The actual published Windows 2.0.1 installer was subsequently downloaded and checksum-verified by `install.ps1`, installed into an isolated folder and launched. Its bundled runtime passed native pdfLaTeX/XeLaTeX/LuaLaTeX PDF compilation, project storage, static assets, spelling and Git initialization checks. Temporary test installation shortcuts and registration were removed afterward; test data and build artifacts remain under ignored `dist-desktop/`.

The distribution adds no hosted compilation backend and no mobile-native app. Existing feature limitations in FEATURE_AUDIT.md still apply. PDF.js evaluation is disabled following the upstream workaround for CVE-2024-4367; this release does not claim a complete dependency-security audit or upgrade all legacy dependencies.
