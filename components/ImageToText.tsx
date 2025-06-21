'use client';

import { useState, useRef } from 'react';

interface ImageToTextProps {
  onTextExtracted: (text: string) => void;
}

export default function ImageToText({ onTextExtracted }: ImageToTextProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Handle file selection
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError('Image size should be less than 20MB');
      return;
    }

    try {
      setError(null);
      const base64Image = await fileToBase64(file);
      setSelectedImage(base64Image);
    } catch (err) {
      setError('Failed to read image file');
    }
  };

  // Process image with Vision API
  const processImage = async () => {
    if (!selectedImage) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt: `Analyze this image and extract ALL text while preserving the EXACT original formatting and structure. 

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

Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary.`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process image');
      }

      if (data.success) {
        onTextExtracted(data.text);
      } else {
        setError('No text could be extracted from the image');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedImage(null);
    setError(null);
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
          accept='image/*'
          onChange={handleFileSelect}
          className='hidden'
          id='image-upload'
        />
        <label
          htmlFor='image-upload'
          className='block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors hover:border-gray-400'
          style={{ borderColor: '#3a3836', color: '#9ca3af' }}
        >
          <div className='space-y-2'>
            <div className='text-2xl'>📷</div>
            <div className='text-sm'>Click to select an image</div>
            <div className='text-xs text-gray-500'>
              Supports: JPG, PNG, GIF, WebP (max 20MB)
            </div>
          </div>
        </label>
      </div>

      {/* Selected Image Preview */}
      {selectedImage && (
        <div className='mb-4'>
          <div className='relative'>
            <img
              src={selectedImage}
              alt='Selected'
              className='w-full h-40 object-cover rounded-lg'
            />
            <button
              onClick={clearSelection}
              className='absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm'
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Process Button */}
      {selectedImage && (
        <button
          onClick={processImage}
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
              <span>Processing...</span>
            </div>
          ) : (
            'Extract Text'
          )}
        </button>
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
    </div>
  );
}
