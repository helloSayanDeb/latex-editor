'use client';

import React, { useState } from 'react';
import { FilePlus, X, Upload } from 'lucide-react';
import { validateFilename } from '@/lib/security';

interface NewFileModalProps {
  isOpen: boolean;
  existingFiles: string[];
  onClose: () => void;
  onCreateFile: (fileName: string, initialContent?: string) => void;
}

export const NewFileModal: React.FC<NewFileModalProps> = ({
  isOpen,
  existingFiles,
  onClose,
  onCreateFile,
}) => {
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fileName.trim();
    if (existingFiles.some(name => name.toLowerCase() === cleanName.replace(/\\/g, '/').toLowerCase())) {
      setError('A file with this name already exists. Choose another name.');
      return;
    }
    if (!cleanName) {
      setError('Please provide a file name');
      return;
    }

    if (!cleanName.includes('.')) {
      setError('Please include an extension (e.g. .tex, .bib)');
      return;
    }

    if (!validateFilename(cleanName)) {
      setError('Invalid file extension or name');
      return;
    }

    onCreateFile(cleanName, cleanName.endsWith('.bib') ? '% Bibliography entries\n' : '% LaTeX file\n');
    setFileName('');
    setError('');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (existingFiles.some(name => name.toLowerCase() === file.name.toLowerCase())) {
      setError('A file with this name already exists. Rename it before uploading.');
      e.target.value = '';
      return;
    }

    if (!validateFilename(file.name)) {
      setError(`File type not allowed for: ${file.name}`);
      return;
    }

    const reader = new FileReader();
    const isImageOrPdf = ['.png', '.jpg', '.jpeg', '.pdf', '.svg'].some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (isImageOrPdf) {
      reader.readAsDataURL(file);
      reader.onload = () => {
        onCreateFile(file.name, reader.result as string);
        onClose();
      };
    } else {
      reader.readAsText(file);
      reader.onload = () => {
        onCreateFile(file.name, reader.result as string);
        onClose();
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div
        className="glass-card flex flex-col w-full max-w-sm overflow-hidden shadow-2xl"
        style={{
          background: 'rgba(15, 18, 28, 0.98)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FilePlus size={16} />
            </div>
            <h2 className="text-sm font-bold text-white">Add Project File</h2>
          </div>
          <button onClick={onClose} className="btn-icon" aria-label="Close add file">
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4 text-xs">
          <label className="flex flex-col gap-1.5">
            <span className="text-slate-300 font-semibold">New File Name</span>
            <input
              type="text"
              placeholder="e.g. chapter1.tex, figures.bib"
              value={fileName}
              onChange={e => {
                setFileName(e.target.value);
                setError('');
              }}
              autoFocus
              className="input-dark"
            />
            {error && <span className="text-rose-400 text-[11px]">{error}</span>}
          </label>

          <div className="flex items-center justify-between pt-1">
            <button type="submit" className="btn-primary w-full justify-center">
              Create File
            </button>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-2 text-[10px] text-slate-500 uppercase tracking-widest">
              or upload
            </span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <label className="btn-secondary justify-center cursor-pointer">
            <Upload size={14} />
            <span>Upload Image or TeX File</span>
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
        </form>
      </div>
    </div>
  );
};
