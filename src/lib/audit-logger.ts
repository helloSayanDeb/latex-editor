import fs from 'fs';
import path from 'path';

export interface AuditEntry {
  timestamp: string;
  action: 'compile' | 'export' | 'create_project' | 'delete_project' | 'file_change' | 'snapshot';
  project: string;
  engine?: string;
  durationMs?: number;
  success: boolean;
  details?: Record<string, unknown>;
}

import { PROJECTS_DIR } from './data-path';
const AUDIT_DIR = path.join(PROJECTS_DIR, '.audit');
const AUDIT_FILE = path.join(AUDIT_DIR, 'audit.log');

export function logAuditEvent(entry: Omit<AuditEntry, 'timestamp'>): void {
  try {
    if (!fs.existsSync(AUDIT_DIR)) {
      fs.mkdirSync(AUDIT_DIR, { recursive: true });
    }

    const fullEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const line = JSON.stringify(fullEntry) + '\n';
    fs.appendFileSync(AUDIT_FILE, line, 'utf-8');
  } catch (err) {
    console.warn('[AuditLogger] Failed to write audit event:', err);
  }
}
