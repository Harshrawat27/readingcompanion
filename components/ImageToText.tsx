'use client';

import { useState, useRef } from 'react';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  extractedText?: string;
  isProcessing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

interface ImageToTextProps {
  onTextExtracted: (text: string, images: ImageData[]) => void;
  onImagesUploaded: (images: ImageData[]) => void;
}

export default function ImageToText({
  onTextExtracted,
  onImagesUploaded,
}: ImageToTextProps) {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
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

  // Handle multiple file selection
  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    // Check total limit
    if (images.length + files.length > 20) {
      setError(
        `You can upload maximum 20 images. Currently have ${images.length}, trying to add ${files.length}.`
      );
      return;
    }

    setError(null);
    const newImages: ImageData[] = [];

    for (const file of files) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`"${file.name}" is not an image file`);
        continue;
      }

      // Validate file size (max 20MB per image)
      if (file.size > 20 * 1024 * 1024) {
        setError(`"${file.name}" is larger than 20MB`);
        continue;
      }

      try {
        const preview = await fileToBase64(file);
        const imageData: ImageData = {
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          isProcessing: false,
          hasError: false,
        };
        newImages.push(imageData);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
      }
    }

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
  };

  // Extract text from a single image
  const extractTextFromImage = async (image: ImageData): Promise<string> => {
    const response = await fetch('/api/vision', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: image.preview,
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
3. Handle mathematical formulas and equations:
   - For inline math: $formula$
   - For display math (centered): $formula$
   - Preserve all mathematical notation exactly as shown
   - Keep subscripts, superscripts, fractions, Greek letters, etc.
4. Maintain original spacing and line breaks
5. Preserve the reading order and layout structure
6. Keep tables in proper markdown table format if present
7. For images/diagrams, use: [Image: brief description]
8. Maintain any indentation or grouping
9. Do NOT wrap content in code blocks unless it's actual code

Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary. Pay special attention to mathematical formulas and scientific notation.`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to process image');
    }

    if (data.success) {
      return data.text;
    } else {
      throw new Error('No text could be extracted from the image');
    }
  };

  // Extract text from a single image by ID
  const processSingleImage = async (imageId: string) => {
    const imageIndex = images.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) return;

    const updatedImages = [...images];
    updatedImages[imageIndex] = {
      ...updatedImages[imageIndex],
      isProcessing: true,
      hasError: false,
    };
    setImages(updatedImages);

    try {
      const text = await extractTextFromImage(updatedImages[imageIndex]);
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        extractedText: text,
        isProcessing: false,
      };

      setImages(updatedImages);
      onTextExtracted(text, updatedImages);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process image';
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        isProcessing: false,
        hasError: true,
        errorMessage,
      };
      setImages(updatedImages);
      setError(errorMessage);
    }
  };

  // Extract text from all images
  const processAllImages = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    setError(null);
    const updatedImages = [...images];
    let combinedText = '';

    try {
      for (let i = 0; i < updatedImages.length; i++) {
        if (updatedImages[i].extractedText) {
          // Skip already processed images
          combinedText += `\n\n--- IMAGE ${i + 1} ---\n\n${
            updatedImages[i].extractedText
          }`;
          continue;
        }

        setCurrentProcessingIndex(i);
        updatedImages[i] = {
          ...updatedImages[i],
          isProcessing: true,
          hasError: false,
        };
        setImages([...updatedImages]);

        try {
          const text = await extractTextFromImage(updatedImages[i]);
          updatedImages[i] = {
            ...updatedImages[i],
            extractedText: text,
            isProcessing: false,
          };

          combinedText += `\n\n--- IMAGE ${i + 1} ---\n\n${text}`;
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to process image';
          updatedImages[i] = {
            ...updatedImages[i],
            isProcessing: false,
            hasError: true,
            errorMessage,
          };
          combinedText += `\n\n--- IMAGE ${
            i + 1
          } ---\n\n[Error: ${errorMessage}]`;
        }

        setImages([...updatedImages]);
      }

      if (combinedText.trim()) {
        onTextExtracted(combinedText.trim(), updatedImages);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
    }
  };

  // Remove an image
  const removeImage = (imageId: string) => {
    const updatedImages = images.filter((img) => img.id !== imageId);
    setImages(updatedImages);
    onImagesUploaded(updatedImages);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Clear all images
  const clearAllImages = () => {
    setImages([]);
    setError(null);
    onImagesUploaded([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className='w-full p-4'>
      {/* File Input */}
      <div className='mb-4'>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          multiple
          onChange={handleFileSelect}
          className='hidden'
          id='images-upload'
        />
        <label
          htmlFor='images-upload'
          className='block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer text-center transition-colors hover:border-gray-400'
          style={{ borderColor: '#3a3836', color: '#9ca3af' }}
        >
          <div className='space-y-2'>
            <div className='text-2xl'>📷</div>
            <div className='text-sm'>Click to select images</div>
            <div className='text-xs text-gray-500'>
              Upload up to 20 images (JPG, PNG, GIF, WebP - max 20MB each)
            </div>
            <div className='text-xs text-gray-400'>
              {images.length}/20 images uploaded
            </div>
          </div>
        </label>
      </div>

      {/* Images Grid */}
      {images.length > 0 && (
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
              Images ({images.length}):
            </h3>
            <button
              onClick={clearAllImages}
              className='text-xs text-red-400 hover:text-red-300'
            >
              Clear All
            </button>
          </div>

          <div className='grid grid-cols-2 gap-3 max-h-80 overflow-y-auto'>
            {images.map((image, index) => (
              <div
                key={image.id}
                className='relative p-2 rounded-lg border'
                style={{ backgroundColor: '#2a2826', borderColor: '#3a3836' }}
              >
                {/* Image Preview */}
                <div className='relative'>
                  <img
                    src={image.preview}
                    alt={`Image ${index + 1}`}
                    className='w-full h-24 object-cover rounded'
                  />

                  {/* Processing Overlay */}
                  {(image.isProcessing ||
                    (isProcessing && currentProcessingIndex === index)) && (
                    <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded'>
                      <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    className='absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs'
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                  >
                    ×
                  </button>
                </div>

                {/* Image Info */}
                <div className='mt-2 space-y-1'>
                  <div className='text-xs text-gray-300 truncate'>
                    {image.file.name}
                  </div>

                  <div className='flex items-center justify-between'>
                    <div className='text-xs text-gray-500'>
                      {(image.file.size / (1024 * 1024)).toFixed(1)} MB
                    </div>

                    {/* Status */}
                    {image.extractedText ? (
                      <span className='text-xs text-green-400'>
                        ✓ Text Ready
                      </span>
                    ) : image.hasError ? (
                      <span className='text-xs text-red-400'>✗ Error</span>
                    ) : image.isProcessing ? (
                      <span className='text-xs text-yellow-400'>
                        Processing...
                      </span>
                    ) : (
                      <button
                        onClick={() => processSingleImage(image.id)}
                        className='text-xs px-2 py-1 rounded transition-colors'
                        style={{ backgroundColor: '#8975EA', color: 'white' }}
                      >
                        Extract
                      </button>
                    )}
                  </div>

                  {/* Error Message */}
                  {image.hasError && image.errorMessage && (
                    <div className='text-xs text-red-400 mt-1'>
                      {image.errorMessage}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Process All Button */}
      {images.length > 0 && (
        <button
          onClick={processAllImages}
          disabled={isProcessing}
          className='w-full py-2 px-4 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4'
          style={{
            backgroundColor: '#8975EA',
            color: '#ffffff',
          }}
        >
          {isProcessing ? (
            <div className='flex items-center justify-center gap-2'>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              <span>
                Processing image {currentProcessingIndex + 1} of {images.length}
                ...
              </span>
            </div>
          ) : (
            `Extract Text from All ${images.length} Images`
          )}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div
          className='p-3 rounded-lg border'
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
      <div className='p-4 rounded-lg' style={{ backgroundColor: '#2a2826' }}>
        <h3 className='text-sm font-medium mb-2' style={{ color: '#8975EA' }}>
          How it works:
        </h3>
        <ul className='text-xs text-gray-400 space-y-1'>
          <li>• Select up to 20 images at once</li>
          <li>• Extract text from individual images or all at once</li>
          <li>• Text appears in the main panel with formatting</li>
          <li>• Images are processed using AI vision</li>
          <li>• Original formatting and structure are preserved</li>
        </ul>
      </div>
    </div>
  );
}
