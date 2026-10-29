import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PROJECTS_DIR } from './data-path';
import { sanitizePath, sanitizeProjectId, validateFilename } from './security';
import { createSnapshot, getProject } from './project-store';
import { resolveTool } from './lemmata-environment';
const execute = promisify(execFile), hidden = ['.lemmata','.snapshots','.synctex_cache'];
const paths = ['--','.',...hidden.map(name=>':(exclude)'+name),':(exclude)project.json'];
export function validateRemote(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length > 2048 || /[\x00-\x20]/.test(raw)) throw new Error('Use HTTPS, SSH or an absolute local bare-repository address without embedded credentials.');
  if (/^(https|ssh):\/\//i.test(raw)) {
    const url = new URL(raw);
    if (!url.hostname || url.password || (url.protocol === 'https:' && url.username) || url.search || url.hash) throw new Error('Remove embedded credentials. Use your OS Git credential manager.');
    return raw;
  }
  if (/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+:[A-Za-z0-9_./~-]+$/.test(raw)) return raw;
  if (path.isAbsolute(raw) && !raw.startsWith('\\\\') && !raw.startsWith('//') && fs.existsSync(path.join(raw,'HEAD')) && fs.existsSync(path.join(raw,'objects'))) return raw;
  throw new Error('Use HTTPS/SSH, or an existing absolute local bare-repository path.');
}
export function redactGitError(value: string): string { return value.replace(/(https?:\/\/)[^\s/@]+(?::[^\s/@]*)?@/g,'$1[credentials-redacted]@').replace(/([?&](?:token|key|password|access_token)=)[^&\s]+/gi,'$1[redacted]').slice(0,4000); }
export async function projectGit(projectId: string, input: Record<string,unknown>) {
  const id = sanitizeProjectId(projectId), root = path.join(PROJECTS_DIR,id), git = resolveTool('git');
  if (!git) throw new Error('Git is not installed or could not be found.');
  if (!fs.existsSync(path.join(root,'project.json'))) throw new Error('Project not found.');
  const gitDir = path.join(root,'.git');
  const run = async (args: string[]) => {
    try { return (await execute(git,['-c','core.hooksPath='+path.join(gitDir,'lemmata-no-hooks'),'-c','protocol.ext.allow=never',...args],{cwd:root,timeout:60000,maxBuffer:2*1024*1024,windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never',GIT_SSH_COMMAND:'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'}})).stdout; }
    catch(problem) { const error=problem as Error&{stderr?:string;stdout?:string}; throw new Error(redactGitError(error.stderr || error.stdout || error.message)); }
  };
  if (input.action === 'init') await run(['init']);
  if (!fs.existsSync(gitDir)) return {ok:false,isRepo:false,message:'Git is not initialized.'};
  if (!fs.lstatSync(gitDir).isDirectory()) throw new Error('Linked Git worktrees need an external Git client.');
  const exclude = path.join(gitDir,'info','exclude'); fs.mkdirSync(path.dirname(exclude),{recursive:true});
  const existing=fs.existsSync(exclude)?fs.readFileSync(exclude,'utf8'):'';
  const additions=[...hidden.map(name=>'/'+name+'/'),'/project.json'].filter(name=>!existing.split(/\r?\n/).includes(name)); if(additions.length)fs.appendFileSync(exclude,'\n'+additions.join('\n')+'\n');
  const branch = (await run(['branch','--show-current'])).trim();
  const conflicts = async () => (await run(['diff','--name-only','--diff-filter=U','-z'])).split('\0').filter(Boolean);
  const merging = () => fs.existsSync(path.join(gitDir,'MERGE_HEAD'));
  const requireBranch = async () => {if(!branch)throw new Error('Switch to a named branch first.');await run(['check-ref-format','--branch',branch]);};
  const remote = async () => {const value=(await run(['remote','get-url','origin'])).trim();validateRemote(value);const push=(await run(['remote','get-url','--push','origin'])).trim();validateRemote(push);if(push!==value)throw new Error('Separate push URLs are not supported. Configure one origin URL.');return value;};
  const requireClean = async () => {if(merging())throw new Error('Finish or abort the current merge first.');if((await run(['status','--porcelain',...paths])).trim())throw new Error('Commit project changes before pulling or merging.');};
  const action = input.action;
  if(action==='init')return {ok:true,message:'Git initialized. Private project metadata is excluded.'};
  if(action==='status') {
    const rows=(await run(['status','--porcelain=v1','-z',...paths])).split('\0'), files:{name:string;status:string}[]=[];
    for(let i=0;i<rows.length;i++){const row=rows[i];if(!row)continue;files.push({status:row.slice(0,2).trim(),name:row.slice(3)});if(/[RC]/.test(row.slice(0,2)))i++;}
    let origin='';try{origin=redactGitError((await run(['remote','get-url','origin'])).trim());}catch{}
    return {ok:true,isRepo:true,branch:branch||'HEAD',files,origin,merging:merging(),conflicts:await conflicts()};
  }
  if(action==='set-remote'){const url=validateRemote(input.url);let exists=false;try{await run(['remote','get-url','origin']);exists=true;}catch{}await run(['remote',exists?'set-url':'add','origin',url]);return {ok:true,message:'Origin saved. Authentication uses your OS Git configuration.'};}
  if(action==='commit'||action==='continue-merge') {
    const message=typeof input.message==='string'?input.message.trim():'';if(!message||message.length>1000)throw new Error('Supply a commit message up to 1,000 characters.');
    if((await conflicts()).length)throw new Error('Resolve all conflicting files first.');
    const privateStaged=(await run(['diff','--cached','--name-only','-z'])).split('\0').some(name=>hidden.some(dir=>name===dir||name.startsWith(dir+'/'))||name==='project.json');if(privateStaged)throw new Error('Private metadata is already staged. Unstage it outside the app first.');
    if(action==='continue-merge'&&!merging())throw new Error('No merge is in progress.');
    if(action==='commit'&&merging())throw new Error('Use Finish merge after resolving conflicts.');
    if(action==='commit') {
      if ((await run(['ls-files','--',...hidden,'project.json'])).trim()) throw new Error('Private metadata is tracked. Remove it from the index outside the app before committing.');
      await run(['add','--all']);
    }
    return {ok:true,message:(await run(['commit','-m',message])).trim(),reload:action==='continue-merge'};
  }
  if(action==='fetch'||action==='pull'||action==='merge'||action==='push') {
    await requireBranch();await remote();
    if(action==='push'){
      if(merging())throw new Error('Finish the merge before pushing.');
      if((await run(['log','--all','--format=','--name-only','--',...hidden])).trim())throw new Error('Private review/snapshot/cache files exist in Git history. Remove them from history outside the app before pushing. Exclusions protect new commits only.');
      await run(['push','--set-upstream','origin','HEAD:refs/heads/'+branch]);return {ok:true,message:'Pushed to origin/'+branch+'.'};
    }
    if(action==='pull'||action==='merge')await requireClean();
    await run(['fetch','--prune','origin']);
    if(action==='fetch')return {ok:true,message:'Fetched origin. Working files were not changed.'};
    await run(['rev-parse','--verify','refs/remotes/origin/'+branch]);
    const project=getProject(id);if(project)createSnapshot(id,{name:'Before Git '+action,type:'auto',files:project.files,activeFile:project.metadata.mainFile});
    const metadata=fs.readFileSync(path.join(root,'project.json'));
    try {
      const result=action==='pull'?await run(['merge','--ff-only','refs/remotes/origin/'+branch]):await run(['merge','--no-commit','--no-ff','refs/remotes/origin/'+branch]);
      return {ok:true,message:result.trim()||(merging()?'Merged. Inspect source and finish the merge.':'Already up to date.'),reload:true,merging:merging(),conflicts:await conflicts()};
    }catch(problem){if((await conflicts()).length)return {ok:true,message:'Merge paused. Resolve conflicts, then finish the merge.',reload:true,merging:true,conflicts:await conflicts()};throw problem;}
    finally{fs.writeFileSync(path.join(root,'project.json'),metadata);}
  }
  if(action==='abort-merge'){if(!merging())throw new Error('No merge is in progress.');await run(['merge','--abort']);return {ok:true,message:'Merge aborted.',reload:true};}
  if(action==='conflict'||action==='resolve') {
    const file=sanitizePath(String(input.file||''));if(!(await conflicts()).includes(file))throw new Error('This file is no longer conflicted.');
    if(!validateFilename(file))throw new Error('Resolve this unsupported file type with an external Git client.');
    const stages = new Set((await run(['ls-files','--unmerged','-z','--',file])).split('\0').filter(Boolean).map(row=>Number(row.split('\t')[0].split(' ')[2])));
    const binary=/\.(png|jpe?g|pdf|eps)$/i.test(file);
    // A failed/oversized read is not a deleted side. Binary side selection must
    // use the index directly and preserve bytes without decoding them as text.
    const stage=async(n:number)=>stages.has(n)?binary?'[Binary file]':await run(['show',':'+n+':'+file]):null;
    if(action==='conflict')return {ok:true,file,base:await stage(1),ours:await stage(2),theirs:await stage(3),binary};
    const target=path.join(root,file);
    for(let location=target;location!==root;location=path.dirname(location)){if(fs.existsSync(location)&&fs.lstatSync(location).isSymbolicLink())throw new Error('Symlink conflicts need an external Git client.');}
    if(input.choice==='ours'||input.choice==='theirs'){const n=input.choice==='ours'?2:3;if(!stages.has(n))fs.rmSync(target,{force:true});else await run(['checkout-index','--force','--stage='+n,'--',file]);}
    else {
      if(typeof input.content!=='string'||input.content.length>1_000_000||/^(?:<{7}|={7}|>{7}|\|{7})(?: |$)/m.test(input.content))throw new Error('Remove conflict markers and keep the resolution below 1 MB.');
      if(/\.(png|jpe?g|pdf|eps)$/i.test(file))throw new Error('Choose a side for a binary file.');
      fs.writeFileSync(target,input.content,'utf8');
    }
    await run(['add','--',file]);return {ok:true,message:'Resolution staged for '+file+'.',reload:true};
  }
  if(action==='log'){const output=await run(['log','-n','15','--pretty=format:%h|%an|%ar|%s']);return {ok:true,commits:output.split('\n').filter(Boolean).map(line=>{const [hash,author,date,...message]=line.split('|');return {hash,author,date,msg:message.join('|')};})};}
  if(action==='diff')return {ok:true,diff:await run(['diff','--no-ext-diff','--no-textconv','--',...(input.file?[sanitizePath(String(input.file))]:['.',...hidden.map(name=>':(exclude)'+name),':(exclude)project.json'])])};
  throw new Error('Unknown Git operation.');
}
