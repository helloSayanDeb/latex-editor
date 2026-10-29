import { NextRequest, NextResponse } from 'next/server';
import { readRequestJSON, acquireJob } from '@/lib/request-limits';
import { lookupPackages, installPackages } from '@/lib/package-manager';
import { logAuditEvent } from '@/lib/audit-logger';
export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  // Serialize package changes with compilation as both touch the distribution.
  const release=acquireJob('compile',1);
  if (!release) return NextResponse.json({error:'Another compiler or package operation is running. Try again when it finishes.'},{status:429});
  try {
    const body=await readRequestJSON(request,16*1024);
    if (body.action==='lookup') return NextResponse.json(await lookupPackages(body.engine,body.files,body.refresh===true));
    if (body.action==='install' && body.approved===true) {
      const result=await installPackages(body.token,body.packages);
      logAuditEvent({action:'package_install',project:'system',success:true,details:result});
      return NextResponse.json(result);
    }
    throw new Error('Choose package lookup or explicitly approve installation.');
  } catch(error) { return NextResponse.json({error:(error as Error).message},{status:400}); }
  finally { release(); }
}
