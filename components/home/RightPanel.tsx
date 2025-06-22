'use client';

import ImageToText from '../ImageToText';

interface ImageData {
  id: string;
  file: File;
  preview: string;
  extractedText?: string;
  isProcessing?: boolean;
  hasError?: boolean;
  errorMessage?: string;
}

interface RightPanelProps {
  onTextExtracted: (text: string) => void;
  onImagesUploaded?: (images: ImageData[]) => void;
}

export default function RightPanel({
  onTextExtracted,
  onImagesUploaded,
}: RightPanelProps) {
  const handleTextExtracted = (text: string, images: ImageData[]) => {
    onTextExtracted(text);
    if (onImagesUploaded) {
      onImagesUploaded(images);
    }
  };

  const handleImagesUploaded = (images: ImageData[]) => {
    if (onImagesUploaded) {
      onImagesUploaded(images);
    }
  };

  return (
    <div
      className='flex flex-col h-full overflow-hidden'
      style={{
        backgroundColor: '#1F1E1D',
        color: '#ffffff',
      }}
    >
      {/* Header */}
      <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
        <h2 className='text-xl font-semibold'>Image Text Extraction</h2>
        <p className='text-sm text-gray-400 mt-1'>
          Upload images and extract text with AI
        </p>
      </div>

      {/* Content Area */}
      <div className='flex-1 overflow-y-auto'>
        <ImageToText
          onTextExtracted={handleTextExtracted}
          onImagesUploaded={handleImagesUploaded}
        />
      </div>
    </div>
  );
}
