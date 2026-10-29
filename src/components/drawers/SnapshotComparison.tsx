'use client';
import { useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Checkbox } from '../Checkbox';
import { Dropdown } from '../Dropdown';
import { changedSnapshotFiles, snapshotChanges, restoreTextChange } from '@/lib/snapshot-diff';
import type { SnapshotItem } from '@/lib/project-store';
export function SnapshotComparison({ snapshot, current, activeFile, onBack, onRestore }: { snapshot:SnapshotItem; current:Record<string,string>; activeFile:string; onBack:()=>void; onRestore:(files:Record<string,string>,active:string,expected:Record<string,string>)=>Promise<void> }) {
  const changed=useMemo(()=>changedSnapshotFiles(current,snapshot.files),[current,snapshot]);
  const [file,setFile]=useState(changed.includes(activeFile)?activeFile:changed[0]||activeFile),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const target=changed.includes(file)?file:changed[0]||file;
  const before=current[target]||'',saved=snapshot.files[target]||'';
  const binary=before.startsWith('data:')||saved.startsWith('data:');
  const changes=useMemo(()=>binary?[]:snapshotChanges(before,saved),[before,saved,binary]);
  const apply=async(files:Record<string,string>)=>{setBusy(true);setError('');try{await onRestore(files,activeFile,current);}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}};
  const restoreFiles=()=>{const files={...current};for(const name of selected.filter(item=>changed.includes(item))){if(snapshot.files[name]===undefined)delete files[name];else files[name]=snapshot.files[name];}void apply(files);};
  return <div className="snapshot-comparison"><header><button className="btn-secondary" onClick={onBack} disabled={busy}><ArrowLeft size={14}/>All snapshots</button><h3>{snapshot.name}</h3><p>Compare with your current project. A safety snapshot is saved before any restore.</p></header>
    {error&&<p role="alert" className="workspace-error">{error}</p>}
    {!changed.length?<p role="status">This snapshot matches the current files.</p>:<>
      <fieldset disabled={busy}><legend>Choose files to restore</legend>{changed.map(name=><Checkbox key={name} checked={selected.includes(name)} onChange={checked=>setSelected(items=>checked?[...items,name]:items.filter(item=>item!==name))}><span>{name} <small>{current[name]===undefined?'deleted since snapshot':snapshot.files[name]===undefined?'added since snapshot':'modified'}</small></span></Checkbox>)}</fieldset>
      <button className="btn-secondary" disabled={busy||!selected.some(name=>changed.includes(name))} onClick={restoreFiles}><RotateCcw size={13}/>Restore selected files</button>
      <Dropdown label="Compare file" value={target} disabled={busy} options={changed.map(name=>({value:name,label:name}))} onChange={setFile}/>
      {binary?<p>Binary file changed. Select this file above to restore its saved bytes.</p>:changes.map((change,index)=><article className="snapshot-change" key={`${target}-${index}`}><div><span>Current line {change.currentLine} / Snapshot line {change.snapshotLine}</span><button className="btn-secondary" disabled={busy} onClick={()=>{const text=restoreTextChange(before,change);void apply({...current,[target]:text});}}>Restore this change</button></div>
        {change.coarse&&<p>Large difference grouped to keep comparison responsive.</p>}
        <div className="snapshot-change-columns"><section><h4>Current</h4><pre>{change.before.length>12000?change.before.slice(0,12000)+'\n… Preview truncated; restore uses the full change.':change.before||'(no text)'}</pre></section><section><h4>Snapshot</h4><pre>{change.after.length>12000?change.after.slice(0,12000)+'\n… Preview truncated; restore uses the full change.':change.after||'(no text)'}</pre></section></div>
      </article>)}
    </>}
  </div>;
}
