'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ImageToText from '../components/ImageToText';

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(70);
  const [isDragging, setIsDragging] = useState(false);
  const [extractedText, setExtractedText] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80);
      setLeftWidth(constrainedWidth);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Handle text extraction (assuming this is a separate effect or callback)
  const handleTextExtracted = (text: string) => {
    setExtractedText(text);
  };

  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      const key = `line-${index}`;

      // Main headings (# )
      if (line.startsWith('# ')) {
        return (
          <h1
            key={key}
            className='text-2xl font-bold mb-4 mt-6'
            style={{ color: '#ffffff' }}
          >
            {line.substring(2)}
          </h1>
        );
      }

      // Subheadings (## )
      if (line.startsWith('## ')) {
        return (
          <h2
            key={key}
            className='text-xl font-semibold mb-3 mt-5'
            style={{ color: '#e5e7eb' }}
          >
            {line.substring(3)}
          </h2>
        );
      }

      // Smaller headings (### )
      if (line.startsWith('### ')) {
        return (
          <h3
            key={key}
            className='text-lg font-medium mb-2 mt-4'
            style={{ color: '#d1d5db' }}
          >
            {line.substring(4)}
          </h3>
        );
      }

      // Bullet points (- )
      if (line.startsWith('- ')) {
        return (
          <div key={key} className='flex items-start mb-1'>
            <span className='mr-2 mt-1' style={{ color: '#8975EA' }}>
              •
            </span>
            <span style={{ color: '#e5e7eb' }}>{line.substring(2)}</span>
          </div>
        );
      }

      // Numbered lists (1. 2. etc.)
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          return (
            <div key={key} className='flex items-start mb-1'>
              <span
                className='mr-2 mt-1 font-medium'
                style={{ color: '#8975EA' }}
              >
                {match[1]}.
              </span>
              <span style={{ color: '#e5e7eb' }}>{match[2]}</span>
            </div>
          );
        }
      }

      // Bold text (**text**)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p
            key={key}
            className='mb-2 leading-relaxed'
            style={{ color: '#e5e7eb' }}
          >
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={i} className='font-semibold'>
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              return part;
            })}
          </p>
        );
      }

      // Italic text (*text*)
      if (line.includes('*') && !line.includes('**')) {
        const parts = line.split(/(\*.*?\*)/);
        return (
          <p
            key={key}
            className='mb-2 leading-relaxed'
            style={{ color: '#e5e7eb' }}
          >
            {parts.map((part, i) => {
              if (
                part.startsWith('*') &&
                part.endsWith('*') &&
                !part.includes('**')
              ) {
                return (
                  <em key={i} className='italic'>
                    {part.slice(1, -1)}
                  </em>
                );
              }
              return part;
            })}
          </p>
        );
      }

      // Empty lines for spacing
      if (line.trim() === '') {
        return <div key={key} className='mb-2'></div>;
      }

      // Regular paragraphs
      return (
        <p
          key={key}
          className='mb-2 leading-relaxed'
          style={{ color: '#e5e7eb' }}
        >
          {line}
        </p>
      );
    });
  };

  const clearText = () => {
    setExtractedText('');
  };

  return (
    <div
      ref={containerRef}
      className='flex h-screen w-full'
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Left Panel - 70% - Color #262624 */}
      <div
        className='flex flex-col p-8 overflow-y-auto'
        style={{
          width: `${leftWidth}%`,
          backgroundColor: '#262624',
          color: '#ffffff',
        }}
      >
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-semibold'>Extracted Text</h1>
          {extractedText && (
            <button
              onClick={clearText}
              className='px-3 py-1 text-sm rounded border'
              style={{ borderColor: '#3a3836', color: '#9ca3af' }}
            >
              Clear
            </button>
          )}
        </div>

        {extractedText ? (
          <div className='flex-1'>
            <div
              className='w-full h-full p-6 rounded-lg border overflow-y-auto'
              style={{
                backgroundColor: '#2a2826',
                borderColor: '#3a3836',
              }}
            >
              <div className='prose prose-invert max-w-none'>
                {parseMarkdown(extractedText)}
              </div>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex items-center justify-center'>
            <div className='text-center'>
              <div className='text-4xl mb-4'>📄</div>
              <p className='text-gray-300'>Upload an image to extract text</p>
              <p className='text-sm text-gray-500 mt-2'>
                The extracted text will appear here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Resizable Divider */}
      <div
        className='w-1 cursor-col-resize hover:w-2 transition-all duration-200'
        style={{ backgroundColor: '#3a3836' }}
        onMouseDown={handleMouseDown}
      />

      {/* Right Panel - 30% - Color #1F1E1D */}
      <div
        className='flex flex-col p-8 overflow-y-auto'
        style={{
          width: `${100 - leftWidth}%`,
          backgroundColor: '#1F1E1D',
          color: '#ffffff',
        }}
      >
        <h2 className='text-xl font-semibold mb-6'>Image to Text</h2>

        <div className='flex-1'>
          <ImageToText onTextExtracted={handleTextExtracted} />
        </div>

        {/* Instructions */}
        <div
          className='mt-6 p-4 rounded-lg'
          style={{ backgroundColor: '#2a2826' }}
        >
          <h3 className='text-sm font-medium mb-2' style={{ color: '#8975EA' }}>
            How it works:
          </h3>
          <ul className='text-xs text-gray-400 space-y-1'>
            <li>• Select an image file</li>
            <li>• Click "Extract Text"</li>
            <li>• AI will read and extract all text</li>
            <li>• Text appears in the main panel</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
