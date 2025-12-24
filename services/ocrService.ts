
import { TextBlock } from '../types';

// Declare Tesseract global from CDN
declare const Tesseract: any;

export class OCRService {
  private static worker: any = null;

  static async getWorker() {
    if (this.worker) return this.worker;
    this.worker = await Tesseract.createWorker('eng+por', 1, {
      logger: (m: any) => console.log(m),
    });
    return this.worker;
  }

  static async performOCR(imageUrl: string, pageNumber: number): Promise<TextBlock[]> {
    const worker = await this.getWorker();
    const { data: { blocks } } = await worker.recognize(imageUrl);
    
    const results: TextBlock[] = [];
    
    blocks.forEach((block: any) => {
      block.paragraphs.forEach((para: any) => {
        para.lines.forEach((line: any) => {
          results.push({
            text: line.text.trim(),
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0,
            fontSize: line.confidence > 0 ? (line.bbox.y1 - line.bbox.y0) * 0.8 : 12,
            fontFamily: 'Helvetica',
            pageNumber
          });
        });
      });
    });

    return results;
  }

  static async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
