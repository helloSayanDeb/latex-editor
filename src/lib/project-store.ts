import fs from 'fs';
import { buildRecipe, type BuildRecipe } from './build-settings';
import path from 'path';
import { sanitizePath, sanitizeProjectId, validateFilename } from './security';
import { logAuditEvent } from './audit-logger';

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  engine: 'pdflatex' | 'xelatex' | 'lualatex';
  mainFile: string;
  buildRecipe?: BuildRecipe;
  autoCompile?: boolean;
}

export interface ProjectData {
  metadata: ProjectMetadata;
  files: Record<string, string>; // relative path -> content (text or data:base64)
}

export interface SnapshotItem {
  id: string;
  name: string;
  type: 'auto' | 'manual';
  timestamp: string;
  files: Record<string, string>;
  activeFile: string;
  sizeBytes: number;
}

import { PROJECTS_DIR } from './data-path';
function defaultEngine(): ProjectMetadata['engine'] {
  try {
    const value = JSON.parse(fs.readFileSync(path.join(PROJECTS_DIR, '..', 'lemmata-settings.json'), 'utf8')).defaultEngine;
    if (['pdflatex', 'xelatex', 'lualatex'].includes(value)) return value;
  } catch { /* No default configured. */ }
  return 'pdflatex';
}
export { defaultEngine };

export function ensureProjectsDir(): void {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }
}

export { WELCOME_LATEX_CONTENT, WELCOME_BIB_CONTENT } from './welcome-document';
import { WELCOME_LATEX_CONTENT, WELCOME_BIB_CONTENT } from './welcome-document';

export function ensureDefaultProject(): void {
  ensureProjectsDir();
  const defaultDir = path.join(PROJECTS_DIR, 'default');
  if (!fs.existsSync(defaultDir)) {
    fs.mkdirSync(defaultDir, { recursive: true });
    const meta: ProjectMetadata = {
      id: 'default',
      name: 'Default Workspace',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engine: defaultEngine(),
      mainFile: 'main.tex',
    };
    fs.writeFileSync(path.join(defaultDir, 'project.json'), JSON.stringify(meta, null, 2), 'utf-8');
    fs.writeFileSync(path.join(defaultDir, 'main.tex'), WELCOME_LATEX_CONTENT, 'utf-8');
    fs.writeFileSync(path.join(defaultDir, 'references.bib'), WELCOME_BIB_CONTENT, 'utf-8');
  }
}

export function listProjects(): ProjectMetadata[] {
  ensureProjectsDir();
  ensureDefaultProject();
  const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const projects: ProjectMetadata[] = [];

  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.')) {
      const pJsonPath = path.join(PROJECTS_DIR, entry.name, 'project.json');
      if (fs.existsSync(pJsonPath)) {
        try {
          const meta = JSON.parse(fs.readFileSync(pJsonPath, 'utf-8')) as ProjectMetadata;
          projects.push(meta);
        } catch {
          // ignore corrupted metadata
        }
      }
    }
  }

  return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getProject(projectId: string): ProjectData | null {
  ensureProjectsDir();
  const cleanId = sanitizeProjectId(projectId);
  const projDir = path.join(PROJECTS_DIR, cleanId);
  if (!fs.existsSync(projDir)) return null;

  const metaPath = path.join(projDir, 'project.json');
  let metadata: ProjectMetadata;
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      metadata = {
        id: cleanId,
        name: cleanId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engine: 'pdflatex',
        mainFile: 'main.tex',
      };
    }
  } else {
    metadata = {
      id: cleanId,
      name: cleanId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engine: 'pdflatex',
      mainFile: 'main.tex',
    };
  }

  const files: Record<string, string> = {};

  function readDirRecursive(dir: string, baseRel: string) {
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      if (item.name.startsWith('.') || item.name === 'node_modules') continue;
      const fullPath = path.join(dir, item.name);
      const relPath = baseRel ? `${baseRel}/${item.name}` : item.name;
      if (item.isDirectory()) {
        readDirRecursive(fullPath, relPath);
      } else if (item.isFile()) {
        if (item.name === 'project.json' && !baseRel) continue;
        const ext = path.extname(item.name).toLowerCase();
        if (!validateFilename(relPath)) continue;
        const isBinary = ['.png', '.jpg', '.jpeg', '.pdf', '.gif', '.ico'].includes(ext);
        if (isBinary) {
          const buf = fs.readFileSync(fullPath);
          const mime = ext === '.pdf' ? 'application/pdf' : `image/${ext.replace('.', '')}`;
          files[relPath] = `data:${mime};base64,${buf.toString('base64')}`;
        } else {
          files[relPath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }
    }
  }

  readDirRecursive(projDir, '');

  if (Object.keys(files).length === 0) {
    files['main.tex'] = WELCOME_LATEX_CONTENT;
  }

  return { metadata, files };
}

