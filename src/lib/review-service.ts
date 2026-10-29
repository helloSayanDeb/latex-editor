import { localAIBase } from './local-ai';
import { readRequestText } from './request-limits';
import { reviewURL, reviewPrompt, parseReview, type ReviewSource, type ReviewEvidence, type ReviewProvider } from './paper-review';
export type ReviewConfig = { provider: ReviewProvider; model: string; apiKey?: string; baseUrl?: string };
export type CrawlerConfig = { endpoint?: string; token?: string };

function crawlerBase(input?: string) {
  const url=new URL(input || 'http://127.0.0.1:8769');
  if(!['http:','https:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname)) throw new Error('Use a loopback crawler address, for example http://127.0.0.1:8769.');
  if(url.hostname==='localhost') url.hostname='127.0.0.1';
  return url.origin;
}
async function jsonRequest(url: string, body: object | undefined, headers: Record<string,string>, signal: AbortSignal) {
  const response=await fetch(url,{method:body?'POST':'GET',redirect:'error',signal,headers:{'Content-Type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  const text=await readRequestText(response,2*1024*1024);
  let data; try {data=JSON.parse(text);} catch {throw new Error(`Server returned ${response.status} without valid JSON.`);}
  if(!response.ok) throw new Error(String(data.error?.message||data.error||`Server returned ${response.status}.`).slice(0,1600));
  return data;
}
export async function checkCrawler(config: CrawlerConfig, signal: AbortSignal) {
  if(!config.token?.trim()) throw new Error('A crawler access token is required. Start the bundled bridge and configure its token.');
  const result=await jsonRequest(crawlerBase(config.endpoint)+'/health',undefined,{Authorization:`Bearer ${config.token}`},signal);
  if(!result.ok) throw new Error('Crawler health check failed. Run its setup/doctor commands.');
  return {ok:true,ready:result.ready===true};
}

export async function runReview(config: ReviewConfig, sources: ReviewSource[], web: boolean, urls: string[], crawler: CrawlerConfig, signal: AbortSignal) {
  const local=config.provider==='lmstudio'||config.provider==='ollama';
  let evidence: ReviewEvidence[]=[], used=false;
  if(local&&web){
    if(!urls.length) throw new Error('Local web review needs one to five approved source URLs. A crawler reads pages; it does not discover papers automatically.');
    if(!crawler.token?.trim()) throw new Error('Configure the local Crawl4AI bridge and its access token.');
    const result=await jsonRequest(crawlerBase(crawler.endpoint)+'/evidence',{urls},{Authorization:`Bearer ${crawler.token}`},signal);
    if(!Array.isArray(result.sources)||result.sources.length>5) throw new Error('Invalid crawler result.');
    evidence=result.sources.flatMap((entry: {url?:unknown;title?:unknown;text?:unknown;retrievedAt?:unknown},index:number)=>{
      const url=typeof entry.url==='string'?reviewURL(entry.url):null;
      if(!url||typeof entry.text!=='string'||!entry.text.trim()) return [];
      return [{id:`S${index+1}`,url,title:typeof entry.title==='string'?entry.title.slice(0,200):url,text:entry.text.slice(0,10000),retrievedAt:typeof entry.retrievedAt==='string'?entry.retrievedAt.slice(0,80):undefined}];
    });
    if(!evidence.length) throw new Error('The crawler returned no usable evidence. Check the approved URLs and robots/access restrictions.');
    used=true;
  }
  const prompt=reviewPrompt(sources,evidence,web), key=config.apiKey?.trim()||'';
  let text='';
  const addSource=(url:unknown,title:unknown)=>{
    if(typeof url!=='string') return;
    const valid=reviewURL(url);if(!valid||evidence.some(entry=>entry.url===valid)||evidence.length>=30)return;
    evidence.push({id:`S${evidence.length+1}`,url:valid,title:typeof title==='string'?title.slice(0,200):valid});
  };
  if(config.provider==='gemini'){
    const result=await jsonRequest(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,{contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:6000},...(web?{tools:[{google_search:{}}]}:{})},{'x-goog-api-key':key},signal);
    const candidate=result.candidates?.[0];text=candidate?.content?.parts?.map((part:{text?:string})=>part.text||'').join('')||'';
    if(web){for(const chunk of candidate?.groundingMetadata?.groundingChunks||[])addSource(chunk.web?.uri,chunk.web?.title);used=Boolean(candidate?.groundingMetadata?.webSearchQueries?.length||evidence.length);}
  } else if(config.provider==='openai'){
    const result=await jsonRequest('https://api.openai.com/v1/responses',{model:config.model,input:prompt,store:false,max_output_tokens:6000,...(web?{tools:[{type:'web_search'}],max_tool_calls:3}:{})},{Authorization:`Bearer ${key}`},signal);
    for(const item of result.output||[]){
      if(web&&item.type==='web_search_call'&&item.status==='completed')used=true;
      for(const part of item.content||[])if(part.type==='output_text'){text+=part.text||'';if(web)for(const annotation of part.annotations||[])if(annotation.type==='url_citation')addSource(annotation.url,annotation.title);}
    }
  } else if(config.provider==='claude'){
    const result=await jsonRequest('https://api.anthropic.com/v1/messages',{model:config.model,max_tokens:6000,messages:[{role:'user',content:prompt}],...(web?{tools:[{type:'web_search_20250305',name:'web_search',max_uses:3}]}:{})},{'x-api-key':key,'anthropic-version':'2023-06-01'},signal);
    for(const part of result.content||[]){
      if(part.type==='text'){text+=part.text||'';if(web)for(const citation of part.citations||[])addSource(citation.url,citation.title);}
      if(web&&part.type==='web_search_tool_result'&&Array.isArray(part.content))for(const source of part.content)if(source.type==='web_search_result'){used=true;addSource(source.url,source.title);}
    }
  } else if(local){
    const provider=config.provider as 'lmstudio'|'ollama',base=localAIBase(provider,config.baseUrl);
    const result=await jsonRequest(base+(provider==='ollama'?'/api/chat':'/chat/completions'),{model:config.model,messages:[{role:'user',content:prompt}],...(provider==='ollama'?{stream:false,options:{temperature:.2}}:{temperature:.2,max_tokens:6000})},{},signal);
    text=provider==='ollama'?result.message?.content||'':result.choices?.[0]?.message?.content||'';
  } else throw new Error('Unsupported review provider.');
  return parseReview(text,sources,evidence,config.provider,used);
}
