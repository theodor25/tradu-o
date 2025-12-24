
/**
 * Image preprocessing logic for OCR optimization.
 */
export const imagePreprocessing = {
  /**
   * Applies a series of filters to a canvas to optimize for OCR.
   * Includes: Grayscale, Contrast Stretching, and Binarization.
   */
  optimizeForOCR: async (canvas: HTMLCanvasElement): Promise<string> => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return canvas.toDataURL();

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // 1. Grayscale Conversion (Luminance formula)
    // 2. Basic Contrast Enhancement
    let min = 255;
    let max = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = data[i + 1] = data[i + 2] = gray;
      if (gray < min) min = gray;
      if (gray > max) max = gray;
    }

    // 3. Contrast Stretching & Adaptive Binarization
    // Normalizes the image so the darkest pixel is 0 and the lightest is 255
    const range = max - min;
    const threshold = min + range * 0.5; // Simple middle-point threshold

    for (let i = 0; i < data.length; i += 4) {
      let gray = data[i];
      // Normalize
      gray = ((gray - min) / (range || 1)) * 255;
      // Binarize
      const binary = gray > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = binary;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  },

  /**
   * Upscales canvas using bicubic interpolation for better OCR on small text.
   */
  upscale: (canvas: HTMLCanvasElement, targetDpi: number = 300, currentDpi: number = 72): HTMLCanvasElement => {
    const scale = targetDpi / currentDpi;
    if (scale <= 1) return canvas;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = Math.floor(canvas.width * scale);
    newCanvas.height = Math.floor(canvas.height * scale);
    const ctx = newCanvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
    }
    return newCanvas;
  }
};
