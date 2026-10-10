'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  HardDrive,
  FileCode,
  ShieldCheck,
} from 'lucide-react';

interface StatusBarProps {
  activeFile: string;
  isModified: boolean;
  cursorLine: number;
  cursorCol: number;
  engine: string;
  compiledEngine?: string;
  compilerBanner?: string;
  compileStatus: 'idle' | 'compiling' | 'success' | 'error';
  compileDurationMs?: number;
  errorMessage?: string;
  onOpenLog?: () => void;
  snapshotCount?: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  activeFile,
  isModified,
  cursorLine,
  cursorCol,
  engine,
  compiledEngine,
  compilerBanner,
  compileStatus,
  compileDurationMs,
  errorMessage,
  onOpenLog,
  snapshotCount = 0,
}) => {
  return (
    <footer className="glass-panel w-full flex items-center justify-between px-3 py-1 text-[11px] text-slate-400 select-none border-t border-white/5 z-20">
      {/* Left side: File and Cursor */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-slate-300">
          <FileCode size={13} className="text-emerald-400" />
          <span className="font-medium">{activeFile}</span>
          {isModified ? (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
          ) : (
            <span className="text-[10px] text-slate-500">Saved</span>
          )}
        </div>

        <div className="h-3 w-px bg-white/10" />

        <div className="font-mono text-slate-300">
          Ln {cursorLine}, Col {cursorCol}
        </div>

        <div className="h-3 w-px bg-white/10 hidden sm:block" />

        <div className="font-mono text-slate-400 hidden sm:block">
          Engine: <span className="text-slate-200">{engine}</span>
        </div>
      </div>

      {/* Right side: Compilation Status & Security */}
      <div className="flex items-center gap-3">
        {/* Compilation Status Indicator */}
        {compileStatus === 'compiling' ? (
          <div className="flex items-center gap-1 text-emerald-400 font-semibold animate-pulse">
            <RefreshCw size={12} className="animate-spin" />
            <span>Typesetting...</span>
          </div>
        ) : compileStatus === 'success' ? (
          <div className="flex items-center gap-1 text-emerald-400 font-medium">
            <CheckCircle2 size={12} />
            <span title={compilerBanner}>Compiled with {compiledEngine || engine}{compiledEngine && compiledEngine !== engine ? ' · recompile to use selected engine' : ''}</span>
            {compileDurationMs ? (
              <span className="text-[10px] text-emerald-500 font-mono">
                ({(compileDurationMs / 1000).toFixed(2)}s)
              </span>
            ) : null}
          </div>
        ) : compileStatus === 'error' ? (
          <button
            onClick={onOpenLog}
            className="flex items-center gap-1 text-rose-400 font-medium hover:underline cursor-pointer"
            title="Click to inspect compilation log"
          >
            <AlertCircle size={12} />
            <span>Compilation failed (View log)</span>
          </button>
        ) : null}

        <div className="h-3 w-px bg-white/10" />

        <div className="flex items-center gap-1 text-slate-400 hidden md:flex" title="Offline Sandboxed TeX Engine">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Local Offline Sandbox</span>
        </div>
      </div>
    </footer>
  );
};
