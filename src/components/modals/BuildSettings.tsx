'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, SlidersHorizontal } from 'lucide-react';
import { Dropdown } from '../Dropdown';
import { Checkbox } from '../Checkbox';
import { BUILD_RECIPES, type BuildRecipe } from '@/lib/build-settings';
import type { ProjectMetadata } from '@/lib/project-store';
export type ProjectBuildSettings = { name: string; mainFile: string; buildRecipe: BuildRecipe; autoCompile: boolean };
export function BuildSettings({ project, files, onClose, onSave }: { project: ProjectMetadata; files: Record<string,string>; onClose:()=>void; onSave:(settings:ProjectBuildSettings)=>Promise<void> }) {
  const [name,setName] = useState(project.name), [mainFile,setMain] = useState(project.mainFile);
  const [recipe,setRecipe] = useState<BuildRecipe>(project.buildRecipe || 'standard'), [auto,setAuto] = useState(project.autoCompile === true);
  const [busy,setBusy] = useState(false), [error,setError] = useState('');
  return createPortal(<div className="visual-backdrop" onClick={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
    <section className="build-settings-panel" role="dialog" aria-modal="true" aria-labelledby="build-settings-title" onKeyDown={event=>{
      if(event.key==='Escape'&&!busy){event.stopPropagation();onClose();}
      if(event.key==='Tab'){const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')].filter(item=>item.tabIndex>=0&&item.getClientRects().length);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}}
    }}><header><div><span className="studio-eyebrow">PROJECT / BUILD</span><h2 id="build-settings-title"><SlidersHorizontal size={20}/>Project & build settings</h2></div><button className="btn-icon" aria-label="Close build settings" disabled={busy} onClick={onClose}><X size={18}/></button></header>
    <form onSubmit={async event=>{event.preventDefault();setBusy(true);setError('');try{await onSave({name:name.trim(),mainFile,buildRecipe:recipe,autoCompile:auto});onClose();}catch(problem){setError((problem as Error).message);}finally{setBusy(false);}}}>
      <label>Project name<input autoFocus className="input-dark" value={name} required maxLength={100} disabled={busy} onChange={event=>setName(event.target.value)}/></label>
      <Dropdown label="Main document" disabled={busy} value={mainFile} options={Object.keys(files).filter(file=>file.endsWith('.tex')).map(file=>({value:file,label:file}))} onChange={setMain}/>
      <Dropdown label="Build recipe" disabled={busy} value={recipe} options={BUILD_RECIPES.map(item=>({...item}))} onChange={value=>setRecipe(value as BuildRecipe)}/>
      <p>{BUILD_RECIPES.find(item=>item.value===recipe)?.detail}</p>
      <Checkbox checked={auto} onChange={value=>{if(!busy)setAuto(value);}}>Automatically compile after edits</Checkbox>
      <p>Waits 1.2 seconds after typing. Pauses for setup, pending AI proposals, history review and Git operations. Opening a project does not start a build. Uses the selected engine and recipe; no custom shell commands.</p>
      {error&&<p role="alert" className="workspace-error">{error}</p>}
      <footer><button type="button" className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy||!name.trim()||!files[mainFile]}>Save project settings</button></footer>
    </form></section></div>,document.body);
}
