import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { querySyncTexView, querySyncTexEdit } from '@/lib/synctex';
import { sanitizeProjectId, sanitizePath } from '@/lib/security';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId = 'default', pdfFile = 'main.pdf', sourceFile = 'main.tex', line, page, x, y } = body;

    const cleanId = sanitizeProjectId(projectId);
    if (sanitizePath(pdfFile) !== pdfFile || !pdfFile.endsWith('.pdf') || sanitizePath(sourceFile) !== sourceFile || !sourceFile.endsWith('.tex')) {
      return NextResponse.json({ ok: false, error: 'Invalid SyncTeX filename' }, { status: 400 });
    }
    const cacheDir = path.join(process.cwd(), 'projects', cleanId, '.synctex_cache');

    if (!fs.existsSync(cacheDir)) {
      return NextResponse.json(
        { ok: false, error: 'SyncTeX data not ready. Compile the document first.' },
        { status: 404 }
      );
    }

    if (action === 'view') {
      // Source -> PDF
      if (!Number.isInteger(line) || line < 1) {
        return NextResponse.json({ ok: false, error: 'Line number is required' }, { status: 400 });
      }
      const res = querySyncTexView(cacheDir, pdfFile, sourceFile, line);
      if (!res) {
        return NextResponse.json({ ok: false, error: 'Location not found in SyncTeX map' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, result: res });
    } else if (action === 'edit') {
      // PDF -> Source
      if (!Number.isInteger(page) || page < 1 || !Number.isFinite(x) || !Number.isFinite(y)) {
        return NextResponse.json({ ok: false, error: 'Page, x, and y coordinates are required' }, { status: 400 });
      }
      const res = querySyncTexEdit(cacheDir, pdfFile, page, x, y);
      if (!res) {
        return NextResponse.json({ ok: false, error: 'Source line not found for coordinates' }, { status: 404 });
      }
      return NextResponse.json({ ok: true, result: res });
    }

    return NextResponse.json({ ok: false, error: 'Invalid action: must be "view" or "edit"' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
