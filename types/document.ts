// Document structure for multi-page handling

export interface PageData {
  pageNumber: number;
  canvas?: HTMLCanvasElement;
  imageData: string; // base64 image of the page
  extractedText?: string; // OCR'd text from this page
  width: number;
  height: number;
  metadata?: {
    orientation?: 'portrait' | 'landscape';
    processingTime?: number;
    confidence?: number;
  };
}

export interface DocumentData {
  id: string;
  name: string;
  type: 'pdf' | 'image';
  totalPages: number;
  pages: PageData[];
  uploadDate: Date;
  size: number; // file size in bytes
}

export interface TextExtraction {
  pageNumber: number;
  text: string;
  isProcessing: boolean;
  error?: string;
}

// For managing current view state
export interface ViewState {
  currentPage: number;
  viewMode: 'single' | 'continuous' | 'thumbnails';
  zoom: number;
  showPageNumbers: boolean;
}

// For the middle panel to know what to display
export interface DisplayContent {
  document?: DocumentData;
  currentPage: number;
  extractedText: string; // combined or current page text
  isMultiPage: boolean;
}
