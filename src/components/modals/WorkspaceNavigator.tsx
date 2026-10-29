'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Command, FileCode, X } from 'lucide-react';
import { Checkbox } from '../Checkbox';
import { searchProject } from '@/lib/project-search';
export type WorkspaceCommand = { id: string; label: string; shortcut?: string; run: () => void; disabled?: boolean };
export function WorkspaceNavigator({ mode, files, commands, onJump, onClose }: {
  mode: 'commands' | 'files' | 'search'; files: Record<string, string>; commands: WorkspaceCommand[];
  onJump: (file: string, line: number, column?: number) => void; onClose: () => void;
}) {
  const [view, setView] = useState(mode), [query, setQuery] = useState(''), [active, setActive] = useState(0), [matchCase, setMatchCase] = useState(false);
  const input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; input.current?.focus(); return () => { if (previous?.isConnected) previous.focus(); }; }, []);
  const search = useMemo(() => searchProject(files, query, { matchCase }), [files, query, matchCase]);
  const results = useMemo(() => view === 'commands'
    ? commands.filter(command => command.label.toLowerCase().includes(query.toLowerCase())).map(command => ({ key: command.id, label: command.label, detail: command.shortcut || '', disabled: command.disabled, run: command.run }))
    : view === 'files'
      ? Object.keys(files).filter(file => !files[file].startsWith('data:') && file.toLowerCase().includes(query.toLowerCase())).sort().slice(0, 150).map(file => ({ key: file, label: file, detail: 'Open file', disabled: false, run: () => onJump(file, 1) }))
      : search.hits.map(hit => ({ key: `${hit.file}:${hit.line}:${hit.column}`, label: hit.text, detail: `${hit.file}:${hit.line}:${hit.column}`, disabled: false, run: () => onJump(hit.file, hit.line, hit.column) })), [view, commands, query, files, search, onJump]);
  const selected = Math.min(active, Math.max(0, results.length - 1));
  useEffect(() => { list.current?.querySelector<HTMLElement>(`[data-result-index="${selected}"]`)?.scrollIntoView({ block: 'nearest' }); }, [selected]);
  const choose = (index: number) => { const result = results[index]; if (result && !result.disabled) { onClose(); result.run(); } };
  return <div className="navigator-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section role="dialog" aria-modal="true" aria-label="Workspace navigator" className="workspace-navigator" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive((selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length)); }
    if (event.key === 'Enter' && event.target === input.current) { event.preventDefault(); choose(selected); }
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input')].filter(element => element.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
    }
  }}>
    <header><nav aria-label="Navigator mode">{(['commands', 'files', 'search'] as const).map(value => <button key={value} aria-pressed={view === value} onClick={() => { setView(value); setQuery(''); setActive(0); input.current?.focus(); }}>{value === 'commands' ? <Command size={15} /> : value === 'files' ? <FileCode size={15} /> : <Search size={15} />}{value === 'commands' ? 'Commands' : value === 'files' ? 'Files' : 'Project search'}</button>)}</nav><button className="btn-icon" aria-label="Close navigator" onClick={onClose}><X size={18} /></button></header>
    <input ref={input} role="combobox" aria-label={view === 'search' ? 'Search project' : view === 'files' ? 'Find file' : 'Find command'} aria-expanded="true" aria-controls="navigator-results" aria-activedescendant={results.length ? `navigator-result-${selected}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} placeholder={view === 'search' ? 'Find literal text across project files…' : view === 'files' ? 'Type a filename…' : 'Type a command…'} />
    {view === 'search' && <div className="navigator-search-options"><Checkbox checked={matchCase} onChange={value => { setMatchCase(value); setActive(0); }}>Match case</Checkbox><small>Text files only · literal search · up to 300 results</small></div>}
    <div id="navigator-results" role="listbox" aria-label="Results" ref={list} className="navigator-results">{results.map((result, index) => <button type="button" role="option" aria-selected={index === selected} id={`navigator-result-${index}`} data-result-index={index} key={result.key} tabIndex={-1} disabled={result.disabled} onMouseMove={() => setActive(index)} onClick={() => choose(index)}><span>{result.label}</span><small>{result.detail}</small></button>)}{!results.length && <p>{view === 'search' && !query.trim() ? 'Enter a search term to find matches across your project.' : 'No matches.'}</p>}</div>
    <footer>{view === 'search' && search.truncated ? 'More matches exist — narrow your query.' : `${results.length} results`}<span>↑ ↓ navigate · Enter open · Esc close</span></footer>
  </section></div>;
}
