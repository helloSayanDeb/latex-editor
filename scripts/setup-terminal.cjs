const readline=require('node:readline');
const {createInterface}=require('node:readline/promises');
const color=process.stdout.isTTY&&!process.env.NO_COLOR;
const amber=s=>color?`\x1b[38;2;255;180;94m${s}\x1b[0m`:s;
const clean=text=>String(text).replace(/[\x00-\x1f\x7f]/g,' ');
function wrap(text,width){const words=clean(text).split(/\s+/),lines=[];let line='';for(let word of words){while(word.length>width){if(line){lines.push(line);line='';}lines.push(word.slice(0,width));word=word.slice(width);}if(line.length+word.length+1>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;}
function frame(title,options,selected,columns=80,rows=24){
 const width=Math.max(1,Math.min(columns-2,100)),height=Math.max(1,rows-1);
 if(columns<35||rows<10)return wrap('Enlarge the terminal to use this menu. Ctrl+C cancels.',width).slice(0,height);
 const brand=height>=20?['  L E M M A T A','  LOCAL WORKSPACE  /  INSTALL & MAINTAIN','']:[' L E M M A T A / LOCAL WORKSPACE'];
 const lines=[...brand,' '+ '='.repeat(Math.max(1,width-2)),...wrap(title,width-2).slice(0,2).map(line=>' '+line),''];
 const slots=Math.max(1,Math.min(options.length,height-lines.length-7));
 const start=Math.max(0,Math.min(selected-Math.floor(slots/2),options.length-slots));
 for(let i=start;i<start+slots;i++)lines.push(`${i===selected?' >':'  '} ${i+1}. ${clean(options[i].label)}`.slice(0,width));
 lines.push(' '+ '-'.repeat(Math.max(1,width-2)));
 for(const line of wrap(options[selected].detail||'',width-3).slice(0,Math.max(1,height-lines.length-3)))lines.push(' '+line);
 lines.push('',' Up/Down: choose   Enter: continue   Esc: back   Ctrl+C: exit');return lines.slice(0,height).map(line=>line.slice(0,width));
}
async function choose(title,options){
 if(!options.length)throw new Error('No choices are available.');
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Run setup in a terminal. Use --check for a noninteractive report.');
 let selected=0;const wasRaw=process.stdin.isRaw;
 readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdout.write('\x1b[?1049h\x1b[?25l');
 const render=()=>{const lines=frame(title,options,selected,process.stdout.columns||80,process.stdout.rows||24);process.stdout.write('\x1b[H\x1b[2J'+lines.map((line,index)=>line.startsWith(' >')||index<4?amber(line):line).join('\r\n'));};
 render();return new Promise((resolve,reject)=>{
 const finish=()=>{process.stdin.removeListener('keypress',key);process.stdout.removeListener('resize',render);process.stdin.setRawMode(Boolean(wasRaw));process.stdin.pause();process.stdout.write('\x1b[?25h\x1b[?1049l');};
 const key=(_,key={})=>{if(key.ctrl&&key.name==='c'){finish();reject(new Error('Setup cancelled.'));return;}if(key.name==='escape'){const back=options.findIndex(option=>['back','no','done'].includes(option.value));if(back>=0){finish();resolve(options[back].value);return;}return;}if(key.name==='up')selected=(selected+options.length-1)%options.length;else if(key.name==='home')selected=0;else if(key.name==='end')selected=options.length-1;else if(key.name==='down')selected=(selected+1)%options.length;else if(key.name==='return'){finish();console.log(amber('  Selected: '+options[selected].label));resolve(options[selected].value);return;}else if(/^[1-9]$/.test(key.name||'')&&Number(key.name)<=options.length)selected=Number(key.name)-1;else return;render();};
 process.stdin.on('keypress',key);process.stdout.on('resize',render);process.stdin.resume();});
}
async function question(label){const terminal=createInterface({input:process.stdin,output:process.stdout});try{return(await terminal.question(label+' ')).trim();}finally{terminal.close();}}
module.exports={choose,question,amber,frame};
