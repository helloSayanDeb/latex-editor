import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist';
import type { PageViewport } from 'pdfjs-dist/types/src/display/display_utils';
import { syncTexPoint } from './pdf-coordinates';
import { restorePDFPosition, type PDFPosition } from './pdf-position';

type PageEntry = {
  page: PDFPageProxy; viewport: PageViewport; wrapper: HTMLDivElement;
  canvas?: HTMLCanvasElement; renderedScale?: number; nearby: boolean; lastUsed: number;
};

/** Retain completed pixels during zoom. Rasterize nearby pages serially, with bounded memory. */
export class PDFPageRenderer {
  private entries: PageEntry[] = [];
  private observer: IntersectionObserver;
  private task?: RenderTask;
  private timer?: ReturnType<typeof setTimeout>;
  private disposed = false;
  private revision = 0;
  private busy = false;
  private dark = false;
  private settled = true;

  constructor(
    private doc: PDFDocumentProxy, private host: HTMLElement, private scroll: HTMLElement,
    private scale: number, private onJump: (page: number, x: number, y: number) => void,
    private onError: (message: string) => void,
  ) {
    this.observer = new IntersectionObserver(records => {
      for (const record of records) {
        const entry = this.entries[Number((record.target as HTMLElement).dataset.pageNum) - 1];
        if (entry) entry.nearby = record.isIntersecting;
      }
      this.pump();
    }, { root: scroll, rootMargin: '400px 0px' });
  }

  async initialize(position?: PDFPosition | null) {
    // Build geometry offscreen before replacing the previous document. Clearing it
    // first causes the browser to clamp scrollTop to zero during recompilation.
    const fragment = document.createDocumentFragment();
    for (let number = 1; number <= this.doc.numPages; number++) {
      const page = await this.doc.getPage(number);
      if (this.disposed) return;
      const viewport = page.getViewport({ scale: 1 });
      const wrapper = document.createElement('div');
      wrapper.className = 'pdf-page-card';
      wrapper.dataset.pageNum = String(number);
      wrapper.setAttribute('aria-label', `PDF page ${number}`);
      const badge = document.createElement('span');
      badge.className = 'pdf-page-badge';
      badge.textContent = `Page ${number} / ${this.doc.numPages}`;
      wrapper.append(badge);
      const entry: PageEntry = { page, viewport, wrapper, nearby: number === Math.min(position?.page || 1, this.doc.numPages), lastUsed: 0 };
      this.entries.push(entry);
      this.size(entry);
      wrapper.addEventListener('click', event => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        const rect = wrapper.getBoundingClientRect();
        const point = syncTexPoint(event.clientX, event.clientY, rect, viewport);
        const marker = document.createElement('span');
        marker.className = 'pdf-sync-marker';
        marker.style.left = `${event.clientX - rect.left}px`;
        marker.style.top = `${event.clientY - rect.top}px`;
        wrapper.append(marker);
        setTimeout(() => marker.remove(), 900);
        this.onJump(number, point.x, point.y);
      });
      fragment.append(wrapper);
    }
    if (this.disposed) return;
    this.host.replaceChildren(fragment);
    if (position) restorePDFPosition(position, this.scroll, this.host, this.scale, this.doc.numPages);
    for (const entry of this.entries) this.observer.observe(entry.wrapper);
    this.pump();
  }

  setDark(dark: boolean) {
    this.dark = dark;
    for (const entry of this.entries) this.appearance(entry);
  }

  setScale(scale: number) {
    if (Math.abs(scale - this.scale) < .0001) return;
    const ratio = scale / this.scale;
    const scrollTop = this.scroll.scrollTop;
    this.scale = scale;
    this.revision++;
    this.settled = false;
    this.task?.cancel();
    for (const entry of this.entries) this.size(entry);
    this.scroll.scrollTop = scrollTop * ratio;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.settled = true; this.pump(); }, 120);
  }

  private size(entry: PageEntry) {
    entry.wrapper.style.width = `${entry.viewport.width * this.scale}px`;
    entry.wrapper.style.height = `${entry.viewport.height * this.scale}px`;
    this.appearance(entry);
  }

  private appearance(entry: PageEntry) {
    entry.wrapper.classList.toggle('pdf-dark-paper', this.dark);
  }

  private async pump() {
    if (this.disposed || this.busy || !this.settled) return;
    const top = this.scroll.getBoundingClientRect().top;
    const candidates = this.entries.filter(entry => entry.nearby && entry.renderedScale !== this.scale);
    candidates.sort((a, b) => Math.abs(a.wrapper.getBoundingClientRect().top - top) - Math.abs(b.wrapper.getBoundingClientRect().top - top));
    const entry = candidates[0];
    if (!entry) { this.evict(); return; }
    this.busy = true;
    const revision = this.revision;
    const scale = this.scale;
    try {
      const viewport = entry.page.getViewport({ scale });
      // Cap raster pixels on large/high-DPI pages; CSS retains exact page geometry.
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8_000_000 / (viewport.width * viewport.height)));
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width * ratio);
      canvas.height = Math.ceil(viewport.height * ratio);
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Could not create PDF page canvas.');
      const task = entry.page.render({ canvasContext: context, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      this.task = task;
      await task.promise;
      if (this.disposed || revision !== this.revision) return;
      // The old canvas remains on screen until the replacement is fully drawn.
      entry.canvas?.remove();
      entry.canvas = canvas;
      entry.wrapper.prepend(canvas);
      entry.renderedScale = scale;
      entry.lastUsed = performance.now();
      entry.wrapper.dataset.renderedScale = String(scale);
      this.evict();
    } catch (error) {
      if (!this.disposed && (error as Error).name !== 'RenderingCancelledException') {
        entry.renderedScale = scale; // Avoid repeatedly retrying a malformed page.
        this.onError((error as Error).message);
      }
    } finally {
      this.task = undefined;
      this.busy = false;
      if (!this.disposed) this.pump();
    }
  }

  private evict() {
    const resident = this.entries.filter(entry => entry.canvas);
    const offscreen = resident.filter(entry => !entry.nearby).sort((a, b) => a.lastUsed - b.lastUsed);
    while (resident.length > 8 && offscreen.length) {
      const entry = offscreen.shift()!;
      entry.canvas!.remove();
      entry.canvas!.width = entry.canvas!.height = 0;
      entry.canvas = undefined;
      entry.renderedScale = undefined;
      delete entry.wrapper.dataset.renderedScale;
      resident.pop();
    }
  }

  destroy() {
    this.disposed = true;
    this.revision++;
    clearTimeout(this.timer);
    this.observer.disconnect();
    this.task?.cancel();
    for (const entry of this.entries) {
      if (entry.canvas) entry.canvas.width = entry.canvas.height = 0;
    }
    this.entries = [];
  }
}
