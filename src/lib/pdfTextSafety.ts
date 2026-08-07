import type jsPDF from 'jspdf';

type PdfTextInput = string | string[];

const ENTITY_MAP: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '-', mdash: '-', bull: '-', hellip: '...',
};

/**
 * Converts arbitrary user/database text to the WinAnsi-safe subset supported by
 * jsPDF's built-in Helvetica font. This prevents one unsupported glyph (notably
 * emoji and UTF-16 symbols) from corrupting the remainder of a PDF text stream.
 */
export function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return '';

  let text = String(value)
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
      if (code[0] === '#') {
        const numeric = code[1]?.toLowerCase() === 'x'
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
        return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : '';
      }
      return ENTITY_MAP[code.toLowerCase()] ?? entity;
    })
    .normalize('NFC');

  // Repair common UTF-8 decoded-as-Windows-1252 text before PDF serialization.
  if (/[ÃÂ]/.test(text)) {
    try {
      const bytes = Uint8Array.from(Array.from(text), char => char.charCodeAt(0));
      const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (!repaired.includes('\uFFFD')) text = repaired;
    } catch {
      // Keep the original when it is legitimate Latin text rather than mojibake.
    }
  }

  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[–—−]/g, '-')
    .replace(/[•●▪◦]/g, '-')
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚]/g, "'")
    .replace(/…/g, '...')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≠/g, '!=')
    .replace(/[→⇒]/g, '->')
    .replace(/[←⇐]/g, '<-')
    .replace(/[↔⇔]/g, '<->')
    .replace(/[·∙]/g, '-')
    .replace(/[º°]/g, 'o')
    // Remove emoji, variation selectors, zero-width characters and other
    // non-BMP glyphs unsupported by the built-in jsPDF fonts.
    .replace(/[\u200B-\u200D\u2060\uFE0E\uFE0F]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[^\x09\x0A\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/** Installs a final safety boundary around every text operation on a document. */
export function installPdfTextSafety(pdf: jsPDF): void {
  const originalText = pdf.text.bind(pdf);
  const originalSplit = pdf.splitTextToSize.bind(pdf);

  pdf.text = ((input: PdfTextInput, ...args: unknown[]) => {
    const safeInput = Array.isArray(input)
      ? input.map(line => sanitizePdfText(line))
      : sanitizePdfText(input);
    return originalText(safeInput as string, ...(args as [number, number, object?]));
  }) as typeof pdf.text;

  pdf.splitTextToSize = ((input: string, maxWidth: number, options?: object) =>
    originalSplit(sanitizePdfText(input), maxWidth, options)) as typeof pdf.splitTextToSize;
}