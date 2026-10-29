'use client';
import { readPreference } from '@/lib/preferences';
import React, { useEffect, useRef, useState } from 'react';
import { SpellCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { setSpelling, type SpellingIssue } from '@/lib/editor-spelling';

interface SpellCheckerProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
  documentText: string;
  documentKey: string;
  getEditorView: () => EditorView | null;
}
export function SpellChecker({ isEnabled, onToggle, documentText, documentKey, getEditorView }: SpellCheckerProps) {
  const [issues, setIssues] = useState<SpellingIssue[]>([]);
  const [index, setIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [ignored, setIgnored] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const getter = useRef(getEditorView);
  useEffect(() => { getter.current = getEditorView; });
  useEffect(() => {
    try { setIgnored(JSON.parse(readPreference('lemmata-spelling-ignored') || '[]')); } catch { /* Empty dictionary if storage is unavailable. */ }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const view = getter.current();
    view?.dispatch({ effects: setSpelling.of([]) });
    setIssues([]); setIndex(0); setError(''); setChecking(isEnabled);
    if (isEnabled) timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/spelling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ document: documentText, ignored }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (controller.signal.aborted) return;
        const current = getter.current();
        if (current?.state.doc.toString() !== documentText) return;
        setIssues(data.issues); setError(data.truncated ? 'Showing the first 500 issues.' : '');
        current.dispatch({ effects: setSpelling.of(data.issues) });
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      } finally { if (!controller.signal.aborted) setChecking(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isEnabled, documentText, documentKey, ignored]);
  const issue = issues[index];
  useEffect(() => {
    const controller = new AbortController();
    setSuggestions([]);
    if (isEnabled && open && issue) {
      void fetch('/api/spelling', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ word: issue.word }), signal: controller.signal })
        .then(response => response.json()).then(data => { if (!controller.signal.aborted) setSuggestions(data.suggestions || []); })
        .catch(() => {});
    }
    return () => controller.abort();
  }, [issue, isEnabled, open]);
  const jump = (next: number) => {
    setIndex(next);
    const target = issues[next];
    const view = getter.current();
    if (target && view?.state.doc.toString() === documentText) {
      view.dispatch({ selection: { anchor: target.from, head: target.to }, scrollIntoView: true });
      view.focus();
    }
  };
  const replace = (word: string) => {
    const view = getter.current();
    if (issue && view?.state.doc.toString() === documentText) {
      view.dispatch({ changes: { from: issue.from, to: issue.to, insert: word } });
      view.focus();
    }
  };
  const ignore = () => {
    if (!issue) return;
    const next = [...ignored, issue.word.toLowerCase()]; setIgnored(next);
    try { localStorage.setItem('lemmata-spelling-ignored', JSON.stringify(next)); } catch { /* Session-only when storage is unavailable. */ }
  };
  return <div className="spelling-control">
    <button className="btn-icon" aria-label={`Spell Checker: ${isEnabled ? 'ON' : 'OFF'}`} title="English spell checking" aria-expanded={open && isEnabled} onClick={() => { if (!isEnabled) { onToggle(true); setOpen(true); } else setOpen(value => !value); }}><SpellCheck size={16} /></button>
    {isEnabled && open && <div className="spelling-panel">
      <div className="spelling-heading"><strong>English spelling</strong><button className="btn-icon" aria-label="Close spelling panel" onClick={() => setOpen(false)}><X size={14} /></button></div>
      <p role="status">{checking ? 'Checking prose…' : `${issues.length} spelling ${issues.length === 1 ? 'issue' : 'issues'}`}</p>
      {error && <p role="alert">{error}</p>}
      {issue && <><div className="spelling-heading"><button className="btn-icon" aria-label="Previous spelling issue" onClick={() => jump((index + issues.length - 1) % issues.length)}><ChevronLeft size={14} /></button><button className="spelling-word" onClick={() => jump(index)}>{issue.word} ({index + 1}/{issues.length})</button><button className="btn-icon" aria-label="Next spelling issue" onClick={() => jump((index + 1) % issues.length)}><ChevronRight size={14} /></button></div>
      <div className="spelling-suggestions">{suggestions.map(word => <button key={word} className="btn-secondary" onClick={() => replace(word)} aria-label={`Replace with ${word}`}>{word}</button>)}</div>
      <button className="btn-secondary" onClick={ignore}>Ignore word</button></>}
      <button className="btn-secondary" onClick={() => { onToggle(false); setOpen(false); }}>Turn off spell checking</button>
    </div>}
  </div>;
}
