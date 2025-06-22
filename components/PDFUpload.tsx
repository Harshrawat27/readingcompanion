'use client';

import { useState, useRef } from 'react';

// Import PDF.js with proper configuration
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use CDN for reliability
if (typeof window !== 'undefined') {
  //   pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.min.mjs`;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface PDFUploadProps {
  onPagesExtracted: (pages: PageData[]) => void;
}

interface PageData {
  pageNumber: number;
  canvas?: HTMLCanvasElement;
  imageData: string; // base64
  extractedText?: string;
  width: number;
  height: number;
  isProcessing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

export default function PDFUpload({ onPagesExtracted }: PDFUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentProcessingPage, setCurrentProcessingPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [extractingText, setExtractingText] = useState(false);
  const [isLoadingPDF, setIsLoadingPDF] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('PDF size should be less than 20MB');
      return;
    }

    setFile(selectedFile);
    clearState(); // Reset everything before loading new file

    await loadAndCountPages(selectedFile);
  };

  // Convert File to ArrayBuffer with better error handling
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const loadAndCountPages = async (file: File) => {
    setIsLoadingPDF(true);
    setError(null);

    try {
      const arrayBuffer = await fileToArrayBuffer(file);
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
      });
      const loadedPdfDoc = await loadingTask.promise;

      setNumPages(loadedPdfDoc.numPages);
      setPdfDoc(loadedPdfDoc); // <-- Store the PDF document object
      setError(null);
    } catch (err) {
      console.error('PDF load error:', err);
      let errorMessage = 'Failed to load PDF. ';
      if (err instanceof Error) {
        if (err.name === 'PasswordException') {
          errorMessage += 'The PDF is password protected.';
        } else if (err.name === 'InvalidPDFException') {
          errorMessage += 'The file is not a valid or is a corrupted PDF.';
        } else {
          errorMessage += err.message;
        }
      }
      setError(errorMessage);
      setNumPages(0);
      setPdfDoc(null);
    } finally {
      setIsLoadingPDF(false);
    }
  };

  // Load PDF for page counting with simplified configuration
  const loadPDFForCounting = async (file: File) => {
    setIsLoadingPDF(true);
    setError(null);

    try {
      console.log('Loading PDF...');
      const arrayBuffer = await fileToArrayBuffer(file);
      console.log('ArrayBuffer created successfully');

      // Simplified PDF.js configuration - remove problematic options
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Suppress console logs
      });

      console.log('Loading task created');

      // Set shorter timeout for faster feedback
      const timeoutMs = 10000; // 10 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(`PDF loading timeout after ${timeoutMs / 1000} seconds`)
            ),
          timeoutMs
        );
      });

      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);

      console.log('PDF loaded successfully');
      console.log(`PDF has ${pdf.numPages} pages`);

      setNumPages(pdf.numPages);
      setError(null);
    } catch (error) {
      console.error('PDF load error:', error);

      let errorMessage = 'Failed to load PDF';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage =
            'PDF loading timeout. Try a smaller or simpler PDF file.';
        } else if (
          error.message.includes('Invalid PDF') ||
          error.message.includes('corrupted')
        ) {
          errorMessage =
            'Invalid or corrupted PDF file. Please try a different PDF.';
        } else if (
          error.message.includes('Password') ||
          error.message.includes('encrypted')
        ) {
          errorMessage =
            'This PDF is password protected. Please use an unprotected PDF.';
        } else {
          errorMessage = `PDF loading failed: ${error.message}`;
        }
      }

      setError(errorMessage);
      setNumPages(0);
    } finally {
      setIsLoadingPDF(false);
    }
  };

  // Convert a single page to image with optimized settings
  const pageToImage = async (
    pageNum: number,
    pdfToRender: pdfjsLib.PDFDocumentProxy
  ): Promise<PageData | null> => {
    try {
      setCurrentProcessingPage(pageNum);

      const page = await pdfToRender.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) throw new Error('Failed to get canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      return {
        pageNumber: pageNum,
        imageData,
        width: viewport.width,
        height: viewport.height,
        isProcessing: false,
        hasError: false,
      };
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      return {
        pageNumber: pageNum,
        imageData: '',
        width: 0,
        height: 0,
        isProcessing: false,
        hasError: true,
        errorMessage: `Failed to process page ${pageNum}`,
      };
    }
  };

  // Extract text from a single page using Vision API
  const extractTextFromPage = async (pageData: PageData): Promise<string> => {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: pageData.imageData,
          prompt: `Extract ALL text from this PDF page while preserving formatting and structure.

REQUIREMENTS:
1. Use markdown formatting:
   - # for main headings
   - ## for section headings  
   - ### for subsection headings
   - Regular text for paragraphs
   - - for bullet points
   - 1. 2. 3. for numbered lists
   - **text** for bold text
   - *text* for italic text
2. Maintain original spacing and line breaks
3. Preserve reading order and layout structure
4. Keep tables in markdown format if present

This is page ${pageData.pageNumber}. Return ONLY the formatted markdown text.`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        return data.text;
      } else {
        throw new Error(data.error || 'Failed to extract text');
      }
    } catch (error) {
      console.error(
        `Error extracting text from page ${pageData.pageNumber}:`,
        error
      );
      throw error;
    }
  };

  // Process all pages (convert to images)
  const processAllPages = async () => {
    if (!pdfDoc) return; // Use the stored pdfDoc object

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      const processedPages: PageData[] = [];
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        // Pass the loaded pdfDoc object to the rendering function
        const pageData = await pageToImage(pageNum, pdfDoc);
        if (pageData) {
          processedPages.push(pageData);
        }
        setProcessingProgress((pageNum / numPages) * 100);
      }
      setPages(processedPages);
      onPagesExtracted(processedPages);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError('Failed to process PDF pages');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingPage(0);
    }
  };

  // Extract text from all pages
  const extractAllText = async () => {
    if (pages.length === 0) return;

    setExtractingText(true);
    setError(null);

    try {
      const updatedPages: PageData[] = [];
      let allExtractedText = '';

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        if (page.hasError || !page.imageData) {
          updatedPages.push({
            ...page,
            extractedText: `[Error: Page ${page.pageNumber} could not be processed]`,
          });
          continue;
        }

        try {
          console.log(`Extracting text from page ${page.pageNumber}...`);
          const extractedText = await extractTextFromPage(page);

          const updatedPage = {
            ...page,
            extractedText,
          };

          updatedPages.push(updatedPage);
          allExtractedText += `\n\n--- PAGE ${page.pageNumber} ---\n\n${extractedText}`;

          setProcessingProgress(((i + 1) / pages.length) * 100);
        } catch (error) {
          console.error(
            `Failed to extract text from page ${page.pageNumber}:`,
            error
          );
          updatedPages.push({
            ...page,
            extractedText: `[Error extracting text from page ${page.pageNumber}]`,
          });
        }
      }

      setPages(updatedPages);

      if (allExtractedText.trim()) {
        onPagesExtracted(updatedPages);
      }
    } catch (error) {
      console.error('Error extracting text from pages:', error);
      setError('Failed to extract text from PDF');
    } finally {
      setExtractingText(false);
      setProcessingProgress(0);
    }
  };

  const clearState = () => {
    setError(null);
    setNumPages(0);
    setPages([]);
    setProcessingProgress(0);
    setCurrentProcessingPage(0);
    setIsLoadingPDF(false);
    setPdfDoc(null);
  };

  const clearSelection = () => {
    setFile(null);
    clearState();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='w-full max-w-md mx-auto p-4'>
      {/* File Input */}
      <div className='mb-4'>
        <input
          ref={fileInputRef}
          type='file'
          accept='.pdf,application/pdf'
          onChange={handleFileSelect}
          className='hidden'
          id='pdf-upload'
        />
        <label
          htmlFor='pdf-upload'
          className='block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors hover:border-gray-400'
          style={{ borderColor: '#3a3836', color: '#9ca3af' }}
        >
          <div className='space-y-2'>
            <div className='text-2xl'>📄</div>
            <div className='text-sm'>Click to select a PDF</div>
            <div className='text-xs text-gray-500'>
              PDF documents only (max 20MB)
            </div>
          </div>
        </label>
      </div>

      {/* PDF Preview */}
      {file && (
        <div className='mb-4'>
          <div
            className='p-3 rounded-lg border'
            style={{ backgroundColor: '#2a2826', borderColor: '#3a3836' }}
          >
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <span className='text-lg'>📄</span>
                <div>
                  <div className='text-sm font-medium text-white'>
                    {file.name}
                  </div>
                  <div className='text-xs text-gray-400'>
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                    {isLoadingPDF && ' • Loading...'}
                    {numPages > 0 && ` • ${numPages} pages`}
                  </div>
                </div>
              </div>
              <button
                onClick={clearSelection}
                className='text-gray-400 hover:text-white'
              >
                ×
              </button>
            </div>

            {/* PDF Loading Progress */}
            {isLoadingPDF && (
              <div className='mt-2'>
                <div className='text-xs text-gray-400 mb-1'>Loading PDF...</div>
                <div className='h-1 bg-gray-700 rounded overflow-hidden'>
                  <div className='h-full bg-blue-500 animate-pulse'></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {file && numPages > 0 && !isLoadingPDF && (
        <div className='space-y-3'>
          {/* Step 1: Convert to Images */}
          <button
            onClick={processAllPages}
            disabled={isProcessing || pages.length > 0}
            className='w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
            style={{
              backgroundColor: pages.length > 0 ? '#4ade80' : '#8975EA',
              color: '#ffffff',
            }}
          >
            {isProcessing ? (
              <div className='flex items-center justify-center gap-2'>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                <span>
                  Converting page {currentProcessingPage}...{' '}
                  {Math.round(processingProgress)}%
                </span>
              </div>
            ) : pages.length > 0 ? (
              `✓ ${pages.filter((p) => !p.hasError).length} pages converted`
            ) : (
              `Convert ${numPages} pages to images`
            )}
          </button>

          {/* Step 2: Extract Text */}
          {pages.length > 0 && (
            <button
              onClick={extractAllText}
              disabled={extractingText}
              className='w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              style={{
                backgroundColor: '#8975EA',
                color: '#ffffff',
              }}
            >
              {extractingText ? (
                <div className='flex items-center justify-center gap-2'>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  <span>
                    Extracting text... {Math.round(processingProgress)}%
                  </span>
                </div>
              ) : (
                `Extract text from all ${
                  pages.filter((p) => !p.hasError).length
                } pages`
              )}
            </button>
          )}
        </div>
      )}

      {/* Processing Progress */}
      {(isProcessing || extractingText) && (
        <div className='mt-4'>
          <div
            className='h-2 rounded-full overflow-hidden'
            style={{ backgroundColor: '#3a3836' }}
          >
            <div
              className='h-full transition-all duration-300 rounded-full'
              style={{
                backgroundColor: '#8975EA',
                width: `${processingProgress}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Pages Status */}
      {pages.length > 0 && (
        <div
          className='mt-4 p-3 rounded-lg'
          style={{ backgroundColor: '#2a2826' }}
        >
          <h3 className='text-sm font-medium mb-2' style={{ color: '#8975EA' }}>
            Processed Pages ({pages.length}):
          </h3>
          <div className='space-y-1 max-h-32 overflow-y-auto'>
            {pages.map((page) => (
              <div
                key={page.pageNumber}
                className='flex items-center justify-between text-xs'
              >
                <span className='text-gray-300'>Page {page.pageNumber}</span>
                <div className='flex items-center gap-2'>
                  {!page.hasError && (
                    <span className='text-gray-500'>
                      {Math.round(page.width)}×{Math.round(page.height)}
                    </span>
                  )}
                  {page.extractedText ? (
                    <span className='text-green-400'>✓ Text</span>
                  ) : page.hasError ? (
                    <span className='text-red-400'>✗ Error</span>
                  ) : (
                    <span className='text-yellow-400'>⏳ Image</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div
          className='mt-4 p-3 rounded-lg border'
          style={{
            backgroundColor: '#2a1a1a',
            borderColor: '#ff6b6b',
            color: '#ff6b6b',
          }}
        >
          <div className='text-sm'>{error}</div>
          <div className='text-xs mt-2 text-gray-400'>
            Try a smaller PDF file or refresh the page if the problem persists.
          </div>
        </div>
      )}

      {/* Instructions */}
      <div
        className='mt-6 p-4 rounded-lg'
        style={{ backgroundColor: '#2a2826' }}
      >
        <h3 className='text-sm font-medium mb-2' style={{ color: '#8975EA' }}>
          How it works:
        </h3>
        <ul className='text-xs text-gray-400 space-y-1'>
          <li>• Upload a PDF document (max 20MB)</li>
          <li>• Step 1: Convert pages to images</li>
          <li>• Step 2: Extract text using AI vision</li>
          <li>• Text appears in main panel with formatting</li>
          <li>• Navigate between pages easily</li>
        </ul>
      </div>
    </div>
  );
}
