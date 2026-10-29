'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PromptCarousel({ onSelect }: { onSelect: (prompt: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const [canMove, setCanMove] = useState({ left: false, right: false });
  useEffect(() => {
    const element = track.current!;
    const update = () => setCanMove({ left: element.scrollLeft > 1, right: element.scrollLeft + element.clientWidth < element.scrollWidth - 1 });
    update();
    element.addEventListener('scroll', update);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, []);
  const move = (direction: number) => track.current?.scrollBy({ left: direction * Math.max(140, track.current.clientWidth * .75), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return <div className="assist-prompt-carousel" aria-label="Quick prompts">
    <button className="assist-prompt-arrow" type="button" aria-label="Previous quick prompts" disabled={!canMove.left} onClick={() => move(-1)}><ChevronLeft size={14} /></button>
    <div ref={track} className="assist-prompt-track">
      {['Fix LaTeX Error', 'Format as Equation', 'CircuiTikZ Circuit', 'Improve Tone'].map(prompt => <button key={prompt} type="button" className="assist-prompt-chip" onClick={() => onSelect(prompt)}>{prompt}</button>)}
    </div>
    <button className="assist-prompt-arrow" type="button" aria-label="Next quick prompts" disabled={!canMove.right} onClick={() => move(1)}><ChevronRight size={14} /></button>
  </div>;
}
