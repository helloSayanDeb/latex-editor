'use client';
import React from 'react';
export type MascotState = 'idle' | 'compiling' | 'success' | 'error';
/** Lemmata: a folded-paper owl, drawn as a restrained vector illustration. */
export function Mascot({ state = 'idle', size = 150, className = '', showSpeech = false, message }: {
  state?: MascotState; size?: number; className?: string; showSpeech?: boolean; message?: string;
}) {
  return <div className={`assist-mascot ${className}`} data-state={state}>
    <svg viewBox="0 0 200 180" width={size} height={size * .9} role="img" aria-label={`The Lemmata paper owl, ${state}`}>
      <ellipse cx="100" cy="163" rx="47" ry="6" fill="var(--accent)" opacity=".08" />
      <g className="assist-body">
        <path d="m44 60 9-35 36 22h22l36-22 9 35-9 77-47 24-47-24Z" fill="#e9e6d8" />
        <path d="m53 25 36 22-45 13ZM147 25l-36 22 45 13Z" fill="color-mix(in srgb, var(--accent) 55%, #b8b8b8)" />
        <path d="m44 60 25 30-16 47-18-28Z" fill="color-mix(in srgb, var(--accent) 35%, #333)" />
        <path d="m156 60-25 30 16 47 18-28Z" fill="color-mix(in srgb, var(--accent) 50%, #555)" />
        <path d="m69 90 31 20 31-20-31 71Z" fill="#d7ceba" />
        <path d="m53 55 36-8 11 24 11-24 36 8-6 36-27 10-14-13-14 13-27-10Z" fill="#faf7ec" />
        <path d="m69 90 31 20 31-20M100 110v51" fill="none" stroke="#c2b59b" />
        <g className="assist-eyes" stroke="#3e3428" strokeWidth="4" strokeLinecap="round" fill="none">
          {state === 'success' ? <><path d="M64 77q10-13 20 0M116 77q10-13 20 0" /></> : <>
            <ellipse cx="74" cy="74" rx="8" ry={state === 'compiling' ? 4 : 11} fill="#3e3428" stroke="none" />
            <ellipse cx="126" cy="74" rx="8" ry={state === 'error' ? 7 : state === 'compiling' ? 4 : 11} fill="#3e3428" stroke="none" />
            <circle cx="76" cy="70" r="2.5" fill="#faf7ec" stroke="none" /><circle cx="128" cy="70" r="2.5" fill="#faf7ec" stroke="none" />
          </>}
        </g>
        <path d="m94 87 6-6 6 6-6 12Z" fill="#c79452" />
        <path d="M72 151h12M116 151h12" stroke="#c79452" strokeWidth="4" strokeLinecap="round" />
        <g transform="rotate(14 153 128)"><path d="M140 108h22v32h-22Z" fill="#faf7ec" stroke="#ad936f" /><path d="M145 117h12m-12 6h12m-12 6h8" stroke="color-mix(in srgb, var(--accent) 35%, #333)" strokeWidth="2" /></g>
      </g>
      <path className="assist-spark" d="m171 38 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill={state === 'error' ? '#f0a889' : 'var(--accent)'} />
    </svg>
    {showSpeech && <p className="assist-caption">{message || (state === 'compiling' ? 'Giving your ideas a little structure…' : state === 'error' ? 'A small correction, then we try again.' : state === 'success' ? 'Your paper is ready.' : 'Good ideas start with a blank page.')}</p>}
  </div>;
}
