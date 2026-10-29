import { readRequestJSON } from '@/lib/request-limits';
import { PROJECTS_DIR } from '@/lib/data-path';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { querySyncTexEdit } from '@/lib/synctex';
import { sanitizeProjectId, sanitizePath } from '@/lib/security';
import { resolveTool } from '@/lib/lemmata-environment';

export async function POST(req: NextRequest) {
  try {
    const body = await readRequestJSON(req);
    const { action, projectId = 'default', pdfFile = 'main.pdf', page, x, y } = body;

    const cleanId = sanitizeProjectId(projectId);
    if (!resolveTool('synctex')) return NextResponse.json({ ok: false, error: 'The SyncTeX command is missing from your TeX distribution. Install its synctex package/tool, then use Tools → Lemmata setup → Check again. PDF compilation can work without this navigation tool.' }, { status: 503 });
    if (sanitizePath(pdfFile) !== pdfFile || !pdfFile.endsWith('.pdf')) {
      return NextResponse.json({ ok: false, error: 'Invalid SyncTeX filename' }, { status: 400 });
    }
    const cacheDir = path.join(PROJECTS_DIR, cleanId, '.synctex_cache');

    if (!fs.existsSync(cacheDir)) {
      return NextResponse.json(
        { ok: false, error: 'SyncTeX data not ready. Compile the document first.' },
        { status: 404 }
      );
    }

    if (action === 'edit') {
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

    return NextResponse.json({ ok: false, error: 'Invalid action: must be "edit"' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
