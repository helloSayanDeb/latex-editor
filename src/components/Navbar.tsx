'use client';

import { Mascot } from './Mascot';
import React, { useEffect, useState } from 'react';
import {
  Play,
  Sparkles,
  Download,
  FolderOpen,
  Plus,
  Table,
  Sigma,
  BarChart3,
  History,
  RotateCcw,
  Check,
  ChevronDown,
  Layers,
  FileText,
  RefreshCw,
  Cpu,
  Trash2,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Logo } from './Logo';
import { useOutsideDismiss } from './Dropdown';
import type { ProjectMetadata } from '@/lib/project-store';

interface NavbarProps {
  currentProject: ProjectMetadata | null;
  projects: ProjectMetadata[];
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (project: ProjectMetadata) => void;
  engine: 'pdflatex' | 'xelatex' | 'lualatex';
  onChangeEngine: (engine: 'pdflatex' | 'xelatex' | 'lualatex') => void;
  onOpenLemmataSetup: () => void;
  onOpenBuildSettings: () => void;
  onOpenCommands: () => void;
  onCompile: () => void;
  isCompiling: boolean;
  onOpenTemplates: () => void;
  onOpenJournal: () => void;
  onOpenTableGen: () => void;
  onOpenVisualEditor: (kind: 'equation' | 'table' | 'figure') => void;
  onOpenSymbols: () => void;
  onOpenWordCount: () => void;
  onExportZip: () => void;
  onOpenSnapshots: () => void;
  onOpenAI: () => void;
  aiOpen: boolean;
  onResetDefault: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  onDeleteProject,
  engine,
  onChangeEngine,
  onOpenLemmataSetup,
  onOpenBuildSettings,
  onOpenCommands,
  onCompile,
  isCompiling,
  onOpenTemplates,
  onOpenJournal,
  onOpenTableGen,
  onOpenVisualEditor,
  onOpenSymbols,
  onOpenWordCount,
  onExportZip,
  onOpenSnapshots,
  onOpenAI,
  aiOpen,
  onResetDefault,
}) => {
  const [searchHint, setSearchHint] = useState(0);
  useEffect(() => { if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const timer = setInterval(() => setSearchHint(value => (value + 1) % 3), 2800); return () => clearInterval(timer); }, []);
  const [projectDropdown, setProjectDropdown] = useState(false);
  const [engineDropdown, setEngineDropdown] = useState(false);
  const projectMenu = useOutsideDismiss<HTMLDivElement>(projectDropdown, () => setProjectDropdown(false));
  const engineMenu = useOutsideDismiss<HTMLDivElement>(engineDropdown, () => setEngineDropdown(false));
  const toolsMenu = useOutsideDismiss<HTMLDetailsElement>(true, element => element?.removeAttribute('open'));
  const [engineVersions, setEngineVersions] = useState<Record<string,string | null> | null>(null);
  useEffect(() => {
    let active = true;
    fetch('/api/system').then(res => res.json()).then(data => { if (active && data.ok) setEngineVersions(data.engineVersions); }).catch(() => {});
    return () => { active = false; };
  }, [engineDropdown]);

  return (
    <header className="workspace-topbar glass-panel w-full flex items-center justify-between px-3 py-2 z-30 select-none border-b border-white/10">
      {/* Left: Logo & Project selector */}
      <div className="flex items-center gap-3">
        <Logo size="md" />

        <div className="h-5 w-px bg-white/10 mx-1 hidden sm:block" />

        {/* Project Dropdown */}
        <div className="relative" ref={projectMenu}>
          <button
            onClick={() => setProjectDropdown(!projectDropdown)}
            aria-expanded={projectDropdown}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-colors"
          >
            <FolderOpen size={13} className="text-emerald-400" />
            <span className="max-w-[120px] sm:max-w-[160px] truncate">
              {currentProject?.name || 'Default Project'}
            </span>
            <ChevronDown size={12} className="text-slate-400" />
          </button>

          {projectDropdown && (
            <div
              className="project-menu absolute top-full left-0 mt-1 w-56 rounded-xl glass-card p-1 shadow-2xl z-50 flex flex-col gap-0.5 text-xs"
              style={{ background: 'var(--bg-elevated)' }}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Projects
              </div>

              {projects.map(p => (
                <div className="project-menu-row" key={p.id}>
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    setProjectDropdown(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors ${
                    p.id === currentProject?.id
                      ? 'bg-emerald-500/15 text-emerald-300 font-semibold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === currentProject?.id && <Check size={12} />}
                </button>
                <button className="project-delete" disabled={p.id === 'default'}
                  aria-label={`Delete project ${p.name}`}
                  title={p.id === 'default' ? 'The default workspace is kept as your home project' : `Delete project ${p.name}`}
                  onClick={() => { setProjectDropdown(false); onDeleteProject(p); }}>
                  <Trash2 size={14} />
                </button>
                </div>
              ))}

              <div className="border-t border-white/10 my-1" />

              <button
                onClick={() => {
                  setProjectDropdown(false);
                  onNewProject();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-white/5 hover:text-white"
              >
                <Plus size={13} className="text-emerald-400" />
                <span>New Project</span>
              </button>
            </div>
          )}
        </div>
        <button className="btn-icon project-build-control" onClick={onOpenBuildSettings} aria-label="Project & build settings" title="Build recipe, auto-compile and project name"><SlidersHorizontal size={15}/></button>
      </div>

      <button className="topbar-command" onClick={onOpenCommands} aria-label="Search commands and files"><Search size={14}/><span className="search-mode-hint" key={searchHint}>{['Commands', 'Files', 'Project search'][searchHint]}</span><kbd>⌘ / Ctrl ⇧ P</kbd></button>
      {/* Center: Compile button & Engine selector */}
      <div className="compile-engine-group">
        <button
          onClick={onCompile}
          className="btn-primary text-xs px-3.5 py-1.5 shadow-lg"
          aria-label={isCompiling ? 'Cancel compilation' : 'Compile document'}
          title={isCompiling ? 'Cancel compilation' : 'Compile document'}
        >
          {isCompiling ? (
            <>
              <RefreshCw size={13} className="animate-spin text-white" />

            </>
          ) : (
            <>
              <Play size={13} fill="currentColor" />

            </>
          )}
        </button>


        {/* Engine dropdown */}
        <div className="relative hidden sm:block" ref={engineMenu}>
          <button
            onClick={() => setEngineDropdown(!engineDropdown)}
            aria-expanded={engineDropdown}
            aria-label={`Compiler: ${engine}`}
            title={engineVersions?.[engine] || 'Select a LaTeX compiler'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 border border-white/10 transition-colors"
          >
            <Cpu size={13} className="text-indigo-400" />
            <span>{engine}</span>
            <ChevronDown size={11} className="text-slate-400" />
          </button>

          {engineDropdown && (
            <div
              className="absolute top-full left-0 mt-1 rounded-xl glass-card p-1 shadow-2xl z-50 flex flex-col gap-0.5 text-xs"
              style={{ background: 'var(--bg-elevated)', width: 230 }}
            >
              {(['pdflatex', 'xelatex', 'lualatex'] as const).map(eng => (
                <button
                  key={eng}
                  disabled={isCompiling || engineVersions?.[eng] === null}
                  title={engineVersions?.[eng] || (engineVersions ? 'Compiler unavailable on this server' : 'Checking installed compilers')}
                  onClick={() => {
                    onChangeEngine(eng);
                    setEngineDropdown(false);
                  }}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-mono transition-colors ${
                    eng === engine
                      ? 'bg-indigo-500/15 text-indigo-300 font-bold'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{eng}</span>
                  <span style={{ fontSize: 10, color: engineVersions?.[eng] ? 'var(--accent-text)' : 'var(--text-muted)' }}>{engineVersions ? (engineVersions[eng] ? 'Installed' : 'Unavailable') : 'Checking…'}</span>
                  {eng === engine && <Check size={12} />}
                </button>
              ))}
              <button className="btn-secondary" onClick={() => { setEngineDropdown(false); onOpenLemmataSetup(); }}>Set up or repair TeX</button>
            </div>
          )}
        </div>

      </div>

      <div className="navbar-actions flex items-center gap-2">
        <button onClick={onOpenTemplates} className="btn-secondary text-xs" title="Document Templates Wizard"><Layers size={14} /><span>Templates</span></button>
        <details className="tools-menu" ref={toolsMenu}>
          <summary>Tools <ChevronDown size={12} /></summary>
          <div className="tools-menu-panel" onClick={e => e.currentTarget.closest('details')?.removeAttribute('open')}>
            <button onClick={onOpenBuildSettings}><SlidersHorizontal size={15}/>Project & build settings</button>
            <button onClick={onOpenCommands}><Search size={15} />Commands & project search</button>
            <button onClick={onOpenJournal}><FileText size={15}/>Journal templates & submission check</button>
            <button onClick={onOpenLemmataSetup}><Cpu size={15} />Lemmata setup & engine checks</button>
            <button onClick={onOpenTableGen}><Table size={15} />Table generator</button>
            <button onClick={() => onOpenVisualEditor('equation')}><Sigma size={15}/>Visual equation & matrix editor</button>
            <button onClick={() => onOpenVisualEditor('table')}><Table size={15}/>Edit table at cursor</button>
            <button onClick={() => onOpenVisualEditor('figure')}><FileText size={15}/>Edit figure at cursor</button>
            <button onClick={onOpenSymbols}><Sigma size={15} />Symbols & circuits</button>
            <button onClick={onOpenWordCount}><BarChart3 size={15} />Word & equation count</button>
            <button onClick={onExportZip}><Download size={15} />Export project ZIP</button>
            <button onClick={onResetDefault}><RotateCcw size={15} />Reset welcome document</button>
          </div>
        </details>
        <button onClick={onOpenSnapshots} className="btn-icon" title="Snapshots & Version Rollback" aria-label="Version history"><History size={16} /></button>

        {/* AI Assistant Button */}
        <button
          onClick={onOpenAI}
          aria-expanded={aiOpen}
          aria-controls="lemmata-assist-panel"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all border assistant-launch-button"
          style={{
            background: aiOpen ? 'var(--accent-dim)' : 'var(--bg-secondary)',
            color: aiOpen ? 'var(--accent-text)' : 'var(--text-main)',
          }}
        >
          <Mascot size={24} />
          <span>Lemmata Assist</span>
        </button>
      </div>
    </header>
  );
};
