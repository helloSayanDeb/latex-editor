'use client';

import React, { useState } from 'react';
import { Sigma, Search, X } from 'lucide-react';

interface SymbolPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSymbol: (symbolCode: string) => void;
}

interface SymbolCategory {
  name: string;
  items: { latex: string; display: string }[];
}

const SYMBOL_CATEGORIES: SymbolCategory[] = [
  {
    name: 'Greek Letters',
    items: [
      { latex: '\\alpha', display: 'α' },
      { latex: '\\beta', display: 'β' },
      { latex: '\\gamma', display: 'γ' },
      { latex: '\\delta', display: 'δ' },
      { latex: '\\epsilon', display: 'ε' },
      { latex: '\\zeta', display: 'ζ' },
      { latex: '\\eta', display: 'η' },
      { latex: '\\theta', display: 'θ' },
      { latex: '\\lambda', display: 'λ' },
      { latex: '\\mu', display: 'μ' },
      { latex: '\\pi', display: 'π' },
      { latex: '\\rho', display: 'ρ' },
      { latex: '\\sigma', display: 'σ' },
      { latex: '\\tau', display: 'τ' },
      { latex: '\\phi', display: 'φ' },
      { latex: '\\psi', display: 'ψ' },
      { latex: '\\omega', display: 'ω' },
      { latex: '\\Gamma', display: 'Γ' },
      { latex: '\\Delta', display: 'Δ' },
      { latex: '\\Theta', display: 'Θ' },
      { latex: '\\Lambda', display: 'Λ' },
      { latex: '\\Sigma', display: 'Σ' },
      { latex: '\\Phi', display: 'Φ' },
      { latex: '\\Psi', display: 'Ψ' },
      { latex: '\\Omega', display: 'Ω' },
    ],
  },
  {
    name: 'Calculus & Operators',
    items: [
      { latex: '\\int_{a}^{b}', display: '∫' },
      { latex: '\\iint', display: '∬' },
      { latex: '\\oint', display: '∮' },
      { latex: '\\sum_{i=1}^{n}', display: '∑' },
      { latex: '\\prod_{i=1}^{n}', display: '∏' },
      { latex: '\\partial', display: '∂' },
      { latex: '\\nabla', display: '∇' },
      { latex: '\\infty', display: '∞' },
      { latex: '\\lim_{x \\to 0}', display: 'lim' },
      { latex: '\\frac{df}{dx}', display: 'df/dx' },
      { latex: '\\sqrt{x}', display: '√' },
      { latex: '\\pm', display: '±' },
      { latex: '\\times', display: '×' },
      { latex: '\\div', display: '÷' },
      { latex: '\\cdot', display: '·' },
    ],
  },
  {
    name: 'Relations & Sets',
    items: [
      { latex: '\\leq', display: '≤' },
      { latex: '\\geq', display: '≥' },
      { latex: '\\neq', display: '≠' },
      { latex: '\\approx', display: '≈' },
      { latex: '\\equiv', display: '≡' },
      { latex: '\\in', display: '∈' },
      { latex: '\\notin', display: '∉' },
      { latex: '\\subset', display: '⊂' },
      { latex: '\\subseteq', display: '⊆' },
      { latex: '\\cup', display: '∪' },
      { latex: '\\cap', display: '∩' },
      { latex: '\\forall', display: '∀' },
      { latex: '\\exists', display: '∃' },
      { latex: '\\Rightarrow', display: '⇒' },
      { latex: '\\Leftrightarrow', display: '⇔' },
      { latex: '\\to', display: '→' },
    ],
  },
  {
    name: 'CircuiTikZ Components',
    items: [
      { latex: 'to[R, l=$R$]', display: 'Resistor' },
      { latex: 'to[C, l=$C$]', display: 'Capacitor' },
      { latex: 'to[L, l=$L$]', display: 'Inductor' },
      { latex: 'to[V, v=$V$]', display: 'Voltage' },
      { latex: 'to[I, i=$I$]', display: 'Current' },
      { latex: 'to[diode]', display: 'Diode' },
      { latex: 'to[ground]', display: 'Ground' },
      { latex: 'node[op amp] {}', display: 'Op-Amp' },
      { latex: 'node[nmos] {}', display: 'NMOS' },
      { latex: 'node[pmos] {}', display: 'PMOS' },
    ],
  },
];

export const SymbolPalette: React.FC<SymbolPaletteProps> = ({
  isOpen,
  onClose,
  onInsertSymbol,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(SYMBOL_CATEGORIES[0].name);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div
        className="glass-card flex flex-col w-full max-w-xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15, 18, 28, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          maxHeight: '85vh',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Sigma size={16} />
            </div>
            <h2 className="text-sm font-bold text-white">LaTeX Symbol Palette</h2>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={17} />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-white/5 relative">
          <Search size={14} className="absolute left-6 top-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search symbol by name or command..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-dark w-full pl-8 text-xs"
          />
        </div>

        {/* Category Tabs */}
        {!search && (
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-white/5 overflow-x-auto text-xs">
            {SYMBOL_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => setActiveTab(cat.name)}
                className={`px-3 py-1.5 rounded-t-lg transition-colors whitespace-nowrap ${
                  activeTab === cat.name
                    ? 'bg-white/10 text-emerald-400 font-bold border-b-2 border-emerald-500'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid of symbols */}
        <div className="flex-1 overflow-y-auto p-4 max-h-80">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {SYMBOL_CATEGORIES.filter(cat => (search ? true : cat.name === activeTab))
              .flatMap(cat => cat.items)
              .filter(item =>
                search
                  ? item.latex.toLowerCase().includes(search.toLowerCase()) ||
                    item.display.toLowerCase().includes(search.toLowerCase())
                  : true
              )
              .map((sym, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onInsertSymbol(sym.latex);
                    onClose();
                  }}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/5 transition-all group"
                  title={`Insert: ${sym.latex}`}
                >
                  <span className="text-base text-white group-hover:scale-110 transition-transform font-serif">
                    {sym.display}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-full mt-1">
                    {sym.latex}
                  </span>
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
