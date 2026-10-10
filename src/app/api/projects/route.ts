import { NextRequest, NextResponse } from 'next/server';
import { listProjects, saveProject, ensureDefaultProject, WELCOME_LATEX_CONTENT, WELCOME_BIB_CONTENT } from '@/lib/project-store';
import { sanitizeProjectId } from '@/lib/security';
import { logAuditEvent } from '@/lib/audit-logger';

export async function GET() {
  try {
    ensureDefaultProject();
    const projects = listProjects();
    return NextResponse.json({ ok: true, projects });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim().slice(0,100) || 'Untitled Project' : 'Untitled Project';
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0,60) || 'project';
    const id = sanitizeProjectId(slug) + '-' + crypto.randomUUID();
    const engine = ['pdflatex', 'xelatex', 'lualatex'].includes(body.engine) ? body.engine : 'pdflatex';

    const files: Record<string, string> = body.files || {
      'main.tex': body.initialTex || WELCOME_LATEX_CONTENT,
      'references.bib': WELCOME_BIB_CONTENT,
    };

    const metadata = saveProject(id, {
      name,
      engine,
      mainFile: body.mainFile || 'main.tex',
      files,
    });

    logAuditEvent({
      action: 'create_project',
      project: id,
      success: true,
      details: { name, engine },
    });

    return NextResponse.json({ ok: true, metadata, id });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
