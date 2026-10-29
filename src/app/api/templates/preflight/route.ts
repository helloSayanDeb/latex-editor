import { NextRequest, NextResponse } from 'next/server';
import { readRequestJSON, acquireJob } from '@/lib/request-limits';
import { submissionPreflight } from '@/lib/submission-preflight';
export async function POST(request: NextRequest) {
  const release = acquireJob('preflight',1);
  if (!release) return NextResponse.json({error:'Another preflight is running.'},{status:429});
  try { const body = await readRequestJSON(request); return NextResponse.json({ok:true,items:await submissionPreflight(body.files,body.mainFile,body.required || [])}); }
  catch(error) { return NextResponse.json({error:(error as Error).message},{status:400}); }
  finally { release(); }
}
