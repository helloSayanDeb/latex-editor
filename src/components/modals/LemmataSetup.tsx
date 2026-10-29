'use client';
import { useEffect, useRef, useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { AccentPicker } from '../AccentPicker';
import { Dropdown } from '../Dropdown';
type Engine = 'pdflatex' | 'xelatex' | 'lualatex';
type System = { platform: string; engineVersions: Record<Engine, string | null>; enginePaths: Record<Engine, string | null>; engineProblems?: Record<Engine, string | null>; tools?: Record<string, boolean>; settings?: { binDirectory?: string } };
async function loadSystem(signal?: AbortSignal): Promise<System> {
  const response = await fetch('/api/system', { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Could not check TeX. Reload Lemmata and try again.');
  return response.json();
}
export function LemmataSetup({ engine, onChoose, onClose }: { engine: Engine; onChoose: (engine: Engine) => void; onClose: () => void }) {
  const [system, setSystem] = useState<System | null>(null);
  const [selection, setSelected] = useState<Engine | null>(null);
  const selected = selection || engine;
  const [directory, setDirectory] = useState('');
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('Checking installed engines…');
  const [verified, setVerified] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); }, []);
  async function refresh() {
    setBusy(true); setVerified(false); setMessage('Checking installed engines…');
    try {
      const result = await loadSystem(); setSystem(result); setDirectory(result.settings?.binDirectory || ''); setMessage('Detected does not mean verified. Run a compilation check below.');
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    loadSystem(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setSystem(result); setDirectory(result.settings?.binDirectory || ''); setBusy(false);
      setMessage('Detected does not mean verified. Run a compilation check below.');
    }).catch(error => { if (!controller.signal.aborted) { setMessage(error.message); setBusy(false); } });
    return () => controller.abort();
  }, []);
  async function verify(probe: 'minimal' | 'welcome') {
    setBusy(true); setVerified(false); setMessage('Compiling a test document. First-time Lemmata setup can take longer…');
    try {
      const response = await fetch('/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', engine: selected, probe }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.log || result.error || 'Verification failed.');
      setVerified(true); setMessage(`Verified ${selected}: ${result.compiler}`);
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  async function configure() {
    setBusy(true);
    try {
      const response = await fetch('/api/system', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'configure', binDirectory: directory }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      await refresh();
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="lemmata-setup-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="lemmata-setup-title" className="lemmata-setup-panel" onKeyDown={event => {
    if (event.key === 'Escape') onClose();
    if (event.key === 'Tab') {
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <header><div><h2 id="lemmata-setup-title">Welcome to Lemmata</h2><p>Choose and verify your project’s TeX engine.</p></div><button ref={closeRef} className="btn-icon" aria-label="Close Lemmata setup" onClick={onClose}><X size={20} /></button></header>
    <AccentPicker />
    <Dropdown label="Project engine" value={selected} disabled={busy} onChange={value => { setSelected(value as Engine); setVerified(false); }} options={(['pdflatex', 'xelatex', 'lualatex'] as Engine[]).map(value => ({ value, label: value, detail: system ? (system.engineVersions[value] || 'Not detected — set up TeX below') : 'Checking…' }))} />
    <p className="lemmata-setup-path">{system?.enginePaths[selected] || 'No executable found for this engine.'}</p>
    {system?.engineProblems?.[selected] && <pre className="lemmata-setup-path">{system.engineProblems[selected]}</pre>}
    {system?.tools && <p className="lemmata-setup-path">Navigation: SyncTeX {system.tools.synctex ? 'detected' : 'missing — install the SyncTeX tool for source/PDF jumps'}. Bibliography: BibTeX {system.tools.bibtex ? 'detected' : 'missing'}, Biber {system.tools.biber ? 'detected' : 'missing'}.</p>}
    <div className="lemmata-setup-actions"><button className="btn-secondary" disabled={busy} onClick={refresh}><RefreshCw size={14} />Check again</button><button className="btn-primary" disabled={busy || !system?.engineVersions[selected]} onClick={() => verify('minimal')}>Verify engine</button><button className="btn-secondary" disabled={busy || !system?.engineVersions[selected]} onClick={() => verify('welcome')}>Check welcome packages</button></div>
    <details><summary>Install or repair a TeX distribution</summary><p>The app does not bundle TeX. Pick one distribution; engines come with it.</p>
      <div className="lemmata-setup-actions">{system?.platform === 'darwin' ? <><a href="https://www.tug.org/mactex/" target="_blank" rel="noopener noreferrer">MacTeX · full setup</a><a href="https://www.tug.org/mactex/morepackages.html" target="_blank" rel="noopener noreferrer">BasicTeX · smaller setup</a></> : <><a href="https://miktex.org/download" target="_blank" rel="noopener noreferrer">MiKTeX</a><a href="https://www.tug.org/texlive/" target="_blank" rel="noopener noreferrer">TeX Live</a></>}</div>
      <p>Finish installation, then Check again. MiKTeX users: use MiKTeX Console to finish updates and configure missing-package installation. BasicTeX users may need additional packages through TeX Live Utility or tlmgr. Package downloads need internet and can require system approval.</p>
      <label>Custom TeX bin directory<input value={directory} onChange={event => setDirectory(event.target.value)} placeholder={system?.platform === 'darwin' ? '/Library/TeX/texbin' : 'Absolute directory containing the TeX executables'} disabled={busy} /></label><button className="btn-secondary" disabled={busy} onClick={configure}>Save directory and check</button>
    </details>
    <div className="lemmata-setup-result" role="status">{verified ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<pre>{message}</pre></div>
    <footer><button className="btn-secondary" onClick={onClose}>Continue editing only</button><button className="btn-primary" disabled={busy || !verified} onClick={() => { onChoose(selected); onClose(); }}>Use {selected}</button></footer>
  </section></div>;
}
