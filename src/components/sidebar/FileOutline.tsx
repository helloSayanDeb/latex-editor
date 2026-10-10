'use client';

import React, { useMemo } from 'react';
import { ListTree, Hash } from 'lucide-react';

interface OutlineItem {
  level: number;
  title: string;
  lineNumber: number;
}

interface FileOutlineProps {
  content: string;
  onJumpToLine: (line: number) => void;
}

export const FileOutline: React.FC<FileOutlineProps> = ({ content, onJumpToLine }) => {
  const items: OutlineItem[] = useMemo(() => {
    if (!content) return [];
    const lines = content.split('\n');
    const result: OutlineItem[] = [];

    const sectionRegex = /\\(part|chapter|section|subsection|subsubsection)\*?\{([^}]+)\}/;

    lines.forEach((lineText, index) => {
      const match = lineText.match(sectionRegex);
      if (match) {
        const type = match[1];
        const title = match[2];
        let level = 1;
        if (type === 'part') level = 0;
        else if (type === 'chapter') level = 1;
        else if (type === 'section') level = 2;
        else if (type === 'subsection') level = 3;
        else if (type === 'subsubsection') level = 4;

        result.push({
          level,
          title,
          lineNumber: index + 1,
        });
      }
    });

    return result;
  }, [content]);

  return (
    <div className="flex flex-col gap-1 select-none">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider">
        <ListTree size={13} className="text-slate-500" />
        <span>Document Outline</span>
      </div>

      <div className="flex flex-col gap-0.5 px-1.5 overflow-y-auto max-h-56">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-slate-500 italic">
            No sections found in active file.
          </div>
        ) : (
          items.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onJumpToLine(item.lineNumber)}
              className="flex items-center gap-1.5 py-1 px-2 rounded-md text-xs text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer transition-colors truncate"
              style={{
                paddingLeft: `${Math.max(6, item.level * 10)}px`,
              }}
              title={`Line ${item.lineNumber}: ${item.title}`}
            >
              <Hash size={11} className="text-emerald-500/60 flex-shrink-0" />
              <span className="truncate">{item.title}</span>
              <span className="ml-auto text-[10px] text-slate-500 font-mono">
                L{item.lineNumber}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
