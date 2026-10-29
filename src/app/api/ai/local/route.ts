import { NextRequest, NextResponse } from 'next/server';
import { sendAIPrompt, type AIConfig } from '@/lib/ai-providers';
import { localAIBase, localModelDetails } from '@/lib/local-ai';
import { validateAIImages } from '@/lib/ai-images';
import { readRequestJSON, acquireJob } from '@/lib/request-limits';

export async function GET(request: NextRequest) {
  const provider = request.nextUrl.searchParams.get('provider');
  if (provider !== 'ollama' && provider !== 'lmstudio') return NextResponse.json({ error: 'Choose a local provider.' }, { status: 400 });
  const release = acquireJob('local-model-discovery', 2);
  if (!release) return NextResponse.json({ error: 'Model discovery is already busy. Please try again shortly.' }, { status: 429 });
  try {
    const modelDetails = await localModelDetails(provider, request.nextUrl.searchParams.get('baseUrl') || undefined);
    return NextResponse.json({ models: modelDetails.map(model => model.id), modelDetails });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  } finally { release(); }
}

export async function POST(request: NextRequest) {
  const release = acquireJob('local-ai', 2);
  if (!release) return NextResponse.json({ error: 'Two local AI requests are already running. Please try again shortly.' }, { status: 429 });
  try {
    const body = await readRequestJSON(request, 6 * 1024 * 1024);
    const provider = body.config?.provider;
    if (provider !== 'ollama' && provider !== 'lmstudio') {
      return NextResponse.json({ error: 'Only local AI providers are supported here.' }, { status: 400 });
    }
    let baseUrl: string;
    try { baseUrl = localAIBase(provider, body.config.baseUrl); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (typeof body.prompt !== 'string' || body.prompt.length > 20000 || ['selectedText', 'fullDocument', 'compilerErrors'].some(field => body.context?.[field] !== undefined && (typeof body.context[field] !== 'string' || body.context[field].length > 100000))) {
      return NextResponse.json({ error: 'Invalid or oversized AI request.' }, { status: 400 });
    }
    if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 40 || body.history.some((turn: {role?: unknown; content?: unknown}) => !turn || !['user', 'assistant'].includes(String(turn.role)) || typeof turn.content !== 'string') || JSON.stringify(body.history).length > 200000)) return NextResponse.json({ error: 'Invalid conversation history.' }, { status: 400 });
    const config: AIConfig = { provider, baseUrl, model: typeof body.config.model === 'string' ? body.config.model.slice(0, 200) : undefined };
    let images;
    try { images = validateAIImages(body.images); }
    catch (error) { return NextResponse.json({ error: (error as Error).message }, { status: 400 }); }
    if (images.length) {
      const model = (await localModelDetails(provider, baseUrl)).find(item => item.id === config.model);
      if (model?.vision !== 'vision') return NextResponse.json({ error: 'Select a model with verified vision support before attaching an image.' }, { status: 400 });
    }
    const text = await sendAIPrompt(config, body.prompt, body.context, body.history, images);
    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  } finally { release(); }
}
