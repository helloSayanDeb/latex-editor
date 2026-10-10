/** SyncTeX uses unrotated PDF points measured from the top left, not canvas pixels. */
export function syncTexPoint(
  clientX: number, clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number; viewBox: number[]; convertToPdfPoint: (x: number, y: number) => number[] },
) {
  const x = (clientX - rect.left) * viewport.width / rect.width;
  const y = (clientY - rect.top) * viewport.height / rect.height;
  const [pdfX, pdfY] = viewport.convertToPdfPoint(x, y);
  return { x: pdfX - viewport.viewBox[0], y: viewport.viewBox[3] - pdfY };
}
