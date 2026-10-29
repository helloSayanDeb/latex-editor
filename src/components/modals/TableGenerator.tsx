'use client';

import { Checkbox } from '../Checkbox';
import { escapeLatexText } from '@/lib/latex-text';
import React, { useState } from 'react';
import { Table, Check, X, Plus, Trash2 } from 'lucide-react';

interface TableGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (latexCode: string) => void;
}

export const TableGenerator: React.FC<TableGeneratorProps> = ({
  isOpen,
  onClose,
  onInsertTable,
}) => {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [useBooktabs, setUseBooktabs] = useState(true);
  const [alignments, setAlignments] = useState<('l' | 'c' | 'r')[]>(['l', 'c', 'c']);
  const [tableData, setTableData] = useState<string[][]>([
    ['Metric', 'Baseline', 'Proposed'],
    ['Accuracy', '84.2%', '93.7%'],
    ['Latency (ms)', '42.1', '18.4'],
  ]);
  const [caption, setCaption] = useState('Experimental Performance Comparison');
  const [label, setLabel] = useState('tab:comparison');

  if (!isOpen) return null;

  const updateCell = (r: number, c: number, val: string) => {
    const copy = tableData.map(row => [...row]);
    if (!copy[r]) copy[r] = [];
    copy[r][c] = val;
    setTableData(copy);
  };

  const addRow = () => {
    setRows(r => r + 1);
    setTableData(prev => [...prev, new Array(cols).fill('')]);
  };

  const addCol = () => {
    setCols(c => c + 1);
    setAlignments(prev => [...prev, 'c']);
    setTableData(prev => prev.map(row => [...row, '']));
  };

  const generateLatex = (): string => {
    const alignStr = alignments.slice(0, cols).join(' ');
    let code = `\\begin{table}[h]\n\\centering\n`;
    code += `\\caption{${escapeLatexText(caption)}}\n`;
    code += `\\label{${label.replace(/[^a-zA-Z0-9:._-]/g, '-')}}\n`;
    code += `\\begin{tabular}{${alignStr}}\n`;

    if (useBooktabs) {
      code += `\\toprule\n`;
    } else {
      code += `\\hline\n`;
    }

    tableData.forEach((row, rIdx) => {
      const rowSlice = row.slice(0, cols);
      const rowStr = rowSlice.map((cell, cIdx) => (rIdx === 0 ? `\\textbf{${escapeLatexText(cell)}}` : escapeLatexText(cell))).join(' & ');
      code += `${rowStr} \\\\\n`;

      if (rIdx === 0) {
        if (useBooktabs) {
          code += `\\midrule\n`;
        } else {
          code += `\\hline\n`;
        }
      }
    });

    if (useBooktabs) {
      code += `\\bottomrule\n`;
    } else {
      code += `\\hline\n`;
    }

    code += `\\end{tabular}\n\\end{table}\n`;
    return code;
  };

  const handleInsert = () => {
    onInsertTable(generateLatex());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div
        className="glass-card flex flex-col w-full max-w-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          maxHeight: '90vh',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Table size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Visual Table Generator</h2>
              <p className="text-xs text-slate-400">Design academic booktabs & standard tables</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs">
          {/* Controls */}
          <div className="flex items-center gap-4 flex-wrap">
            <Checkbox checked={useBooktabs} onChange={setUseBooktabs}>
              <span className="text-slate-300 font-semibold">Use Booktabs (\\toprule, \\midrule)</span>
            </Checkbox>

            <button onClick={addRow} className="btn-secondary text-xs">
              <Plus size={13} />
              <span>Add Row</span>
            </button>
            <button onClick={addCol} className="btn-secondary text-xs">
              <Plus size={13} />
              <span>Add Column</span>
            </button>
          </div>

          {/* Grid Editor */}
          <div className="overflow-x-auto rounded-xl border border-white/10 p-2 bg-black/30">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {alignments.slice(0, cols).map((align, cIdx) => (
                    <th key={cIdx} className="p-1">
                      <select
                        value={align}
                        onChange={e => {
                          const copy = [...alignments];
                          copy[cIdx] = e.target.value as 'l' | 'c' | 'r';
                          setAlignments(copy);
                        }}
                        className="input-dark py-0.5 px-1 text-[11px] w-full text-center"
                      >
                        <option value="l">Left (l)</option>
                        <option value="c">Center (c)</option>
                        <option value="r">Right (r)</option>
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {new Array(cols).fill(0).map((_, cIdx) => (
                      <td key={cIdx} className="p-1">
                        <input
                          type="text"
                          value={row[cIdx] || ''}
                          onChange={e => updateCell(rIdx, cIdx, e.target.value)}
                          placeholder={rIdx === 0 ? `Header ${cIdx + 1}` : `Val`}
                          className={`input-dark w-full py-1 px-2 text-xs ${
                            rIdx === 0 ? 'font-bold text-emerald-400' : ''
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="text-slate-300 font-semibold">Table Caption</span>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                className="input-dark"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-300 font-semibold">Label (for \\ref)</span>
              <input
                type="text"
                value={label}
                onChange={e => setLabel(e.target.value)}
                className="input-dark font-mono text-[11px]"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-white/10">
          <button onClick={onClose} className="btn-secondary text-xs">
            Cancel
          </button>
          <button onClick={handleInsert} className="btn-primary text-xs">
            <Check size={14} />
            <span>Insert Table at Cursor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
