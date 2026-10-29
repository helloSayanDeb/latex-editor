'use client';
import { useEffect, useState } from 'react';
const palettes = [
  {id:'amber',name:'Tungsten amber',accent:'#efb96f',text:'#e9c397',dim:'#efb96f1c'},
  {id:'metallic',name:'Metallic black',accent:'#8f969f',text:'#c5cbd2',dim:'#8f969f1c'},
  {id:'cyan',name:'Cyber cyan',accent:'#54b5cf',text:'#9bd8e7',dim:'#54b5cf1c'},
  {id:'emerald',name:'Matrix emerald',accent:'#51b88a',text:'#9bd9b8',dim:'#51b88a1c'},
  {id:'crimson',name:'Crimson core',accent:'#db5264',text:'#ee9ba6',dim:'#db52641c'},
  {id:'violet',name:'Violet plasma',accent:'#9657e8',text:'#c39aed',dim:'#9657e81c'},
  {id:'blue',name:'Glacier blue',accent:'#80b5ed',text:'#b5d7fa',dim:'#80b5ed1c'},
  {id:'sage',name:'Soft sage',accent:'#91bca4',text:'#bcdcca',dim:'#91bca41c'},
  {id:'rose',name:'Rose copper',accent:'#d49b99',text:'#edc5c3',dim:'#d49b991c'},
];
function apply(id: string) { const palette=palettes.find(p=>p.id===id)||palettes[0]; const root=document.documentElement; root.dataset.palette=palette.id; root.style.setProperty('--accent',palette.accent); root.style.setProperty('--accent-hover',palette.text); root.style.setProperty('--accent-text',palette.text);root.style.setProperty('--accent-dim',palette.dim); }
export function RestoreAccent() { useEffect(()=>{try{apply(localStorage.getItem('lemmata-accent')||'amber');}catch{apply('amber');}},[]);return null; }
export function AccentPicker() { const [selected,setSelected]=useState('amber');useEffect(()=>{try{setSelected(localStorage.getItem('lemmata-accent')||'amber');}catch{}},[]);return <fieldset className="accent-picker"><legend>Workspace accent</legend><p>Tungsten amber · recommended</p><div>{palettes.map(p=><button type="button" key={p.id} aria-pressed={selected===p.id} title={p.name} onClick={()=>{setSelected(p.id);apply(p.id);try{localStorage.setItem('lemmata-accent',p.id);}catch{}}}><i style={{background:p.accent}}/>{p.name}</button>)}</div></fieldset>; }

