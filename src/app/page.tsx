'use client';

import { isolateHistory } from '@codemirror/commands';
import { minimalAIEdit, validEditTarget, type AIEditTarget } from '@/lib/ai-conversation';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppDialog } from '@/components/AppDialog';
import { SaveQueue } from '@/lib/save-queue';
import {
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
} from 'lucide-react';

import { Navbar } from '@/components/Navbar';
import { MobileWelcome } from '@/components/MobileWelcome';
import { StatusBar } from '@/components/StatusBar';
import { FileTree } from '@/components/sidebar/FileTree';
import { FileOutline } from '@/components/sidebar/FileOutline';
import { GitPanel } from '@/components/sidebar/GitPanel';
import { FindReplacePanel } from '@/components/editor/FindReplacePanel';
import { setAIReview } from '@/lib/editor-ai-review';
import { SpellChecker } from '@/components/editor/SpellChecker';
import { TemplateWizard } from '@/components/modals/TemplateWizard';
import { TableGenerator } from '@/components/modals/TableGenerator';
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
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectMetadata | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('main.tex');
  const [engine, setEngine] = useState<'pdflatex' | 'xelatex' | 'lualatex'>('pdflatex');
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
  const [compileLog, setCompileLog] = useState<string>('');
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
  aiSourceIdentity.current = { project: currentProject?.id || 'default', file: activeFile };
  useEffect(() => {
    editorRef.current?.previewAIEdit(null);
    diffTarget.current = null;
    setDiffState({ isOpen: false, originalText: '', suggestedText: '' });
    lastAIEdit.current = null;
  }, [activeFile, currentProject?.id]);
  const saveQueue = useRef(new SaveQueue());
  const loadRevision = useRef(0);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [savedVersion, setSavedVersion] = useState(0);
  const saveRevision = useRef(0);
  const compileRevision = useRef(0);
  const compiledSource = useRef<{ project: string; main: string; files: Record<string, string> } | null>(null);
  const syncRevision = useRef(0);
  const [sourceJump, setSourceJump] = useState<{ project: string; file: string; line: number; column: number } | null>(null);
  const { ask, dialog } = useAppDialog();
  const [compiledEngine, setCompiledEngine] = useState('');
  const [compilerBanner, setCompilerBanner] = useState('');

  useEffect(() => {
    const container = workbenchRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => setWorkbenchWidth(entry.contentRect.width));
    observer.observe(container);
    try {
      const saved = Number(localStorage.getItem('texstudio_assistant_width'));
      if (saved >= 320 && saved <= 480) setAssistantWidth(saved);
    } catch { /* Layout remains usable without browser storage. */ }
    return () => observer.disconnect();
  }, []);

  const resizeAssistant = (width: number) => {
    const next = Math.round(Math.max(320, Math.min(assistantMaxWidth, width)));
    setAssistantWidth(next);
    try { localStorage.setItem('texstudio_assistant_width', String(next)); } catch { /* Optional preference. */ }
  };

  const closeAssistant = () => {
    setAiDrawerOpen(false);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-controls="tex-sage-panel"]')?.focus());
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
    projId: string
  ) => {
    const revision = ++compileRevision.current;
    setIsCompiling(true);
    setCompileStatus('compiling');
    const start = Date.now();

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: targetFiles,
          mainFile: mainFile || 'main.tex',
          engine: targetEngine,
          synctex: true,
          projectId: projId || 'default',
        }),
      });

      const elapsed = Date.now() - start;
      if (revision !== compileRevision.current) return;
      setCompileDurationMs(elapsed);

      if (res.ok) {
        const blob = await res.blob();
        if (revision !== compileRevision.current) return;
        setPdfBlob(blob);
        compiledSource.current = { project: projId || 'default', main: mainFile, files: { ...targetFiles } };
        setCompiledEngine(res.headers.get('X-Compile-Engine') || targetEngine);
        setCompilerBanner(res.headers.get('X-Compile-Compiler') || '');
        setCompileStatus('success');
        setCompileLog('');

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
      }
    } catch (err) {
      if (revision !== compileRevision.current) return;
      setCompileStatus('error');
      setCompileLog((err as Error).message);
    } finally {
      if (revision === compileRevision.current) setIsCompiling(false);
    }
  };

  // Load project by ID
  const loadProject = async (id: string) => {
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

        // Auto compile initial project
        if (data.project.files[main]?.trim()) compileWithPayload(data.project.files, main, eng, id);
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
      engine,
      currentProject?.id || 'default'
    );
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
          pdfFile: compiled.main.replace(/\.tex$/i, '.pdf'),
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

  // Run after the selected file's editor has mounted; no guessed switching delay.
  useEffect(() => {
    if (!sourceJump || sourceJump.project !== currentProject?.id || sourceJump.file !== activeFile) return;
    const frame = requestAnimationFrame(() => {
      editorRef.current?.jumpToLine(sourceJump.line, sourceJump.column);
      setSourceJump(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [sourceJump, activeFile, currentProject?.id]);

  // Insert code at cursor from AI or Symbol Palette or Table Generator
  const handleInsertAtCursor = (code: string) => {
    editorRef.current?.insertAtCursor(code);
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
      setWorkspaceError('This suggestion belongs to a different or changed source. Ask TeX Sage for an updated edit in the current file.');
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
  const handleRestoreSnapshot = async (restoredFiles: Record<string, string>, newActiveFile: string) => {
    if (!currentProject) throw new Error('No project is loaded.');
    await saveQueue.current.flush();
    ++saveRevision.current;
    await saveQueue.current.enqueue(async () => {
      const response = await fetch(`/api/projects/${currentProject.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: restoredFiles, engine, mainFile: currentProject.mainFile, name: currentProject.name }),
      });
      if (!response.ok) throw new Error('Restore could not be saved. Please try again.');
    });
    setSavedVersion(value => value + 1);
    setFiles(restoredFiles);
    setActiveFile(restoredFiles[newActiveFile] !== undefined ? newActiveFile : currentProject.mainFile);
    setIsModified(false);
    setPdfBlob(null);
    setCompileStatus('idle');
    ++compileRevision.current;
    setIsCompiling(false);
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
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(s => !s);
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  return (
    <div className="workspace select-none">
      {dialog}
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
        onChangeEngine={nextEngine => { setEngine(nextEngine); scheduleSave(files, nextEngine); }}
        onCompile={handleCompile}
        isCompiling={isCompiling}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenTableGen={() => setTableGenOpen(true)}
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
          <span className="text-slate-300 text-xs">{currentProject?.name || 'Loading project…'}</span>
        </div>
        <div className="layout-switch" aria-label="Workspace layout">
          {(['editor', 'split', 'pdf'] as const).map(mode => <button key={mode} aria-pressed={layout === mode} onClick={() => setLayout(mode)}>{mode === 'pdf' ? 'PDF only' : mode === 'editor' ? 'Editor only' : 'Split view'}</button>)}
        </div>
      </div>
      {workspaceError && <div className="workspace-error" role="alert">{workspaceError}</div>}
      {/* Main Workspace Split: Sidebar + Editor + PDF Preview */}
      <div className="workspace-body">
        {/* Collapsible Sidebar */}
        {sidebarOpen && (
          <aside
            className="workspace-sidebar flex flex-col justify-between select-none"
          >
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 py-2">
              <FileTree
                files={files}
                activeFile={activeFile}
                onSelectFile={handleSelectFile}
                onNewFile={() => setNewFileOpen(true)}
                onDeleteFile={handleDeleteFile}
              />

              <div className="border-t border-white/5 my-1" />

              <FileOutline
                content={files[activeFile] || ''}
                onJumpToLine={line => editorRef.current?.jumpToLine(line)}
              />
            </div>

            {/* Git Panel in bottom of sidebar */}
            <GitPanel key={currentProject?.id} projectId={currentProject?.id || 'default'} savedVersion={savedVersion} beforeMutation={() => saveQueue.current.flush()} />
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
              readOnly={isLoadingProject || diffState.isOpen}
              ref={editorRef}
              key={(currentProject?.id || 'loading') + '/' + activeFile}
              initialValue={files[activeFile] || ''}
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
        <section className="preview-pane" aria-label="PDF preview">
          <PDFViewer
            pdfBlob={pdfBlob}
            isCompiling={isCompiling}
            onSyncTexJump={handleSyncTexFromPDF}
          />
        </section>
      </div>

      {aiDrawerOpen && assistantDocked && <div className="pane-divider assistant-divider" role="separator" aria-label="Resize TeX Sage panel" aria-orientation="vertical" aria-valuemin={320} aria-valuemax={assistantMaxWidth} aria-valuenow={effectiveAssistantWidth} tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); resizeAssistant(effectiveAssistantWidth + (e.key === 'ArrowLeft' ? 20 : -20)); }
          if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); resizeAssistant(e.key === 'Home' ? 320 : assistantMaxWidth); }
        }}
        onDoubleClick={() => resizeAssistant(360)}
        onPointerDown={e => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) resizeAssistant(workbenchRef.current!.getBoundingClientRect().right - e.clientX); }}
        onPointerUp={e => e.currentTarget.releasePointerCapture(e.pointerId)}
      />}
      {aiDrawerOpen && !assistantDocked && <button className="assistant-backdrop" aria-label="Close TeX Sage overlay" onClick={closeAssistant} />}
      <aside className="assistant-shell" data-open={aiDrawerOpen} data-docked={assistantDocked} style={{ '--assistant-width': `${effectiveAssistantWidth}px` } as React.CSSProperties} aria-label="Assistant panel">
        <AIAssistantDrawer
          key={currentProject?.id || 'default'}
          isOpen={aiDrawerOpen}
          docked={assistantDocked}
          onClose={closeAssistant}
          selectedText={selectedText}
          activeFile={activeFile}
          onInsertCode={handleInsertAtCursor}
          getEditTarget={getAIEditTarget}
          onRequestDiff={handleRequestDiff}
        />
      </aside>
      </div>

      </div>

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
        isOpen={snapshotDrawerOpen}
        onClose={() => setSnapshotDrawerOpen(false)}
        projectId={currentProject?.id || 'default'}
        currentFiles={files}
        activeFile={activeFile}
        onRestoreSnapshot={handleRestoreSnapshot}
      />

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
