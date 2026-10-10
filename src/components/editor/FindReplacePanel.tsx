'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Replace, ChevronUp, ChevronDown, X, Check, RefreshCw } from 'lucide-react';
import type { EditorView } from '@codemirror/view';
import { findMatches, type SearchMatch } from '@/lib/search';
import { Checkbox } from '@/components/Checkbox';

interface FindReplacePanelProps {
  isOpen: boolean;
  onClose: () => void;
  getEditorView: () => EditorView | null;
  documentText: string;
  documentKey: string;
}

export const FindReplacePanel: React.FC<FindReplacePanelProps> = ({
  isOpen,
  onClose,
  getEditorView,
  documentText,
  documentKey,
}) => {
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [searchError, setSearchError] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const findInputRef = useRef<HTMLInputElement>(null);

  // Focus find input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => findInputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Recalculate matches when search term or text changes
  useEffect(() => {
    if (!isOpen || !findText) {
      setSearchError('');
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const view = getEditorView();
    if (!view) return;

    const docText = view.state.doc.toString();
    let newMatches: SearchMatch[] = [];

    try {
      newMatches = findMatches(docText, findText, replaceText, { regex: useRegex, caseSensitive, wholeWord });
      setSearchError('');
    } catch (error) {
      setSearchError(`Invalid regular expression: ${(error as Error).message}`);
    }
    setMatches(newMatches);

    // If cursor was near a match, select it
    if (newMatches.length > 0) {
      const curHead = view.state.selection.main.head;
      const foundIdx = newMatches.findIndex(m => m.from >= curHead);
      const nextIdx = foundIdx >= 0 ? foundIdx : 0;
      setCurrentMatchIndex(nextIdx);
      highlightMatch(view, newMatches[nextIdx]);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [findText, caseSensitive, useRegex, wholeWord, isOpen, documentText, documentKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightMatch = (view: EditorView, match: { from: number; to: number }) => {
    if (!match) return;
    view.dispatch({
      selection: { anchor: match.from, head: match.to },
      scrollIntoView: true,
    });
  };

  const handleNext = () => {
    if (matches.length === 0) return;
    const view = getEditorView();
    if (!view) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    highlightMatch(view, matches[nextIdx]);
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const view = getEditorView();
    if (!view) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    highlightMatch(view, matches[prevIdx]);
  };

  const handleReplaceOne = () => {
    if (matches.length === 0 || currentMatchIndex < 0) return;
    const view = getEditorView();
    if (!view) return;

    const match = findMatches(view.state.doc.toString(), findText, replaceText, { regex: useRegex, caseSensitive, wholeWord })[currentMatchIndex];
    if (!match) return;
    view.dispatch({
      changes: { from: match.from, to: match.to, insert: match.replacement },
      selection: { anchor: match.from + match.replacement.length },
    });

    // The document update recalculates ranges before the next replacement.
  };

  const handleReplaceAll = () => {
    if (matches.length === 0) return;
    const view = getEditorView();
    if (!view) return;

    // Apply changes in reverse order so positions don't shift
    const changes = findMatches(view.state.doc.toString(), findText, replaceText, { regex: useRegex, caseSensitive, wholeWord }).map(m => ({
      from: m.from,
      to: m.to,
      insert: m.replacement,
    }));

    view.dispatch({ changes });
    setMatches([]);
    setCurrentMatchIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrev();
      } else {
        handleNext();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="absolute top-2 right-4 z-30 flex flex-col gap-2 p-3 rounded-xl shadow-2xl transition-all select-none"
      style={{
        background: 'rgba(18, 22, 33, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        width: 390,
        maxWidth: 'calc(100% - 24px)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
      }}
      onKeyDown={handleKeyDown}
    >
      {/* Row 1: Find */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 flex items-center">
          <Search size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            ref={findInputRef}
            type="text"
            placeholder="Find in document..."
            value={findText}
            onChange={e => setFindText(e.target.value)}
            className="input-dark w-full pl-8 pr-16 text-xs"
            style={{ height: 32 }}
          />
          <span className="absolute right-2 text-[11px] font-mono text-slate-400">
            {matches.length > 0 ? `${currentMatchIndex + 1}/${matches.length}` : findText ? '0/0' : ''}
          </span>
        </div>

        <button
          onClick={handlePrev}
          disabled={matches.length === 0}
          title="Previous Match (Shift+Enter)"
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <ChevronUp size={16} />
        </button>
        <button
          onClick={handleNext}
          disabled={matches.length === 0}
          title="Next Match (Enter)"
          className="btn-icon"
          style={{ width: 28, height: 28 }}
        >
          <ChevronDown size={16} />
        </button>
        <button
          onClick={onClose}
          title="Close (Esc)"
          className="btn-icon hover:text-rose-400"
          style={{ width: 28, height: 28 }}
        >
          <X size={15} />
        </button>
      </div>

      {/* Row 2: Replace */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1 flex items-center">
          <Replace size={14} className="absolute left-2.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceText}
            onChange={e => setReplaceText(e.target.value)}
            className="input-dark w-full pl-8 text-xs"
            style={{ height: 32 }}
          />
        </div>

        <button
          onClick={handleReplaceOne}
          disabled={matches.length === 0}
          title="Replace Current"
          className="btn-secondary text-xs px-2 py-1"
          style={{ height: 32 }}
        >
          <Check size={13} />
          <span>Replace</span>
        </button>
        <button
          onClick={handleReplaceAll}
          disabled={matches.length === 0}
          title="Replace All"
          className="btn-secondary text-xs px-2 py-1"
          style={{ height: 32 }}
        >
          <RefreshCw size={13} />
          <span>All</span>
        </button>
      </div>

      {searchError && <p role="alert" className="text-xs text-amber-400">{searchError}</p>}
      {/* Row 3: Option toggles */}
      <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[11px] text-slate-400">
        <Checkbox checked={caseSensitive} onChange={setCaseSensitive}>Match Case (Aa)</Checkbox>
        <Checkbox checked={useRegex} onChange={setUseRegex}>Regex (.*)</Checkbox>
        <Checkbox checked={wholeWord} onChange={setWholeWord}>Whole Word (\b)</Checkbox>
      </div>
    </div>
  );
};
