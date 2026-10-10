'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
  Download,
  ChevronLeft,
  ChevronRight,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { PDFPageRenderer } from '@/lib/pdf-page-renderer';
import { capturePDFPosition } from '@/lib/pdf-position';
import { Mascot } from '../Mascot';

interface PDFViewerProps {
  pdfBlob: Blob | null;
  isCompiling: boolean;
  onSyncTexJump?: (page: number, x: number, y: number) => void;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfBlob,
  isCompiling,
  onSyncTexJump,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.25);
  const [darkPaper, setDarkPaper] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [fitMode, setFitMode] = useState<'width' | 'page' | null>('width');
  const [renderError, setRenderError] = useState('');
  const syncCallback = useRef(onSyncTexJump);
  useEffect(() => { syncCallback.current = onSyncTexJump; }, [onSyncTexJump]);
  const rendererRef = useRef<PDFPageRenderer | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  // Ensure PDF.js is loaded
  const ensurePdfJs = useCallback(async (): Promise<any> => {
    if (typeof window === 'undefined') return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/pdf.min.js';
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
        }
        resolve(lib);
      };
      script.onerror = () => reject(new Error('Could not load the PDF viewer. Reload to try again.'));
      document.body.appendChild(script);
    });
  }, []);

  // Load PDF Document when blob changes
  useEffect(() => {
    if (!pdfBlob) {
      setPdfDoc(null);
      setNumPages(0);
      if (pagesContainerRef.current) {
        pagesContainerRef.current.innerHTML = '';
      }
      return;
    }

    let active = true;
    let loadingTask: any; // eslint-disable-line @typescript-eslint/no-explicit-any

    async function loadDocument() {
      try {
        setRenderError('');
        const pdfjs = await ensurePdfJs();
        if (!pdfjs || !active) return;
        const arrayBuffer = await pdfBlob!.arrayBuffer();
        if (!active) return;
        loadingTask = pdfjs.getDocument({ data: arrayBuffer, isEvalSupported: false });
        const doc = await loadingTask.promise;

        if (active) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(page => Math.min(page, doc.numPages));
        }
      } catch (err) {
        if (active) setRenderError((err as Error).message);
      }
    }

    loadDocument();

    return () => {
      active = false;
      loadingTask?.destroy();
    };
  }, [pdfBlob, ensurePdfJs]);

  useEffect(() => {
    if (!pdfDoc || !pagesContainerRef.current || !containerRef.current) return;
    const position = capturePDFPosition(containerRef.current, pagesContainerRef.current, scaleRef.current);
    const renderer = new PDFPageRenderer(pdfDoc, pagesContainerRef.current, containerRef.current,
      scaleRef.current, (page, x, y) => syncCallback.current?.(page, x, y), setRenderError);
    rendererRef.current = renderer;
    renderer.initialize(position).catch(error => setRenderError(error.message));
    return () => { renderer.destroy(); rendererRef.current = null; };
  }, [pdfDoc]);

  useEffect(() => { rendererRef.current?.setScale(scale); }, [scale]);
  useEffect(() => { rendererRef.current?.setDark(darkPaper); }, [darkPaper, pdfDoc]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfDoc || !fitMode) return;
    let active = true;
    const resize = async () => {
      const page = await pdfDoc.getPage(1);
      if (!active || !container.clientWidth) return;
      const viewport = page.getViewport({ scale: 1 });
      const width = (container.clientWidth - 48) / viewport.width;
      const height = (container.clientHeight - 48) / viewport.height;
      setScale(Math.max(.2, Math.min(3, fitMode === 'page' ? Math.min(width, height) : width)));
    };
    const observer = new ResizeObserver(() => { resize().catch(() => {}); });
    observer.observe(container);
    return () => { active = false; observer.disconnect(); };
  }, [pdfDoc, fitMode]);

  // Zoom controls
  const handleZoomIn = () => { setFitMode(null); setScale(s => Math.min(s + 0.1, 3)); };
  const handleZoomOut = () => { setFitMode(null); setScale(s => Math.max(s - 0.1, 0.2)); };
  const handleFitWidth = () => setFitMode('width');
  const handleFitPage = () => setFitMode('page');

  const jumpToPage = (page: number) => {
    const number = Math.max(1, Math.min(numPages, page));
    const target = pagesContainerRef.current?.querySelector<HTMLElement>(`[data-page-num="${number}"]`);
    if (target && containerRef.current) {
      containerRef.current.scrollTop += target.getBoundingClientRect().top - containerRef.current.getBoundingClientRect().top - 24;
      setCurrentPage(number);
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <div className={`relative flex flex-col h-full bg-[#07080c] overflow-hidden select-none ${className}`}>
      {/* Top Toolbar */}
      <div
        className="pdf-toolbar glass-panel flex items-center justify-between px-3 py-1.5 z-20"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}
      >
        {/* Left: document status */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.25)',
            }}
            title="PDF.js worker · Canvas 2D · visible pages first"
          >
            <Cpu size={13} />
            <span className="font-semibold">PDF preview</span>

          </div>

          {numPages > 0 && (
            <span className="text-xs text-slate-400 font-mono">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </span>
          )}
        </div>

        {/* Center: Zoom & View controls */}
        <div className="flex items-center gap-1">
          <button onClick={handleZoomOut} className="btn-icon" title="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-mono text-slate-300 w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <button onClick={handleZoomIn} className="btn-icon" title="Zoom In">
            <ZoomIn size={15} />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button onClick={handleFitWidth} className="btn-icon" title="Fit to Width">
            <Maximize2 size={14} />
          </button>
          <button onClick={handleFitPage} className="btn-icon" title="Fit to Page">
            <Minimize2 size={14} />
          </button>
        </div>

        {/* Right: dark paper and download */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDarkPaper(d => !d)}
            className={`btn-icon ${darkPaper ? 'text-indigo-400 bg-indigo-500/10' : 'text-amber-400'}`}
            title={`Toggle Dark Paper Mode: ${darkPaper ? 'ON' : 'OFF'}`}
          >
            {darkPaper ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button onClick={handleDownload} disabled={!pdfBlob} className="btn-icon" title="Download PDF">
            <Download size={15} />
          </button>
        </div>
      </div>

      {/* PDF Pages Scroll Area */}
      <div className="pdf-viewport-frame" aria-busy={isCompiling}>
      <div
        ref={containerRef}
        onScroll={() => {
          const container = containerRef.current;
          if (!container) return;
          const pages = pagesContainerRef.current?.querySelectorAll<HTMLElement>('[data-page-num]');
          const top = container.getBoundingClientRect().top;
          const visible = Array.from(pages || []).find(page => page.getBoundingClientRect().bottom > top + 48);
          if (visible) setCurrentPage(Number(visible.dataset.pageNum));
        }}
        className="pdf-pages flex-1 overflow-y-auto overflow-x-auto p-6 flex flex-col relative"
        style={{
          background: 'radial-gradient(circle at 50% 30%, rgba(17, 21, 33, 0.7) 0%, rgba(7, 8, 12, 1) 100%)',
        }}
      >
        {renderError && <div role="alert" className="workspace-error">{renderError}</div>}
        {/* Dynamic Canvas Container - Isolated from React DOM reconciliation */}
        <div ref={pagesContainerRef} className="flex flex-col items-center w-full" />

        {/* Empty State when no document compiled */}
        {!pdfBlob && !isCompiling && (
          <div className="pdf-empty-state">
            <Mascot state="idle" size={130} showSpeech message="A little structure. Endless possibilities." />
            <h3 className="text-lg font-bold text-white mt-4 tracking-tight">
              Your next paper starts here
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]">Ctrl + Enter</kbd> or click <strong>Compile</strong> to generate your PDF preview.
            </p>
          </div>
        )}

      </div>

        {/* Keep the overlay outside scrolling content so it covers the viewport at every page. */}
        {isCompiling && (
          <div role="status" className="pdf-compiling-overlay">
            <Mascot state="compiling" size={110} showSpeech message="Resolving equations & citations..." />
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 animate-pulse">
              <RefreshCw size={16} className="animate-spin" />
              <span>Compiling with LaTeX engine...</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint Bar */}
      <div
        className="pdf-hint glass-panel flex items-center justify-between px-3 py-1 text-[11px] text-slate-400 z-10"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        <span>Ctrl+Click PDF to jump to source</span>
        {numPages > 0 && <div className="flex items-center gap-1">
          <button className="btn-icon" aria-label="Previous PDF page" disabled={currentPage <= 1} onClick={() => jumpToPage(currentPage - 1)}><ChevronLeft size={14} /></button>
          <input aria-label="PDF page number" type="number" min={1} max={numPages} value={currentPage} className="input-dark" style={{ width: 52, padding: '2px 5px' }} onChange={e => { const page = Number(e.target.value); if (Number.isInteger(page) && page >= 1 && page <= numPages) jumpToPage(page); }} />
          <span>/ {numPages}</span>
          <button className="btn-icon" aria-label="Next PDF page" disabled={currentPage >= numPages} onClick={() => jumpToPage(currentPage + 1)}><ChevronRight size={14} /></button>
        </div>}
        <span className="font-mono text-[10px]">
          {darkPaper ? 'Dark paper' : ''}
        </span>
      </div>
    </div>
  );
};
