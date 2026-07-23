import type { Rendered } from './render';

/**
 * Real PDF export - deliverables as generated PDF files, replacing browser
 * "Print to PDF" (DECISIONS.md 2026-07-17; PATH-TO-SHIP Tier 2, promoted when
 * the report became the product in the service model).
 *
 * Design:
 * - The converter below (markdownToPdfContent) is PURE and knows only the
 *   markdown subset our own Doc generator emits (render.ts) - headings,
 *   paragraphs, blockquotes, bullets, fenced code, rules, plus **bold** and
 *   *italic* runs. It never sees the model, so it cannot invent content: it
 *   reshapes the exact markdown the zero-invention audit already covers.
 * - Typography follows the visual system (08-docs/VISUAL-SYSTEM.md): one
 *   serif face, quiet, printed-page feel. The PDF standard-14 Times fonts
 *   give that without embedding font files, so the output stays small and
 *   pdfmake's Roboto TTFs never load.
 * - pdfmake (first new runtime dependency of the project - logged decision)
 *   is imported ONLY inside generatePdfBytes(), so it lives in its own
 *   lazy-loaded chunk fetched on the first PDF click, never in the initial
 *   bundle.
 */

/* ----- the pdfmake content shapes we emit (structural, no dependency) ----- */

export interface PdfText {
  text: string | PdfInline[];
  fontSize?: number;
  bold?: boolean;
  italics?: boolean;
  font?: string;
  color?: string;
  margin?: [number, number, number, number];
  lineHeight?: number;
  alignment?: string;
  preserveLeadingSpaces?: boolean;
  pageBreak?: 'before';
}
export interface PdfInline { text: string; bold?: boolean; italics?: boolean }
export interface PdfList { ul: (string | PdfText | { text: PdfInline[] })[]; margin?: [number, number, number, number] }
export interface PdfRule { canvas: { type: 'line'; x1: number; y1: number; x2: number; y2: number; lineWidth: number; lineColor: string }[]; margin?: [number, number, number, number] }
export type PdfContent = PdfText | PdfList | PdfRule;

/* ----- inline markdown: **bold** and *italic* runs ----- */

export function parseInline(text: string): PdfInline[] {
  const out: PdfInline[] = [];
  // Split on **bold** first, then *italic* inside the remainder.
  const boldParts = text.split(/\*\*([^*]+)\*\*/);
  boldParts.forEach((part, i) => {
    if (i % 2 === 1) { if (part) out.push({ text: part, bold: true }); return; }
    const italicParts = part.split(/\*([^*]+)\*/);
    italicParts.forEach((ip, j) => {
      if (!ip) return;
      out.push(j % 2 === 1 ? { text: ip, italics: true } : { text: ip });
    });
  });
  return out.length > 0 ? out : [{ text: '' }];
}

/* ----- the layout constants (visual system, translated to points) ----- */

const INK = '#2b2b2b';
const MUTED = '#5f5f5f';
const RULE = '#dddddd';
const BODY = 10.5;
const CONTENT_WIDTH = 612 - 2 * 72; // letter width minus margins

/* ----- line-based conversion of our own markdown subset ----- */

export function markdownToPdfContent(markdown: string): PdfContent[] {
  const out: PdfContent[] = [];
  const lines = markdown.split('\n');
  let bullets: { text: PdfInline[] }[] | null = null;
  let fence: string[] | null = null;

  const flushBullets = () => {
    if (bullets && bullets.length > 0) out.push({ ul: bullets, margin: [0, 0, 0, 6] });
    bullets = null;
  };
  const flushFence = () => {
    if (fence) {
      out.push({
        text: fence.join('\n'), font: 'Courier', fontSize: 7,
        color: INK, margin: [0, 2, 0, 8], preserveLeadingSpaces: true,
      });
    }
    fence = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (fence !== null) {
      if (line.startsWith('```')) flushFence();
      else fence.push(raw);
      continue;
    }
    if (line.startsWith('```')) { flushBullets(); fence = []; continue; }
    if (line.startsWith('- ')) {
      if (!bullets) bullets = [];
      bullets.push({ text: parseInline(line.slice(2)) });
      continue;
    }
    flushBullets();
    if (line === '') continue;
    if (line.startsWith('# ')) {
      out.push({ text: line.slice(2), fontSize: 19, margin: [0, 0, 0, 8], color: INK });
    } else if (line.startsWith('## ')) {
      out.push({ text: line.slice(3), fontSize: 14.5, margin: [0, 14, 0, 6], color: INK });
    } else if (line.startsWith('### ')) {
      out.push({ text: parseInline(line.slice(4)), fontSize: 11.5, italics: true, margin: [0, 10, 0, 4], color: INK });
    } else if (line.startsWith('> ')) {
      // The owner's verbatim words: indented, roman; markers arrive as *italic*.
      out.push({ text: parseInline(line.slice(2)), margin: [16, 0, 0, 6], lineHeight: 1.25, color: INK });
    } else if (line === '---') {
      out.push({
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: RULE }],
        margin: [0, 4, 0, 10],
      });
    } else {
      out.push({ text: parseInline(line), margin: [0, 0, 0, 6], lineHeight: 1.3, color: INK });
    }
  }
  flushBullets();
  flushFence();
  return out;
}

/** One document, or a whole package with a page break between documents. */
export function docDefinitionFor(docs: Rendered[]): unknown {
  const content: PdfContent[] = [];
  docs.forEach((d, i) => {
    const converted = markdownToPdfContent(d.markdown);
    if (i > 0 && converted.length > 0) (converted[0] as PdfText).pageBreak = 'before';
    content.push(...converted);
  });
  return {
    pageSize: 'LETTER',
    pageMargins: [72, 64, 72, 64],
    defaultStyle: { font: 'Times', fontSize: BODY, color: INK },
    footer: (page: number, total: number) => ({
      text: `Page ${page} of ${total}`, alignment: 'center', fontSize: 8.5, color: MUTED,
      margin: [0, 18, 0, 0],
    }),
    info: { title: docs.length === 1 ? docs[0].title : 'Succession package', creator: 'Successor' },
    content,
  };
}

/* ----- generation (pdfmake loads here, lazily, and nowhere else) ----- */

export async function generatePdfBytes(docs: Rendered[]): Promise<Uint8Array> {
  const [{ default: pdfMake }, { default: times }, { default: courier }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'),
    import('pdfmake/build/standard-fonts/Times.js'),
    import('pdfmake/build/standard-fonts/Courier.js'),
  ]);
  pdfMake.addFontContainer(times);
  pdfMake.addFontContainer(courier);
  pdfMake.fonts = {
    Times: { normal: 'Times-Roman', bold: 'Times-Bold', italics: 'Times-Italic', bolditalics: 'Times-BoldItalic' },
    Courier: { normal: 'Courier', bold: 'Courier-Bold', italics: 'Courier-Oblique', bolditalics: 'Courier-BoldOblique' },
  };
  return pdfMake.createPdf(docDefinitionFor(docs)).getBuffer();
}

export async function downloadPdf(docs: Rendered[], filename: string): Promise<void> {
  const bytes = await generatePdfBytes(docs);
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
