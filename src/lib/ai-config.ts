import type { AIConfig } from './ai-providers';

/** Cloud credentials never participate in local-provider configuration. */
export async function resolveAIConfig(provider: AIConfig['provider'], settings: {
  apiKey: string; encryptedKey: string; masterPass: string; baseUrl: string; modelName: string;
}, unlock: (cipher: string, password: string) => Promise<string>): Promise<AIConfig> {
  const local = provider === 'lmstudio' || provider === 'ollama';
  return {
    provider,
    apiKey: local ? undefined : settings.apiKey || (settings.encryptedKey ? await unlock(settings.encryptedKey, settings.masterPass) : ''),
    baseUrl: settings.baseUrl,
    model: settings.modelName,
  };
}
