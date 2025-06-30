'use client';

import { useRef, useEffect } from 'react';
import ImageToText from './ImageToText';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  extractedText?: string;
  isProcessing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  processingProgress?: number;
}

interface ImageUploadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onTextExtracted: (text: string, images: ImageData[]) => void;
  existingImages?: ImageData[];
}

export default function ImageUploadPopup({
  isOpen,
  onClose,
  onTextExtracted,
  existingImages = [],
}: ImageUploadPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle text extraction from ImageToText component
  const handleTextExtracted = (text: string, images: ImageData[]) => {
    onTextExtracted(text, images);
  };

  // Handle images uploaded from ImageToText component
  const handleImagesUploaded = (images: ImageData[]) => {
    // We can handle additional logic here if needed
    // The images are already managed by the ImageToText component
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300'
        onClick={onClose}
      />

      {/* Popup */}
      <div
        ref={popupRef}
        className='relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden transform transition-all duration-300 scale-100'
        style={{
          backgroundColor: '#1F1E1D',
          color: '#ffffff',
          animation: isOpen ? 'slideIn 0.3s ease-out' : undefined,
        }}
      >
        {/* Header */}
        <div
          className='flex items-center justify-between p-6 border-b'
          style={{ borderColor: '#2f2d2a' }}
        >
          <div>
            <h2 className='text-xl font-semibold'>Upload Images</h2>
            <p className='text-sm text-gray-400 mt-1'>
              Extract text from images using AI
            </p>
          </div>
          <button
            onClick={onClose}
            className='w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors text-xl'
            style={{ color: '#9ca3af' }}
          >
            ×
          </button>
        </div>

        {/* Content - Using ImageToText component */}
        <div
          className='overflow-y-auto'
          style={{ maxHeight: 'calc(90vh - 140px)' }}
        >
          <ImageToText
            onTextExtracted={handleTextExtracted}
            onImagesUploaded={handleImagesUploaded}
          />
        </div>

        {/* Footer */}
        <div
          className='p-4 border-t flex justify-end'
          style={{ borderColor: '#2f2d2a' }}
        >
          <button
            onClick={onClose}
            className='px-6 py-2 rounded-lg text-sm transition-colors hover:bg-gray-700'
            style={{ color: '#9ca3af' }}
          >
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
