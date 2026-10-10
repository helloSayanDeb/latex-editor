export type LocalProvider = 'lmstudio' | 'ollama';
export function localAIBase(provider: LocalProvider, input?: string): string {
  const url = new URL(input?.trim() || (provider === 'lmstudio' ? 'http://127.0.0.1:1234/v1' : 'http://127.0.0.1:11434'));
  if (!['http:', 'https:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use a local server address such as http://127.0.0.1:1234.');
  }
  // Many local servers bind IPv4 only; localhost can resolve to IPv6 in Node.
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  let pathname = url.pathname.replace(/\/+$/, '');
  if (provider === 'lmstudio' && !pathname) pathname = '/v1';
  if (provider === 'ollama' && pathname === '/api') pathname = '';
  url.pathname = pathname;
  return url.toString().replace(/\/$/, '');
}
export async function localModels(provider: LocalProvider, input?: string): Promise<string[]> {
  const base = localAIBase(provider, input);
  try {
    const response = await fetch(`${base}${provider === 'lmstudio' ? '/models' : '/api/tags'}`, { signal: AbortSignal.timeout(8000), redirect: 'error' });
    if (!response.ok) throw new Error(`Server returned ${response.status}.`);
    const body = await response.json();
    const items = provider === 'lmstudio' ? body.data : body.models;
    if (!Array.isArray(items)) throw new Error('Server returned an invalid model list.');
    return [...new Set<string>(items.map(item => provider === 'lmstudio' ? item.id : item.name || item.model).filter((id): id is string => typeof id === 'string' && !/embed/i.test(id)))];
  } catch (error) {
    throw new Error(`Cannot read ${provider === 'lmstudio' ? 'LM Studio' : 'Ollama'} models at ${base}. Check the server address and that it is running. ${(error as Error).message}`);
  }
}
