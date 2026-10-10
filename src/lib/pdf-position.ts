export type PDFPosition = { page: number; offset: number; horizontal: number };

/** Keep the page plus an offset in PDF points, independently of canvas resolution. */
export function capturePDFPosition(scroll: HTMLElement, host: HTMLElement, scale: number): PDFPosition | null {
  const pages = Array.from(host.querySelectorAll<HTMLElement>('[data-page-num]'));
  const top = scroll.getBoundingClientRect().top + 24;
  const page = pages.find(page => page.getBoundingClientRect().bottom > top) || pages[pages.length - 1];
  if (!page) return null;
  return { page: Number(page.dataset.pageNum), offset: (top - page.getBoundingClientRect().top) / scale, horizontal: scroll.scrollLeft / scale };
}

export function restorePDFPosition(position: PDFPosition, scroll: HTMLElement, host: HTMLElement, scale: number, numPages: number) {
  const number = Math.min(position.page, numPages);
  const page = host.querySelector<HTMLElement>(`[data-page-num="${number}"]`);
  if (!page) return;
  const delta = page.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 24;
  const offset = Math.min(position.offset * scale, page.clientHeight - 1);
  scroll.scrollTop += delta + offset;
  scroll.scrollLeft = position.horizontal * scale;
  return number;
}
