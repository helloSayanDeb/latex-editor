'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, GitCommit, Check, RefreshCw, Plus, FileText } from 'lucide-react';

interface GitPanelProps {
  projectId: string;
  savedVersion: number;
  beforeMutation: () => Promise<void>;
}

export const GitPanel: React.FC<GitPanelProps> = ({ projectId, savedVersion, beforeMutation }) => {
  const [isRepo, setIsRepo] = useState(false);
  const [branch, setBranch] = useState('main');
  const [changedFiles, setChangedFiles] = useState<{ status: string; name: string }[]>([]);
  const [commitOpen, setCommitOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const statusRevision = useRef(0);

  const fetchStatus = async () => {
    const revision = ++statusRevision.current;
    try {
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', projectId }),
      });
      const data = await res.json();
      if (revision !== statusRevision.current) return;
      if (data.ok) {
        setIsRepo(true);
        setBranch(data.branch);
        setChangedFiles(data.files || []);
      } else {
        setIsRepo(false);
      }
    } catch {
      if (revision === statusRevision.current) setIsRepo(false);
    }
  };

  useEffect(() => {
    setCommitOpen(false);
    setCommitMsg('');
    setStatusMsg('');
    fetchStatus();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchStatus(); }, [savedVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInit = async () => {
    setLoading(true);
    try {
      await beforeMutation();
      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', projectId }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Could not initialize Git.');
    fetchStatus();
    } catch (err) {
      setStatusMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMsg.trim() || loading) return;
    setLoading(true);
    try {
      await beforeMutation();
      const res = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'commit', projectId, message: commitMsg }),
      });
      const data = await res.json();
      if (data.ok) {
        setCommitMsg('');
        setCommitOpen(false);
        setStatusMsg('Committed successfully!');
        setTimeout(() => setStatusMsg(''), 3000);
        fetchStatus();
      } else {
        setStatusMsg(`Failed: ${data.error}`);
      }
    } catch (error) {
      setStatusMsg((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 select-none border-t border-white/5 text-xs">
      <div className="flex items-center justify-between px-1 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
        <div className="flex items-center gap-1.5">
          <GitBranch size={13} className="text-slate-500" />
          <button onClick={() => setExpanded(v => !v)} aria-expanded={expanded} title="Expand or collapse Git panel">Git Versioning {expanded ? '−' : '+'}</button>
        </div>
        {isRepo && (
          <span className="badge-indigo text-[10px] lowercase font-mono">
            {branch}
          </span>
        )}
      </div>

      {expanded && (!isRepo ? (
        <div className="flex flex-col gap-2 p-2 rounded-lg bg-white/5 text-center">
          <span className="text-slate-400 text-[11px]">No Git repo in this project</span>
          <button
            onClick={handleInit}
            disabled={loading}
            className="btn-secondary justify-center text-xs"
          >
            <Plus size={13} />
            <span>Initialize Git</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* Changed files */}
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {changedFiles.length === 0 ? (
              <span className="text-[11px] text-emerald-400/80 px-1">
                ✓ Working tree clean
              </span>
            ) : (
              changedFiles.map((f, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-1.5 py-0.5 rounded bg-white/5 text-[11px]"
                >
                  <span className="truncate text-slate-300">{f.name}</span>
                  <span className="text-amber-400 font-mono font-bold text-[10px] ml-1">
                    {f.status || 'M'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Commit Box */}
          {!commitOpen ? <button className="btn-secondary justify-center" disabled={loading || !changedFiles.length} onClick={() => setCommitOpen(true)}>Prepare commit</button> : <div className="flex flex-col gap-1.5 pt-1">
            <input
              type="text"
              placeholder="Commit message..."
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              className="input-dark text-xs py-1 px-2"
            />
            <button
              onClick={handleCommit}
              disabled={loading || !commitMsg.trim()}
              className="btn-primary justify-center text-xs py-1"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <GitCommit size={13} />}
              <span>Commit Changes</span>
            </button>
            <button className="btn-secondary justify-center" disabled={loading} onClick={() => { setCommitOpen(false); setCommitMsg(''); setStatusMsg('Commit draft cancelled. No files were changed.'); }}>Cancel</button>
          </div>}
        </div>
      ))}
      {statusMsg && <p role="status" className="text-xs text-slate-300">{statusMsg}</p>}
    </div>
  );
};
