// Compatibility styles for the existing component vocabulary. No Tailwind runtime.

// Run after adding utility classes; prefer semantic CSS for new workspace features.
const fs = require('node:fs');
const ts = require('typescript');
const tokens = new Set();
for (const file of fs.readdirSync('src', { recursive: true }).filter(f => f.endsWith('.tsx'))) {
  const source = ts.createSourceFile(file, fs.readFileSync(`src/${file}`, 'utf8'), 99, true);
  function visit(n) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
      n.text.split(/\s+/).forEach(t => tokens.add(t));
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
}
const colors = { white:'#ffffff', black:'#000000', 'slate-100':'#f1f5f9', 'slate-200':'#e2e8f0', 'slate-300':'#cbd5e1', 'slate-400':'#94a3b8', 'slate-500':'#64748b', 'slate-700':'#334155', 'slate-800':'#1e293b', 'emerald-200':'#f5ddbc', 'emerald-300':'#e9c397', 'emerald-400':'#ffb45e', 'emerald-500':'#d6a86e', 'emerald-600':'#8e6940', 'indigo-200':'#c7d2fe', 'indigo-300':'#a5b4fc', 'indigo-400':'#818cf8', 'indigo-500':'#6366f1', 'rose-200':'#fecdd3', 'rose-300':'#fda4af', 'rose-400':'#fb7185', 'rose-500':'#f43f5e', 'amber-400':'#fbbf24', 'purple-400':'#c084fc', 'sky-400':'#38bdf8' };
const fixed = { hidden:'display:none', block:'display:block', inline:'display:inline', grid:'display:grid', 'flex-wrap':'flex-wrap:wrap', 'flex-grow':'flex-grow:1', 'flex-shrink':'flex-shrink:1', 'items-end':'align-items:flex-end', truncate:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap', 'text-left':'text-align:left', 'text-center':'text-align:center', 'font-mono':'font-family:var(--font-mono)', 'font-serif':'font-family:Georgia,serif', 'font-medium':'font-weight:500', 'font-semibold':'font-weight:600', 'font-bold':'font-weight:700', 'font-extrabold':'font-weight:800', 'font-black':'font-weight:900', uppercase:'text-transform:uppercase', italic:'font-style:italic', underline:'text-decoration:underline', 'leading-relaxed':'line-height:1.625', 'leading-tight':'line-height:1.25', 'tracking-tight':'letter-spacing:-.025em', 'tracking-wider':'letter-spacing:.05em', 'tracking-widest':'letter-spacing:.1em', 'pointer-events-none':'pointer-events:none', 'resize-none':'resize:none', 'select-text':'user-select:text', 'whitespace-nowrap':'white-space:nowrap', 'whitespace-pre-wrap':'white-space:pre-wrap', 'break-all':'word-break:break-all', 'break-word':'overflow-wrap:anywhere', 'border-collapse':'border-collapse:collapse', border:'border:1px solid var(--border-medium)', 'border-t':'border-top:1px solid var(--border-medium)', 'border-b':'border-bottom:1px solid var(--border-medium)', 'border-r':'border-right:1px solid var(--border-medium)', 'border-b-2':'border-bottom:2px solid', '-translate-x-1/2':'transform:translateX(-50%)', 'col-span-2':'grid-column:span 2', 'shadow-md':'box-shadow:var(--shadow-md)', 'shadow-lg':'box-shadow:var(--shadow-lg)', 'shadow-2xl':'box-shadow:0 24px 60px #0008' };
function declaration(t) {
  if (fixed[t]) return fixed[t];
  let m;
  if ((m=t.match(/^([pm])([xytrbl]?)-(auto|\d+(?:\.\d+)?)$/))) {
    const sides={x:['left','right'],y:['top','bottom'],t:['top'],r:['right'],b:['bottom'],l:['left'],'':['']};
    return sides[m[2]].map(s=>`${m[1]==='p'?'padding':'margin'}${s?'-'+s:''}:${m[3]==='auto'?'auto':Number(m[3])*.25+'rem'}`).join(';');
  }
  if ((m=t.match(/^(w|h|max-w|max-h|min-w|min-h|top|bottom|left|right|gap)-(.+)$/))) {
    const props={w:'width',h:'height','max-w':'max-width','max-h':'max-height','min-w':'min-width','min-h':'min-height'};
    const v=m[2], named={full:'100%',screen:m[1]==='w'?'100vw':'100dvh',px:'1px','1/2':'50%',sm:'24rem',md:'28rem',xl:'36rem','2xl':'42rem'};
    const value=named[v] || (/^\d+(\.\d+)?$/.test(v)?Number(v)*.25+'rem':/^\[.+\]$/.test(v)?v.slice(1,-1):null);
    if(value)return `${props[m[1]]||m[1]}:${value}`;
  }
  if ((m=t.match(/^-(top|right)-(\d+)$/))) return `${m[1]}:-${Number(m[2])*.25}rem`;
  if ((m=t.match(/^text-(xs|sm|base|lg|2xl|\[\d+px\])$/))) return `font-size:${({xs:'12px',sm:'14px',base:'16px',lg:'18px','2xl':'24px'})[m[1]]||m[1].slice(1,-1)};line-height:1.5`;
  if ((m=t.match(/^(bg|text|border)-(.+)$/))) {
    const [key,alpha]=m[2].split('/'); const color=colors[key] || (/^\[#[\da-f]+\]$/.test(key)?key.slice(1,-1):null);
    if(color)return `${({bg:'background-color',text:'color',border:'border-color'})[m[1]]}:${color}${alpha?Math.round(Number(alpha)*2.55).toString(16).padStart(2,'0'):''}`;
  }
  if ((m=t.match(/^rounded(?:-(.+))?$/))) {const v=({sm:'3px',md:'6px',lg:'8px',xl:'12px','2xl':'16px',full:'999px'})[m[1]];if(v||!m[1])return `border-radius:${v||'4px'}`;if(m[1]==='t-lg')return 'border-radius:8px 8px 0 0';if(m[1]==='bl-sm')return 'border-bottom-left-radius:3px';if(m[1]==='br-sm')return 'border-bottom-right-radius:3px';}
  if ((m=t.match(/^grid-cols-(\d+)$/))) return `grid-template-columns:repeat(${m[1]},minmax(0,1fr))`;
  if ((m=t.match(/^opacity-(\d+)$/))) return `opacity:${Number(m[1])/100}`;
  if ((m=t.match(/^transition-(all|colors|opacity|transform)$/))) return `transition:${m[1]==='colors'?'color,background-color,border-color':m[1]} .15s ease`;
  if ((m=t.match(/^duration-(\d+)$/))) return `transition-duration:${m[1]}ms`;
  if ((m=t.match(/^backdrop-blur-(sm|md)$/))) return `backdrop-filter:blur(${m[1]==='sm'?4:12}px)`;
  if ((m=t.match(/^animate-(spin|pulse|ping|bounce)$/))) return `animation:ui-${m[1]} ${m[1]==='spin'?1:2}s infinite ${m[1]==='spin'?'linear':'ease-in-out'}`;
}
const rules=[];
for(const token of [...tokens].sort((a,b)=>a.includes(':')-b.includes(':')||a.localeCompare(b))) {
  const parts=token.split(':'); const base=parts.pop(); const d=declaration(base); if(!d)continue;
  let selector='.'+token.replace(/[^a-zA-Z0-9_-]/g,c=>'\\'+c);
  if(parts.includes('hover'))selector+=':hover';
  if(parts.includes('group-hover'))selector='.group:hover '+selector;
  const rule=`${selector} { ${d}; }`;
  rules.push(parts.includes('sm')?`@media(min-width:640px) { ${rule} }`:parts.includes('md')?`@media(min-width:768px) { ${rule} }`:rule);
}
fs.writeFileSync('src/app/utilities.css','/* Existing component utility vocabulary; generated by scripts/generate-ui-utilities.cjs. */\n'+rules.join('\n')+'\n');
console.log(`Wrote ${rules.length} vanilla CSS rules.`);
