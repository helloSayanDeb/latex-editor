import { NextRequest, NextResponse } from 'next/server';
import { readRequestJSON, acquireJob } from '@/lib/request-limits';
import { projectGit } from '@/lib/git-service';
import { sanitizeProjectId } from '@/lib/security';
export async function POST(request: NextRequest) {
  let release: (()=>void)|null = null;
  try {
    const body = await readRequestJSON(request,1_100_000), id = sanitizeProjectId(body.projectId || 'default');
    // A background status read can overlap the user's next click. Queue briefly
    // before native work starts; never retry a command after it has executed.
    for (let attempt=0;attempt<50&&!release;attempt++) {
      release=acquireJob('git-'+id,1);
      if(!release)await new Promise(resolve=>setTimeout(resolve,40));
    }
    if(!release)return NextResponse.json({error:'Another Git operation is running for this project. Wait for it to finish and retry.'},{status:409});
    return NextResponse.json(await projectGit(id,body));
  } catch(error) {return NextResponse.json({error:(error as Error).message},{status:400});}
  finally {release?.();}
}
