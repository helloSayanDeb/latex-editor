import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { PROJECTS_DIR } from './data-path';
import { sanitizeProjectId, sanitizePath } from './security';
import { parseReview, reviewURL, type ReviewReport, type ReviewSource } from './paper-review';
export type SavedReviewNote = { id: string; file: string; line: number; quote: string; message: string; status: 'open' | 'resolved'; createdAt: string; updatedAt: string; origin: 'author' | 'ai'; replies: { id: string; text: string; createdAt: string }[]; edit?: { search: string; replace: string }; decision?: 'accepted' | 'rejected' };
export type SavedPaperReview = { id: string; createdAt: string; report: ReviewReport; sources: ReviewSource[] };
export type ReviewState = { revision: number; notes: SavedReviewNote[]; reports?: SavedPaperReview[] };
function location(project: string) {
  const root = path.join(PROJECTS_DIR, sanitizeProjectId(project));
  if (!fs.existsSync(path.join(root, 'project.json'))) throw new Error('Project not found.');
  return path.join(root, '.lemmata', 'reviews.json');
}
export function readReviews(project: string): ReviewState {
  const file = location(project);
  if (!fs.existsSync(file)) return { revision: 0, notes: [] };
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Number.isSafeInteger(state.revision) || !Array.isArray(state.notes)) throw new Error('Review storage is invalid. Restore its backup before editing.');
  return state;
}
export function mutateReviews(project: string, input: { revision?: unknown; action?: unknown; note?: unknown; id?: unknown; status?: unknown; text?: unknown; decision?: unknown; report?: unknown; sources?: unknown }) {
  const file = location(project), state = readReviews(project);
  if (input.revision !== state.revision) throw new Error('Review changed in another window. Reload notes and retry.');
  const now = new Date().toISOString();
  if (input.action === 'save-report') {
    if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length > 10) throw new Error('Supply the approved review source snapshot.');
    let size = 0;
    const sources = input.sources.map((source: ReviewSource) => {
      if (!source || typeof source.file !== 'string' || sanitizePath(source.file) !== source.file || !source.file.endsWith('.tex') || typeof source.text !== 'string' || (size += source.text.length) > 100000) throw new Error('Invalid review source snapshot.');
      return { file: source.file, text: source.text };
    });
    const report = input.report as ReviewReport;
    if (!report || !Array.isArray(report.findings) || !Array.isArray(report.evidence) || report.evidence.length > 30 || JSON.stringify(report).length > 100000) throw new Error('Invalid saved review report.');
    const evidence = report.evidence.map(item => {
      if (!item || typeof item.url !== 'string' || !reviewURL(item.url) || typeof item.id !== 'string' || !/^S\d{1,3}$/.test(item.id) || typeof item.title !== 'string') throw new Error('Invalid research evidence.');
      return { id: item.id, url: reviewURL(item.url)!, title: item.title.slice(0,500) };
    });
    const clean = parseReview(JSON.stringify({ findings: report.findings.map(finding => ({...finding,source_ids:finding.sourceIds})) }),sources,evidence,String(report.provider||'saved').slice(0,50),report.researchUsed===true);
    state.reports ||= [];
    if (state.reports.length >= 10) throw new Error('Delete an older report before saving another (maximum 10 per project).');
    state.reports.unshift({ id: randomUUID(), createdAt: now, report: clean, sources });
  } else if (input.action === 'delete-report') {
    const index = state.reports?.findIndex(report => report.id === input.id) ?? -1;
    if (index < 0) throw new Error('Saved report not found.');
    state.reports!.splice(index,1);
  } else if (input.action === 'add') {
    const note = input.note as Partial<SavedReviewNote> | null;
    if (!note || typeof note.file !== 'string' || sanitizePath(note.file) !== note.file || !note.file.endsWith('.tex') || !Number.isSafeInteger(note.line) || Number(note.line) < 1 || typeof note.quote !== 'string' || !note.quote.trim() || note.quote.length > 1000 || typeof note.message !== 'string' || !note.message.trim() || note.message.length > 8000) throw new Error('Supply a valid quoted source anchor and review message.');
    if (state.notes.length >= 500) throw new Error('This project has reached its 500-note limit. Delete obsolete notes first.');
    if (note.edit && (typeof note.edit.search !== 'string' || !note.edit.search || note.edit.search.length > 12000 || typeof note.edit.replace !== 'string' || note.edit.replace.length > 12000)) throw new Error('Saved changes need bounded exact search/replacement text.');
    state.notes.push({ id: randomUUID(), file: note.file, line: note.line!, quote: note.quote, message: note.message, status: 'open', createdAt: now, updatedAt: now, origin: note.origin === 'ai' ? 'ai' : 'author', replies: [], ...(note.edit ? { edit: { search: note.edit.search, replace: note.edit.replace } } : {}) });
  } else {
    const index = state.notes.findIndex(note => note.id === input.id);
    if (index < 0) throw new Error('Review note not found.');
    if (input.action === 'delete') state.notes.splice(index, 1);
    else if (input.action === 'decision' && state.notes[index].edit && ['accepted','rejected'].includes(String(input.decision))) { state.notes[index].decision = input.decision as 'accepted'|'rejected'; state.notes[index].status = 'resolved'; state.notes[index].updatedAt = now; }
    else if (input.action === 'status' && ['open','resolved'].includes(String(input.status))) { state.notes[index].status = input.status as 'open' | 'resolved'; state.notes[index].updatedAt = now; }
    else if (input.action === 'reply' && typeof input.text === 'string' && input.text.trim() && input.text.length <= 4000 && state.notes[index].replies.length < 50) { state.notes[index].replies.push({ id: randomUUID(), text: input.text.trim(), createdAt: now }); state.notes[index].updatedAt = now; }
    else throw new Error('Invalid review operation.');
  }
  state.revision++; fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = file + '.next'; fs.writeFileSync(temporary, JSON.stringify(state, null, 2)); fs.renameSync(temporary, file);
  return state;
}
