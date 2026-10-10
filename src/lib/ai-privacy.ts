import type { AIEditTarget } from './ai-conversation';
export type SourceSharing = 'none' | 'selection' | 'document';

export function sharedSource(mode: SourceSharing, selected: string, target: AIEditTarget | null) {
  if (mode === 'document') return target?.document || '';
  if (mode === 'selection') return selected || (target && (target.from > 0 || target.to < target.document.length) ? target.document.slice(target.from, target.to) : '');
  return '';
}

export function conversationScope(provider: string, baseUrl: string) {
  // Changing a destination never transfers prior conversation to that destination.
  return `${provider}:${baseUrl.trim().replace(/\/+$/, '')}`;
}
