import { useState, useRef } from 'react';
import { pdfjs } from 'react-pdf';

// Set up PDF.js worker - use unpkg with the exact same version
pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;

interface PDFUploadProps {
  onPagesExtracted: (pages: PageData[]) => void;
}

interface PageData {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  imageData: string; // base64
  width: number;
  height: number;
}

export default function PDFUpload({ onPagesExtracted }: PDFUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
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

    // Load PDF to get page count
    await loadPDFForCounting(selectedFile);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    console.log(`PDF loaded with ${numPages} pages`);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setError('Failed to load PDF. Please try a different file.');
  };

  // Load PDF for page counting - simplified approach
  const loadPDFForCounting = async (file: File) => {
    try {
      console.log('Loading PDF for page counting...');
      const arrayBuffer = await fileToArrayBuffer(file);

      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;

      setNumPages(pdf.numPages);
      console.log(`PDF loaded successfully with ${pdf.numPages} pages`);
      setError(null);
    } catch (error) {
      console.error('PDF load error:', error);
      setError(
        `Failed to load PDF: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      setNumPages(0);
    }
  };

  // Convert File to ArrayBuffer
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  };

  // Convert a single page to image data
  const pageToImage = async (pageNum: number): Promise<PageData | null> => {
    try {
      console.log(`Processing page ${pageNum}...`);

      // Convert File to ArrayBuffer first
      const arrayBuffer = await fileToArrayBuffer(file!);

      const loadingTask = pdfjs.getDocument(arrayBuffer);
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(pageNum);

      // Set scale for good quality (2 = 2x resolution)
      const scale = 2;
      const viewport = page.getViewport({ scale });

      // Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Convert to base64
      const imageData = canvas.toDataURL('image/png');

      console.log(`Page ${pageNum} processed successfully`);

      return {
        pageNumber: pageNum,
        canvas,
        imageData,
        width: viewport.width,
        height: viewport.height,
      };
    } catch (error) {
      console.error(`Error processing page ${pageNum}:`, error);
      return null;
    }
  };

  const processAllPages = async () => {
    if (!file || numPages === 0) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    setError(null);

    try {
      const pages: PageData[] = [];

      // Process each page
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const pageData = await pageToImage(pageNum);
        if (pageData) {
          pages.push(pageData);
        }

        // Update progress
        setProcessingProgress((pageNum / numPages) * 100);
      }

      console.log(`Successfully processed ${pages.length} pages`);
      onPagesExtracted(pages);
    } catch (error) {
      console.error('Error processing PDF:', error);
      setError('Failed to process PDF pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearSelection = () => {
    setFile(null);
    setNumPages(0);
    setError(null);
    setProcessingProgress(0);
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
          {/* PDF info display */}
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
          </div>
        </div>
      )}

      {/* Process Button */}
      {file && numPages > 0 && (
        <button
          onClick={processAllPages}
          disabled={isProcessing}
          className='w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
          style={{
            backgroundColor: '#8975EA',
            color: '#ffffff',
          }}
        >
          {isProcessing ? (
            <div className='flex items-center justify-center gap-2'>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              <span>Processing... {Math.round(processingProgress)}%</span>
            </div>
          ) : (
            `Process ${numPages} pages`
          )}
        </button>
      )}

      {/* Processing Progress */}
      {isProcessing && (
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
          <li>• Each page is converted to high-quality images</li>
          <li>• Navigate between pages in the main view</li>
          <li>• Text extraction preserves original layout</li>
          <li>• Images and formatting are maintained</li>
        </ul>
      </div>
    </div>
  );
}
