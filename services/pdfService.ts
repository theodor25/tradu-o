
import { PageLayout, TextBlock } from '../types';
import { OCRService } from './ocrService';
import { imagePreprocessing } from './imageService';

declare const pdfjsLib: any;
declare const PDFLib: any;

if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const pdfService = {
  /**
   * Orchestrates the extraction of content from a PDF file.
   * Auto-detects if the PDF is scanned or native.
   */
  extractContent: async (file: File, onProgress: (p: number) => void): Promise<PageLayout[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const layouts: PageLayout[] = [];

    for (let i = 1; i <= numPages; i++) {
      const pageProgress = Math.round(((i - 1) / numPages) * 100);
      onProgress(pageProgress);
      
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });
      const textContent = await page.getTextContent();
      
      // Heuristic: if very little text is found, it's likely a scanned PDF
      const hasNativeText = textContent.items.length > 20;

      const layout: PageLayout = {
        width: viewport.width,
        height: viewport.height,
        blocks: [],
        images: []
      };

      if (hasNativeText) {
        layout.blocks = textContent.items.map((item: any) => ({
          text: item.str,
          x: item.transform[4],
          y: viewport.height - item.transform[5] - (item.height || Math.abs(item.transform[0])),
          width: item.width,
          height: item.height || Math.abs(item.transform[0]),
          fontSize: Math.abs(item.transform[0]),
          fontFamily: item.fontName || 'Helvetica',
          pageNumber: i
        }));
      } else {
        // High-res render for OCR (300 DPI approx)
        const ocrViewport = page.getViewport({ scale: 3.5 });
        const canvas = document.createElement('canvas');
        canvas.width = ocrViewport.width;
        canvas.height = ocrViewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: ocrViewport }).promise;
        
        const optimizedUrl = await imagePreprocessing.optimizeForOCR(canvas);
        const ocrBlocks = await OCRService.performOCR(optimizedUrl, i);
        
        // Scale OCR blocks back to original viewport coordinates
        const scaleX = viewport.width / ocrViewport.width;
        const scaleY = viewport.height / ocrViewport.height;
        
        layout.blocks = ocrBlocks.map(block => ({
          ...block,
          x: block.x * scaleX,
          y: block.y * scaleY,
          width: block.width * scaleX,
          height: block.height * scaleY,
          fontSize: block.fontSize * scaleY
        }));
      }
      
      layouts.push(layout);
    }

    onProgress(100);
    return layouts;
  },

  /**
   * Reconstructs the PDF document using translated blocks.
   */
  generateTranslatedPDF: async (layouts: PageLayout[], translatedTextMap: Record<string, string>): Promise<Uint8Array> => {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    for (const layout of layouts) {
      const page = pdfDoc.addPage([layout.width, layout.height]);
      
      for (const block of layout.blocks) {
        const translated = translatedTextMap[block.text] || block.text;
        if (!translated.trim()) continue;

        try {
          page.drawText(translated, {
            x: block.x,
            y: layout.height - block.y - (block.height * 0.8), // Adjusted for baseline
            size: Math.max(4, block.fontSize * 0.9), // Slightly smaller to ensure fit
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        } catch (e) {
          console.warn('Could not draw block:', block.text, e);
        }
      }
    }

    return await pdfDoc.save();
  }
};
