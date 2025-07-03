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
  processingProgress?: number; // 0-100 for individual image progress
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
  const [processingStats, setProcessingStats] = useState({
    completed: 0,
    total: 0,
    currentBatch: 0,
    totalBatches: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration
  const BATCH_SIZE = 5; // Process 5 images simultaneously
  const MAX_RETRIES = 2;

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
          processingProgress: 0,
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

  // Extract text from a single image with retry logic
  const extractTextFromImage = async (
    image: ImageData,
    retryCount = 0
  ): Promise<string> => {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: image.preview,
          //           prompt: `Analyze this image and extract ALL text while preserving the EXACT original formatting and structure. Pay close attention to the beginning of each image—some may start mid-sentence or include file names or headers. Do not assume any content is a heading unless it's clearly formatted as one. Maintain natural text flow across images that are part of the same document.

          // CRITICAL REQUIREMENTS:
          // 1. Identify the text hierarchy exactly as shown (main titles, subtitles, body text)
          // 2. Use appropriate markdown formatting:
          //    - # for main headings/titles
          //    - ## for section headings
          //    - ### for subsection headings
          //    - Regular text for paragraphs
          //    - - for bullet points
          //    - 1. 2. 3. for numbered lists
          //    - **text** for bold text
          //    - *text* for italic text
          // 3. Handle mathematical formulas and equations:
          //    - For inline math: $formula$
          //    - For display math (centered): $formula$
          //    - Preserve all mathematical notation exactly as shown
          //    - Keep subscripts, superscripts, fractions, Greek letters, etc.
          // 4. Maintain original spacing and line breaks
          // 5. Preserve the reading order and layout structure
          // 6. Keep tables in proper markdown table format if present
          // 7. For images/diagrams, use: [Image: brief description]
          // 8. Maintain any indentation or grouping
          // 9. Do NOT wrap content in code blocks unless it's actual code, when something is starting from image or complex formula you are turning whole page into code block don't do this, when starting is complex watch carefully and only wrap code into code block.

          // Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary. Pay special attention to mathematical formulas and scientific notation.`,
          prompt: `
You are an expert at converting complex documents (textbooks, academic PDFs, code tutorials) into accurate, structured Markdown. The input is a single image of a page from such a document. Convert the visible content into clean Markdown.

Rules to follow:
1. Use '#' for the main document title only once, if visible. Otherwise, use '##' or '###' as appropriate for sections and sub-sections.
2. If the page is a continuation and has no title, do not invent one. Do not use '#' unless you're confident it's the actual title of the entire document.
3. Use proper formatting:
   - Bold: **like this**
   - Italic: *like this*
   - Lists: '-', '1.' for bullets and numbers
   - Code blocks: Use triple backticks like \`\`\`js for code
4. For math expressions:
   - Use LaTeX wrapped in '$...$' for inline and '$$...$$' for block math
   - Never skip math; if unreadable, write '[math unreadable]'
5. Do NOT wrap the whole page in a single code block unless it's clearly all code.
6. Transcribe figure captions as: **Figure: description**
7. Maintain spacing/indentation in code/math where relevant
8. Maintain structural consistency across pages. Don’t assume each page is a new document.

Output only clean and valid Markdown. Do not explain anything.
`,
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
    } catch (error) {
      console.error(
        `Error extracting text from image (attempt ${retryCount + 1}):`,
        error
      );

      // Retry logic
      if (
        retryCount < MAX_RETRIES &&
        error instanceof Error &&
        (error.message.includes('timeout') ||
          error.message.includes('rate limit'))
      ) {
        // Wait a bit before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, (retryCount + 1) * 1000)
        );
        return extractTextFromImage(image, retryCount + 1);
      }

      throw error;
    }
  };

  // Update image state helper
  const updateImageState = (imageId: string, updates: Partial<ImageData>) => {
    setImages((prevImages) => {
      const updatedImages = prevImages.map((img) =>
        img.id === imageId ? { ...img, ...updates } : img
      );

      // If this update includes extracted text, notify parent immediately
      if (updates.extractedText) {
        const updatedImage = updatedImages.find((img) => img.id === imageId);
        if (updatedImage?.extractedText) {
          onTextExtracted(updatedImage.extractedText, updatedImages);
          onImagesUploaded(updatedImages);
        }
      }

      return updatedImages;
    });
  };

  // Process a single batch of images
  const processBatch = async (batch: ImageData[], batchNumber: number) => {
    console.log(`Processing batch ${batchNumber + 1}: ${batch.length} images`);

    // Set all images in batch to processing state
    batch.forEach((image) => {
      updateImageState(image.id, {
        isProcessing: true,
        hasError: false,
        processingProgress: 0,
      });
    });

    // Process all images in batch simultaneously
    const batchPromises = batch.map(async (image) => {
      try {
        // Simulate progress updates (since we can't track real API progress)
        const progressInterval = setInterval(() => {
          updateImageState(image.id, {
            processingProgress: Math.min(
              (image.processingProgress || 0) + 10,
              90
            ),
          });
        }, 200);

        const text = await extractTextFromImage(image);

        clearInterval(progressInterval);

        updateImageState(image.id, {
          extractedText: text,
          isProcessing: false,
          processingProgress: 100,
        });

        return { success: true, image, text };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to process image';

        updateImageState(image.id, {
          isProcessing: false,
          hasError: true,
          errorMessage,
          processingProgress: 0,
        });

        return { success: false, image, error: errorMessage };
      }
    });

    // Wait for all images in batch to complete
    const results = await Promise.all(batchPromises);

    // Update completion stats
    const successCount = results.filter((r) => r.success).length;
    setProcessingStats((prev) => ({
      ...prev,
      completed: prev.completed + successCount,
      currentBatch: batchNumber + 1,
    }));

    return results;
  };

  // Extract text from a single image by ID
  const processSingleImage = async (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;

    updateImageState(imageId, {
      isProcessing: true,
      hasError: false,
      processingProgress: 0,
    });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImages((prevImages) => {
          const currentImage = prevImages.find((img) => img.id === imageId);
          if (currentImage && currentImage.isProcessing) {
            return prevImages.map((img) =>
              img.id === imageId
                ? {
                    ...img,
                    processingProgress: Math.min(
                      (img.processingProgress || 0) + 15,
                      90
                    ),
                  }
                : img
            );
          }
          return prevImages;
        });
      }, 300);

      const text = await extractTextFromImage(image);

      clearInterval(progressInterval);

      // Update state and notify parent
      setImages((prevImages) => {
        const updatedImages = prevImages.map((img) =>
          img.id === imageId
            ? {
                ...img,
                extractedText: text,
                isProcessing: false,
                processingProgress: 100,
              }
            : img
        );

        // Notify parent with the extracted text and updated images
        onTextExtracted(text, updatedImages);
        onImagesUploaded(updatedImages);

        return updatedImages;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to process image';

      updateImageState(imageId, {
        isProcessing: false,
        hasError: true,
        errorMessage,
        processingProgress: 0,
      });

      setError(errorMessage);
    }
  };

  // Extract text from all images using batch processing
  const processAllImages = async () => {
    if (images.length === 0) return;

    // Filter out already processed images
    const unprocessedImages = images.filter(
      (img) => !img.extractedText && !img.hasError
    );

    if (unprocessedImages.length === 0) {
      // All images already processed, just combine text
      combineAndReturnText();
      return;
    }

    setIsProcessing(true);
    setError(null);

    // Calculate batches
    const batches: ImageData[][] = [];
    for (let i = 0; i < unprocessedImages.length; i += BATCH_SIZE) {
      batches.push(unprocessedImages.slice(i, i + BATCH_SIZE));
    }

    setProcessingStats({
      completed: 0,
      total: unprocessedImages.length,
      currentBatch: 0,
      totalBatches: batches.length,
    });

    try {
      // Process batches sequentially to avoid overwhelming the API
      for (let i = 0; i < batches.length; i++) {
        await processBatch(batches[i], i);

        // Small delay between batches to be nice to the API
        if (i < batches.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // After all processing is complete, combine results
      setTimeout(() => {
        combineAndReturnText();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process images');
    } finally {
      setIsProcessing(false);
      setProcessingStats({
        completed: 0,
        total: 0,
        currentBatch: 0,
        totalBatches: 0,
      });
    }
  };

  // Combine all extracted text and return to parent
  const combineAndReturnText = () => {
    setImages((currentImages) => {
      let combinedText = '';

      currentImages.forEach((image, index) => {
        if (image.extractedText) {
          combinedText += `\n\n--- IMAGE ${index + 1} ---\n\n${
            image.extractedText
          }`;
        } else if (image.hasError) {
          combinedText += `\n\n--- IMAGE ${index + 1} ---\n\n[Error: ${
            image.errorMessage || 'Failed to process'
          }]`;
        }
      });

      if (combinedText.trim()) {
        console.log(
          'Sending combined text to parent:',
          combinedText.length,
          'characters'
        );
        onTextExtracted(combinedText.trim(), currentImages);
        onImagesUploaded(currentImages);
      }

      return currentImages;
    });
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

  // Calculate processing statistics
  const processedCount = images.filter((img) => img.extractedText).length;
  const errorCount = images.filter((img) => img.hasError).length;
  const processingCount = images.filter((img) => img.isProcessing).length;

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

      {/* Processing Status Bar */}
      {isProcessing && (
        <div
          className='mb-4 p-3 rounded-lg'
          style={{ backgroundColor: '#2a2826' }}
        >
          <div className='flex items-center justify-between mb-2'>
            <span className='text-sm font-medium' style={{ color: '#8975EA' }}>
              Processing Images...
            </span>
            <span className='text-xs text-gray-400'>
              Batch {processingStats.currentBatch}/
              {processingStats.totalBatches}
            </span>
          </div>

          <div className='space-y-2'>
            <div className='flex justify-between text-xs text-gray-400'>
              <span>
                Progress: {processingStats.completed}/{processingStats.total}
              </span>
              <span>
                {Math.round(
                  (processingStats.completed / processingStats.total) * 100
                )}
                %
              </span>
            </div>

            <div
              className='h-2 rounded-full overflow-hidden'
              style={{ backgroundColor: '#3a3836' }}
            >
              <div
                className='h-full transition-all duration-300 rounded-full'
                style={{
                  backgroundColor: '#8975EA',
                  width: `${
                    (processingStats.completed / processingStats.total) * 100
                  }%`,
                }}
              />
            </div>

            <div className='text-xs text-gray-500'>
              Processing {BATCH_SIZE} images simultaneously per batch
            </div>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className='mb-4'>
          <div className='flex items-center justify-between mb-3'>
            <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
              Images ({images.length}):
              {processedCount > 0 && (
                <span className='ml-2 text-xs text-green-400'>
                  {processedCount} processed
                </span>
              )}
              {errorCount > 0 && (
                <span className='ml-2 text-xs text-red-400'>
                  {errorCount} failed
                </span>
              )}
              {processingCount > 0 && (
                <span className='ml-2 text-xs text-yellow-400'>
                  {processingCount} processing
                </span>
              )}
            </h3>
            <button
              onClick={clearAllImages}
              className='text-xs text-red-400 hover:text-red-300'
              disabled={isProcessing}
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

                  {/* Processing Overlay with Progress */}
                  {image.isProcessing && (
                    <div className='absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded'>
                      <div className='w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-1'></div>
                      {image.processingProgress !== undefined && (
                        <div className='text-white text-xs font-medium'>
                          {Math.round(image.processingProgress)}%
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => removeImage(image.id)}
                    disabled={image.isProcessing}
                    className='absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs disabled:opacity-50'
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
                        disabled={isProcessing}
                        className='text-xs px-2 py-1 rounded transition-colors disabled:opacity-50'
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
                Processing {processingStats.completed}/{processingStats.total}{' '}
                images (Batch {processingStats.currentBatch}/
                {processingStats.totalBatches})
              </span>
            </div>
          ) : (
            `Extract Text from All ${images.length} Images (${BATCH_SIZE} at a time)`
          )}
        </button>
      )}

      {/* Error Display */}
      {error && (
        <div
          className='p-3 rounded-lg border mb-4'
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
