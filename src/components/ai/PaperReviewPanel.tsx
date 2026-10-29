'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, BookOpen, RefreshCw } from 'lucide-react';
import { Checkbox } from '../Checkbox';
import { Dropdown } from '../Dropdown';
import { useAppDialog } from '../AppDialog';
import { parseReview, type ReviewProvider, type ReviewReport, type ReviewSource } from '@/lib/paper-review';
import type { AIConfig } from '@/lib/ai-providers';
import { ReviewNotebook } from './ReviewNotebook';
import type { SavedPaperReview } from '@/lib/review-store';
const providers=[{value:'gemini',label:'Google Gemini'},{value:'openai',label:'OpenAI Responses'},{value:'claude',label:'Claude'},{value:'lmstudio',label:'LM Studio'},{value:'ollama',label:'Ollama'}];
export function PaperReviewPanel({ open, onClose, files, activeFile, currentProvider, currentModel, currentBaseUrl, getConfig, onJump, projectId, cursorLine, applySavedEdit }: {
  open: boolean; onClose: () => void; files: Record<string,string>; activeFile: string; currentProvider: AIConfig['provider']; currentModel: string; currentBaseUrl: string;
  getConfig: () => Promise<AIConfig>; onJump: (file:string,line:number) => void;
  projectId: string; cursorLine: number;
  applySavedEdit: (file: string, search: string, replace: string) => void;
}) {
  const [provider,setProvider]=useState<ReviewProvider>(currentProvider),[model,setModel]=useState(currentModel),[baseUrl,setBaseUrl]=useState(currentBaseUrl),[apiKey,setApiKey]=useState('');
  const [selected,setSelected]=useState<string[]>([activeFile]),[consent,setConsent]=useState(false),[web,setWeb]=useState(false);
  const [approvedScope,setApprovedScope]=useState('');
  const [endpoint,setEndpoint]=useState('http://127.0.0.1:8769'),[token,setToken]=useState(''),[urls,setUrls]=useState('');
  const [report,setReport]=useState<ReviewReport|null>(null),[snapshot,setSnapshot]=useState<ReviewSource[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[models,setModels]=useState<{value:string;label:string}[]>([]),[importText,setImportText]=useState('');
  const [modelError,setModelError]=useState('');
  const [tab,setTab]=useState<'review'|'notes'>('review');
  const [savedReports,setSavedReports]=useState<SavedPaperReview[]>([]),[severity,setSeverity]=useState('all'),[category,setCategory]=useState('all');
  const savedURL='/api/projects/'+encodeURIComponent(projectId)+'/reviews';
  useEffect(()=>{if(!open)return;const abort=new AbortController();fetch(savedURL,{signal:abort.signal}).then(async response=>{const value=await response.json();if(!response.ok)throw new Error(value.error);setSavedReports(value.reports||[]);}).catch(problem=>{if(!abort.signal.aborted)setError(problem.message);});return()=>abort.abort();},[open,savedURL]);
  async function storeReport(action:'save-report'|'delete-report',id?:string) {
    setBusy(true);setError('');
    try{const current=await fetch(savedURL).then(response=>response.json());const response=await fetch(savedURL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id,revision:current.revision,...(action==='save-report'?{report,sources:snapshot}:{})})});const value=await response.json();if(!response.ok)throw new Error(value.error);setSavedReports(value.reports||[]);setStatus(action==='save-report'?'Report and approved source snapshot saved locally.':'Saved report deleted.');}
    catch(problem){setError((problem as Error).message);}finally{setBusy(false);}
  }
  const controller=useRef<AbortController|null>(null),epoch=useRef(0),root=useRef<HTMLElement>(null);
  const {ask,dialog}=useAppDialog();
  const local=provider==='lmstudio'||provider==='ollama';
  const scope=selected.filter(file=>files[file]!==undefined&&file.endsWith('.tex')&&!files[file].startsWith('data:')).map(file=>({file,text:files[file]}));
  const count=scope.reduce((total,source)=>total+source.text.length,0);
  const approvalKey=JSON.stringify({provider,baseUrl:local?baseUrl:'',scope});
  const sharingApproved=consent&&approvedScope===approvalKey;
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return ()=>{controller.current?.abort();if(previous?.isConnected)previous.focus();};
  },[open]);
  useEffect(()=>{
    if(!open||!local)return;
    const abort=new AbortController();
    const timer=setTimeout(()=>{fetch(`/api/ai/local?provider=${provider}&baseUrl=${encodeURIComponent(baseUrl)}`,{signal:abort.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error||'Local model discovery failed.');return result;}).then(result=>{if(!abort.signal.aborted){setModels((result.models||[]).map((id:string)=>({value:id,label:id})));setModelError('');}}).catch(problem=>{if(!abort.signal.aborted)setModelError(problem.message);});},300);
    return ()=>{clearTimeout(timer);abort.abort();};
  },[open,local,provider,baseUrl]);
  const cancel=()=>{epoch.current++;controller.current?.abort();setBusy(false);setStatus('Cancelled. No source edits were made.');};
  async function review() {
    const revision=++epoch.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;
    setBusy(true);setError('');setReport(null);setSnapshot([]);setStatus(web?'Reviewing with explicitly enabled research…':'Reviewing approved source without web research…');
    try {
      let key=apiKey;
      if(!local&&!key&&provider===currentProvider)key=(await getConfig()).apiKey||'';
      const response=await fetch('/api/review',{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({config:{provider,model,baseUrl:local?baseUrl:undefined,apiKey:local?undefined:key},sources:scope,consent:sharingApproved,web,urls:local&&web?urls.split(/\r?\n/).map(url=>url.trim()).filter(Boolean):[],crawler:local&&web?{endpoint,token}:undefined})});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Review failed.');
      if(epoch.current!==revision||abort.signal.aborted)return;
      setReport(result);setSnapshot(scope.map(source=>({...source})));setStatus(result.researchUsed?(result.evidence.length?'Review complete. Retrieved sources are listed below; findings still require author verification.':'The research tool ran but returned no usable sources. External claims remain unverified.'):web?'Review complete, but no retrieved research sources were recorded. Treat external claims as unverified.':'Source-only review complete. No web research was requested.');
    }catch(problem){if(epoch.current===revision&&!abort.signal.aborted)setError((problem as Error).message);}finally{if(epoch.current===revision)setBusy(false);}
  }
  async function check() {
    const revision=++epoch.current;const abort=new AbortController();controller.current?.abort();controller.current=abort;setBusy(true);
    setError('');setStatus('Checking local crawler…');
    try {const response=await fetch('/api/review',{method:'POST',signal:abort.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'crawler-check',crawler:{endpoint,token}})});const result=await response.json();if(!response.ok)throw new Error(result.error);if(epoch.current===revision&&!abort.signal.aborted)setStatus(result.ready?'Crawler bridge is ready. Only approved source URLs will be requested.':'Bridge is running, but Crawl4AI is not installed. Follow the setup instructions.');}catch(problem){if(epoch.current===revision&&!abort.signal.aborted)setError((problem as Error).message);}finally{if(epoch.current===revision)setBusy(false);}
  }
  if(!open||typeof document==='undefined')return null;
  return createPortal(<div className="review-backdrop"><section ref={root} className="paper-review-panel" role="dialog" aria-modal="true" aria-labelledby="paper-review-title" onKeyDown={event=>{
      if((event.target as HTMLElement).closest('dialog')){event.stopPropagation();return;}
      if(event.defaultPrevented)return;
      if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(busy)cancel();else onClose();}
    if(event.key==='Tab'){const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]')].filter(item=>item.tabIndex>=0&&item.getClientRects().length);if(event.shiftKey&&document.activeElement===controls[0]){event.preventDefault();controls.at(-1)?.focus();}else if(!event.shiftKey&&document.activeElement===controls.at(-1)){event.preventDefault();controls[0]?.focus();}}
  }}>{dialog}<header><div><h2 id="paper-review-title"><BookOpen size={20}/>Paper review</h2><p>Structured feedback linked to your source. You choose what to share.</p></div><button className="btn-icon" aria-label="Close paper review" onClick={()=>{if(busy)cancel();onClose();}}><X size={20}/></button></header>
      <nav className="review-tabs"><button aria-pressed={tab === 'review'} onClick={() => setTab('review')}>AI paper review</button><button aria-pressed={tab === 'notes'} onClick={() => setTab('notes')}>Persistent notes</button></nav>
      {tab === 'notes' ? <ReviewNotebook project={projectId} files={files} activeFile={activeFile} cursorLine={cursorLine} report={report} onJump={(file,line) => { onJump(file,line); onClose(); }} onApply={applySavedEdit}/> : <div className="review-columns"><div className="review-settings">
      <Dropdown label="Review provider" value={provider} disabled={busy} options={providers} onChange={value=>{setProvider(value as ReviewProvider);setModel(value===currentProvider?currentModel:'');setBaseUrl(value===currentProvider?currentBaseUrl:value==='ollama'?'http://127.0.0.1:11434':'http://127.0.0.1:1234/v1');setApiKey('');setModels([]);setConsent(false);}}/>
      {local?<><label>Local model server<input className="input-dark" value={baseUrl} disabled={busy} onChange={event=>setBaseUrl(event.target.value)}/></label><Dropdown label="Review model" value={model} disabled={busy} options={models} placeholder="Choose a detected model" onChange={setModel}/>{modelError&&<p role="alert">{modelError}</p>}</>:<><label>Model<input className="input-dark" value={model} disabled={busy} onChange={event=>setModel(event.target.value)} placeholder="A model supported by your account and chosen research tool"/></label><label>API key{provider===currentProvider?' (leave blank to use unlocked Lemmata Assist settings)':''}<input className="input-dark" type="password" autoComplete="off" value={apiKey} disabled={busy} onChange={event=>setApiKey(event.target.value)} placeholder="Kept in memory; never included in the review prompt"/></label></>}
      <fieldset disabled={busy}><legend>Source scope · {count.toLocaleString()} / 100,000 characters</legend>{Object.keys(files).filter(file=>file.endsWith('.tex')&&!files[file].startsWith('data:')).map(file=><Checkbox key={file} checked={selected.includes(file)} onChange={checked=>{setSelected(previous=>checked?[...previous,file]:previous.filter(value=>value!==file));setConsent(false);}}>{file}</Checkbox>)}</fieldset>
      <details><summary>Preview exactly what will be shared</summary>{scope.map(source=><div key={source.file}><strong>{source.file}</strong><pre>{source.text}</pre></div>)}</details>
      <Checkbox checked={web} onChange={setWeb}>Enable web research</Checkbox>
      {web&&<p>{local?'Local inference stays on your model server. The separate crawler visits approved public URLs; this requires internet.':'The selected cloud provider can receive source excerpts and search queries. Web research can incur extra provider charges.'}</p>}
      {local&&web&&<div className="review-crawler"><label>Crawl4AI bridge<input className="input-dark" value={endpoint} onChange={event=>setEndpoint(event.target.value)}/></label><label>Crawler access token<input className="input-dark" type="password" value={token} onChange={event=>setToken(event.target.value)} autoComplete="off"/></label><label>Approved public HTTPS source URLs (one per line, up to five)<textarea className="input-dark" rows={3} value={urls} onChange={event=>setUrls(event.target.value)} /></label><button className="btn-secondary" onClick={check} disabled={busy}><RefreshCw size={13}/>Check crawler</button><details><summary>Set up the optional local crawler</summary><p>Install Python and Crawl4AI in a separate environment, run crawl4ai-setup, then start scripts/crawl4ai-bridge.py with LEMMATA_CRAWL_TOKEN set. The bridge binds to 127.0.0.1:8769. See docs/PAPER_REVIEW_GUIDE.md for Windows/macOS and packaged-app paths. It reads approved URLs; it does not discover papers automatically.</p></details></div>}
      <Checkbox checked={sharingApproved} onChange={checked=>{setConsent(checked);setApprovedScope(checked?approvalKey:'');}}>I approve sending the selected source to {local?'my local model server':provider}.</Checkbox>
      <div className="review-actions"><button className="btn-primary" disabled={busy||!sharingApproved||!scope.length||scope.length>10||count>100000||!model.trim()} onClick={review}>Run paper review</button>{busy&&<button className="btn-secondary" onClick={cancel}>Cancel review</button>}</div>
      <details><summary>Import structured findings without making an AI request</summary><textarea aria-label="Review JSON" className="input-dark" rows={4} value={importText} onChange={event=>setImportText(event.target.value)} placeholder='{"findings":[...]}'/><button className="btn-secondary" disabled={busy||!scope.length||!importText} onClick={()=>{try{setReport(parseReview(importText,scope,[],'imported',false));setSnapshot(scope);setError('');setStatus('Imported findings are unverified. No external links are trusted from imported JSON.');}catch(problem){setError((problem as Error).message);}}}>Import findings</button></details>
    </div><div className="review-findings"><div className="review-status" role="status">{status||'No review yet. Select a scope, approve sharing and run a review, or import findings.'}</div>{error&&<p role="alert" className="workspace-error">{error}</p>}
      <details className="saved-paper-reports"><summary>Saved reports · {savedReports.length}</summary>{savedReports.map(saved=><div className="review-import-row" key={saved.id}><span>{new Date(saved.createdAt).toLocaleString()} · {saved.report.provider} · {saved.report.findings.length} findings</span><button className="btn-secondary" disabled={busy} onClick={()=>{setReport(saved.report);setSnapshot(saved.sources);setStatus('Loaded a saved report. Source links are disabled if the draft changed.');}}>Load report</button><button className="btn-icon" disabled={busy} aria-label="Delete saved report" onClick={async()=>{if(await ask({title:'Delete saved report?',message:'The saved report and its source snapshot will be removed.',confirmLabel:'Delete report'}))void storeReport('delete-report',saved.id);}}><X size={14}/></button></div>)}</details>
      {report&&<><div className="review-actions"><button className="btn-secondary" disabled={busy} onClick={()=>storeReport('save-report')}>Save full report locally</button><Dropdown label="Severity" value={severity} options={['all','warning','info'].map(value=>({value,label:value}))} onChange={setSeverity}/><Dropdown label="Finding category" value={category} options={['all',...new Set(report.findings.map(finding=>finding.category))].map(value=>({value,label:value.replaceAll('_',' ')}))} onChange={setCategory}/></div><h3>{report.findings.length} {report.findings.length===1?'finding':'findings'} · {report.provider}</h3>{!report.findings.length&&<p>The model reported no findings. This is not proof that the paper is correct.</p>}{report.findings.filter(finding=>(severity==='all'||finding.severity===severity)&&(category==='all'||finding.category===category)).map((finding,index)=>{const stale=snapshot.find(source=>source.file===finding.file)?.text!==files[finding.file];return <article key={index} className="review-finding"><div><strong>{finding.category.replaceAll('_',' ')}</strong><small>{finding.severity}</small></div><p>{finding.explanation}</p>{finding.quote&&<blockquote>{finding.quote}</blockquote>}<p>{finding.suggestion}</p><small>{finding.sourceIds.length?'Evidence linked: '+finding.sourceIds.join(', '):'Needs author/external verification'}</small><button className="btn-secondary" disabled={!finding.locationValid||stale} onClick={()=>{onJump(finding.file,finding.line);onClose();}}>{stale?'Source changed — rerun review':finding.locationValid?`${finding.file}:${finding.line} · Show source`:'Source location could not be verified'}</button></article>;})}
      {report.evidence.length>0&&<section><h3>Retrieved sources</h3>{report.evidence.map(source=><button className="review-source" key={source.id} onClick={async()=>{if(await ask({title:'Open research source?',message:source.url,confirmLabel:'Open source'}))window.open(source.url,'_blank','noopener,noreferrer');}}><ExternalLink size={14}/>{source.id}: {source.title}</button>)}</section>}</>}
    </div></div>}<footer>Findings are suggestions, not a peer-review verdict. Save findings in Persistent notes to retain them with the project. Provider retention policies apply.</footer>
  </section></div>,document.body);
}
