'use client';
import { useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll } from 'framer-motion';
import { WorkspaceDemo, type DemoStage } from '@/components/WorkspaceDemo';
import { OrbitalHero } from '@/components/OrbitalHero';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Braces, FileText, GitBranch, Layers, LockKeyhole, Sigma, Sparkles, Terminal } from 'lucide-react';
import './landing.css';
// Small original diagrams explain each capability without loading extra illustration assets.
function FeatureSketch({ index }: { index: number }) {
  const shared = { fill: 'none', stroke: 'currentColor', strokeWidth: 1 };
  return <svg className="feature-sketch" viewBox="0 0 300 100" aria-hidden="true">
    {index === 0 && <g {...shared}><rect x="30" y="12" width="240" height="78" rx="5"/><path d="M30 31H270M52 46H94M52 59H164M66 72H137M185 46H248M185 59H240M185 72H230M174 31V90"/><circle cx="43" cy="22" r="2"/></g>}
    {index === 1 && <g {...shared}><path d="M83 18H75V82H83M218 18H226V82H218"/>{[0,1,2].flatMap(row=>[0,1,2].map(col=><rect key={`${row}-${col}`} x={97+col*35} y={25+row*20} width="12" height="8" rx="2"/>))}<path d="M35 50H54M247 50H267"/></g>}
    {index === 2 && <g {...shared}><rect x="38" y="19" width="224" height="63" rx="5"/><path d="M52 36H154M52 48H238M52 64H192"/><path className="sketch-highlight" d="M47 61H251" strokeWidth="17"/><path d="M52 64H192"/><path d="m225 30 4 4 8-9"/></g>}
    {index === 3 && <g {...shared}><path d="M60 22H153M60 36H180M60 50H141M60 64H174M60 78H122M189 36H210V61H229"/><rect x="229" y="47" width="45" height="29" rx="4"/><circle cx="189" cy="36" r="4"/><circle cx="43" cy="22" r="2"/><circle cx="43" cy="50" r="2"/><circle cx="43" cy="78" r="2"/></g>}
    {index === 4 && <g {...shared}><rect x="71" y="8" width="158" height="84" rx="5"/>{[28,50,72].map(y=><g key={y}><path d={`M112 ${y}H207`}/><path d={`m86 ${y} 4 4 8-9`}/></g>)}</g>}
    {index === 5 && <g {...shared}><path d="M48 50H250M100 50Q118 50 130 27H202M155 50Q173 50 187 77H250"/>{[[48,50],[100,50],[155,50],[202,27],[250,50],[250,77]].map(([x,y])=><circle key={`${x}-${y}`} cx={x} cy={y} r="5"/>)}</g>}
  </svg>;
}
const features = [
  { icon: <Braces/>, title: 'A proper writing environment', text: 'Multi-file projects, citation completion, word wrap, formatting, project search and PDF-to-source navigation.' },
  { icon: <Sigma/>, title: 'Make the structure visible', text: 'Work with equations, matrices, supported tables and figures visually. Keep the LaTeX source underneath.' },
  { icon: <Sparkles/>, title: 'Assistance with boundaries', text: 'Ask for an explanation or request a focused edit. Preview source sharing and keep control of every change.' },
  { icon: <Layers/>, title: 'Review that stays with you', text: 'Source-linked findings, a persistent review notebook, replies and saved proposals. Optional web research is explicit.' },
  { icon: <FileText/>, title: 'Prepare for submission', text: 'Import a journal template and inspect required files, packages, fonts and unresolved references before you submit.' },
  { icon: <GitBranch/>, title: 'Keep the history', text: 'Local snapshots and Git versioning, with remote synchronization and a deliberate conflict-resolution workflow.' },
];
export default function LandingPage() {
  const container = useRef<HTMLElement>(null), reduced = useReducedMotion();
  const [demoStage,setDemoStage] = useState<DemoStage>('write');
  const openDemo = (stage: DemoStage) => { setDemoStage(stage); document.getElementById('workspace-preview')?.scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'}); };
  const { scrollYProgress } = useScroll({ container });
  return <motion.main ref={container} className="landing">
    <noscript><style>{".landing-feature-grid article{opacity:1!important;transform:none!important}"}</style></noscript>
    <motion.div className="landing-progress" style={{ scaleX: scrollYProgress }}/>
    <header className="landing-nav"><Link href="/" className="landing-brand"><img src="/favicon.svg?v=20261028-amber" alt="" width={34} height={34}/><span>Lemmata</span><small>LOCAL WORKSPACE</small></Link><nav aria-label="Main navigation"><a href="#features">Capabilities</a><a href="#workflow">Workflow</a><a href="#questions">Questions</a></nav><Link href="/lemmata" className="landing-open">Open workspace<ArrowUpRight size={15}/></Link></header>
    <section className="landing-hero"><div className="landing-orbit" aria-hidden="true"><div className="orbit-halo"/><div className="orbit-ring orbit-ring-one"/><div className="orbit-ring orbit-ring-two"/><span className="orbit-core">λ</span><span className="orbit-coordinate">SOURCE / IDEAS / FORM</span><i className="orbit-dot"/><OrbitalHero/></div>
      <motion.div className="landing-hero-copy" initial={reduced ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [.22, 1, .36, 1] }}><div className="landing-kicker"><span/>YOUR IDEAS. YOUR MACHINE.</div><h1>Room to think.<br/><em>Precision to publish.</em></h1><p>A considered space for LaTeX. Write, typeset and refine your paper with source and PDF together—and an assistant that shares only what you choose.</p><div className="landing-hero-actions"><Link href="/lemmata" className="landing-primary">Enter Lemmata<ArrowRight size={17}/></Link><a href="#workspace-preview" className="landing-secondary">Explore the workspace<ArrowUpRight size={15}/></a></div><div className="landing-requirements"><Terminal size={13}/><span>Runs locally · Requires an installed TeX distribution</span></div></motion.div>
      <div className="landing-hero-readout"><span><i/>WORKSPACE / READY</span><span>pdfLaTeX · XeLaTeX · LuaLaTeX</span><span>LOCAL COMPILATION</span></div>
    </section>
    <section className="landing-console-section" id="workspace-preview"><div className="landing-section-top"><span className="landing-kicker">01 / THE WORKSPACE</span><span>A tool that stays out of the way.</span></div><WorkspaceDemo stage={demoStage} onStageChange={setDemoStage}/></section>
    <section className="landing-features" id="features"><div className="landing-section-top"><span className="landing-kicker">02 / CAPABILITIES</span><span>Built around the work, not the noise.</span></div><h2>From a rough thought<br/>to a <em>well-formed paper.</em></h2><div className="landing-feature-grid">{features.map((feature,index) => <motion.article key={feature.title} initial={reduced ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} whileHover={reduced ? undefined : { y: -4 }} transition={{ duration: .6, delay: index * .025, ease: [.22, 1, .36, 1] }} viewport={{ root: container, once: true, amount: .15 }}><div className="feature-top"><span>{feature.icon}</span><small>0{index+1}</small></div><FeatureSketch index={index}/><h3>{feature.title}</h3><p>{feature.text}</p><span className="feature-corner"/></motion.article>)}</div></section>
    <section className="landing-workflow" id="workflow"><div><span className="landing-kicker">03 / A CLEARER PROCESS</span><h2>Stay with<br/><em>the thought.</em></h2><p>One workspace. Your editor, preview and assistant remain within reach.</p></div><ol>{[['Write','Start from a blank page or bring your project. Your TeX distribution handles the typesetting.'],['Build','Compile locally, navigate errors and inspect the PDF alongside your source.'],['Refine','Review feedback, test focused repairs and accept the changes you want to keep.']].map(([title,text],i) => <li key={title}><button className="workflow-demo-link" onClick={() => openDemo((['write','build','refine'] as DemoStage[])[i])} aria-label={`Try the ${title.toLowerCase()} example`}><span>0{i+1}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={18}/></button></li>)}</ol></section>
    <section className="landing-privacy"><div className="privacy-symbol"><LockKeyhole size={30}/></div><div><span className="landing-kicker">LOCAL BY DESIGN</span><h2>A quiet workspace.<br/><em>A clear boundary.</em></h2><p>Projects and compilation stay on your machine. Cloud AI receives only the content you approve; local model servers can keep inference on-device. Fresh web research still needs internet.</p></div></section>
    <section className="landing-faq" id="questions"><div className="landing-section-top"><span className="landing-kicker">04 / BEFORE YOU BEGIN</span><span>A few practical details.</span></div>{[
      ['What do I need installed?','Use an installed TeX distribution: MiKTeX or TeX Live on Windows, or MacTeX/BasicTeX on macOS. The workspace setup screen detects and verifies its engines. Source users also need the documented Node.js environment.'],
      ['Can I work offline?','Editing and compilation work offline once the required TeX packages and fonts are installed. A configured local model can provide offline AI. Cloud providers, remote Git operations and fresh web research require network access.'],
      ['Does this landing page mean the tool is hosted online?','No. This page is served by your local Lemmata server. It does not provide cloud compilation, accounts or shared storage.'],
      ['Does AI change my paper automatically?','Ask mode explains. Edit mode proposes focused source changes for inline review. Compile accepts pending edits by design; saved proposals can also be reviewed later. Always inspect model-generated content.'],
    ].map(([question,answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</section>
    <section className="landing-cta"><span className="landing-kicker">THE NEXT PAGE IS YOURS.</span><h2>Make room<br/>for <em>your next idea.</em></h2><Link href="/lemmata" className="landing-primary">Open the workspace<ArrowRight size={17}/></Link></section><div className="landing-wordmark" aria-hidden="true">Lemmata<span>LOCAL LATEX / LIMITLESS IDEAS</span></div><footer className="landing-footer"><Link href="/" className="landing-brand">Lemmata</Link><span>An open-source, local-first LaTeX workspace.</span><a href="https://github.com/helloSayanDeb/latex-editor" target="_blank" rel="noopener noreferrer">Source on GitHub<ArrowUpRight size={13}/></a></footer>
  </motion.main>;
}
