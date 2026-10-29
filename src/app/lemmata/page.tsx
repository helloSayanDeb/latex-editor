'use client';
import { RestoreAccent } from '@/components/AccentPicker';
import { readPreference } from '@/lib/preferences';

import { isolateHistory } from '@codemirror/commands';
import { minimalAIEdit, validEditTarget, type AIEditTarget } from '@/lib/ai-conversation';

import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAppDialog } from '@/components/AppDialog';
import { SaveQueue } from '@/lib/save-queue';
import {
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  FileCode,
  Sparkles,
  AlertTriangle,
  X,
  Copy,
  Check,
  Search,
  AlignLeft,
  WrapText,
} from 'lucide-react';

import { BuildSettings, type ProjectBuildSettings } from '@/components/modals/BuildSettings';
import type { BuildRecipe } from '@/lib/build-settings';
import { Navbar } from '@/components/Navbar';
import { LemmataSetup } from '@/components/modals/LemmataSetup';
import { WorkspaceNavigator, type WorkspaceCommand } from '@/components/modals/WorkspaceNavigator';
import { MissingPackages } from '@/components/modals/MissingPackages';
import { ProblemsPanel } from '@/components/ProblemsPanel';
import { parseCompileLog, type CompileDiagnostic } from '@/lib/compile-diagnostics';
import { referenceDiagnostics } from '@/lib/project-index';
import { MobileWelcome } from '@/components/MobileWelcome';
import { StatusBar } from '@/components/StatusBar';
import { FileTree } from '@/components/sidebar/FileTree';
import { FileOutline } from '@/components/sidebar/FileOutline';
import { GitPanel } from '@/components/sidebar/GitPanel';
import { FindReplacePanel } from '@/components/editor/FindReplacePanel';
import { setAIReview } from '@/lib/editor-ai-review';
import { SpellChecker } from '@/components/editor/SpellChecker';
import { JournalTemplates } from '@/components/modals/JournalTemplates';
import { TemplateWizard } from '@/components/modals/TemplateWizard';
import { TableGenerator } from '@/components/modals/TableGenerator';
import { VisualEditor, type VisualTarget } from '@/components/modals/VisualEditor';
import { SymbolPalette } from '@/components/modals/SymbolPalette';
import { WordCountModal } from '@/components/modals/WordCountModal';
import { NewFileModal } from '@/components/modals/NewFileModal';
import { SnapshotDrawer } from '@/components/drawers/SnapshotDrawer';
import { AIAssistantDrawer } from '@/components/ai/AIAssistantDrawer';
import type { CodeEditorHandle } from '@/components/editor/CodeEditor';
import { WELCOME_LATEX_CONTENT, WELCOME_BIB_CONTENT } from '@/lib/welcome-document';
import type { ProjectMetadata } from '@/lib/project-store';

// Dynamic client-side only imports for CodeMirror and PDFViewer to prevent SSR issues
const CodeEditor = dynamic(
  () => import('@/components/editor/CodeEditor').then(mod => mod.CodeEditor),
  { ssr: false }
);

const PDFViewer = dynamic(
  () => import('@/components/preview/PDFViewer').then(mod => mod.PDFViewer),
  { ssr: false }
);

