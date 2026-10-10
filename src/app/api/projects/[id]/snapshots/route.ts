import { NextRequest, NextResponse } from 'next/server';
import { listSnapshots, createSnapshot, deleteSnapshot } from '@/lib/project-store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = listSnapshots(id);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const snapshot = createSnapshot(id, {
      name: body.name,
      type: body.type === 'manual' ? 'manual' : 'auto',
      files: body.files || {},
      activeFile: body.activeFile || 'main.tex',
    });
    return NextResponse.json({ ok: true, snapshot });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const snapshotId = searchParams.get('snapshotId');
    if (!snapshotId) {
      return NextResponse.json({ ok: false, error: 'snapshotId parameter required' }, { status: 400 });
    }
    const success = deleteSnapshot(id, snapshotId);
    return NextResponse.json({ ok: success });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
