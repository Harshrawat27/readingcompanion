// app/page.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import LeftPanel from '../components/home/LeftPanel';
import MiddlePanel from '../components/home/MiddlePanel';
import ChatPanel from '../components/home/ChatPanel';
import ImageUploadPopup from '../components/ImageUploadPopup';

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

  // Image upload popup state
  const [isUploadPopupOpen, setIsUploadPopupOpen] = useState<boolean>(false);
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

  // Application event handlers
  const handleTextExtracted = (text: string, images?: ImageData[]) => {
    console.log('Text extracted in main app:', text.substring(0, 100) + '...');
    setExtractedText(text);

    // Update uploaded images state
    if (images && images.length > 0) {
      setUploadedImages(images);
      const newPages = convertImagesToPages(images);
      setPages(newPages);

      // If text contains multi-image markers, we're in multi-image mode
      if (text.includes('--- IMAGE')) {
        // Set current page to show the first image with extracted text
        const firstPageWithText = newPages.find((p) => p.extractedText);
        if (firstPageWithText) {
          setCurrentPage(firstPageWithText.pageNumber);
        }
      } else {
        // Single image mode - show first page
        setCurrentPage(1);
      }
    } else {
      // Clear pages if no images
      setPages([]);
      setCurrentPage(1);
    }

    // Close the popup after successful extraction
    setIsUploadPopupOpen(false);
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

  // Handle upload images button click
  const handleUploadImagesClick = () => {
    setIsUploadPopupOpen(true);
  };

  // Handle popup close
  const handlePopupClose = () => {
    setIsUploadPopupOpen(false);
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
      {/* Left Panel - Controls & Tools */}
      <div style={{ width: `${leftWidth}%` }}>
        <LeftPanel
          onFontSizeChange={handleFontSizeChange}
          onHighlightToggle={handleHighlightToggle}
          onThemeChange={handleThemeChange}
          onUploadImagesClick={handleUploadImagesClick}
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

      {/* Image Upload Popup */}
      <ImageUploadPopup
        isOpen={isUploadPopupOpen}
        onClose={handlePopupClose}
        onTextExtracted={handleTextExtracted}
        existingImages={uploadedImages}
      />
    </div>
  );
}