export default function WorkspacePage() {
  // Project & Files State
  const [buildSettingsOpen,setBuildSettingsOpen] = useState(false);
  const autoBuildBaseline = useRef({ project: '', source: '' });
  const [journalOpen,setJournalOpen] = useState(false);
  const [gitBusy,setGitBusy] = useState(false);
  const gitBusyRef = useRef(false);
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('main.tex');
  const [engine, setEngine] = useState<'pdflatex' | 'xelatex' | 'lualatex'>('pdflatex');
  const [lemmataSetupOpen, setLemmataSetupOpen] = useState(false);
  const [visualTarget, setVisualTarget] = useState<VisualTarget | null>(null);
  const [serverRun, setServerRun] = useState('');
  const [wordWrap, setWordWrap] = useState(true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { setWordWrap(readPreference('lemmata_word_wrap') !== 'false'); } catch { /* Default to wrapping. */ }
    });
    const abort = new AbortController();
    fetch('/api/system', { signal: abort.signal }).then(response => response.json()).then(data => {
      if (abort.signal.aborted) return;
      setServerRun(data.runId);
      setLemmataSetupOpen(!data.setupAcknowledged);
    }).catch(() => {});
    return () => { abort.abort(); cancelAnimationFrame(frame); };
  }, []);
  const closeLemmataSetup = async () => {
    if (serverRun) {
      try {
        const response = await fetch('/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'acknowledge', runId: serverRun }) });
        if (!response.ok) throw new Error('Could not remember setup for this server run.');
      } catch { setWorkspaceError('Could not remember engine setup. Try again after checking the local server.'); return; }
    }
    setLemmataSetupOpen(false);
  };
  const engineRef = useRef(engine);
  useLayoutEffect(() => { engineRef.current = engine; }, [engine]);
  const [isModified, setIsModified] = useState<boolean>(false);

  // Layout & UI State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [layout, setLayout] = useState<'split' | 'editor' | 'pdf'>('split');
  const [editorWidth, setEditorWidth] = useState(50);
  const panesRef = useRef<HTMLDivElement>(null);
  const workbenchRef = useRef<HTMLDivElement>(null);
  const [workbenchWidth, setWorkbenchWidth] = useState(0);
  const [assistantWidth, setAssistantWidth] = useState(360);
  const assistantDocked = workbenchWidth >= 1040;
  const assistantMaxWidth = Math.min(480, Math.max(320, workbenchWidth - 680));
  const effectiveAssistantWidth = Math.min(assistantWidth, assistantMaxWidth);
  const [workspaceError, setWorkspaceError] = useState('');
  const [findOpen, setFindOpen] = useState<boolean>(false);
  const [formatMessage, setFormatMessage] = useState('');
  const [spellCheckEnabled, setSpellCheckEnabled] = useState<boolean>(false);

  // Cursor & Selection State
  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);
  const [selectedText, setSelectedText] = useState<string>('');

  // Compilation & PDF State
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');
  const [compileDurationMs, setCompileDurationMs] = useState<number>(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [packageRecovery,setPackageRecovery]=useState<{files:string[];engine:string;project:string}|null>(null);
  useEffect(()=>setPackageRecovery(null),[currentProject?.id,engine]);
  const [compileLog, setCompileLog] = useState<string>('');
  const [compilerProblems, setCompilerProblems] = useState<CompileDiagnostic[]>([]);
  const [problemsOpen, setProblemsOpen] = useState(false);
  const [problemFilter, setProblemFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => { const update = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update); }, []);
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen().catch(() => setWorkspaceError('Fullscreen is unavailable in this browser. Try F11.')); };
  const [navigatorMode, setNavigator] = useState<'commands' | 'files' | 'search' | null>(null);
  const [diagnosticSource,setDiagnosticSource] = useState<Record<string, string> | null>(null);
  const sourceProblems = useMemo(() => referenceDiagnostics(files), [files]);
  const problems = [...compilerProblems, ...sourceProblems];
  const problemsStale = Boolean(diagnosticSource && JSON.stringify(diagnosticSource) !== JSON.stringify(files));
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);

  // Modals & Drawers State
  const [templatesOpen, setTemplatesOpen] = useState<boolean>(false);
  const [tableGenOpen, setTableGenOpen] = useState<boolean>(false);
  const [symbolsOpen, setSymbolsOpen] = useState<boolean>(false);
  const [wordCountOpen, setWordCountOpen] = useState<boolean>(false);
  const [newFileOpen, setNewFileOpen] = useState<boolean>(false);
  const [snapshotDrawerOpen, setSnapshotDrawerOpen] = useState<boolean>(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);

  // Inline AI Diff State
  const [diffState, setDiffState] = useState<{
    isOpen: boolean;
    originalText: string;
    suggestedText: string;
  }>({
    isOpen: false,
    originalText: '',
    suggestedText: '',
  });

  const editorRef = useRef<CodeEditorHandle | null>(null);
  const diffTarget = useRef<AIEditTarget | null>(null);
  const diffCode = useRef('');
  const lastAIEdit = useRef<AIEditTarget | null>(null);
  const aiSourceIdentity = useRef({ project: currentProject?.id || 'default', file: activeFile });
  useLayoutEffect(() => { aiSourceIdentity.current = { project: currentProject?.id || 'default', file: activeFile }; }, [currentProject?.id,activeFile]);
  useEffect(() => {
    editorRef.current?.previewAIEdit(null);
    diffTarget.current = null;
    setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
    lastAIEdit.current = null;
  }, [activeFile, currentProject?.id]);
  const saveQueue = useRef(new SaveQueue());
  const loadRevision = useRef(0);
  const historyRestoreBusy = useRef(false);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [savedVersion, setSavedVersion] = useState(0);
  const saveRevision = useRef(0);
  const compileRevision = useRef(0);
  const compileRequest = useRef<Promise<Response> | null>(null);
  const compileAbort = useRef<AbortController | null>(null);
  const compiledSource = useRef<{ project: string; main: string; files: Record<string, string> } | null>(null);
  const syncRevision = useRef(0);
  const [sourceJump, setSourceJump] = useState<{ project: string; file: string; line: number; column: number } | null>(null);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const { ask, dialog } = useAppDialog();
  const [compiledEngine, setCompiledEngine] = useState('');
  const [compilerBanner, setCompilerBanner] = useState('');

  useEffect(() => {
    const container = workbenchRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWorkbenchWidth(entry.contentRect.width));
    observer.observe(container);
    try {
      const saved = Number(readPreference('lemmata_assistant_width'));
      if (saved >= 320 && saved <= 480) setAssistantWidth(saved);
    } catch { /* Layout remains usable without browser storage. */ }
    return () => observer.disconnect();
  }, []);

  const resizeAssistant = (width: number) => {
    const next = Math.round(Math.max(320, Math.min(assistantMaxWidth, width)));
    setAssistantWidth(next);
    try { localStorage.setItem('lemmata_assistant_width', String(next)); } catch { /* Optional preference. */ }
  };

  const closeAssistant = () => {
    setAiDrawerOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-controls="lemmata-assist-panel"]')?.focus());
  };

  useEffect(() => { setFormatMessage(''); }, [activeFile, currentProject?.id]);

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 760px)');
    const updateSidebar = () => { if (narrow.matches) setSidebarOpen(false); };
    updateSidebar();
    narrow.addEventListener('change', updateSidebar);
    return () => narrow.removeEventListener('change', updateSidebar);
  }, []);

  // Compile helper
  const compileWithPayload = async (
    targetFiles: Record<string, string>,
    mainFile: string,
    targetEngine: 'pdflatex' | 'xelatex' | 'lualatex',
    projId: string,
    recipe: BuildRecipe = currentProject?.buildRecipe || 'standard'
  ) => {
    const revision = ++compileRevision.current;
    
    setIsCompiling(true);
    setCompileStatus('compiling');
    setPackageRecovery(null);
    const start = Date.now();

    try {
      // A project change can invalidate a request without stopping its native process.
      // Wait for it before launching the newly selected engine.
      await compileRequest.current?.catch(() => undefined);
      if (revision !== compileRevision.current) return;
      const controller = new AbortController();
      compileAbort.current = controller;
      const pending = fetch('/api/compile', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: targetFiles,
          mainFile: mainFile || 'main.tex',
          engine: targetEngine,
          recipe,
          synctex: true,
          projectId: projId || 'default',
        }),
      });
      compileRequest.current = pending;
      const res = await pending;

      const elapsed = Date.now() - start;
      if (revision !== compileRevision.current) return;
      setCompileDurationMs(elapsed);

      if (res.ok) {
        if (res.headers.get('X-Compile-Engine') !== targetEngine) throw new Error('Compiler result does not match the selected engine. Please compile again.');
        const blob = await res.blob();
        if (revision !== compileRevision.current) return;
        setPdfBlob(blob);
        compiledSource.current = { project: projId || 'default', main: decodeURIComponent(res.headers.get('X-Compile-Main') || encodeURIComponent(mainFile)), files: { ...targetFiles } };
        setCompiledEngine(res.headers.get('X-Compile-Engine') || targetEngine);
        setCompilerBanner(res.headers.get('X-Compile-Compiler') || '');
        setCompileStatus('success');
        setCompileLog('');
        const encoded = res.headers.get('X-Compile-Diagnostics');
        try {
          const parsed: CompileDiagnostic[] = encoded ? JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(encoded), char => char.charCodeAt(0)))) : [];
          setCompilerProblems(parsed); setCompileLog(parsed.length ? 'Successful compilation: bounded warning summary (up to 12 warnings).\n\n' + parsed.map(item => `${item.file || ''}${item.line ? ':' + item.line : ''} ${item.message}`).join('\n') : 'Compilation succeeded without recorded warnings.');
        } catch { setCompilerProblems([]); }
        setDiagnosticSource({ ...targetFiles });

        // Trigger auto-snapshot
        if (projId) {
          fetch(`/api/projects/${projId}/snapshots`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'auto',
              files: targetFiles,
              activeFile: mainFile,
            }),
          }).catch(() => {});
        }
      } else {
        const errData = await res.json();
        if (revision !== compileRevision.current) return;
        setCompileStatus('error');
        setCompileLog(errData.log || 'Compilation failed.');
        if(errData.missingPackages?.length) setPackageRecovery({files:errData.missingPackages,engine:targetEngine,project:projId});
        setCompilerProblems(errData.diagnostics || parseCompileLog(errData.log || 'Compilation failed.', Object.keys(targetFiles), mainFile));
        setDiagnosticSource({ ...targetFiles }); setProblemsOpen(false);
      }
    } catch (err) {
      if (revision !== compileRevision.current) return;
      setCompileStatus('error');
      setCompileLog((err as Error).message);
      setCompilerProblems([{ severity: 'error', message: (err as Error).message }]); setProblemsOpen(true);
    } finally {
      if (revision === compileRevision.current) setIsCompiling(false);
    }
  };

  // Load project by ID
  const loadProject = async (id: string) => {
    if (historyRestoreBusy.current) { setWorkspaceError('Wait for the history restore to finish before switching projects.'); return; }
    const revision = ++loadRevision.current;
    editorRef.current?.previewAIEdit(null);
    diffTarget.current = null;
    setIsLoadingProject(true);
    setFindOpen(false);
    setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
    ++compileRevision.current;
    setIsCompiling(false);
    setCompileStatus('idle');
    setCompileLog('');
    setCompilerProblems([]); setDiagnosticSource(null); 
    try {
      await saveQueue.current.flush();
      if (revision !== loadRevision.current) return;
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (revision !== loadRevision.current) return;
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not load project.');
      if (data.ok && data.project) {
        setPdfBlob(null);
        setCurrentProject(data.project.metadata);
        setFiles(data.project.files || {});
        const main = data.project.metadata.mainFile || 'main.tex';
        setActiveFile(main);
        setCursorLine(1);
        setCursorCol(1);
        setSelectedText('');
        const eng = data.project.metadata.engine || 'pdflatex';
        setEngine(eng);

        setIsModified(false);
        setWorkspaceError('');

        // First-run Lemmata setup must finish before starting native compilation.
      }
    } catch (err) {
      if (revision === loadRevision.current) setWorkspaceError((err as Error).message);
    } finally {
      if (revision === loadRevision.current) setIsLoadingProject(false);
    }
  };

  // Fetch projects on initial load
  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.json())
      .then(data => {
        if (data.ok && data.projects?.length > 0) {
          setProjects(data.projects);
          loadProject(data.projects[0].id);
        }
      })
      .catch(() => setWorkspaceError('Could not load projects. Please reload to try again.'));
  }, []);

  // Debounced auto-save project files
  const scheduleSave = useCallback(
    (updatedFiles: Record<string, string>, selectedEngine = engine) => {
      if (!currentProject) return;
      const revision = ++saveRevision.current;

      setIsModified(true);
      saveQueue.current.schedule(async () => {
        try {
          const response = await fetch(`/api/projects/${currentProject.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: currentProject.name,
              engine: selectedEngine,
              mainFile: currentProject.mainFile || 'main.tex',
              buildRecipe: currentProject.buildRecipe || 'standard',
              autoCompile: currentProject.autoCompile === true,
              files: updatedFiles,
            }),
          });
          if (!response.ok) throw new Error('Saving failed. Your edits remain in this tab.');
          setSavedVersion(value => value + 1);
          if (revision === saveRevision.current) {
            setWorkspaceError('');
            setIsModified(false);
          }
        } catch (err) {
          if (revision === saveRevision.current) setWorkspaceError((err as Error).message);
          throw err;
        }
      });
    },
    [currentProject, engine]
  );

  // Editor content change handler
  const handleEditorChange = (newVal: string) => {
    const updated = { ...files, [activeFile]: newVal };
    setFiles(updated);
    scheduleSave(updated);
  };

  // Switch active file
  const handleSelectFile = (fileName: string) => {
    if (fileName === activeFile) return;
    setActiveFile(fileName);
    setCursorLine(1);
    setCursorCol(1);
    setSelectedText('');
  };

  // Compilation function
  const handleFormatCode = () => {
    if (isLoadingProject || !activeFile.endsWith('.tex')) return;
    const changed = editorRef.current?.formatCode();
    setFormatMessage(changed ? 'Code formatted · Ctrl+Z to undo' : 'Indentation is already clean');
  };

  const handleCompile = async () => {
    if (isCompiling) {
      compileAbort.current?.abort();
      ++compileRevision.current;
      setIsCompiling(false);
      setCompileStatus('idle');
      setCompileLog('Compilation cancelled. The previous preview has been retained.');
      return;
    }
    if (gitBusyRef.current) return;
    if (isCompiling || isLoadingProject) return;

    if (diffTarget.current && !acceptAIEdit(diffTarget.current, diffCode.current)) return;

    // Ensure latest text is in files
    const latestFiles = { ...files };
    if (editorRef.current) {
      const currentVal = editorRef.current.getValue();
      latestFiles[activeFile] = currentVal;
      setFiles(latestFiles);
    }

    const main = currentProject?.mainFile || 'main.tex';
    await compileWithPayload(
      latestFiles,
      main,
      engineRef.current,
      currentProject?.id || 'default'
    );
  };

  const autoBuildContext = useRef({ source: '', blocked: true });
  useLayoutEffect(() => {
    autoBuildContext.current = {
      source: JSON.stringify([files, engine, currentProject?.mainFile, currentProject?.buildRecipe]),
      blocked: !currentProject?.autoCompile || isLoadingProject || isCompiling || lemmataSetupOpen || diffState.isOpen || gitBusy || snapshotDrawerOpen || buildSettingsOpen,
    };
  });
  const autoBuild = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    autoBuild.current = async () => {
      if (!currentProject || diffTarget.current || gitBusyRef.current) return;
      const revision = loadRevision.current, source = autoBuildContext.current.source;
      try { await saveQueue.current.flush(); }
      catch { setWorkspaceError('Auto-compile paused because saving failed.'); return; }
      if (revision !== loadRevision.current || source !== autoBuildContext.current.source || autoBuildContext.current.blocked || diffTarget.current || gitBusyRef.current) return;
      autoBuildBaseline.current = { project: currentProject.id, source };
      await compileWithPayload(files, currentProject.mainFile, engineRef.current, currentProject.id);
    };
  });
  useEffect(() => {
    if (!currentProject) return;
    const source = JSON.stringify([files, engine, currentProject.mainFile, currentProject.buildRecipe]);
    const previous = autoBuildBaseline.current;
    if (previous.project !== currentProject.id || !currentProject.autoCompile || isLoadingProject) {
      autoBuildBaseline.current = { project: currentProject.id, source }; return;
    }
    if (previous.source === source || isCompiling || lemmataSetupOpen || diffState.isOpen || gitBusy || snapshotDrawerOpen || buildSettingsOpen) return;
    const timer = setTimeout(() => {
      void autoBuild.current();
    }, 1200);
    return () => clearTimeout(timer);
  }, [files, engine, currentProject, isLoadingProject, isCompiling, lemmataSetupOpen, diffState.isOpen, gitBusy, snapshotDrawerOpen, buildSettingsOpen]);

  const saveBuildSettings = async (settings: ProjectBuildSettings) => {
    if (!currentProject || gitBusyRef.current) throw new Error('Wait until the project is ready.');
    if (!settings.name || settings.name.length > 100 || !settings.mainFile.endsWith('.tex') || files[settings.mainFile] === undefined) throw new Error('Choose a name and an existing main .tex file.');
    await saveQueue.current.flush();
    const metadata = { ...currentProject, ...settings };
    await saveQueue.current.enqueue(async () => {
      const response = await fetch(`/api/projects/${metadata.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...metadata, engine: engineRef.current, files }) });
      const result = await response.json(); if (!response.ok || !result.ok) throw new Error(result.error || 'Could not save project settings.');
      setCurrentProject(result.metadata); setProjects(items=>items.map(item=>item.id===metadata.id?result.metadata:item));
      setIsModified(false);
    });
  };

  // SyncTeX Jump: PDF -> Source (Ctrl+Click on PDF)
  const handleSyncTexFromPDF = async (page: number, x: number, y: number) => {
    const revision = ++syncRevision.current;
    const projectRevision = loadRevision.current;
    const compileVersion = compileRevision.current;
    const compiled = compiledSource.current;
    if (!compiled || compiled.project !== currentProject?.id || isCompiling) return;
    try {
      const res = await fetch('/api/synctex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          projectId: currentProject?.id || 'default',
          pdfFile: compiled.main.split(/[\\/]/).at(-1)!.replace(/\.tex$/i, '.pdf'),
          page,
          x,
          y,
        }),
      });
      const data = await res.json();
      if (revision !== syncRevision.current || projectRevision !== loadRevision.current || compileVersion !== compileRevision.current) return;
      if (data.ok && data.result) {
        const { file, line, column } = data.result;
        if (files[file] === undefined) {
          setWorkspaceError('The PDF points to a source file that is no longer in this project. Recompile to refresh the map.');
          return;
        }
        if (files[file] !== compiled.files[file]) {
          setWorkspaceError('The source has changed since this PDF was compiled. Recompile for an accurate source jump.');
          return;
        }
        setWorkspaceError('');
        if (layout === 'pdf') setLayout('split');
        handleSelectFile(file);
        setSourceJump({ project: compiled.project, file, line, column: Math.max(1, column) });
      } else {
        setWorkspaceError(data.error || 'No source location found here. Try clicking directly on text or an equation.');
      }
    } catch (err) {
      if (revision === syncRevision.current) setWorkspaceError(`Source lookup failed: ${(err as Error).message}`);
    }
  };

  const jumpToSource = (file: string, line: number, column = 1) => {
    if (!currentProject || files[file] === undefined) { setWorkspaceError('That source file is not in the current project.'); return; }
    if (layout === 'pdf') setLayout('split');
    handleSelectFile(file); setSourceJump({ project: currentProject.id, file, line, column });
  };

  // Run after the selected file's editor has mounted; no guessed switching delay.
  useEffect(() => {
    if (!sourceJump || sourceJump.project !== currentProject?.id || sourceJump.file !== activeFile) return;
    const frame = requestAnimationFrame(() => {
      if (!editorRef.current?.getEditorView()) return;
      editorRef.current?.jumpToLine(sourceJump.line, sourceJump.column);
      setSourceJump(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceJump, activeFile, currentProject?.id, editorEpoch]);

  // Insert code at cursor from AI or Symbol Palette or Table Generator
  const handleInsertAtCursor = (code: string) => {
    editorRef.current?.insertAtCursor(code);
  };
  const openVisualEditor = (kind: VisualTarget['kind']) => {
    const view = editorRef.current?.getEditorView();
    if (!view || !activeFile.endsWith('.tex') || isLoadingProject) return;
    if (diffTarget.current) { setWorkspaceError('Accept or reject the pending inline edit before opening the visual editor.'); return; }
    setVisualTarget({ kind, file: activeFile, project: currentProject?.id || 'default', source: view.state.doc.toString(), cursor: view.state.selection.main.head, files: { ...files } });
  };
  const verifyCandidate = async (target: AIEditTarget, code: string) => {
    const view = editorRef.current?.getEditorView();
    if (!view || !validEditTarget(target, currentProject?.id || 'default', activeFile, view.state.doc.toString())) throw new Error('Source changed. Request a new repair against the current document.');
    const candidate = { ...files, [activeFile]: target.document.slice(0, target.from) + code + target.document.slice(target.to) };
    const candidateEngine = engineRef.current;
    const response = await fetch('/api/compile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: candidate, mainFile: currentProject?.mainFile || 'main.tex', engine: candidateEngine, synctex: false }) });
    if (!response.ok) { const failure = await response.json(); return { ok: false, message: 'Verification still reports errors. ' + String(failure.log || failure.error).slice(0, 1600) }; }
    if (response.headers.get('X-Compile-Engine') !== candidateEngine) { await response.body?.cancel(); throw new Error('The verification engine did not match the requested engine. Retry after checking setup.'); }
    await response.body?.cancel(); return { ok: true, message: 'Candidate compiled successfully with ' + candidateEngine + '. Review and accept the inline edit to apply it.' };
  };

  const getAIEditTarget = (finalizePending = false): AIEditTarget | null => {
    if (finalizePending && diffTarget.current && !acceptAIEdit(diffTarget.current, diffCode.current)) return null;
    const view = editorRef.current?.getEditorView();
    if (!view || isLoadingProject) return null;
    const document = view.state.doc.toString();
    const selection = view.state.selection.main;
    if (selection.empty && lastAIEdit.current && validEditTarget(lastAIEdit.current, aiSourceIdentity.current.project, activeFile, document)) return lastAIEdit.current;
    return { project: currentProject?.id || 'default', file: activeFile, document,
      from: selection.empty ? 0 : selection.from, to: selection.empty ? document.length : selection.to };
  };

  const handleRequestDiff = (target: AIEditTarget, suggestedText: string) => {
    const view = editorRef.current?.getEditorView();
    if (!view || isLoadingProject || !validEditTarget(target, aiSourceIdentity.current.project, aiSourceIdentity.current.file, view.state.doc.toString())) {
      setWorkspaceError('This suggestion belongs to a different or changed source. Ask Lemmata Assist for an updated edit in the current file.');
      return;
    }
    if (diffTarget.current) { setWorkspaceError("Accept or reject the pending edit first."); return; }
    const minimal = minimalAIEdit(target, suggestedText);
    target = minimal.target; suggestedText = minimal.code;
    if (target.from === target.to && !suggestedText) return;
    diffTarget.current = target;
    diffCode.current = suggestedText;
    setDiffState({ isOpen: true, originalText: target.document.slice(target.from, target.to), suggestedText });
    if (layout === 'pdf') setLayout('split');
    editorRef.current?.previewAIEdit({ from: target.from, to: target.to, code: suggestedText, accept: () => acceptAIEdit(target, suggestedText), reject: handleRejectDiff });
  };

  const acceptAIEdit = (target: AIEditTarget, suggestedText: string) => {
    const view = editorRef.current?.getEditorView();
    if (!view || !target || isLoadingProject || !validEditTarget(target, aiSourceIdentity.current.project, aiSourceIdentity.current.file, view.state.doc.toString())) {
      setWorkspaceError('The document changed. Reopen the suggestion against the current text before applying it.');
      return false;
    }
    view.dispatch({ changes: { from: target.from, to: target.to, insert: suggestedText }, selection: { anchor: target.from + suggestedText.length }, effects: setAIReview.of(null), annotations: isolateHistory.of('full'), userEvent: 'input.ai' });
    lastAIEdit.current = { ...target, document: view.state.doc.toString(), to: target.from + suggestedText.length };
    view.focus();
    diffTarget.current = null;
    setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
    return true;
  };

  const handleRejectDiff = () => {
    editorRef.current?.previewAIEdit(null);
    diffTarget.current = null;
    setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
  };

  // New file creation
  const handleCreateFile = (fileName: string, initialContent = '') => {
    const updated = { ...files, [fileName]: initialContent };
    setFiles(updated);
    setActiveFile(fileName);
    scheduleSave(updated);
  };

  // Delete file
  const handleDeleteFile = (fileName: string) => {
    if (fileName === 'main.tex') return;
    const copy = { ...files };
    delete copy[fileName];
    setFiles(copy);
    if (activeFile === fileName) {
      setActiveFile('main.tex');

    }
    scheduleSave(copy);
  };

  // Restore snapshot
  const handleRestoreSnapshot = async (restoredFiles: Record<string, string>, newActiveFile: string, expectedFiles?: Record<string,string>) => {
    if (!currentProject || isLoadingProject || gitBusyRef.current || isCompiling || diffTarget.current) throw new Error('Finish compilation, Git operations or the pending AI proposal before restoring.');
    const current = { ...files };
    if (editorRef.current && current[activeFile] !== undefined) current[activeFile] = editorRef.current.getValue();
    if (expectedFiles && (Object.keys(current).length !== Object.keys(expectedFiles).length || Object.keys(current).some(name=>current[name] !== expectedFiles[name]))) throw new Error('Your source changed during comparison. Review the latest difference and retry.');
    const main = restoredFiles[currentProject.mainFile] !== undefined ? currentProject.mainFile : newActiveFile.endsWith('.tex') && restoredFiles[newActiveFile] !== undefined ? newActiveFile : Object.keys(restoredFiles).find(file=>file.endsWith('.tex'));
    if (!main) throw new Error('Keep at least one .tex source file in the project.');
    historyRestoreBusy.current = true;
    setIsLoadingProject(true);
    try {
      await saveQueue.current.flush();
      if (editorRef.current && current[activeFile] !== undefined && editorRef.current.getValue() !== current[activeFile]) throw new Error('Source changed before restore. Review the latest difference and retry.');
      const backup = await fetch(`/api/projects/${currentProject.id}/snapshots`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'manual',name:'Before history restore',files:current,activeFile})});
      if(!backup.ok) throw new Error('Could not save a safety snapshot. Nothing was restored.');
      ++saveRevision.current;
      await saveQueue.current.enqueue(async () => {
        const response = await fetch(`/api/projects/${currentProject.id}`, {
          method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...currentProject,files:restoredFiles,engine:engineRef.current,mainFile:main}),
        });
        if(!response.ok)throw new Error('Could not save restored files.');
      });
      setFiles(restoredFiles);
      setCurrentProject(project=>project?{...project,mainFile:main}:project);
      setActiveFile(restoredFiles[newActiveFile] !== undefined ? newActiveFile : main);
      setEditorEpoch(epoch=>epoch+1);
      setIsModified(false); setWorkspaceError('');
      ++compileRevision.current; compiledSource.current=null; setPdfBlob(null); setCompileStatus('idle');
      setCompilerProblems([]);setDiagnosticSource(null);
    } finally { historyRestoreBusy.current = false; setIsLoadingProject(false); }
  };

  // Reset to Welcome Document
  const handleResetToDefault = async () => {
    if (
      await ask({title: 'Reset welcome document?', message: 'Current project files will be replaced by the welcome document. Save a snapshot first if you want to keep them.', confirmLabel: 'Reset document'})
    ) {
      const resetFiles = {
        'main.tex': WELCOME_LATEX_CONTENT,
        'references.bib': WELCOME_BIB_CONTENT,
      };
      setFiles(resetFiles);
      setActiveFile('main.tex');

      scheduleSave(resetFiles);
      await compileWithPayload(resetFiles, 'main.tex', engine, currentProject?.id || 'default');
    }
  };

  // Export project as ZIP
  const handleExportZip = async () => {
    try {
      const res = await fetch('/api/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files,
          projectName: currentProject?.name || 'latex-project',
        }),
      });
      if (!res.ok) throw new Error('Could not export the project.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'latex-project'}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setWorkspaceError(`ZIP export error: ${(err as Error).message}`);
    }
  };

  // Keyboard shortcut listener for Ctrl+B
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest?.('[role="dialog"], [role="alertdialog"]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(s => !s);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') { e.preventDefault(); setNavigator(e.shiftKey ? 'commands' : 'files'); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); setNavigator('search'); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') { e.preventDefault(); setProblemsOpen(open => !open); }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const commands: WorkspaceCommand[] = [
    { id: 'build-settings', label: 'Project & build settings', run: () => setBuildSettingsOpen(true) },
    { id: 'fullscreen', label: 'Toggle fullscreen', shortcut: 'F11', run: toggleFullscreen },
    { id: 'compile', label: 'Compile document', shortcut: 'Ctrl/Cmd + Enter', run: handleCompile, disabled: isCompiling || isLoadingProject },
    { id: 'search', label: 'Search across project', shortcut: 'Ctrl/Cmd + Shift + S', run: () => setNavigator('search') },
    { id: 'problems', label: 'Toggle Problems panel', shortcut: 'Ctrl/Cmd + Shift + M', run: () => setProblemsOpen(open => !open) },
    { id: 'format', label: 'Format source code', shortcut: 'Ctrl/Cmd + Shift + F', run: handleFormatCode, disabled: isLoadingProject || !activeFile.endsWith('.tex') },
    { id: 'tex', label: 'Set up or repair TeX engines', run: () => setLemmataSetupOpen(true) },
    { id: 'find', label: 'Find and replace in active file', shortcut: 'Ctrl/Cmd + F', run: () => setFindOpen(true) },
    { id: 'sidebar', label: 'Toggle sidebar', shortcut: 'Ctrl/Cmd + B', run: () => setSidebarOpen(open => !open) },
    { id: 'assistant', label: 'Open Lemmata Assist', run: () => setAiDrawerOpen(true) },
    { id: 'snapshots', label: 'Open snapshots', run: () => setSnapshotDrawerOpen(true) },
    { id: 'templates', label: 'Open templates', run: () => setTemplatesOpen(true) },
    { id: 'export', label: 'Export project ZIP', run: handleExportZip },
  ];

  return (
    <div className="workspace select-none" inert={gitBusy || undefined}>
      {dialog}
      {navigatorMode && <WorkspaceNavigator key={navigatorMode} mode={navigatorMode} files={files} commands={commands} onJump={jumpToSource} onClose={() => setNavigator(null)} />}
      {/* Top Navbar */}
      <Navbar
        currentProject={currentProject}
        projects={projects}
        onSelectProject={loadProject}
        onDeleteProject={async project => {
          const confirmed = await ask({ title: 'Delete project?', message: `Permanently delete “${project.name}” and all its files and version history? This cannot be undone.`, confirmLabel: 'Delete project' });
          if (!confirmed) return;
          const deletingCurrent = project.id === currentProject?.id;
          if (deletingCurrent) {
            ++saveRevision.current;
            ++compileRevision.current;
          }
          try {
            await saveQueue.current.flush();
            const response = await fetch(`/api/projects/${project.id}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || 'Could not delete project.');
            setProjects(previous => previous.filter(item => item.id !== project.id));
            setWorkspaceError('');
            if (deletingCurrent) {
              setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
              setSnapshotDrawerOpen(false);
              await loadProject('default');
            }
          } catch (error) {
            setWorkspaceError((error as Error).message);
            if (deletingCurrent) setIsCompiling(false);
          }
        }}
        onNewProject={async () => {
          const name = await ask({title: 'New project', message: 'Create a local project with its own files and version history.', input: true, confirmLabel: 'Create project'});
          if (name?.trim()) {
            fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name.trim() }),
            })
              .then(r => r.json())
              .then(d => {
                if (d.ok) {
                  loadProject(d.id);
                  setProjects(prev => [d.metadata, ...prev]);
                } else setWorkspaceError(d.error || 'Could not create the project.');
              }).catch(() => setWorkspaceError('Could not create the project. Please try again.'));
          }
        }}
        engine={engine}
        onChangeEngine={nextEngine => {
          if (isCompiling || isLoadingProject) return;
          engineRef.current = nextEngine;
          setEngine(nextEngine);
          setCurrentProject(project => project ? { ...project, engine: nextEngine } : project);
          setCompileStatus('idle'); setCompileLog('');
          scheduleSave(files, nextEngine);
        }}
        onOpenBuildSettings={() => setBuildSettingsOpen(true)}
        onOpenLemmataSetup={() => setLemmataSetupOpen(true)}
        onOpenCommands={() => setNavigator('commands')}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenJournal={() => setJournalOpen(true)}
        onOpenTableGen={() => setTableGenOpen(true)}
        onOpenVisualEditor={openVisualEditor}
        onOpenSymbols={() => setSymbolsOpen(true)}
        onOpenWordCount={() => setWordCountOpen(true)}
        onExportZip={handleExportZip}
        onOpenSnapshots={() => setSnapshotDrawerOpen(true)}
        aiOpen={aiDrawerOpen}
        onOpenAI={() => setAiDrawerOpen(open => !open)}
        onResetDefault={handleResetToDefault}
      />

      <div className="workspace-toolbar">
        <div className="workspace-toolbar-group">
          <button className="btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Sidebar (Ctrl + B)" aria-label="Toggle sidebar" aria-expanded={sidebarOpen}>
            {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
          <span className="workspace-caption">WORKSPACE</span>
          <span className="text-slate-300 text-xs">{currentProject?.name || 'Loading project…'}</span>{currentProject?.autoCompile && <span className="auto-build-indicator" title="Auto-compile waits for idle edits and pauses during review">Auto{diffState.isOpen || snapshotDrawerOpen || lemmataSetupOpen ? ' · paused' : ''}</span>}
        </div>
        <div className="workspace-view-controls"><button className="btn-secondary workspace-fullscreen" onClick={toggleFullscreen} title="Toggle fullscreen (F11)" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}<span>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>
        <div className="layout-switch" aria-label="Workspace layout">
          {(['editor', 'split', 'pdf'] as const).map(mode => <button key={mode} aria-pressed={layout === mode} onClick={() => setLayout(mode)}>{mode === 'pdf' ? 'PDF only' : mode === 'editor' ? 'Editor only' : 'Split view'}</button>)}
        </div>
      </div>
      </div>
      {lemmataSetupOpen && <LemmataSetup engine={engine} onClose={closeLemmataSetup} onChoose={next => {
        engineRef.current = next; setEngine(next);
        setCurrentProject(project => project ? { ...project, engine: next } : project);
        scheduleSave(files, next);
      }} />}
      {workspaceError && <div className="workspace-error" role="alert">{workspaceError}</div>}
      {buildSettingsOpen && currentProject && <BuildSettings project={currentProject} files={files} onClose={() => setBuildSettingsOpen(false)} onSave={saveBuildSettings}/>}
      {journalOpen && <JournalTemplates files={files} mainFile={currentProject?.mainFile || 'main.tex'} engine={engine} onClose={() => setJournalOpen(false)} onImport={async id => { await loadProject(id); const data = await fetch('/api/projects').then(response=>response.json()); if(data.ok)setProjects(data.projects); }} onJump={jumpToSource}/>}
      {visualTarget && <VisualEditor target={visualTarget} onClose={() => setVisualTarget(null)} onApply={(from,to,code) => {
        const view = editorRef.current?.getEditorView();
        if (!view || currentProject?.id !== visualTarget.project || activeFile !== visualTarget.file || view.state.doc.toString() !== visualTarget.source) throw new Error('The source changed while this editor was open. Reopen it before applying.');
        view.dispatch({ changes: { from, to, insert: code }, selection: { anchor: from + code.length }, annotations: isolateHistory.of('full'), userEvent: 'input.visual' }); setVisualTarget(null);
      }}/>}
      {/* Main Workspace Split: Sidebar + Editor + PDF Preview */}
      <div className="workspace-body">
        {/* Collapsible Sidebar */}
        {sidebarOpen && (
          <aside
            className="workspace-sidebar flex flex-col justify-between select-none"
          >
            <div className="explorer-heading"><FileCode size={15}/><strong>Project explorer</strong><span>{Object.keys(files).length}</span><button className="btn-icon" aria-label="Search project files" title="Search project files" onClick={() => setNavigator('search')}><Search size={15}/></button></div>
            <nav className="explorer-shortcuts" aria-label="Project tools"><button onClick={() => document.getElementById('project-files')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}>Files</button><button onClick={() => document.getElementById('project-outline')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })}>Outline</button><button onClick={() => setSnapshotDrawerOpen(true)}>History</button></nav>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-2">
              <div id="project-files">
              <FileTree
                files={files}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
                onNewFile={() => setNewFileOpen(true)}
                onDeleteFile={handleDeleteFile}
              />
              </div>

              <div className="border-t border-white/5 my-1" />

              <div id="project-outline"><FileOutline
                content={files[activeFile] || ''}
                onJumpToLine={line => editorRef.current?.jumpToLine(line)}
              /></div>
            </div>

            {/* Git Panel in bottom of sidebar */}
            <GitPanel key={currentProject?.id} projectId={currentProject?.id || 'default'} savedVersion={savedVersion} beforeMutation={() => saveQueue.current.flush()} onBusy={value => { gitBusyRef.current=value; setGitBusy(value); }} onReload={async () => { const id=currentProject?.id; if(id && aiSourceIdentity.current.project===id)await loadProject(id); }} />
          </aside>
        )}

        <div ref={workbenchRef} className="workspace-main" data-assistant-docked={aiDrawerOpen && assistantDocked}>
        <div ref={panesRef} className="workspace-panes" data-layout={layout} style={{ '--editor-width': editorWidth + '%' } as React.CSSProperties}>
        {/* Editor Pane (Left Half) */}
        <section
          className="source-pane" aria-label="Source editor"
        >
          {/* Editor Tab Bar */}
          <div className="source-tabbar glass-panel flex items-center justify-between px-3 py-1.5 border-b border-white/5 z-10">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>{activeFile}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button className="btn-icon" aria-label="Word wrap" aria-pressed={wordWrap} title="Toggle word wrap" onClick={() => { const next = !wordWrap; setWordWrap(next); try { localStorage.setItem('lemmata_word_wrap', String(next)); } catch { /* Session preference. */ } }}><WrapText size={15}/></button>
              <button onClick={handleFormatCode} disabled={isLoadingProject || !activeFile.endsWith('.tex')} className="btn-icon" title="Format Code (Ctrl + Shift + F)" aria-label="Format Code"><AlignLeft size={15} /></button>
              <button
                onClick={() => setFindOpen(!findOpen)}
                className={`btn-icon ${findOpen ? 'text-emerald-400 bg-white/10' : ''}`}
                title="Find & Replace (Ctrl + F)"
              >
                <Search size={14} />
              </button>
              <SpellChecker
                isEnabled={spellCheckEnabled && !isLoadingProject}
                onToggle={setSpellCheckEnabled}
                documentText={files[activeFile] || ''}
                documentKey={`${currentProject?.id}/${activeFile}`}
                getEditorView={() => editorRef.current?.getEditorView() || null}
              />
            </div>
          </div>

          {/* Find & Replace Overlay */}
          <FindReplacePanel
            isOpen={findOpen}
            documentText={files[activeFile] || ''}
            documentKey={activeFile}
            onClose={() => setFindOpen(false)}
            getEditorView={() => editorRef.current?.getEditorView() || null}
          />

          {/* CodeMirror 6 Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <CodeEditor
              readOnly={isLoadingProject || diffState.isOpen || gitBusy}
              ref={editorRef}
              key={(currentProject?.id || 'loading') + '/' + activeFile}
              initialValue={files[activeFile] || ''}
              wordWrap={wordWrap}
              projectFiles={files}
              onReady={() => setEditorEpoch(epoch => epoch + 1)}
              onChange={handleEditorChange}
              onCursorChange={(ln, col) => {
                setCursorLine(ln);
                setCursorCol(col);
              }}
              onSelectionChange={setSelectedText}
              onCompileShortcut={handleCompile}
              onFindShortcut={() => setFindOpen(true)}
              onFormatShortcut={handleFormatCode}
            />


          </div>

          {formatMessage && <div className="format-code-status" role="status"><span>{formatMessage}</span><button className="btn-icon" aria-label="Dismiss formatting message" onClick={() => setFormatMessage('')}><X size={12} /></button></div>}
        </section>

        <div className="pane-divider" role="separator" aria-label="Resize editor and PDF" aria-orientation="vertical" aria-valuemin={25} aria-valuemax={75} aria-valuenow={Math.round(editorWidth)} tabIndex={0}
          onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setEditorWidth(w => Math.max(25, Math.min(75, w + (e.key === 'ArrowRight' ? 5 : -5)))); } }}
          onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
          onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const r = panesRef.current?.getBoundingClientRect(); if (r) setEditorWidth(Math.max(25, Math.min(75, (e.clientX-r.left)/r.width*100))); }}
          onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
        />
        {/* PDF Preview Pane (Right Half) */}
        <section className="preview-pane" aria-label="PDF preview" style={{position: 'relative'}}>
          <PDFViewer
            problemControls={problems.length > 0 && <div className="pdf-problem-actions">{(['all', 'error', 'warning'] as const).map(filter => <button key={filter} aria-pressed={problemsOpen && problemFilter === filter} onClick={() => {setProblemFilter(filter);setProblemsOpen(true);}}>{filter === 'all' ? 'All' : filter === 'error' ? 'Errors' : 'Warnings'}</button>)}</div>}
            pdfBlob={pdfBlob}
            isCompiling={isCompiling}
            onSyncTexJump={handleSyncTexFromPDF}
          />
          {problemsOpen && <div className="pdf-problems-popover"><ProblemsPanel filter={problemFilter} items={problems} stale={problemsStale} onJump={jumpToSource} onClose={() => setProblemsOpen(false)} onLog={() => setLogModalOpen(true)} /></div>}
        </section>
      </div>

      {aiDrawerOpen && assistantDocked && <div className="pane-divider assistant-divider" role="separator" aria-label="Resize Lemmata Assist panel" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={assistantMaxWidth} aria-valuenow={effectiveAssistantWidth} tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); resizeAssistant(effectiveAssistantWidth + (e.key === 'ArrowLeft' ? 20 : -20)); }
          if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); resizeAssistant(e.key === 'Home' ? 320 : assistantMaxWidth); }
        }}
        onDoubleClick={() => resizeAssistant(360)}
        onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resizeAssistant(workbenchRef.current!.getBoundingClientRect().right - e.clientX); }}
        onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
      />}
      {aiDrawerOpen && !assistantDocked && <button className="assistant-backdrop" aria-label="Close Lemmata Assist overlay" onClick={closeAssistant} />}
      <aside className="assistant-shell" data-open={aiDrawerOpen} data-docked={assistantDocked} style={{ '--assistant-width': `${effectiveAssistantWidth}px` } as React.CSSProperties} aria-label="Assistant panel">
        <AIAssistantDrawer
          key={currentProject?.id || 'default'}
          isOpen={aiDrawerOpen}
          docked={assistantDocked}
          onClose={closeAssistant}
          selectedText={selectedText}
          activeFile={activeFile}
          getEditTarget={getAIEditTarget}
          onRequestDiff={handleRequestDiff}
          projectFiles={files}
          projectId={currentProject?.id || 'default'}
          cursorLine={cursorLine}
          diagnostics={problems.filter(item => item.severity === 'error').slice(0,12).map(item => `${item.file || 'compiler'}:${item.line || '?'}: ${item.message}`).join('\n')}
          diagnosticsStale={problemsStale}
          verifyCandidate={verifyCandidate}
          applySavedEdit={(file,search,replace) => {
            if (gitBusyRef.current) throw new Error('Wait for the Git operation to finish.');
            const view = editorRef.current?.getEditorView();
            if (file !== activeFile || !view) throw new Error('Open this note’s source file first, then return to apply it.');
            if (diffTarget.current) throw new Error('Accept or reject the pending inline edit first.');
            const source = view.state.doc.toString(), from = source.indexOf(search);
            if (from < 0 || source.indexOf(search, from + 1) >= 0) throw new Error('The saved change no longer matches uniquely. Request a new proposal.');
            view.dispatch({ changes: { from, to: from + search.length, insert: replace }, annotations: isolateHistory.of('full'), userEvent: 'input.review' });
          }}
          onJumpToSource={jumpToSource}
        />
      </aside>
      </div>

      </div>

      
      <RestoreAccent />
      {/* Status Bar */}
      <StatusBar
        compiledEngine={compiledEngine}
        compilerBanner={compilerBanner}
        activeFile={activeFile}
        isModified={isModified}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        engine={engine}
        compileStatus={compileStatus}
        compileDurationMs={compileDurationMs}
        onOpenLog={() => setLogModalOpen(true)}
        problemCount={problems.length}
        onOpenProblems={() => setProblemsOpen(open => !open)}
      />

      {/* Modals & Drawers */}
      <TemplateWizard
        isOpen={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onApplyTemplate={async code => {
          try {
            const response = await fetch('/api/projects', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'New document', initialTex: code, engine }),
            });
            const result = await response.json();
            if (!response.ok || !result.ok) throw new Error(result.error || 'Could not create document.');
            setProjects(prev => [result.metadata, ...prev]);
            await loadProject(result.id);
          } catch (err) { setWorkspaceError((err as Error).message); }
        }}
      />

      <TableGenerator
        isOpen={tableGenOpen}
        onClose={() => setTableGenOpen(false)}
        onInsertTable={handleInsertAtCursor}
      />

      <SymbolPalette
        isOpen={symbolsOpen}
        onClose={() => setSymbolsOpen(false)}
        onInsertSymbol={handleInsertAtCursor}
      />

      <WordCountModal
        isOpen={wordCountOpen}
        onClose={() => setWordCountOpen(false)}
        documentText={files[activeFile] || ''}
      />

      <NewFileModal
        existingFiles={Object.keys(files)}
        isOpen={newFileOpen}
        onClose={() => setNewFileOpen(false)}
        onCreateFile={handleCreateFile}
      />

      <SnapshotDrawer
        key={currentProject?.id || 'default'}
        isOpen={snapshotDrawerOpen}
        onClose={() => setSnapshotDrawerOpen(false)}
        projectId={currentProject?.id || 'default'}
        currentFiles={files}
        activeFile={activeFile}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

      {packageRecovery && packageRecovery.project===(currentProject?.id||'default') && packageRecovery.engine===engine && <MissingPackages files={packageRecovery.files} engine={packageRecovery.engine} onClose={()=>setPackageRecovery(null)} onInstalled={()=>{setPackageRecovery(null);void handleCompile();}}/>}
      {/* Compilation Log Modal */}
      <MobileWelcome />
      {logModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
          <div
            className="glass-card flex flex-col w-full max-w-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(15, 18, 28, 0.98)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              maxHeight: '85vh',
            }}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-rose-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400" />
                <h2 className="text-sm font-bold text-white">Compilation Output Log</h2>
              </div>
              <button onClick={() => setLogModalOpen(false)} className="btn-icon">
                <X size={17} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 select-text">
              <pre className="font-mono text-xs text-rose-300 whitespace-pre-wrap leading-relaxed">
                {compileLog || 'No log details available.'}
              </pre>
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(compileLog);
                }}
                className="btn-secondary text-xs"
              >
                <Copy size={13} />
                <span>Copy Log</span>
              </button>
              <button onClick={() => setLogModalOpen(false)} className="btn-primary text-xs">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
