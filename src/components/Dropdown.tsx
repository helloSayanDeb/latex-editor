'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, Eye, Type, HelpCircle } from 'lucide-react';

export function useOutsideDismiss<T extends HTMLElement>(open: boolean, close: (element: T | null) => void) {
  const ref = useRef<T>(null);
  const closer = useRef(close);
  useEffect(() => { closer.current = close; });
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) closer.current(ref.current); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') closer.current(ref.current); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  return ref;
}

export function Dropdown({ label, value, options, onChange, placeholder = 'Select…', disabled = false }: {
  label: string; value: string; options: { value: string; label: string; detail?: string; capability?: 'vision' | 'text' | 'unknown' }[];
  onChange: (value: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(0);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useOutsideDismiss<HTMLDivElement>(open, () => setOpen(false));
  const selected = options.find(option => option.value === value);
  useEffect(() => { if (open) root.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[focused]?.focus(); }, [open, focused, root]);
  const choose = (next: string) => { onChange(next); setOpen(false); trigger.current?.focus(); };
  return <div className="custom-select" ref={root}>
    <span className="custom-select-label" id={`${id}-label`}>{label}</span>
    <button type="button" ref={trigger} className="custom-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-menu`} disabled={disabled}
      onClick={() => { setFocused(Math.max(0, options.findIndex(option => option.value === value))); setOpen(!open); }}
      onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setFocused(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true); } }}>
      <span>{selected?.label || placeholder}</span>{selected?.capability && <Capability value={selected.capability} />}<ChevronDown size={15} className={open ? 'select-chevron-open' : ''} />
    </button>
    {open && <div id={`${id}-menu`} className="custom-select-menu" role="listbox" aria-labelledby={`${id}-label`} onKeyDown={event => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setFocused(index => (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length); }
      if (event.key === 'Home') { event.preventDefault(); setFocused(0); }
      if (event.key === 'End') { event.preventDefault(); setFocused(options.length - 1); }
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
      if (event.key === 'Tab') setOpen(false);
    }}>
      {options.map((option, index) => <button type="button" key={option.value} role="option" aria-selected={value === option.value} tabIndex={focused === index ? 0 : -1} onClick={() => choose(option.value)}>
        <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>{option.capability && <Capability value={option.capability} />}{value === option.value && <Check size={15} />}
      </button>)}
    </div>}
  </div>;
}

function Capability({ value }: { value: 'vision' | 'text' | 'unknown' }) {
  return <span className={`model-capability model-capability-${value}`} title={value === 'vision' ? 'Text and image input' : value === 'text' ? 'Text input only' : 'Image support not reported'}>{value === 'vision' ? <Eye size={13} /> : value === 'text' ? <Type size={13} /> : <HelpCircle size={13} />}<span>{value === 'vision' ? 'Vision' : value === 'text' ? 'Text' : 'Unverified'}</span></span>;
}
