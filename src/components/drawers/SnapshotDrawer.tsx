'use client';

import { SnapshotComparison } from './SnapshotComparison';
import React, { useState, useEffect } from 'react';
import { History, X, Plus, RotateCcw, Trash2, ShieldCheck, Clock, HardDrive } from 'lucide-react';
import type { SnapshotItem } from '@/lib/project-store';
import { useAppDialog } from '../AppDialog';

interface SnapshotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentFiles: Record<string, string>;
  activeFile: string;
  onRestoreSnapshot: (files: Record<string, string>, activeFile: string, expectedFiles?: Record<string,string>) => Promise<void>;
}

export const SnapshotDrawer: React.FC<SnapshotDrawerProps> = ({
  isOpen,
  onClose,
  projectId,
  currentFiles,
  activeFile,
  onRestoreSnapshot,
}) => {
  const [comparing,setComparing] = useState<SnapshotItem|null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const { ask, dialog } = useAppDialog();
  const [autoCount, setAutoCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [filter, setFilter] = useState<'all' | 'manual' | 'auto'>('all');
  const [newSnapName, setNewSnapName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  const fetchSnapshots = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`);
      const data = await res.json();
      if (data.ok) {
        setSnapshots(data.items || []);
        setAutoCount(data.autoCount || 0);
        setManualCount(data.manualCount || 0);
        setTotalSize(data.totalSizeBytes || 0);
      }
    } catch (err) {
      console.warn('[SnapshotDrawer] Fetch error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setComparing(null);
      fetchSnapshots();
    }
  }, [isOpen, projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreateManual = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSnapName.trim() || 'Manual Snapshot',
          type: 'manual',
          files: currentFiles,
          activeFile,
        }),
      });
      if (res.ok) {
        setNewSnapName('');
        setIsCreating(false);
        fetchSnapshots();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (snapId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/snapshots?snapshotId=${snapId}`, {
        method: 'DELETE',
      });
      fetchSnapshots();
    } catch {}
  };

  const handleRestore = async (snap: SnapshotItem) => {
    if (await ask({title: 'Restore snapshot?', message: `Restore "${snap.name}"? Current edits will be replaced by these saved files.`, confirmLabel: 'Restore snapshot'})) {
      setLoading(true);
      setRestoreError('');
      try {
        await onRestoreSnapshot(snap.files, snap.activeFile, currentFiles);
        onClose();
      } catch (error) { setRestoreError((error as Error).message); }
      finally { setLoading(false); }
    }
  };

  if (!isOpen) return null;

  const filtered = snapshots.filter(s => {
    if (filter === 'manual') return s.type === 'manual';
    if (filter === 'auto') return s.type === 'auto';
    return true;
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="snapshot-backdrop" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div
      tabIndex={-1} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } if (event.key === 'Tab') { const buttons = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]')]; const first = buttons[0], last = buttons[buttons.length-1]; if (event.shiftKey && document.activeElement === first) {event.preventDefault();last?.focus();} else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first?.focus();} } }}
      role="dialog" aria-label="Project snapshots" aria-modal="true"
      className="snapshot-dialog fixed z-50 flex flex-col shadow-2xl"
      style={{
        width: comparing ? 960 : 720,
        left: '50%', top: '50%', transform: 'translate(-50%, -50%)', height: 'min(760px, 85dvh)', borderRadius: 18, boxShadow: '0 0 0 100vmax #0009',
        maxWidth: '100vw',
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(30px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      {dialog}
      {restoreError && <p role="alert" className="workspace-error">{restoreError}</p>}
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-500 flex items-center justify-center shadow-lg">
            <History size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Project Snapshots</h2>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <HardDrive size={11} />
              <span>
                {autoCount}/50 auto + {manualCount} manual ({formatSize(totalSize)})
              </span>
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-icon" aria-label="Close snapshots" autoFocus>
          <X size={18} />
        </button>
      </div>

      {comparing ? <SnapshotComparison snapshot={comparing} current={currentFiles} activeFile={activeFile} onBack={() => setComparing(null)} onRestore={async (files,active,expected) => { await onRestoreSnapshot(files,active,expected); await fetchSnapshots(); }}/> : <>
      {/* Action / Create Bar */}
      <div className="p-3 border-b border-white/5 flex flex-col gap-2">
        {!isCreating ? (
          <button
            onClick={() => setIsCreating(true)}
            className="btn-primary justify-center text-xs py-2"
          >
            <Plus size={14} />
            <span>Create Manual Snapshot</span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10">
            <input
              type="text"
              placeholder="Snapshot description (e.g. Before rewriting section 3)"
              value={newSnapName}
              onChange={e => setNewSnapName(e.target.value)}
              className="input-dark text-xs"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsCreating(false)}
                className="btn-secondary text-xs px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateManual}
                disabled={loading}
                className="btn-primary text-xs px-3 py-1"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        )}

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-xs pt-1">
          {(['all', 'manual', 'auto'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1 rounded-md capitalize transition-colors text-center ${
                filter === tab
                  ? 'bg-white/10 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Snapshot List */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500">
            No snapshots recorded yet.
          </div>
        ) : (
          filtered.map(snap => (
            <div
              key={snap.id}
              className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2 hover:border-white/15 transition-all text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <span>{snap.name}</span>
                    {snap.type === 'manual' ? (
                      <span className="badge-amber text-[9px] uppercase">
                        Manual
                      </span>
                    ) : (
                      <span className="badge-indigo text-[9px] uppercase">
                        Auto
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                    <Clock size={11} />
                    <span>{new Date(snap.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button className="btn-secondary text-[11px]" onClick={() => setComparing(snap)} aria-label={`Compare ${snap.name}`}>Compare</button>
                  <button
                    onClick={() => handleRestore(snap)}
                    className="btn-secondary text-[11px] px-2 py-1 text-emerald-400 hover:text-emerald-300"
                    title="Rollback to this snapshot"
                  >
                    <RotateCcw size={12} />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => handleDelete(snap.id)}
                    className="btn-icon hover:text-rose-400"
                    style={{ width: 26, height: 26 }}
                    title="Delete snapshot"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                <span>{Object.keys(snap.files).length} files</span>
                <span>{formatSize(snap.sizeBytes)}</span>
              </div>
            </div>
          ))
        )}
      </div>
      </>}
    </div></div>
  );
};
