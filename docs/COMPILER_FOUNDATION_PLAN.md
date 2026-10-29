# Lemmata compiler foundation repair plan

Status: core repair implemented and Windows MiKTeX integration verified on 2026-10-29. Remaining coverage and scope are listed below; this is not a claim of universal compiler compatibility.

## Implemented and verified

- Startup failures retain executable, stage, exit code and hexadecimal Windows status. Missing DLL, architecture/load failure, permissions and format initialization have distinct guidance. Setup exposes executable startup problems instead of silently reporting every broken executable as absent.
- BibTeX, Biber and MakeIndex resolve beside the selected engine rather than falling back to another distribution. Standard/final builds run MakeIndex when a nonempty index is generated; quick builds skip auxiliary stages.
- Nested main files compile from their source directory, with uploaded project resources available to TeX and bibliography tools. Generated outputs stay in the disposable build directory.
- Root/program/engine directives are validated. Missing roots, cycles, project escapes and engine conflicts produce actionable errors; engines are never silently switched. Resolved main-file identity travels with the PDF for SyncTeX.
- Cancel build aborts the request and terminates the native process tree. Timeouts use the same tree cleanup. Existing revision checks reject stale responses; cancellation retains the previous preview.
- Existing catalog-based package approval and TikZ library recovery remain in place.

## Evidence and remaining limits

Production build passed. Real Windows MiKTeX tests passed for pdfLaTeX, XeLaTeX, LuaLaTeX, MakeIndex, nested inputs with BibTeX, root directives, cancellation and the next successful compile. The original user report compiled unchanged to a 223,909-byte PDF with no installs.

Run `node scripts/compiler-foundation-regressions.cjs` for failure/directive/orchestration checks. Run `scripts/compiler-foundation-live.cjs` against a protected local server for native integration checks; it does not install packages. `LEMMATA_TEST_URL` chooses the server.

Real Apple Silicon and TeX Live/TinyTeX verification remains outstanding. Biber has existing command-contract coverage, not a new native bibliography integration test. Plain TeX and ConTeXt workflows are not added: their output handling and format-specific recipes need separate implementation and tests; they must not appear as working LaTeX engines. Package installation is intentionally not force-killed mid-write by the compile cancellation action. Complex multi-index/glossary workflows remain unsupported. REA/Ghidra were not used for these repairs.

## Evidence

TeXworks source inspected: src/TWApp.cpp (program discovery and engine definitions), src/utils/TypesetManager.cpp (root-document job ownership), src/document/TeXDocument.cpp (root directives). Official source: https://github.com/TeXworks/texworks . This is behavioral comparison, not copied implementation.

The screenshot mixes plain TeX formats, LaTeX formats, ConTeXt workflows and auxiliary tools. Menu presence does not verify installed executables. Lemmata currently supports three LaTeX engines and automatic bibliography passes; expanding the menu alone would not add these workflows.

REA: no connected REA tool or rea executable found in the initial checks. An existing rea-env.ps1 references Ghidra/JDK. Locate the original REA package before claiming REA analysis; source inspection is available independently.

## Ordered implementation and acceptance gates

1. Executable health and distribution identity. Distinguish absent executable, Windows loader/DLL failure, initialization/format failure, missing package, document syntax and timeout. Preserve exit codes and relevant stdout/stderr. Test broken process fixtures and valid installed engines.
2. Unified tool registry. Separate plain pdfTeX/XeTeX/LuaTeX, LaTeX engines, ConTeXt and auxiliary BibTeX/Biber/MakeIndex. Show verified availability. Resolve every auxiliary tool from the selected distribution, not an unrelated PATH installation. Add only workflows with working output handling; explain unsupported output formats.
3. Build orchestration. Run bibliography/index stages when required, preserve necessary auxiliary files within a job, bounded reference stabilization, main-file directory handling and accurate incomplete-build warnings. Test nested projects, citations, indexes and repeated builds.
4. Root and engine directives. Recognize supported TeXworks-style root/program declarations, validate project-relative paths, surface conflicts with saved settings rather than silently switching. Test cycles, traversal and missing roots.
5. Process lifecycle. Real cancel action, process-tree cleanup, timeout diagnostics and no stale PDF replacing a newer request. Test cancel during engine, bibliography and package work.
6. Package recovery. Keep catalog-based mapping and explicit installation consent; expand fixture corpus for library messages, wrapped logs and distribution-specific errors. System fonts/custom files/broken distribution remain distinct recovery paths. Existing TikZ shadows.blur fixture and full report compilation are regression evidence, not proof of universal recovery.
7. User-facing recovery. Show failed stage, selected executable/distribution, actionable diagnosis, complete logs and repair/setup link. Avoid a generic compilation failure when the executable never started.
8. Verification matrix. Windows real MiKTeX and isolated TinyTeX; Apple Silicon real tests when hardware is available. Test clean compiler installation, missing optional packages, missing core runtime, unknown journal class, nested inputs, bibliography, index, Unicode, repeated compile and cancellation. Record untested platforms explicitly.

## Completion rules

Each phase requires behavior tests before it is marked complete. Keep source/data intact. Do not reinstall a system distribution or claim native/platform verification solely from mocks. No collaboration feature work. No GitHub push without a current publication request.
