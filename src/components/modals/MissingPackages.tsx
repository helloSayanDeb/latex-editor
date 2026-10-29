'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, PackageSearch, X, LoaderCircle } from 'lucide-react';
import { Dropdown } from '../Dropdown';
type Lookup = { token:string; distribution:string; matches:Record<string,string[]>; packages:string[]; note:string; command:string };
export function MissingPackages({ files, engine, onClose, onInstalled }: {files:string[];engine:string;onClose:()=>void;onInstalled:()=>void}) {
  const [lookup,setLookup]=useState<Lookup|null>(null), [selected,setSelected]=useState<Record<string,string>>({});
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  const root=useRef<HTMLDivElement>(null);
  const mounted=useRef(false);
  const installed=useRef(onInstalled);
  useEffect(()=>{installed.current=onInstalled;},[onInstalled]);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null;root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!busy){event.preventDefault();onClose();}if(event.key==='Tab'){const list=Array.from(root.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]')||[]);const first=list[0],last=list.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};
    document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);previous?.focus();};
  },[busy,onClose]);
  async function request(body:Record<string,unknown>) {
    const response=await fetch('/api/packages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Package operation failed.');return result;
  }
  async function find(refresh=false) {
    setBusy(refresh?'Refreshing package database…':'Finding the package that supplies each file…');setError('');setLookup(null);
    try {const result:Lookup=await request({action:'lookup',engine,files,refresh});setLookup(result);setSelected(Object.fromEntries(Object.entries(result.matches).map(([file,packages])=>[file,packages.length===1?packages[0]:''])));}catch(error){setError((error as Error).message);}finally{setBusy('');}
  }
  const packages=[...new Set(Object.values(selected).filter(Boolean))];
  async function install() {
    if(!lookup||!packages.length)return;setBusy('Installing packages and their dependencies. This may take a few minutes…');setError('');
    try {await request({action:'install',token:lookup.token,packages,approved:true});if(mounted.current)installed.current();}catch(error){setError((error as Error).message);setLookup(null);}finally{setBusy('');}
  }
  return <div className="package-recovery-backdrop" onPointerDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <div ref={root} className="package-recovery glass-card" role="dialog" aria-modal="true" aria-labelledby="package-recovery-title" aria-busy={Boolean(busy)}>
      <header><div><PackageSearch size={23}/><h2 id="package-recovery-title">This document needs extra packages</h2></div><button className="btn-icon" aria-label="Close package installer" disabled={Boolean(busy)} onClick={onClose}><X size={18}/></button></header>
      <div className="package-recovery-body">
        <p>The compiler is installed. These LaTeX support files are missing:</p>
        <ul>{files.map(file=><li key={file}><code>{file}</code></li>)}</ul>
        <p>Find their package names using the distribution selected for <strong>{engine}</strong>. Lookup may access its configured repository; installation only starts after you approve it.</p>
        {lookup&&<><p>{lookup.distribution} · {lookup.note}</p>{Object.entries(lookup.matches).map(([file,options])=><div className="package-recovery-file" key={file}>
          {options.length?<Dropdown label={file} value={selected[file]||''} onChange={value=>setSelected(current=>({...current,[file]:value}))} options={options.map(id=>({value:id,label:id}))} placeholder="Choose the package to install" disabled={Boolean(busy)}/>:<p><code>{file}</code> has no catalog match. It may be a custom journal/class file or the package database needs refreshing. Check the original template download.</p>}
        </div>)}{packages.length>0&&<p className="package-recovery-command"><code>{lookup.command} {packages.join(' ')}</code><br/>The package manager may also install dependencies. A successful install will recompile the current source.</p>}
        {lookup.distribution==='MiKTeX'&&<button className="btn-secondary" disabled={Boolean(busy)} onClick={()=>void find(true)}>Refresh MiKTeX database and search again</button>}</>}
        {error&&<pre className="package-recovery-error" role="alert">{error}</pre>}
        {busy&&<p role="status" className="package-recovery-progress"><LoaderCircle size={16} className="animate-spin"/>{busy}</p>}
        <p className="package-recovery-hint">Internet access and writable distribution folders are needed. Administrator-only installations may require the vendor package manager. Fonts and missing project images need separate installation or upload.</p>
      </div>
      <footer><button className="btn-secondary" disabled={Boolean(busy)} onClick={onClose}>Back to editor</button>{lookup?<button className="btn-primary" disabled={Boolean(busy)||!packages.length} onClick={()=>void install()}><Download size={15}/>Install packages &amp; retry</button>:<button className="btn-primary" disabled={Boolean(busy)} onClick={()=>void find()}><PackageSearch size={15}/>Find packages</button>}</footer>
    </div>
  </div>;
}
