'use client';

import React from 'react';
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  File,
  Plus,
  Trash2,
  FolderOpen,
} from 'lucide-react';

interface FileTreeProps {
  files: Record<string, string>;
  activeFile: string;
  onSelectFile: (fileName: string) => void;
  onNewFile: () => void;
  onDeleteFile: (fileName: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  activeFile,
  onSelectFile,
  onNewFile,
  onDeleteFile,
}) => {
  const fileNames = Object.keys(files).sort((a, b) => {
    if (a === 'main.tex') return -1;
    if (b === 'main.tex') return 1;
    return a.localeCompare(b);
  });

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'tex') return <FileCode size={14} className="text-emerald-400" />;
    if (ext === 'bib') return <FileText size={14} className="text-amber-400" />;
    if (['png', 'jpg', 'jpeg', 'svg', 'eps'].includes(ext || ''))
      return <ImageIcon size={14} className="text-sky-400" />;
    return <File size={14} className="text-slate-400" />;
  };

  return (
    <div className="flex flex-col gap-1 select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <FolderOpen size={13} className="text-slate-500" />
          <span>Files</span>
        </div>
        <button
          onClick={onNewFile}
          className="btn-icon"
          style={{ width: 22, height: 22 }}
          title="Create New File"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* File List */}
      <div className="flex flex-col gap-0.5 px-1.5">
        {fileNames.map(fileName => {
          const isActive = fileName === activeFile;
          return (
            <div
              key={fileName}
              onClick={() => onSelectFile(fileName)}
              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                {getFileIcon(fileName)}
                <span className="truncate">{fileName}</span>
              </div>

              {fileName !== 'main.tex' && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onDeleteFile(fileName);
                  }}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity p-0.5"
                  title="Delete file"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
