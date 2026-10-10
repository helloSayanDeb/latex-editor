import path from 'path';

// Packaged applications keep writable documents outside their installation.
export const PROJECTS_DIR = path.join(process.env.TEXSTUDIO_DATA_DIR || process.cwd(), 'projects');
