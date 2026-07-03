import type jsPDF from 'jspdf';

/** Load a remote image as a data URL so jsPDF can embed it. */
export async function loadImageDataUrl(url: string): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    const dims: { w: number; h: number } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    const type = blob.type.toLowerCase();
    let format = 'JPEG';
    if (type.includes('png')) format = 'PNG';
    else if (type.includes('webp')) format = 'WEBP';
    return { dataUrl, width: dims.w, height: dims.h, format };
  } catch {
    return null;
  }
}

/** Embed image evidencias into the PDF (thumbnails, 2 per row). Non-images are skipped. */
export async function renderEvidenceImages(
  doc: jsPDF,
  evidencias: any[],
  opts: { marginX: number; contentW: number; pageH: number; startY: number },
): Promise<number> {
  const imgs = evidencias.filter(e => e.mime_type?.startsWith('image/') && e.signed_url);
  if (!imgs.length) return opts.startY;

  const perRow = 2;
  const gap = 4;
  const cellW = (opts.contentW - gap * (perRow - 1)) / perRow;
  const cellH = 55;
  let y = opts.startY;
  let col = 0;

  for (const e of imgs) {
    if (col === 0 && y + cellH + 8 > opts.pageH - 15) {
      doc.addPage();
      y = 20;
    }
    const x = opts.marginX + col * (cellW + gap);
    const data = await loadImageDataUrl(e.signed_url);
    if (data && data.width > 0) {
      const ratio = data.width / data.height;
      let w = cellW;
      let h = w / ratio;
      if (h > cellH - 8) { h = cellH - 8; w = h * ratio; }
      const offsetX = x + (cellW - w) / 2;
      try {
        doc.addImage(data.dataUrl, data.format, offsetX, y, w, h, undefined, 'FAST');
      } catch {
        // fallback: unsupported format
        doc.setFontSize(8); doc.text('[imagem não suportada]', x, y + 20);
      }
      doc.setFontSize(7); doc.setTextColor(80);
      const label = doc.splitTextToSize(e.file_name || '', cellW);
      doc.text(label[0] || '', x, y + cellH - 2);
      doc.setTextColor(0);
    }
    col++;
    if (col >= perRow) {
      col = 0;
      y += cellH + gap;
    }
  }
  if (col > 0) y += cellH + gap;
  return y;
}
