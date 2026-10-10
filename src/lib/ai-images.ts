export type AIImage = { name: string; mimeType: 'image/png'; data: string; width: number; height: number };
export type VisionSupport = 'vision' | 'text' | 'unknown';
export type AIModel = { id: string; label: string; vision: VisionSupport; loaded?: boolean };
export const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 16 * 1024 * 1024;

/** Only browser-normalized PNG bytes, never URLs or file paths, cross the AI boundary. */
export function validateAIImages(input: unknown): AIImage[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > 1) throw new Error('Attach one reference image per request.');
  return input.map(image => {
    if (!image || image.mimeType !== 'image/png' || typeof image.data !== 'string' || typeof image.name !== 'string' || image.name.length > 120 || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 2048 || image.height > 2048) throw new Error('Invalid reference image.');
    if (image.data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(image.data) || image.data.length % 4 !== 0) throw new Error('Reference image is invalid or too large.');
    const header = atob(image.data.slice(0, 44));
    if (!header.startsWith('\x89PNG\r\n\x1a\n') || header.slice(12, 16) !== 'IHDR') throw new Error('Only normalized PNG image data is accepted.');
    const numberAt = (offset: number) => ((header.charCodeAt(offset) * 0x1000000) + (header.charCodeAt(offset + 1) << 16) + (header.charCodeAt(offset + 2) << 8) + header.charCodeAt(offset + 3));
    if (numberAt(16) !== image.width || numberAt(20) !== image.height) throw new Error('Image dimensions do not match its contents.');
    return { name: image.name, mimeType: 'image/png', data: image.data, width: image.width, height: image.height };
  });
}

export async function prepareReferenceImage(file: File): Promise<AIImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image. PDFs, SVGs and other files are not supported.');
  if (!file.size || file.size > MAX_IMAGE_FILE_BYTES) throw new Error('Choose an image smaller than 8 MB.');
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const starts = (...signature: number[]) => signature.every((value, index) => bytes[index] === value);
  const valid = file.type === 'image/png' ? starts(137, 80, 78, 71, 13, 10, 26, 10) : file.type === 'image/jpeg' ? starts(255, 216, 255) : starts(82, 73, 70, 70) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!valid) throw new Error('The file contents do not match a supported image.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > MAX_IMAGE_PIXELS) throw new Error('Choose an image no larger than 16 megapixels.');
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare the image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // Canvas encoding drops EXIF, filename paths and other original-file metadata.
    const data = canvas.toDataURL('image/png').split(',')[1];
    return validateAIImages([{ name: 'Reference image', mimeType: 'image/png', data, width: canvas.width, height: canvas.height }])[0];
  } finally { URL.revokeObjectURL(url); }
}

/** An explicit supported catalog; unknown/custom cloud model IDs remain unverified. */
export function cloudVisionSupport(provider: string, model: string, baseUrl?: string): VisionSupport {
  if (provider === 'gemini' && /^gemini-(?:1\.5|2\.0|2\.5|3|3\.1|3\.8)-(?:flash|pro)(?:-preview|-latest|-\d+)?$/.test(model)) return 'vision';
  if (provider === 'openai' && (!baseUrl || baseUrl.replace(/\/$/, '') === 'https://api.openai.com/v1') && /^(?:gpt-4o(?:-mini)?|gpt-4\.1(?:-mini|-nano)?|gpt-(?:5\.6|6|6\.1)-(?:sol|luna|terra|astra))(?:-\d{4}-\d{2}-\d{2})?$/.test(model)) return 'vision';
  return 'unknown';
}
