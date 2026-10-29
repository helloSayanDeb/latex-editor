'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, X, FileText, Sigma, Image as ImageIcon, Table } from 'lucide-react';

interface WordCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
}

interface Stats {
  words: number;
  characters: number;
  mathFormulas: number;
  figures: number;
  tables: number;
}

export const WordCountModal: React.FC<WordCountModalProps> = ({
  isOpen,
  onClose,
  documentText,
}) => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    fetch('/api/wordcount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: documentText }),
    })
      .then(res => res.json())
      .then(data => {
        if (active) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen, documentText]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div
        className="glass-card flex flex-col w-full max-w-md overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <BarChart3 size={16} />
            </div>
            <h2 className="text-sm font-bold text-white">Academic Document Statistics</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={17} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Analyzing LaTeX document tokens...
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <FileText size={18} className="text-emerald-400" />
                <div>
                  <div className="text-lg font-bold text-white font-mono">{stats.words}</div>
                  <div className="text-[11px] text-slate-400">Total Words</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <Sigma size={18} className="text-purple-400" />
                <div>
                  <div className="text-lg font-bold text-white font-mono">{stats.mathFormulas}</div>
                  <div className="text-[11px] text-slate-400">Math Equations</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <ImageIcon size={18} className="text-sky-400" />
                <div>
                  <div className="text-lg font-bold text-white font-mono">{stats.figures}</div>
                  <div className="text-[11px] text-slate-400">Figures</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                <Table size={18} className="text-amber-400" />
                <div>
                  <div className="text-lg font-bold text-white font-mono">{stats.tables}</div>
                  <div className="text-[11px] text-slate-400">Tables</div>
                </div>
              </div>

              <div className="col-span-2 p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                <span className="text-slate-400">Characters (no spaces)</span>
                <span className="font-mono font-bold text-white">{stats.characters}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-5 py-3 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="btn-primary text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
