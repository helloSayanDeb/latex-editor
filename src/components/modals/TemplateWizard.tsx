'use client';

import { generateTemplate } from '@/lib/templates';
import React, { useState } from 'react';
import { Sparkles, FileText, Cpu, BookOpen, Layers, Check, X, ArrowRight, ArrowLeft } from 'lucide-react';

interface TemplateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (latexCode: string) => void;
}

interface TemplateOption {
  id: string;
  name: string;
  description: string;
  docClass: string;
  defaultPackages: string[];
  icon: React.ReactNode;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'article',
    name: 'Research Article (IEEE / ACM / arXiv)',
    description: 'Two-column or single-column scientific publication with abstract, math, and references.',
    docClass: 'article',
    defaultPackages: ['amsmath', 'amssymb', 'graphicx', 'booktabs', 'hyperref', 'cite'],
    icon: <FileText size={20} className="text-emerald-400" />,
  },
  {
    id: 'circuit',
    name: 'CircuiTikZ Schematic & Engineering',
    description: 'Hardware schematics, electrical circuits, RLC networks, and block diagrams.',
    docClass: 'article',
    defaultPackages: ['amsmath', 'circuitikz', 'graphicx', 'siunitx'],
    icon: <Cpu size={20} className="text-sky-400" />,
  },
  {
    id: 'math',
    name: 'Pure Mathematics & Theorems',
    description: 'Theorems, lemmas, proofs, complex integrals, and linear algebra matrices.',
    docClass: 'article',
    defaultPackages: ['amsmath', 'amssymb', 'amsthm', 'mathtools'],
    icon: <Sparkles size={20} className="text-purple-400" />,
  },
  {
    id: 'exam',
    name: 'Exam & Assignment Worksheet',
    description: 'Numbered questions, point values, solution spaces, and academic headers.',
    docClass: 'exam',
    defaultPackages: ['amsmath', 'amssymb', 'geometry'],
    icon: <BookOpen size={20} className="text-amber-400" />,
  },
  {
    id: 'beamer',
    name: 'Beamer Presentation Slides',
    description: 'Modern conference slides with Metropolis / Madrid dark-ready theme.',
    docClass: 'beamer',
    defaultPackages: ['amsmath', 'graphicx', 'booktabs'],
    icon: <Layers size={20} className="text-rose-400" />,
  },
  {
    id: 'minimal',
    name: 'Minimal Blank Template',
    description: 'Ultra-fast clean starting point with essential formatting only.',
    docClass: 'article',
    defaultPackages: ['amsmath', 'geometry'],
    icon: <FileText size={20} className="text-slate-400" />,
  },
];

export const TemplateWizard: React.FC<TemplateWizardProps> = ({
  isOpen,
  onClose,
  onApplyTemplate,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>(TEMPLATE_OPTIONS[0]);

  // Form configuration
  const [title, setTitle] = useState('Quantum Coherence in Superconducting Circuits');
  const [author, setAuthor] = useState('Alex Vance, Gordon Freeman');
  const [fontSize, setFontSize] = useState('11pt');
  const [margin, setMargin] = useState('0.85in');
  const [selectedPackages, setSelectedPackages] = useState<string[]>(TEMPLATE_OPTIONS[0].defaultPackages);
  const [sections, setSections] = useState<string>('Introduction, Methodology, Experiments, Discussion, Conclusion');

  if (!isOpen) return null;

  const handleSelectTemplate = (tmpl: TemplateOption) => {
    setSelectedTemplate(tmpl);
    setSelectedPackages(tmpl.defaultPackages);
    setStep(2);
  };

  const togglePackage = (pkg: string) => {
    setSelectedPackages(prev =>
      prev.includes(pkg) ? prev.filter(p => p !== pkg) : [...prev, pkg]
    );
  };

  const generateLatex = () => generateTemplate({ docClass: selectedTemplate.docClass, templateId: selectedTemplate.id, title, author, fontSize, margin, selectedPackages, sections });

  const handleFinish = () => {
    const finalCode = generateLatex();
    onApplyTemplate(finalCode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div
        className="glass-card flex flex-col w-full max-w-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15, 18, 28, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400" />
              <span>Document Template Wizard</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {step} of 3: {step === 1 ? 'Select Blueprint' : step === 2 ? 'Configure Details' : 'Review & Create'}
            </p>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATE_OPTIONS.map(tmpl => (
                <div
                  key={tmpl.id}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border flex flex-col gap-2 ${
                    selectedTemplate.id === tmpl.id
                      ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg'
                      : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {tmpl.icon}
                    <span className="font-semibold text-sm text-white">{tmpl.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-300 font-semibold">Document Title</span>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="input-dark"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-slate-300 font-semibold">Author(s)</span>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="input-dark"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex flex-col gap-1">
                  <span className="text-slate-300 font-semibold">Base Font Size</span>
                  <select
                    value={fontSize}
                    onChange={e => setFontSize(e.target.value)}
                    className="input-dark"
                  >
                    <option value="10pt">10pt (Standard publication)</option>
                    <option value="11pt">11pt (Modern readable)</option>
                    <option value="12pt">12pt (Comfort / Thesis)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-slate-300 font-semibold">Margins</span>
                  <select
                    value={margin}
                    onChange={e => setMargin(e.target.value)}
                    className="input-dark"
                  >
                    <option value="0.75in">Narrow (0.75 in)</option>
                    <option value="0.85in">Standard (0.85 in)</option>
                    <option value="1.0in">Wide / Thesis (1.0 in)</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-slate-300 font-semibold">Section Outline (comma-separated)</span>
                <input
                  type="text"
                  value={sections}
                  onChange={e => setSections(e.target.value)}
                  className="input-dark"
                />
              </label>

              <div>
                <span className="text-slate-300 font-semibold block mb-2">Packages to Include</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'amsmath',
                    'amssymb',
                    'graphicx',
                    'booktabs',
                    'circuitikz',
                    'hyperref',
                    'microtype',
                    'cite',
                    'siunitx',
                    'tikz',
                  ].map(pkg => (
                    <button
                      key={pkg}
                      type="button"
                      onClick={() => togglePackage(pkg)}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors border ${
                        selectedPackages.includes(pkg)
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-3">
              <span className="text-xs text-slate-400">
                Generated LaTeX preamble & structure preview:
              </span>
              <pre
                className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-emerald-300 overflow-y-auto"
                style={{ maxHeight: 300 }}
              >
                {generateLatex()}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10">
          {step > 1 ? (
            <button
              onClick={() => setStep((s => (s - 1) as any))}
              className="btn-secondary text-xs"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((s => (s + 1) as any))}
              className="btn-primary text-xs"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button onClick={handleFinish} className="btn-primary text-xs">
              <Check size={14} />
              <span>Create Document</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
