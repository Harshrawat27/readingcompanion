// app/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import LeftPanel from '../components/home/LeftPanel';
import MiddlePanel from '../components/home/MiddlePanel';
import ChatPanel from '../components/home/ChatPanel';

// Add ImageData interface for type safety
interface ImageData {
  id: string;
  file: File;
  preview: string;
  extractedText?: string;
  isProcessing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

// PageData interface to match MiddlePanel expectations
interface PageData {
  pageNumber: number;
  imageData: string;
  extractedText?: string;
  width: number;
  height: number;
}

export default function Home() {
  // Layout state
  const [leftWidth, setLeftWidth] = useState(20);
  const [middleWidth, setMiddleWidth] = useState(50);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Application state
  const [extractedText, setExtractedText] = useState<string>('');
  const [fontSize, setFontSize] = useState<number>(14);
  const [theme, setTheme] = useState<string>('dark');
  const [isHighlightEnabled, setIsHighlightEnabled] = useState<boolean>(false);

  // New state for multi-page documents
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<ImageData[]>([]);

  // Left divider handlers
  const handleLeftMouseDown = useCallback(() => {
    setIsDraggingLeft(true);
  }, []);

  const handleLeftMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingLeft || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      const constrainedLeftWidth = Math.min(Math.max(newLeftWidth, 10), 35);
      setLeftWidth(constrainedLeftWidth);
    },
    [isDraggingLeft]
  );

  // Right divider handlers
  const handleRightMouseDown = useCallback(() => {
    setIsDraggingRight(true);
  }, []);

  const handleRightMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRight || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const mousePosition =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      const newMiddleWidth = mousePosition - leftWidth;
      const constrainedMiddleWidth = Math.min(Math.max(newMiddleWidth, 30), 70);
      setMiddleWidth(constrainedMiddleWidth);
    },
    [isDraggingRight, leftWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }, []);

  // Global mouse event listeners
  useState(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      handleLeftMouseMove(e);
      handleRightMouseMove(e);
    };
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  });

  // Convert ImageData to PageData format for MiddlePanel
  const convertImagesToPages = (images: ImageData[]): PageData[] => {
    return images.map((image, index) => ({
      pageNumber: index + 1,
      imageData: image.preview,
      extractedText: image.extractedText,
      width: 800, // Default width
      height: 600, // Default height
    }));
  };

  // Parse combined text to extract individual page texts
  const parseMultiPageText = (combinedText: string): string[] => {
    if (!combinedText.includes('--- IMAGE')) {
      return [combinedText]; // Single page
    }

    // Split by the image markers
    const sections = combinedText.split(/\n\n--- IMAGE \d+ ---\n\n/);

    // Remove empty first section if it exists
    if (sections[0].trim() === '') {
      sections.shift();
    }

    return sections
      .map((section) => section.trim())
      .filter((section) => section.length > 0);
  };

  // Application event handlers
  const handleTextExtracted = (text: string, images?: ImageData[]) => {
    console.log('Text extracted in main app:', text.substring(0, 100) + '...');

    // Update uploaded images state
    if (images && images.length > 0) {
      setUploadedImages(images);

      // Check if we have multiple images with combined text
      if (text.includes('--- IMAGE') && images.length > 1) {
        // Multi-page mode: parse the combined text into individual pages
        const pageTexts = parseMultiPageText(text);

        const newPages = images.map((image, index) => ({
          pageNumber: index + 1,
          imageData: image.preview,
          extractedText: pageTexts[index] || image.extractedText || '',
          width: 800,
          height: 600,
        }));

        setPages(newPages);
        setCurrentPage(1); // Start with first page

        // Set the extracted text to the first page's text
        setExtractedText(pageTexts[0] || '');
      } else {
        // Single image or individual processing
        const newPages = convertImagesToPages(images);
        setPages(newPages);

        if (images.length === 1) {
          setCurrentPage(1);
          setExtractedText(images[0].extractedText || text);
        } else {
          // Multiple individual extractions - show first page with text
          const firstPageWithText = newPages.find((p) => p.extractedText);
          if (firstPageWithText) {
            setCurrentPage(firstPageWithText.pageNumber);
            setExtractedText(firstPageWithText.extractedText || '');
          } else {
            setCurrentPage(1);
            setExtractedText('');
          }
        }
      }
    } else {
      // No images - single text extraction
      setExtractedText(text);
      setPages([]);
      setCurrentPage(1);
    }
  };

  // Handle page navigation for multi-page mode
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pages.length) {
      setCurrentPage(pageNumber);

      // Update the main text area with the current page's text
      const currentPageData = pages.find((p) => p.pageNumber === pageNumber);
      if (currentPageData?.extractedText) {
        setExtractedText(currentPageData.extractedText);
      } else {
        setExtractedText(''); // Clear text if current page has no text yet
      }
    }
  };

  const handleClearText = () => {
    setExtractedText('');
    setPages([]);
    setCurrentPage(1);
    setUploadedImages([]);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleHighlightToggle = (enabled: boolean) => {
    setIsHighlightEnabled(enabled);
  };

  const handleImagesUploaded = (images: ImageData[]) => {
    setUploadedImages(images);

    // If images are uploaded but not yet processed, create pages without text
    if (images.length > 0) {
      const newPages = convertImagesToPages(images);
      setPages(newPages);
      setCurrentPage(1);
    }
  };

  const rightWidth = 100 - leftWidth - middleWidth;

  // Get current page text for chat context
  const currentPageText =
    pages.length > 0
      ? pages.find((p) => p.pageNumber === currentPage)?.extractedText || ''
      : extractedText;

  return (
    <div
      ref={containerRef}
      className='flex h-screen w-full'
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Left Panel - Controls & Image Upload */}
      <div style={{ width: `${leftWidth}%` }}>
        <LeftPanel
          onFontSizeChange={handleFontSizeChange}
          onHighlightToggle={handleHighlightToggle}
          onThemeChange={handleThemeChange}
          onTextExtracted={handleTextExtracted}
          onImagesUploaded={handleImagesUploaded}
          currentFontSize={fontSize}
          isHighlightEnabled={isHighlightEnabled}
          currentTheme={theme}
        />
      </div>

      {/* Left Divider */}
      <div
        className='w-0.5 cursor-col-resize hover:w-1 transition-all duration-200'
        style={{ backgroundColor: '#3a3836' }}
        onMouseDown={handleLeftMouseDown}
      />

      {/* Middle Panel - Document Display */}
      <div style={{ width: `${middleWidth}%` }}>
        <MiddlePanel
          extractedText={extractedText}
          fontSize={fontSize}
          theme={theme}
          isHighlightEnabled={isHighlightEnabled}
          onClearText={handleClearText}
          pages={pages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Right Divider */}
      <div
        className='w-0.5 cursor-col-resize hover:w-1 transition-all duration-200'
        style={{ backgroundColor: '#3a3836' }}
        onMouseDown={handleRightMouseDown}
      />

      {/* Right Panel - Chat */}
      <div style={{ width: `${rightWidth}%` }}>
        <ChatPanel
          extractedText={currentPageText}
          currentPage={currentPage}
          totalPages={pages.length > 0 ? pages.length : undefined}
        />
      </div>
    </div>
  );
}
