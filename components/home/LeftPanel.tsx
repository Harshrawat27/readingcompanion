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

interface LeftPanelProps {
  onFontSizeChange: (size: number) => void;
  onHighlightToggle: (enabled: boolean) => void;
  onThemeChange: (theme: string) => void;
  onTextExtracted: (text: string) => void;
  onImagesUploaded?: (images: ImageData[]) => void;
  currentFontSize: number;
  isHighlightEnabled: boolean;
  currentTheme: string;
}

export default function LeftPanel({
  onFontSizeChange,
  onHighlightToggle,
  onThemeChange,
  onTextExtracted,
  onImagesUploaded,
  currentFontSize,
  isHighlightEnabled,
  currentTheme,
}: LeftPanelProps) {
  const fontSizes = [
    { label: 'XS', value: 12 },
    { label: 'S', value: 14 },
    { label: 'M', value: 16 },
    { label: 'L', value: 18 },
    { label: 'XL', value: 20 },
    { label: 'XXL', value: 24 },
  ];

  const themes = [
    {
      label: 'Dark',
      value: 'dark',
      preview: '#262624',
    },
    {
      label: 'Sepia',
      value: 'sepia',
      preview: '#2d2a23',
    },
    {
      label: 'High Contrast',
      value: 'contrast',
      preview: '#000000',
    },
  ];

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
        <h2 className='text-lg font-semibold'>Controls</h2>
      </div>

      {/* Font Size Section */}
      <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
        <h3 className='text-sm font-medium mb-3' style={{ color: '#8975EA' }}>
          Font Size
        </h3>

        {/* Font Size Buttons Grid */}
        <div className='grid grid-cols-3 gap-2 mb-3'>
          {fontSizes.map((size) => (
            <button
              key={size.value}
              onClick={() => onFontSizeChange(size.value)}
              className={`p-2 rounded text-xs font-medium transition-all duration-200 ${
                currentFontSize === size.value
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={{
                backgroundColor:
                  currentFontSize === size.value ? '#8975EA' : '#2a2826',
                border:
                  currentFontSize === size.value
                    ? '1px solid #8975EA'
                    : '1px solid #3a3836',
              }}
            >
              {size.label}
            </button>
          ))}
        </div>

        {/* Font Size Slider */}
        <div className='space-y-2'>
          <div className='flex justify-between text-xs text-gray-400'>
            <span>12px</span>
            <span className='text-white font-medium'>{currentFontSize}px</span>
            <span>24px</span>
          </div>
          <input
            type='range'
            min='12'
            max='24'
            value={currentFontSize}
            onChange={(e) => onFontSizeChange(parseInt(e.target.value))}
            className='w-full h-2 rounded-lg appearance-none cursor-pointer'
            style={{
              background: `linear-gradient(to right, #8975EA 0%, #8975EA ${
                ((currentFontSize - 12) / 12) * 100
              }%, #3a3836 ${
                ((currentFontSize - 12) / 12) * 100
              }%, #3a3836 100%)`,
            }}
          />
        </div>
      </div>

      {/* Theme Section */}
      <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
        <h3 className='text-sm font-medium mb-3' style={{ color: '#8975EA' }}>
          Theme
        </h3>

        <div className='space-y-2'>
          {themes.map((theme) => (
            <button
              key={theme.value}
              onClick={() => onThemeChange(theme.value)}
              className={`w-full flex items-center justify-between p-3 rounded text-sm transition-all duration-200 ${
                currentTheme === theme.value
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={{
                backgroundColor:
                  currentTheme === theme.value ? '#2a2826' : 'transparent',
                border:
                  currentTheme === theme.value
                    ? '1px solid #8975EA'
                    : '1px solid #3a3836',
              }}
            >
              <div className='flex items-center gap-3'>
                <div
                  className='w-4 h-4 rounded border'
                  style={{
                    backgroundColor: theme.preview,
                    borderColor: '#3a3836',
                  }}
                />
                <span>{theme.label}</span>
              </div>
              {currentTheme === theme.value && (
                <div
                  className='w-2 h-2 rounded-full'
                  style={{ backgroundColor: '#8975EA' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Image Upload Section - Takes remaining space */}
      <div className='flex-1 overflow-hidden flex flex-col'>
        {/* Section Header */}
        <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
          <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
            Image Upload
          </h3>
          <p className='text-xs text-gray-400 mt-1'>
            Upload images and extract text with AI
          </p>
        </div>

        {/* Content Area - Scrollable */}
        <div className='flex-1 overflow-y-auto'>
          <ImageToText
            onTextExtracted={handleTextExtracted}
            onImagesUploaded={handleImagesUploaded}
          />
        </div>
      </div>
    </div>
  );
}
