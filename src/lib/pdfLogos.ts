import type jsPDF from 'jspdf';

function withCacheBuster(url: string): string {
  try {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}cb=${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return url;
  }
}

async function loadViaFetch(url: string): Promise<HTMLImageElement | null> {
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      mode: 'cors',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
    return img;
  } catch {
    return null;
  }
}

async function loadDirect(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = url;
    });
    return img;
  } catch {
    return null;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  const finalUrl = withCacheBuster(url);
  const viaFetch = await loadViaFetch(finalUrl);
  if (viaFetch) return viaFetch;
  const direct = await loadDirect(finalUrl);
  if (direct) return direct;
  console.warn('PDF logo load failed:', url);
  return null;
}

interface RenderLogosOptions {
  sstLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  topY?: number;
  maxHeight?: number;
  maxWidth?: number;
  maxImagePixels?: number;
}

/**
 * Render the SST manager logo (left) and the final company logo (right)
 * over the colored header band of a PDF cover page.
 * Logos are scaled to fit inside `maxWidth` x `maxHeight` while preserving aspect ratio.
 */
export async function renderReportLogos(
  pdf: jsPDF,
  pageWidth: number,
  {
    sstLogoUrl,
    companyLogoUrl,
    topY = 8,
    maxHeight = 28,
    maxWidth = 45,
    maxImagePixels,
  }: RenderLogosOptions,
): Promise<void> {
  const margin = 12;

  const drawFitted = (img: HTMLImageElement, x: number, align: 'left' | 'right') => {
    const ratio = img.width && img.height ? img.width / img.height : 1;
    let h = maxHeight;
    let w = h * ratio;
    if (w > maxWidth) {
      w = maxWidth;
      h = w / ratio;
    }
    const drawX = align === 'left' ? x : x - w;
    let image: HTMLImageElement | HTMLCanvasElement = img;
    if (maxImagePixels && Math.max(img.naturalWidth, img.naturalHeight) > maxImagePixels) {
      const scale = maxImagePixels / Math.max(img.naturalWidth, img.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (context) {
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        image = canvas;
      }
    }
    try {
      pdf.addImage(image, 'PNG', drawX, topY, w, h);
    } catch (e) {
      try {
        pdf.addImage(image, 'JPEG', drawX, topY, w, h);
      } catch (err) {
        console.warn('PDF addImage failed:', err);
      }
    }
  };

  const [sstImg, companyImg] = await Promise.all([
    sstLogoUrl ? loadImage(sstLogoUrl) : Promise.resolve(null),
    companyLogoUrl ? loadImage(companyLogoUrl) : Promise.resolve(null),
  ]);

  if (sstImg) drawFitted(sstImg, margin, 'left');
  if (companyImg) drawFitted(companyImg, pageWidth - margin, 'right');
}

/**
 * Draw a full-page background image on the current PDF page (cover page).
 * Must be called before any other content is drawn on the page.
 */
export async function renderCoverBackground(
  pdf: jsPDF,
  pageWidth: number,
  pageHeight: number,
  url: string,
): Promise<void> {
  const img = await loadImage(url);
  if (!img) return;
  try {
    pdf.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);
  } catch (e) {
    try {
      pdf.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (err) {
      console.warn('PDF cover background failed:', err);
    }
  }
}
