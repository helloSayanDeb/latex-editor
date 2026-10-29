import { NextRequest, NextResponse } from 'next/server';
import { readRequestJSON, acquireJob } from '@/lib/request-limits';
import { sanitizePath } from '@/lib/security';
import { runReview, checkCrawler, type ReviewConfig } from '@/lib/review-service';
import { reviewURL } from '@/lib/paper-review';
export async function POST(request: NextRequest) {
  const release=acquireJob('paper-review',1);
  if(!release)return NextResponse.json({error:'A paper review is already running. Wait or cancel it before starting another.'},{status:429});
  let secrets: string[]=[];
  try {
    const body=await readRequestJSON(request,512*1024);
    secrets=[body.config?.apiKey,body.crawler?.token].filter((value):value is string=>typeof value==='string'&&Boolean(value));
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(120000)]);
    const crawler={endpoint:typeof body.crawler?.endpoint==='string'?body.crawler.endpoint.slice(0,300):undefined,token:typeof body.crawler?.token==='string'?body.crawler.token.slice(0,1000):undefined};
    if(body.action==='crawler-check')return NextResponse.json(await checkCrawler(crawler,signal));
    const provider=body.config?.provider;
    if(!['gemini','openai','claude','lmstudio','ollama'].includes(provider))throw new Error('Choose a review provider.');
    if(typeof body.config?.model!=='string'||!body.config.model.trim()||body.config.model.length>200)throw new Error('Choose a model for review.');
    const local=provider==='lmstudio'||provider==='ollama';
    if(!local&&(typeof body.config.apiKey!=='string'||!body.config.apiKey.trim()||body.config.apiKey.length>1000))throw new Error('A cloud provider API key is required.');
    if(body.consent!==true)throw new Error('Explicit source-sharing consent is required for paper review.');
    if(!Array.isArray(body.sources)||body.sources.length<1||body.sources.length>10)throw new Error('Select between one and ten source files.');
    let total=0;
    const sources=body.sources.map((source:{file?:unknown;text?:unknown})=>{
      if(!source||typeof source.file!=='string'||source.file.length>240||!source.file.endsWith('.tex')||sanitizePath(source.file)!==source.file||typeof source.text!=='string'||source.text.startsWith('data:'))throw new Error('Review accepts project-relative LaTeX text sources only.');
      total+=source.text.length;if(total>100000)throw new Error('Review source exceeds 100,000 characters. Choose a shorter scope.');
      return {file:source.file,text:source.text};
    });
    if(new Set(sources.map((source:{file:string})=>source.file)).size!==sources.length)throw new Error('Duplicate source selection.');
    const urls=Array.isArray(body.urls)?body.urls:[];
    if(urls.length>5||urls.some((url:unknown)=>typeof url!=='string'||url.length>2048||!reviewURL(url)))throw new Error('Use up to five public HTTPS source URLs.');
    const config:ReviewConfig={provider,model:body.config.model.trim(),apiKey:local?undefined:body.config.apiKey.trim(),baseUrl:typeof body.config.baseUrl==='string'?body.config.baseUrl.slice(0,300):undefined};
    return NextResponse.json(await runReview(config,sources,body.web===true,urls,crawler,signal));
  } catch(error){
    let message=(error as Error).message||'Paper review failed.';
    for(const secret of secrets)message=message.split(secret).join('[redacted]');
    message=message.replace(/Bearer\s+\S+/gi,'Bearer [redacted]');
    return NextResponse.json({error:message.slice(0,1800)},{status:400});
  } finally {release();}
}
