import { NextRequest, NextResponse } from 'next/server';
import { sendAIPrompt, type AIConfig } from '@/lib/ai-providers';
import { localAIBase, localModels } from '@/lib/local-ai';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');
  if (provider !== 'ollama' && provider !== 'lmstudio') return NextResponse.json({ error: 'Choose a local provider.' }, { status: 400 });
  try {
    const models = await localModels(provider, request.nextUrl.searchParams.get('baseUrl') || undefined);
    return NextResponse.json({ models });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const provider = body.config?.provider;
    if (provider !== 'ollama' && provider !== 'lmstudio') {
      return NextResponse.json({ error: 'Only local AI providers are supported here.' }, { status: 400 });
    }
    let baseUrl: string;
    try { baseUrl = localAIBase(provider, body.config.baseUrl); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (typeof body.prompt !== 'string' || body.prompt.length > 20000 || ['selectedText', 'fullDocument'].some(field => body.context?.[field] !== undefined && (typeof body.context[field] !== 'string' || body.context[field].length > 100000))) {
      return NextResponse.json({ error: 'Invalid or oversized AI request.' }, { status: 400 });
    }
    if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 40 || body.history.some((turn: {role?: unknown; content?: unknown}) => !turn || !['user', 'assistant'].includes(String(turn.role)) || typeof turn.content !== 'string') || JSON.stringify(body.history).length > 200000)) return NextResponse.json({ error: 'Invalid conversation history.' }, { status: 400 });
    const config: AIConfig = { provider, baseUrl, model: typeof body.config.model === 'string' ? body.config.model.slice(0, 200) : undefined };
    const text = await sendAIPrompt(config, body.prompt, body.context, body.history);
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
