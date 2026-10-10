# Desktop distribution verification

Verified on Windows x64, 11 October 2026.

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

The distribution adds no hosted compilation backend and no mobile-native app. Existing feature limitations in FEATURE_AUDIT.md still apply. PDF.js evaluation is disabled following the upstream workaround for CVE-2024-4367; this release does not claim a complete dependency-security audit or upgrade all legacy dependencies.
