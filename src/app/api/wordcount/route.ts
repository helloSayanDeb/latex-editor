import { readRequestJSON } from '@/lib/request-limits';
import { NextRequest, NextResponse } from 'next/server';
import { countLatex } from '@/lib/latex-text';
export async function POST(req: NextRequest) {
  try {
    const source = req.headers.get('content-type')?.includes('application/json') ? (await readRequestJSON(req)).text : await req.text();
    if (typeof source !== 'string') return NextResponse.json({ error: 'Text must be a string.' }, { status: 400 });
    return NextResponse.json(countLatex(source));
  } catch (err) { return NextResponse.json({ error: (err as Error).message }, { status: 400 }); }
}
