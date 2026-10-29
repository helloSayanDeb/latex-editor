import path from 'path';

// Lemmata can keep private documents in a configured data directory.
export const PROJECTS_DIR = path.join(process.env.LEMMATA_DATA_DIR || process.cwd(), 'projects');