export function saveProject(
  projectId: string,
  data: { name?: string; engine?: 'pdflatex' | 'xelatex' | 'lualatex'; mainFile?: string; buildRecipe?: BuildRecipe; autoCompile?: boolean; files: Record<string, string> }
): ProjectMetadata {
  ensureProjectsDir();
  const cleanId = sanitizeProjectId(projectId);
  if (!data.files || typeof data.files !== 'object' || Array.isArray(data.files)) throw new Error('Files must be an object.');
  for (const [name, content] of Object.entries(data.files)) {
    if (!validateFilename(name) || typeof content !== 'string') throw new Error('Invalid project file: ' + name);
  }
  if (data.mainFile && (!validateFilename(data.mainFile) || !data.mainFile.endsWith('.tex'))) throw new Error('Invalid main .tex file.');
  if (data.engine !== undefined && !['pdflatex','xelatex','lualatex'].includes(data.engine)) throw new Error('Unsupported compiler.');
  const recipe = data.buildRecipe === undefined ? undefined : buildRecipe(data.buildRecipe);
  if (data.autoCompile !== undefined && typeof data.autoCompile !== 'boolean') throw new Error('Invalid automatic compilation setting.');
  const projDir = path.join(PROJECTS_DIR, cleanId);
  const previousFiles = fs.existsSync(path.join(projDir, 'project.json')) ? getProject(cleanId)?.files || {} : {};
  fs.mkdirSync(projDir, { recursive: true });

  const metaPath = path.join(projDir, 'project.json');
  let metadata: ProjectMetadata;
  if (fs.existsSync(metaPath)) {
    try {
      metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch {
      metadata = {
        id: cleanId,
        name: data.name || cleanId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        engine: data.engine || 'pdflatex',
        mainFile: data.mainFile || 'main.tex',
      };
    }
  } else {
    metadata = {
      id: cleanId,
      name: data.name || cleanId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      engine: data.engine || 'pdflatex',
      mainFile: data.mainFile || 'main.tex',
    };
  }

  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 100) throw new Error('Use a project name between 1 and 100 characters.');
    metadata.name = data.name.trim();
  }
  if (recipe !== undefined) metadata.buildRecipe = recipe;
  if (data.autoCompile !== undefined) metadata.autoCompile = data.autoCompile;
  if (data.engine) metadata.engine = data.engine;
  if (data.mainFile) metadata.mainFile = data.mainFile;
  metadata.updatedAt = new Date().toISOString();

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

  // Write files
  for (const [relPath, content] of Object.entries(data.files)) {
    try {
      const safeRel = sanitizePath(relPath);
      const targetPath = path.join(projDir, safeRel);
      for (let location = targetPath; location !== projDir; location = path.dirname(location)) {
        if (fs.existsSync(location) && fs.lstatSync(location).isSymbolicLink()) throw new Error('Project symlinks cannot be edited.');
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });

      if (typeof content === 'string' && content.startsWith('data:') && content.includes(';base64,')) {
        const base64Data = content.split(';base64,')[1];
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));
      } else if (typeof content === 'string') {
        fs.writeFileSync(targetPath, content, 'utf-8');
      }
    } catch (err) {
      throw err;
    }
  }

  // PUT is a complete project file set; removed files must remain removed on reload.
  for (const name of Object.keys(previousFiles)) {
    if (!(name in data.files)) {
      const target = path.resolve(projDir, sanitizePath(name));
      if (!target.startsWith(path.resolve(projDir) + path.sep)) throw new Error('Invalid deletion target.');
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
  }

  logAuditEvent({
    action: 'file_change',
    project: cleanId,
    success: true,
  });

  return metadata;
}

