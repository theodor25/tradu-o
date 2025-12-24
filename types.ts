
export interface TextBlock {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  isBold?: boolean;
  isItalic?: boolean;
  pageNumber: number;
}

export interface PageLayout {
  width: number;
  height: number;
  blocks: TextBlock[];
  images: {
    data: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

export interface ProcessedDocument {
  name: string;
  originalText: string;
  translatedText: string;
  pages: PageLayout[];
  status: 'idle' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export enum OCRQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface TranslationOptions {
  preserveLayout: boolean;
  preserveKeywords: boolean;
  ocrQuality: OCRQuality;
  targetLanguage: string;
}
