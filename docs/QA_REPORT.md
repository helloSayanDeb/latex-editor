# Quality assurance — 28 October 2026



**29/29 consolidated QA groups passed on Windows x64.** The feature audit inside that run passed **25/25 checks**. The production build and TypeScript pass. The complete npm dependency audit reports **zero known advisories** at this date. These results cover the current source. Native application packaging has since been removed from this checkout. These checks do not certify every model, operating system, document or security scenario.



## TikZ/PGF library recovery follow-up

The reported `shadows.blur` failure used TikZ's library-specific message, not a `File ... not found` error. Recovery now recognizes these TikZ/PGF errors and named `.code.tex` support files, while continuing to reject traversal and ordinary missing project `.tex` files. Catalog lookup mapped `tikzlibraryshadows.blur.code.tex` to `pgf-blur`. The complete supplied report then compiled unchanged after 22 additional catalog-matched packages were installed in two bounded recovery runs; the resulting PDF was 223,909 bytes. Updated regression checks and all 18 QA groups passed, with zero lint errors. User report source/PDF and test output remain local ignored files.

A repeatable opt-in harness is `node scripts/package-library-live-tests.cjs <local-source-file> --install` against an isolated server. Without `--install` it stops after catalog lookup. It reads the supplied source locally without rewriting it, installs only uniquely matched approved package IDs and limits each run to 16 recovery attempts.

## Missing package recovery follow-up

The updated source passed **18/18 local QA groups**, including TypeScript and zero ESLint errors. A real Windows MiKTeX browser test compiled a document requiring missing `esint.sty`, observed the exact diagnostic and automatic prompt, queried the catalog without installing, approved installation, and observed automatic recompilation to a rendered PDF. An unknown custom `.cls` produced no invented package; an unapproved package ID was refused. Catalog, approval-ticket, injection, replay, selected-distribution change and permission handling checks cover both vendor command contracts.

The opt-in `scripts/package-browser-tests.cjs --install` harness needs an isolated server and a distribution where the explicit `esint` fixture package is missing. The flag intentionally installs that test package; its fixture project is deleted afterwards. MiKTeX was tested on this Windows installation. TeX Live/TinyTeX/macOS operations have command-contract tests, not live installation coverage. This is not universal package/font repair.

## Latest installer follow-up



The installer follow-up passed **17/17 local QA groups**, including TypeScript and ESLint (zero errors; existing warnings remain). New checks cover 800 menu renders across terminal sizes, installation ownership, altered markers, path traversal and preserving untracked files. A Windows PTY exercise verified repeated arrow navigation and terminal restoration. PowerShell and Bash syntax checks passed. Running `Lemmata Setup.cmd --check` reused system Node and generated real PDFs with all three installed MiKTeX engines.



The former TinyTeX Windows wrapper failure is avoided by using official SHA-256-verified release archives directly. Release metadata was checked online. This pass did **not** reinstall/remove real distributions, test a complete fresh bootstrap against unpublished GitHub changes, or run setup/uninstall on macOS hardware. Uninstall behavior was tested with disposable managed fixtures. The previous broader browser/API results below predate this installer follow-up.



## What was corrected during this pass



