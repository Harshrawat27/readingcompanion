'use client';

import { useState, useRef, useCallback } from 'react';
import LeftPanel from '../components/home/LeftPanel';
import MiddlePanel from '../components/home/MiddlePanel';
import RightPanel from '../components/home/RightPanel';

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

  // New state for multi-image documents
  const [imagesData, setImagesData] = useState<ImageData[]>([]);
  const [currentImage, setCurrentImage] = useState<number>(1);

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

  // Application event handlers
  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
    // If we have images but are showing single text, clear images mode
    if (imagesData.length > 0 && !text.includes('--- IMAGE')) {
      setImagesData([]);
      setCurrentImage(1);
    }
  };

  // New handler for multi-image documents
  const handleImagesUploaded = (images: ImageData[]) => {
    console.log(`App received ${images.length} images`);
    setImagesData(images);
    setCurrentImage(1); // Reset to first image

    // Clear any existing single-image text when switching to multi-image mode
    if (images.length > 0) {
      setExtractedText('');
    }
  };

  // Handle image navigation
  const handleImageChange = (imageNumber: number) => {
    if (imageNumber >= 1 && imageNumber <= imagesData.length) {
      setCurrentImage(imageNumber);

      // Update the main text area with the current image's text
      const currentImageData = imagesData.find(
        (img, index) => index + 1 === imageNumber
      );
      if (currentImageData?.extractedText) {
        setExtractedText(currentImageData.extractedText);
      } else {
        setExtractedText(''); // Clear text if current image has no text yet
      }
    }
  };

  const handleClearText = () => {
    setExtractedText('');
    setImagesData([]);
    setCurrentImage(1);
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

  const rightWidth = 100 - leftWidth - middleWidth;

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

      {/* Middle Panel - Text Display */}
      <div style={{ width: `${middleWidth}%` }}>
        <MiddlePanel
          extractedText={extractedText}
          fontSize={fontSize}
          theme={theme}
          isHighlightEnabled={isHighlightEnabled}
          onClearText={handleClearText}
          images={imagesData}
          currentImage={currentImage}
          onImageChange={handleImageChange}
        />
      </div>

      {/* Right Divider */}
      <div
        className='w-0.5 cursor-col-resize hover:w-1 transition-all duration-200'
        style={{ backgroundColor: '#3a3836' }}
        onMouseDown={handleRightMouseDown}
      />

      {/* Right Panel - Image Upload */}
      <div style={{ width: `${rightWidth}%` }}>
        <RightPanel
          onTextExtracted={handleTextExtracted}
          onImagesUploaded={handleImagesUploaded}
        />
      </div>
    </div>
  );
}
