'use client';

import { useState, useRef } from 'react';

// Import PDF.js directly without react-pdf since we're doing manual processing
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker with a more reliable approach
if (typeof window !== 'undefined') {
  // Try multiple worker sources for better compatibility
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

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (selectedFile.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (max 50MB)
    if (selectedFile.size > 50 * 1024 * 1024) {
      setError('PDF size should be less than 50MB');
      return;
    }

    setFile(selectedFile);
    setError(null);
    setNumPages(0);
    setPages([]);

    // Load PDF to get page count
    await loadPDFForCounting(selectedFile);
  };

  // Convert File to ArrayBuffer
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      console.log('Converting file to ArrayBuffer...');
      const reader = new FileReader();

      reader.onload = () => {
        console.log('File converted to ArrayBuffer successfully');
        resolve(reader.result as ArrayBuffer);
      };

      reader.onerror = () => {
        console.error('Error reading file:', reader.error);
        reject(reader.error);
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Load PDF for page counting with better error handling
  const loadPDFForCounting = async (file: File) => {
    setIsLoadingPDF(true);
    try {
      console.log('Loading PDF for page counting...');
      const arrayBuffer = await fileToArrayBuffer(file);

      console.log('ArrayBuffer created, length:', arrayBuffer.byteLength);

      // Create loading task with timeout and better error handling
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        useSystemFonts: true,
        disableFontFace: false,
        // Remove external dependencies that might cause issues
        cMapUrl: undefined,
        cMapPacked: undefined,
        standardFontDataUrl: undefined,
      });

      console.log('Loading task created, waiting for PDF...');

      // Add progress monitoring
      loadingTask.onProgress = (progress: any) => {
        if (progress.total > 0) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`PDF loading progress: ${percent.toFixed(1)}%`);
        }
      };

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error('PDF loading timeout after 30 seconds')),
          30000
        );
      });

      const pdf = await Promise.race([loadingTask.promise, timeoutPromise]);

      console.log('PDF loaded successfully!');
      setNumPages(pdf.numPages);
      console.log(`PDF has ${pdf.numPages} pages`);
      setError(null);
    } catch (error) {
      console.error('Detailed PDF load error:', error);

      let errorMessage = 'Failed to load PDF';
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });

        errorMessage += `: ${error.message}`;

        // Provide specific error guidance
        if (
          error.message.includes('Invalid PDF') ||
          error.message.includes('InvalidPDFException')
        ) {
          errorMessage =
            'Invalid or corrupted PDF file. Please try a different PDF.';
        } else if (error.message.includes('timeout')) {
          errorMessage =
            'PDF loading timeout. The file might be too complex or corrupted.';
        } else if (
          error.message.includes('Worker') ||
          error.message.includes('worker')
        ) {
          errorMessage =
            'PDF worker failed to load. Please refresh the page and try again.';
        } else if (error.message.includes('network')) {
          errorMessage =
            'Network error. Please check your connection and try again.';
        } else if (
          error.message.includes('Password') ||
          error.message.includes('encrypted')
        ) {
          errorMessage =
            'This PDF is password protected. Please use an unprotected PDF.';
        }
      }

      setError(errorMessage);
      setNumPages(0);
    } finally {
      setIsLoadingPDF(false);
    }
  };

  // Convert a single page to image data with better error handling
  const pageToImage = async (pageNum: number): Promise<PageData | null> => {
    try {
      console.log(`Processing page ${pageNum}...`);
      setCurrentProcessingPage(pageNum);

      // Convert File to ArrayBuffer first
      const arrayBuffer = await fileToArrayBuffer(file!);

      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
        useSystemFonts: true,
        disableFontFace: false,
      });

      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);

      // Set scale for good quality (2 = 2x resolution)
      const scale = 2;
      const viewport = page.getViewport({ scale });

      // Create canvas with better error handling
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas with timeout
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: false, // Disable WebGL for better compatibility
      };

      const renderPromise = page.render(renderContext).promise;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Page ${pageNum} render timeout`)),
          15000
        );
      });

      await Promise.race([renderPromise, timeoutPromise]);

      // Convert to base64
      const imageData = canvas.toDataURL('image/png', 0.9); // Slightly compress

      console.log(`Page ${pageNum} processed successfully`);

      return {
        pageNumber: pageNum,
        canvas,
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
        errorMessage: `Failed to process page ${pageNum}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
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
          prompt: `Analyze this PDF page and extract ALL text while preserving the EXACT original formatting and structure. 

CRITICAL REQUIREMENTS:
1. Identify the text hierarchy exactly as shown (main titles, subtitles, body text)
2. Use appropriate markdown formatting:
   - # for main headings/titles
   - ## for section headings  
   - ### for subsection headings
   - Regular text for paragraphs
   - - for bullet points
   - 1. 2. 3. for numbered lists
   - **text** for bold text
   - *text* for italic text
3. Maintain original spacing and line breaks
4. Preserve the reading order and layout structure
5. Keep tables in proper markdown table format if present
6. Maintain any indentation or grouping

This is page ${pageData.pageNumber}. Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary.`,
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
    if (!file || numPages === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      const processedPages: PageData[] = [];

      // Process each page with better error handling
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        try {
          const pageData = await pageToImage(pageNum);
          if (pageData) {
            processedPages.push(pageData);
          }
        } catch (error) {
          console.error(`Failed to process page ${pageNum}:`, error);
          // Continue with other pages even if one fails
          processedPages.push({
            pageNumber: pageNum,
            imageData: '',
            width: 0,
            height: 0,
            isProcessing: false,
            hasError: true,
            errorMessage: `Failed to process page ${pageNum}`,
          });
        }

        // Update progress
        setProcessingProgress((pageNum / numPages) * 100);
      }

      console.log(
        `Successfully processed ${
          processedPages.filter((p) => !p.hasError).length
        } of ${processedPages.length} pages`
      );
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

        // Skip pages that had errors during image processing
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

          // Combine all pages into one document
          allExtractedText += `\n\n--- PAGE ${page.pageNumber} ---\n\n${extractedText}`;

          // Update progress
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

      // Send the updated pages to the parent component
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

  const clearSelection = () => {
    setFile(null);
    setNumPages(0);
    setPages([]);
    setError(null);
    setProcessingProgress(0);
    setCurrentProcessingPage(0);
    setIsLoadingPDF(false);
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
              PDF documents only (max 50MB)
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
                      {Math.round(page.width / 2)}×{Math.round(page.height / 2)}
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
          {error.includes('Worker') && (
            <div className='text-xs mt-2 text-gray-400'>
              Try refreshing the page and uploading the PDF again.
            </div>
          )}
          {error.includes('timeout') && (
            <div className='text-xs mt-2 text-gray-400'>
              This PDF might be too complex. Try a simpler PDF or smaller file
              size.
            </div>
          )}
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
          <li>• Upload a PDF document</li>
          <li>• Step 1: Convert pages to high-quality images</li>
          <li>• Step 2: Extract text using AI vision</li>
          <li>• Text appears in main panel with formatting</li>
          <li>• Images and layout are preserved</li>
        </ul>
      </div>
    </div>
  );
}
