import type { AIModel, VisionSupport } from './ai-images';
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
async function modelJSON(url: string, body?: object) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: 'error', ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Server returned ${response.status}.`);
  return response.json();
}

export async function localModelDetails(provider: LocalProvider, input?: string): Promise<AIModel[]> {
  const base = localAIBase(provider, input);
  try {
    if (provider === 'lmstudio') {
      // Native API reports downloaded models, loaded instance IDs and authoritative vision flags.
      const root = new URL(base);
      if (root.pathname === '/v1') {
        for (const endpoint of ['/api/v1/models', '/api/v0/models']) {
          try {
            const data = await modelJSON(root.origin + endpoint);
            const items = endpoint.includes('/v0/') ? data.data : data.models;
            if (!Array.isArray(items) || (items.length && !items.some(item => typeof item.type === 'string'))) continue;
            return items.filter(item => ['llm', 'vlm'].includes(item.type)).flatMap(item => {
              const vision: VisionSupport = typeof item.capabilities?.vision === 'boolean' ? item.capabilities.vision ? 'vision' : 'text' : item.type === 'vlm' ? 'vision' : 'unknown';
              const instances = Array.isArray(item.loaded_instances) ? item.loaded_instances.filter((instance: { id?: unknown }) => typeof instance.id === 'string').map((instance: { id: string }) => instance.id) : [];
              const ids = instances.length ? instances : [item.key || item.id];
              return ids.filter((id: unknown) => typeof id === 'string').map((id: string) => ({ id, label: item.display_name || id, vision, loaded: Boolean(instances.length || item.state === 'loaded') }));
            }).slice(0, 64);
          } catch { /* Older servers expose only the compatibility API. */ }
        }
      }
    }
    const body = await modelJSON(`${base}${provider === 'lmstudio' ? '/models' : '/api/tags'}`);
    const items = provider === 'lmstudio' ? body.data : body.models;
    if (!Array.isArray(items)) throw new Error('Server returned an invalid model list.');
    const ids = [...new Set<string>(items.map(item => provider === 'lmstudio' ? item.id : item.name || item.model).filter((id): id is string => typeof id === 'string' && !/embed/i.test(id)))].slice(0, 64);
    if (provider === 'lmstudio') return ids.map(id => ({ id, label: id, vision: 'unknown' }));
    const result: AIModel[] = [];
    // Bound concurrency while asking Ollama for each downloaded model's actual capabilities.
    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (cursor < ids.length) {
        const index = cursor++;
        const id = ids[index];
        let vision: VisionSupport = 'unknown';
        try {
          const data = await modelJSON(`${base}/api/show`, { model: id });
          if (Array.isArray(data.capabilities)) vision = data.capabilities.includes('vision') ? 'vision' : 'text';
        } catch { /* Keep text chat available when older servers omit metadata. */ }
        result[index] = { id, label: id, vision };
      }
    }));
    return result;
  } catch (error) {
    throw new Error(`Cannot read ${provider === 'lmstudio' ? 'LM Studio' : 'Ollama'} models at ${base}. Check the server address and that it is running. ${(error as Error).message}`);
  }
}

export async function localModels(provider: LocalProvider, input?: string): Promise<string[]> {
  return (await localModelDetails(provider, input)).map(model => model.id);
}
