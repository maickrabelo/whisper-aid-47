import type jsPDF from 'jspdf';

function withCacheBuster(url: string): string {
  try {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}cb=${Date.now()}`;
  } catch {
    return url;
  }
}

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const finalUrl = withCacheBuster(url);
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (e) => reject(e);
      img.src = finalUrl;
    });
    return img;
  } catch (e) {
    console.warn('PDF logo load failed:', url, e);
    return null;
  }
}

interface RenderLogosOptions {
  sstLogoUrl?: string | null;
  companyLogoUrl?: string | null;
  topY?: number;
  maxHeight?: number;
  maxWidth?: number;
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
    try {
      pdf.addImage(img, 'PNG', drawX, topY, w, h);
    } catch (e) {
      try {
        pdf.addImage(img, 'JPEG', drawX, topY, w, h);
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
