'use client';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, X, FileText } from 'lucide-react';
import type { CompileDiagnostic } from '@/lib/compile-diagnostics';
export function ProblemsPanel({ items, stale, onJump, onClose, onLog, filter: selectedFilter }: { filter?: 'all' | 'error' | 'warning'; items: CompileDiagnostic[]; stale: boolean; onJump: (file: string, line: number, column?: number) => void; onClose: () => void; onLog: () => void }) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all');
  const activeFilter = selectedFilter || filter;
  const visible = activeFilter === 'all' ? items : items.filter(item => item.severity === activeFilter);
  return <section className="problems-panel" aria-label="Problems">
    <header><strong>Problems <span>{items.length}</span></strong><div className="problems-filters" role="group" aria-label="Problem filters">{(['all', 'error', 'warning'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : value === 'error' ? 'Errors' : 'Warnings'}</button>)}</div><button onClick={onLog} className="btn-secondary">Compile details</button><button onClick={onClose} className="btn-icon" aria-label="Close Problems"><X size={16} /></button></header>
    {stale && <p className="problems-note">Source changed since compilation. Compiler locations may have moved; recompile for current results.</p>}
    <div className="problems-list">{!visible.length ? <p>No {filter === 'all' ? 'problems to display. Compile your document to check it.' : `${filter}s to display.`}</p> : visible.map((item, index) => {
      const located = Boolean(item.file && item.line);
      return <button key={`${item.file}/${item.line}/${index}`} className={`problem-row problem-${item.severity}`} onClick={() => located && onJump(item.file!, item.line!, item.column)} disabled={!located} title={located ? 'Jump to source' : 'No project source location recorded'}>
        {item.severity === 'error' ? <AlertCircle size={15} /> : item.severity === 'warning' ? <AlertTriangle size={15} /> : <FileText size={15} />}<span>{item.message}</span><small>{item.file}{item.line ? `:${item.line}` : ''}</small>
      </button>;
    })}</div>
  </section>;
}
