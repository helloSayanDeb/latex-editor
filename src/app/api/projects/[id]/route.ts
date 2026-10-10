import { readRequestJSON } from '@/lib/request-limits';
import { NextRequest, NextResponse } from 'next/server';
import { getProject, saveProject, deleteProject } from '@/lib/project-store';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = getProject(id);
    if (!project) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, project });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await readRequestJSON(req);
    // A delayed autosave must never recreate a project that was deleted.
    if (!getProject(id)) {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }
    const metadata = saveProject(id, {
      name: body.name,
      engine: body.engine,
      mainFile: body.mainFile,
      files: body.files || {},
    });
    return NextResponse.json({ ok: true, metadata });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Cannot delete default project or project not found' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
