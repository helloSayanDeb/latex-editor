'use client';

import React, { useEffect } from 'react';
import { Check, X, Sparkles } from 'lucide-react';

interface InlineAIDiffProps {
  isOpen: boolean;
  originalText: string;
  suggestedText: string;
  targetLabel?: string;
  onAccept: () => void;
  onReject: () => void;
}

export const InlineAIDiff: React.FC<InlineAIDiffProps> = ({
  isOpen,
  originalText,
  suggestedText,
  targetLabel,
  onAccept,
  onReject,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onReject(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [isOpen, onReject]);
  if (!isOpen) return null;

  const originalLines = originalText.split('\n');
  const suggestedLines = suggestedText.split('\n');

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-3 p-4 rounded-2xl shadow-2xl transition-all"
      style={{
        width: '92%',
        maxWidth: 720,
        background: 'rgba(14, 17, 26, 0.96)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(16, 185, 129, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            TeX Sage suggestion
          </span>
          <span className="text-[11px] text-slate-400">
            {targetLabel || 'Review changes before applying to document'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onReject}
            className="btn-secondary text-xs px-3 py-1 text-slate-300 hover:text-rose-400"
          >
            <X size={14} />
            <span>Reject (Esc)</span>
          </button>
          <button
            onClick={onAccept}
            className="btn-primary text-xs px-3.5 py-1"
          >
            <Check size={14} />
            <span>Accept Changes</span>
          </button>
        </div>
      </div>

      {/* Side-by-side or stacked diff view */}
      <div
        className="grid grid-cols-2 gap-2 overflow-y-auto font-mono text-xs rounded-xl p-2.5"
        style={{
          maxHeight: 220,
          background: '#090b10',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Original (Deletions) */}
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest pb-1 border-b border-rose-500/20 flex items-center justify-between">
            <span>Original Code</span>
            <span className="text-rose-400/60">- {originalLines.length} lines</span>
          </div>
          <div className="pt-1.5 flex flex-col gap-0.5">
            {originalLines.map((line, idx) => (
              <div
                key={`orig-${idx}`}
                className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-200 line-through whitespace-pre-wrap break-all"
              >
                {line || ' '}
              </div>
            ))}
          </div>
        </div>

        {/* Suggested (Additions) */}
        <div className="flex flex-col gap-0.5">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest pb-1 border-b border-emerald-500/20 flex items-center justify-between">
            <span>Suggested Code</span>
            <span className="text-emerald-400/60">+ {suggestedLines.length} lines</span>
          </div>
          <div className="pt-1.5 flex flex-col gap-0.5">
            {suggestedLines.map((line, idx) => (
              <div
                key={`sugg-${idx}`}
                className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-200 whitespace-pre-wrap break-all"
              >
                {line || ' '}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
