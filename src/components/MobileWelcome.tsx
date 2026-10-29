'use client';
import { readPreference } from '@/lib/preferences';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Monitor, Tablet, Smartphone } from 'lucide-react';
import { Logo } from './Logo';

const preference = 'lemmata_mobile_continue';

export function MobileWelcome() {
  const [show, setShow] = useState(false);
  const continueRef = useRef<HTMLButtonElement>(null);
  const sessionAccepted = useRef(false);
  useEffect(() => {
    const mobile = window.matchMedia('(max-width: 600px), (max-height: 500px) and (pointer: coarse)');
    const update = () => {
      let accepted = sessionAccepted.current;
      try { accepted = localStorage.getItem(preference) === 'true'; } catch { /* Session fallback. */ }
      setShow(mobile.matches && !accepted);
    };
    update();
    mobile.addEventListener('change', update);
    window.addEventListener('storage', update);
    return () => { mobile.removeEventListener('change', update); window.removeEventListener('storage', update); };
  }, []);
  useEffect(() => { if (show) continueRef.current?.focus(); }, [show]);
  if (!show) return null;
  return <div className="mobile-welcome" role="dialog" aria-modal="true" aria-labelledby="mobile-welcome-title" aria-describedby="mobile-welcome-description" onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); continueRef.current?.focus(); } }}>
    <div className="mobile-welcome-card">
      <div className="mobile-welcome-brand"><Logo size="md" /></div>
      <div className="mobile-welcome-devices" aria-hidden="true"><Monitor size={64} strokeWidth={1.3} /><Tablet size={40} strokeWidth={1.4} style={{ transform: 'rotate(-90deg)' }} /><Smartphone size={26} strokeWidth={1.4} style={{ transform: 'rotate(-90deg)' }} /></div>
      <span className="mobile-welcome-eyebrow">A little more room for your ideas</span>
      <h1 id="mobile-welcome-title">Made for a bigger workspace.</h1>
      <p id="mobile-welcome-description">Lemmata works best on a tablet or desktop, with room for your code, PDF and Lemmata Assist side by side.</p>
      <p className="mobile-welcome-note">Using a tablet or phone? Turn it to landscape for more room. You can still continue here with compact panels.</p>
      <button ref={continueRef} className="mobile-welcome-continue" onClick={() => {
        try { localStorage.setItem(preference, 'true'); } catch { sessionAccepted.current = true; }
        setShow(false);
      }}>Continue here <ArrowRight size={17} /></button>
      <small className="mobile-welcome-remember">We’ll remember your choice in this browser.</small>
    </div>
  </div>;
}
