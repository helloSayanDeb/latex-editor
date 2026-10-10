export type AIChatTurn = { role: 'user' | 'assistant'; content: string };
export type AIEditTarget = { project: string; file: string; document: string; from: number; to: number };

export function boundedHistory(history: AIChatTurn[] = []): AIChatTurn[] {
  const result: AIChatTurn[] = [];
  let remaining = 100000;
  for (const turn of history.slice(-40).reverse()) {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.content !== 'string') continue;
    if (turn.content.length > remaining) break;
    result.unshift({ role: turn.role, content: turn.content });
    remaining -= turn.content.length;
  }
  while (result[0]?.role === 'assistant') result.shift();
  return result;
}

export function contextualPrompt(prompt: string, context?: { selectedText?: string; fullDocument?: string; activeFile?: string }): string {
  const source = context?.selectedText || context?.fullDocument;
  return source ? `[${context?.selectedText ? 'Selected source' : 'Current document'}: ${context?.activeFile || 'document'}]\n\`\`\`latex\n${source.slice(0, 100000)}\n\`\`\`\n\n${prompt}` : prompt;
}

export function latexBlocks(markdown: string): string[] {
  return Array.from(markdown.matchAll(/```(?:latex|tex)?[^\S\r\n]*\r?\n([\s\S]*?)```/gi), match => match[1].replace(/\r?\n$/, '')).filter(code => code.trim());
}

// A moved cursor is harmless; a changed source or different project/file is not.
export function validEditTarget(target: AIEditTarget, project: string, file: string, document: string): boolean {
  return target.project === project && target.file === file && target.document === document && target.from >= 0 && target.to >= target.from && target.to <= document.length;
}

// Ignore unchanged leading/trailing lines even when the model returns a whole file.
export function minimalAIEdit(target: AIEditTarget, code: string): { target: AIEditTarget; code: string } {
  if ((target.from !== 0 || target.to !== target.document.length) && /\\documentclass(?:\[|\{)/.test(code) && /\\begin\{document\}/.test(code) && /\\end\{document\}/.test(code)) {
    target = { ...target, from: 0, to: target.document.length };
  }
  const original = target.document.slice(target.from, target.to);
  const oldLines = original.match(/[^\n]*\n|[^\n]+$/g) || [];
  const newLines = code.match(/[^\n]*\n|[^\n]+$/g) || [];
  let start = 0, end = 0;
  while (start < oldLines.length && start < newLines.length && oldLines[start] === newLines[start]) start++;
  while (end < oldLines.length - start && end < newLines.length - start && oldLines[oldLines.length - 1 - end] === newLines[newLines.length - 1 - end]) end++;
  const prefix = oldLines.slice(0, start).join('').length;
  const suffix = end ? oldLines.slice(-end).join('').length : 0;
  return { target: { ...target, from: target.from + prefix, to: target.to - suffix }, code: newLines.slice(start, end ? -end : undefined).join('') };
}
