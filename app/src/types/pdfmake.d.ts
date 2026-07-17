/**
 * Minimal typings for pdfmake 0.3, which ships none. Only the surface this
 * app touches is declared - createPdf/getBuffer and the standard-14 font
 * containers - so the compiler checks our usage without inventing an API.
 */
declare module 'pdfmake/build/pdfmake.js' {
  export interface PdfFontContainer { vfs: Record<string, { data: string }> }
  interface PdfDocument {
    getBuffer(): Promise<Uint8Array>;
  }
  interface PdfMakeStatic {
    fonts: Record<string, Record<'normal' | 'bold' | 'italics' | 'bolditalics', string>>;
    addFontContainer(container: PdfFontContainer): void;
    createPdf(docDefinition: unknown): PdfDocument;
  }
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/standard-fonts/Times.js' {
  import type { PdfFontContainer } from 'pdfmake/build/pdfmake.js';
  const container: PdfFontContainer;
  export default container;
}

declare module 'pdfmake/build/standard-fonts/Courier.js' {
  import type { PdfFontContainer } from 'pdfmake/build/pdfmake.js';
  const container: PdfFontContainer;
  export default container;
}