- Replaced PDF.js 3.x with 4.10.38, a shared same-origin module loader and matching worker. CMaps, standard fonts and the upstream license are local assets. Build/dev scripts synchronize the assets; old vulnerable browser bundles were removed. Evaluation stays disabled. See [Mozilla's advisory](https://github.com/mozilla/pdf.js/security/advisories/GHSA-wgrm-67xf-hhpq) and [the release](https://github.com/mozilla/pdf.js/releases/tag/v4.10.38).

- Unified nested math-rendering dependencies on the patched root KaTeX, and applied compatible development dependency updates. The audited dependency tree currently has no reported vulnerabilities; this is not a complete security audit.

- Fixed render-time ref access, declaration ordering and ambiguous types. CommonJS test scripts now have the appropriate lint configuration. Intentional UI resets in effects remain visible as performance warnings, rather than lint errors. Other minor lint warnings remain.

- Compiler diagnostics retain multiline package/font explanations and do not mistake package-message prefixes for source-stack changes. Missing fonts, incompatible engines and missing packages receive separate guidance, including wrapped error lines.

- Compiler checks cover custom journal resource extensions and literal input/include dependencies, including plain text inputs. Encoded input masquerading as a source file is rejected. This remains defense in depth, **not an OS-level TeX sandbox**.

- Default environment testing uses base LaTeX. CircuitikZ is an optional advanced probe, not a prerequisite for a healthy minimal installation. Live LM Studio inference is explicitly opt-in and no longer assumes one particular downloaded model.



## Comparison with the supplied original plan



The Downloads copies of `implementation_plan.md` and `walkthrough.md` were checked as historical references. Their proposed commands and claims were not treated as fresh instructions or proof of implementation. Later requests changed several original details: Lemmata replaces the old branding, local fonts replace network fonts, explicit sharing replaces automatic source attachment, the PDF uses Canvas 2D instead of an extra WebGL pass, download replaces print, and the workspace moved from `/` to `/lemmata`. The landing artwork uses a separate high-DPI Canvas 2D illustration. The walkthrough's old GPU/security claims therefore do not describe the current build.



Find/replace now decorates every nonempty match and distinguishes the active one. Basic AI diff annotations and explicitly saved proposals are supported; universal collaborative change tracking remains outside scope.



## Previous-request coverage



| Requested area | Result | Evidence / boundary |

| --- | --- | --- |

| Branding, dark interface, landing/editor separation | Passed | Original Framer Motion/Canvas landing, `/lemmata` workspace, responsive/reduced-motion checks and current SVG/icon assets. Editor/PDF/assistant positions are retained. |

| Compact composer and custom controls | Passed | Growing input, outside-click dropdown dismissal, custom find checkboxes, provider/model controls and a readable three-second toast. |

| Mobile guidance | Passed | Continue-here preference survives reload; desktop/tablet guidance and landscape device illustration remain. Phone editing is a compact fallback. |

| Three compiler engines | Passed with real executables | Independent pdfLaTeX/XeLaTeX/LuaLaTeX identities, PDF producers, nested main/input files and Unicode fontspec probes. No app restart is needed for an engine switch. |

| First-run/setup behavior | Passed on Windows | Once-per-server-run acknowledgment, late discovery, custom bin paths, actual verification. |

| Welcome and presets | Passed | One-page welcome on all engines; article, circuit, math, exam, minimal and Beamer templates compile after required packages are installed. |

| Bibliography | Passed | Real BibTeX and Biber resolution. Auxiliary tools and packages remain external dependencies. |

| PDF viewer | Passed with real 12-page PDF | Matching module/worker, full viewport compile overlay at page 10, exact scroll restoration with and without source edits, retained zoom pixels, dark paper and PDF download. Not a controlled hardware performance benchmark. |

| Source/PDF navigation | Passed | Real forward/inverse SyncTeX, nested source files, coordinate/rotation tests, highlights and stale-map rejection. Precision remains limited by TeX's recorded boxes. |

| Editor basics | Passed | Wrapping, formatting/undo, regex capture replacement, file/outline/search/command actions and real citation/label completion. |

| Spelling and counts | Passed | Real local English dictionary, corrections/ignore, TeX exclusions and approximate word/formula counts. Not grammar checking. |

| Projects and history | Passed | CRUD, autosave ordering, unsafe-path rejection, binary/nested files, snapshot restore and retention, Git draft cancellation and deletion of disposable projects. Multi-client conflict detection and transactional file writes are absent. |

| Local AI and cloud adapters | Contract/browser checks passed | Provider discovery, key isolation, payloads, error handling and destination-separated history. No paid cloud account or current real LM Studio/Ollama inference server was used in this QA pass. |

| Images and answer formatting | Passed with controlled model | Native browser paste-event handler, normalized image bytes, vision/text gating, one-time image delivery, Markdown/math rendering, source-off payload and remembered follow-up context. The user's OS clipboard was not overwritten. |

| Ask/Edit and inline proposals | Passed with controlled model | Ask has no editor action buttons; Edit uses focused patches, selection bounds, stale/ambiguous rejection, Accept/Reject, undo and compile finalization rules. Model instruction compliance still varies. |

| Persistent notes and reports — #6 / #11 | Passed | Reloaded notes/replies/resolutions, saved proposals/decisions, full reports and approved source snapshots, filters and checked source links. Not collaborative track changes or a peer-review verdict. |

| Compiler repair — #10 | Passed | Approved diagnostic/source context, controlled focused suggestion, actual candidate compilation, saved proposal acceptance and final PDF. |

| Visual tools — #8 / #9 | Passed within supported structures | Existing simple tables, matrix/equation structures and single-image figures can be edited; advanced custom layouts are refused rather than rewritten. |

| Paper research — #11 | Passed with real retrieval | Real Crawl4AI retrieval through the protected API, actual evidence links, source anchors, token isolation and private-URL rejection. Inference was a fixture. Local retrieval uses approved URLs; it is not autonomous literature discovery. |

| Journal templates — #12 | Passed | Bounded ZIP import, path/type/size checks, new-project preservation, real package lookup, required files, static references and font declarations. Publisher rules, dynamic TeX and installed font-family discovery need manual verification. |

| Git remotes/conflicts — #13 | Passed with real local bare remotes | Fetch, push, fast-forward pull, diverged merge, manual/side resolution, abort, 3 MB binary-byte preservation, private-file exclusion and editor reload/autosave preservation. Hosted authentication was not tested. |



## What is still incomplete or unverified



- Real macOS browser setup/native TeX compilation still needs platform acceptance testing. Native installers are no longer part of this checkout.

- Live cloud-model/account access, real Ollama inference, current LM Studio model accuracy and hosted Git credentials were not established. Contract fixtures verify request wiring, not service availability or answer correctness. Git commits require a configured author identity; remote operations use the OS credential manager/SSH agent.

- Lint has no errors and 38 warnings remain, including reviewed effect-reset/performance notices and minor unused-code warnings. Accessibility and browser coverage are sampled, not exhaustive.

- Arbitrary custom TeX/journal classes, fonts and every document layout are not guaranteed. A font-family lookup failure is a distribution/font-cache issue; tests use an installed OpenType font filename for portable fontspec verification. Advanced primitives can be rejected by the local compiler policy.

- Previously deferred #5 (build recipes/auto-compile) and #7 (selective history comparison) are now implemented in the remaining-plan follow-up. #14 (real-time collaboration) is explicitly excluded. There is no cloud compilation service or PWA-based native server auto-start.

- No new tag, public installer, GitHub release or push was made during this QA task. Previously published installers do not receive source changes automatically.



## Folder cleanup and visual follow-up — 28 October 2026



Removed 2.79 GiB of redundant archives, generated outputs and disposable research/test copies. Installed development tools were preserved outside the source folder in the user's cache; the private TeX settings now reference that location. Removed the unused old AI diff overlay and obsolete internal planning documents. Generated test reports now go to ignored `tmp/`, and fresh-checkout tests create that directory themselves. All 10 personal project files matched their pre-cleanup aggregate fingerprint before restarting the normal server; live autosaves resume when existing browser tabs reconnect. No Git history was rewritten or published.



A 140-file owned-source/document/asset audit found no previous product branding. The follow-up replaces inherited green action colors across base styles and utility generation, including portal dialogs, dropdown focus rings and the table checkbox. Original landing artwork now uses sharp high-DPI Canvas 2D paths with Framer Motion reveals; animation pauses off-screen and respects reduced motion. The feature cards use original explanatory diagrams inspired by the supplied reference compositions.



Production build, 14/14 regression/type/lint groups, and the interaction/premium browser groups passed. Browser checks cover desktop/mobile landing overflow, reduced motion, growing composer bounds, custom settings navigation, versioned amber favicon, dropdown focus/open colors, the custom table checkbox, journal import/preflight, persistent report reload/source jump and Git remote UI. The relocated native distribution passed independent three-engine compilation and SyncTeX checks. Existing platform/service limits below still apply; this does not establish a bug-free app.



## Remaining-plan follow-up — 28 October 2026



Completed #5 (fixed build recipes and opt-in auto-compile) and #7 (snapshot comparison and selective restore). Also completed all-match find highlighting and project rename. #14 (real-time collaboration) remains explicitly excluded.



The production build and **29/29 complete regression/API/browser groups pass**, including the 25-check feature audit. New coverage verifies real Quick/Standard/Final TeX pass counts, real bibliography handling, persisted rename/recipe/auto settings, mapped search highlights, 206 exact snapshot-diff round trips, large/stale-region handling, single-region and selected-file restore with safety snapshots, debouncing, paused AI/history review and reload behavior. The complete run uses disposable projects and local bare Git remotes. All three actual engines, SyncTeX, 12-page PDF position/zoom/overlay behavior, review/compiler-repair flows and existing privacy checks also passed. Lint reports zero errors and 38 existing warnings.



Build recipes accept a fixed enum, not shell commands. Auto-compile never approves a pending AI proposal and opening a project does not trigger a build. History restoration preserves unrelated current files/regions, rejects stale source, saves a safety copy and blocks project switching until writes finish. Large comparisons use a grouped region and bounded preview. Transactional filesystem writes, multi-client conflict detection, real cloud inference, hosted credentials, macOS acceptance testing retain the documented limitations.



## Reproduce



Use a separate local server/data directory for API/browser testing; never point the test-data variable at personal project storage. Required test tools are Git, an installed TeX distribution (with the preset/bibliography packages), Node.js, and Playwright/Chromium for browser groups. Current verification used Node 26.7.0; Node 22+ is recommended for the PDF audit helpers.



```sh

npm run build

npm run qa

npm run qa -- --api --browser

npm audit

```



For the combined run set `LEMMATA_TEST_URL` (default `http://127.0.0.1:2306`), `LEMMATA_TEST_TEX_BIN` if using portable TeX, `LEMMATA_PLAYWRIGHT_PATH` if Playwright is installed separately, and `LEMMATA_TEST_DATA_DIR` to the isolated server's data directory for real Git UI pull testing. The optional crawler check additionally needs its documented running bridge and disposable token.



Test commands regenerate machine-readable results and screenshots in ignored `tmp/`. Folder cleanup removes these disposable outputs; a compact verification summary is retained outside the source folder in the local Lemmata cache. Personal project data is not test evidence. Native build artifacts and external development tools are not public release assets.



## Guided landing demo — 28 October 2026



The landing preview now contains preset Write / Build / Refine scenarios. Workflow-row buttons select and scroll to the exact corresponding scenario. Visitors can choose an equation/matrix starter, reveal and repair a sample compiler typo, and accept/reject a focused sentence suggestion. Reset and keyboard tab navigation are available; source is read-only. These examples are deterministic illustrations, not live model calls or compilation, and never load personal project data.



Production build, TypeScript and focused browser checks cover scenario actions, reset, source/preview updates, workflow navigation, keyboard tabs, mobile overflow and reduced motion. REA's official browser-scenario CLI captured the reference site's public rendered DOM after dismissing its cookie notice, but tab-click replay timed out. This is partial public-page evidence, not decoded private implementation. Lemmata's scenario state machine is original.



## Native packaging removal — 28 October 2026



Removed the Electron shell, native icon, builder configuration, release workflow, binary-download scripts, desktop-only verification scripts and historical installer documentation. Removed Electron/electron-builder and the direct packaging-only sharp dependency; Next.js retains its own required image dependency. Local browser startup, CLI setup, TeX compilation, project storage and the SVG favicon remain. Existing releases and installed applications outside this checkout were not modified.



## Lemmata naming follow-up — 28 October 2026



Private configuration now uses `lemmata-settings.json`. Setup UI and environment helper names use Lemmata consistently. The existing settings bytes were preserved during rename. An audit of 142 app-owned source/document/asset files found no previous branding references. Production build, 15/15 regression/type/lint groups and live discovery of all three configured engines pass. Technical LaTeX syntax, compiler/tool names, third-party licenses and user documents remain intact.



## Interactive terminal setup — 28 October 2026



The previous bootstrap scripts now delegate to a shared five-step terminal wizard. It prepares the local web app, verifies real PDFs with each engine, offers architecture-filtered distribution choices with approximate storage needs, installs the selected option after confirmation, rechecks engines, saves a verified default and waits for server readiness before opening the browser. Custom paths, retry, explicit partial success and editing-only mode are supported. Normal launches retain first-run browser setup; a wizard-verified launch acknowledges setup for that run. Native application EXE/DMG packaging remains removed.



Windows x64 offers TinyTeX, MiKTeX/winget and TeX Live; Windows ARM64 offers TeX Live with x64 emulation. Apple Silicon offers TinyTeX, BasicTeX and MacTeX. macOS packages use SHA-256 metadata checks and the native installer with OS approval. TinyTeX uses its official installation script; TeX Live uses the official network installer. These selected external installers can download additional packages. No installer is invoked by noninteractive checks.



Verification: 16/16 regression/type/lint groups pass; all three installed engines generated real test PDFs through the new verifier. A Windows PTY exercised arrow navigation and Enter, selected XeLaTeX and preserved the compiler path in isolated settings. A second end-to-end run selected pdfLaTeX, started an isolated server on port 2307, waited for readiness, invoked the default browser and confirmed the selected setting and acknowledged setup through the local API. Shell and PowerShell syntax passed. Windows shortcut creation succeeded and uses a favicon-derived icon. Plain script files keep OS file-type icons; the Mac command launcher has no automatic custom Finder icon. Fresh vendor installations, Windows ARM hardware and execution on a real Apple Silicon Mac have not been tested here; those branches must not be described as verified installs. Existing functional distributions were not reinstalled.