export function deleteProject(projectId: string): boolean {
  ensureProjectsDir();
  const cleanId = sanitizeProjectId(projectId);
  if (cleanId === 'default') return false; // don't delete default
  const projDir = path.join(PROJECTS_DIR, cleanId);
  if (fs.existsSync(projDir)) {
    fs.rmSync(projDir, { recursive: true, force: true, maxRetries: 6, retryDelay: 100 });
    logAuditEvent({
      action: 'delete_project',
      project: cleanId,
      success: true,
    });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Snapshot System (Phase 11)
// ---------------------------------------------------------------------------

export function getSnapshotsDir(projectId: string): string {
  const cleanId = sanitizeProjectId(projectId);
  if (!fs.existsSync(path.join(PROJECTS_DIR, cleanId, 'project.json'))) {
    throw new Error('Project not found');
  }
  const snapDir = path.join(PROJECTS_DIR, cleanId, '.snapshots');
  if (!fs.existsSync(snapDir)) {
    fs.mkdirSync(snapDir, { recursive: true });
  }
  return snapDir;
}

export function pruneAutoSnapshots(projectId: string, maxAuto = 50): void {
  try {
    const snapDir = getSnapshotsDir(projectId);
    const files = fs.readdirSync(snapDir)
      .filter(f => f.startsWith('auto_') && f.endsWith('.json'))
      .sort()
      .reverse(); // Newest first

    if (files.length > maxAuto) {
      const toDelete = files.slice(maxAuto);
      for (const f of toDelete) {
        try {
          fs.unlinkSync(path.join(snapDir, f));
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[pruneAutoSnapshots] Error pruning:', err);
  }
}

export function createSnapshot(
  projectId: string,
  snapshot: { name?: string; type: 'auto' | 'manual'; files: Record<string, string>; activeFile: string }
): SnapshotItem {
  const snapDir = getSnapshotsDir(projectId);
  const now = new Date();
  const timestamp = now.toISOString();
  const safeTime = timestamp.replace(/[:.]/g, '-');
  const snapId = `${snapshot.type}_${safeTime}_${crypto.randomUUID()}`;
  const filename = `${snapId}.json`;
  const filePath = path.join(snapDir, filename);

  const snapData: SnapshotItem = {
    id: snapId,
    name: snapshot.name || (snapshot.type === 'auto' ? `Auto-Save ${now.toLocaleTimeString()}` : 'Manual Snapshot'),
    type: snapshot.type,
    timestamp,
    files: snapshot.files,
    activeFile: snapshot.activeFile,
    sizeBytes: 0,
  };

  const jsonStr = JSON.stringify(snapData);
  snapData.sizeBytes = Buffer.byteLength(jsonStr, 'utf-8');
  fs.writeFileSync(filePath, jsonStr, 'utf-8');

  if (snapshot.type === 'auto') {
    pruneAutoSnapshots(projectId, 50);
  }

  logAuditEvent({
    action: 'snapshot',
    project: projectId,
    success: true,
    details: { id: snapId, type: snapshot.type },
  });

  return snapData;
}

export function listSnapshots(projectId: string): { items: SnapshotItem[]; autoCount: number; manualCount: number; totalSizeBytes: number } {
  const snapDir = getSnapshotsDir(projectId);
  const files = fs.readdirSync(snapDir).filter(f => f.endsWith('.json'));
  const items: SnapshotItem[] = [];
  let autoCount = 0;
  let manualCount = 0;
  let totalSizeBytes = 0;

  for (const f of files) {
    try {
      const fullPath = path.join(snapDir, f);
      const stat = fs.statSync(fullPath);
      totalSizeBytes += stat.size;
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SnapshotItem;
      data.sizeBytes = stat.size;
      items.push(data);
      if (data.type === 'auto') autoCount++;
      else manualCount++;
    } catch {
      // ignore corrupt file
    }
  }

  // Sort newest first
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { items, autoCount, manualCount, totalSizeBytes };
}

export function deleteSnapshot(projectId: string, snapshotId: string): boolean {
  const snapDir = getSnapshotsDir(projectId);
  const safeId = snapshotId.replace(/[^a-zA-Z0-9_-]/g, '');
  const filePath = path.join(snapDir, `${safeId}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}
