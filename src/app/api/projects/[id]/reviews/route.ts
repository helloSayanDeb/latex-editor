import { NextRequest, NextResponse } from 'next/server';
import { readRequestJSON } from '@/lib/request-limits';
import { readReviews, mutateReviews } from '@/lib/review-store';
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json({ ok: true, ...readReviews((await context.params).id) }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try { const input = await readRequestJSON(request, 900000); return NextResponse.json({ ok: true, ...mutateReviews((await context.params).id, input) }); }
  catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
}
