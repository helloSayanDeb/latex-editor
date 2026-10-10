'use client';

import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (checked: boolean) => void; children: ReactNode }) {
  return <label className="workspace-checkbox">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    <span className="workspace-checkbox-box" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
    <span>{children}</span>
  </label>;
}
