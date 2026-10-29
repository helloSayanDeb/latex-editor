export interface TextChange {
  from: number; to: number; before: string; after: string;
  currentLine: number; snapshotLine: number; coarse: boolean;
}
const lines = (text: string) => text.match(/[^\n]*\n|[^\n]+$/g) || [];
/** Current -> saved text. Exact line endings are retained; large divergent spans use one bounded change. */
export function snapshotChanges(current: string, saved: string): TextChange[] {
  if (current === saved) return [];
  const a = lines(current), b = lines(saved);
  let prefix = 0, suffix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  while (suffix < a.length-prefix && suffix < b.length-prefix && a[a.length-1-suffix] === b[b.length-1-suffix]) suffix++;
  const aa=a.slice(prefix,a.length-suffix), bb=b.slice(prefix,b.length-suffix);
  const offset=a.slice(0,prefix).join('').length;
  if ((aa.length+1)*(bb.length+1)>2_000_000 || current.length+saved.length>2_000_000) return [{from:offset,to:offset+aa.join('').length,before:aa.join(''),after:bb.join(''),currentLine:prefix+1,snapshotLine:prefix+1,coarse:true}];
  const width=bb.length+1, matrix=new Uint32Array((aa.length+1)*width);
  for(let i=aa.length-1;i>=0;i--)for(let j=bb.length-1;j>=0;j--)matrix[i*width+j]=aa[i]===bb[j]?1+matrix[(i+1)*width+j+1]:Math.max(matrix[(i+1)*width+j],matrix[i*width+j+1]);
  const result:TextChange[]=[];let i=0,j=0,position=offset,change:TextChange|null=null;
  const flush=()=>{if(change)result.push(change);change=null;};
  while(i<aa.length||j<bb.length){
    if(i<aa.length&&j<bb.length&&aa[i]===bb[j]){flush();position+=aa[i++].length;j++;continue;}
    if(!change)change={from:position,to:position,before:'',after:'',currentLine:prefix+i+1,snapshotLine:prefix+j+1,coarse:false};
    if(j<bb.length&&(i===aa.length||matrix[i*width+j+1]>=matrix[(i+1)*width+j]))change.after+=bb[j++];
    else {change.before+=aa[i];position+=aa[i++].length;change.to=position;}
  }
  flush();return result;
}
export function restoreTextChange(current:string, change:TextChange):string {
  if(change.from<0||change.to<change.from||change.to>current.length||current.slice(change.from,change.to)!==change.before)throw new Error('The current source changed. Compare it again before restoring.');
  return current.slice(0,change.from)+change.after+current.slice(change.to);
}
export function changedSnapshotFiles(current:Record<string,string>,saved:Record<string,string>):string[]{
  return [...new Set([...Object.keys(current),...Object.keys(saved)])].filter(file=>current[file]!==saved[file]).sort();
}
