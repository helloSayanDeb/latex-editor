import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import { sanitizePath, validateFilename } from '@/lib/security';
import { logAuditEvent } from '@/lib/audit-logger';
import { PassThrough } from 'stream';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const files: Record<string, string> = body.files || {};
    const projectName = (body.projectName || 'latex-project').replace(/[^a-zA-Z0-9_-]/g, '_');

    for (const name of Object.keys(files)) { if (!validateFilename(name)) throw new Error('Invalid archive file path.'); sanitizePath(name); }
    const archive = archiver('zip', { zlib: { level: 9 } });
    const passthrough = new PassThrough();

    const chunks: Buffer[] = [];
    passthrough.on('data', chunk => chunks.push(Buffer.from(chunk)));

    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);
      archive.on('error', reject);
    });

    archive.pipe(passthrough);

    for (const [relPath, content] of Object.entries(files)) {
      if (typeof content === 'string' && content.startsWith('data:') && content.includes(';base64,')) {
        const base64Data = content.split(';base64,')[1];
        archive.append(Buffer.from(base64Data, 'base64'), { name: relPath });
      } else if (typeof content === 'string') {
        archive.append(content, { name: relPath });
      }
    }

    await archive.finalize();
    const zipBuffer = await archivePromise;

    logAuditEvent({ action: 'export', project: projectName, success: true });
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${projectName}.zip"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
