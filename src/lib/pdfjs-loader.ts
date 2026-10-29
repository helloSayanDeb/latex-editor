import type * as PDFJS from 'pdfjs-dist';
type PDFWindow = Window & { pdfjsLib?: typeof PDFJS };
let pending: Promise<typeof PDFJS> | null = null;
/** One same-origin module/worker pair, shared by concurrent document loads. */
export function loadPDFJS(): Promise<typeof PDFJS> {
  const target = window as PDFWindow;
  if (target.pdfjsLib) return Promise.resolve(target.pdfjsLib);
  if (pending) return pending;
  pending = new Promise((resolve,reject) => {
    const script = document.createElement('script');
    script.type = 'module'; script.src = '/vendor/pdf-loader.mjs';
    script.onload = () => {
      if (!target.pdfjsLib) { pending = null; script.remove(); reject(new Error('The PDF viewer module did not initialize. Reload to retry.')); }
      else resolve(target.pdfjsLib);
    };
    script.onerror = () => { pending = null; script.remove(); reject(new Error('Could not load the PDF viewer. Reload to retry.')); };
    document.body.appendChild(script);
  });
  return pending;
}
