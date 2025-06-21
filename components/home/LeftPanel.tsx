'use client';

import { useState } from 'react';

interface LeftPanelProps {
  onFontSizeChange: (size: number) => void;
  onHighlightToggle: (enabled: boolean) => void;
  onThemeChange: (theme: string) => void;
  currentFontSize: number;
  isHighlightEnabled: boolean;
  currentTheme: string;
}

export default function LeftPanel({
  onFontSizeChange,
  onHighlightToggle,
  onThemeChange,
  currentFontSize,
  isHighlightEnabled,
  currentTheme,
}: LeftPanelProps) {
  const [activeSection, setActiveSection] = useState<string>('formatting');

  const sections = [
    { id: 'formatting', label: 'Format', icon: '🎨' },
    { id: 'tools', label: 'Tools', icon: '🔧' },
    { id: 'export', label: 'Export', icon: '📤' },
  ];

  const fontSizes = [
    { label: 'Small', value: 12 },
    { label: 'Medium', value: 14 },
    { label: 'Large', value: 16 },
    { label: 'Extra Large', value: 18 },
  ];

  const themes = [
    { label: 'Dark', value: 'dark' },
    { label: 'Sepia', value: 'sepia' },
    { label: 'High Contrast', value: 'contrast' },
  ];

  return (
    <div
      className='flex flex-col h-full overflow-y-auto'
      style={{
        backgroundColor: '#1F1E1D',
        color: '#ffffff',
      }}
    >
      {/* Header */}
      <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
        <h2 className='text-lg font-semibold'>Controls</h2>
      </div>

      {/* Section Tabs */}
      <div className='flex border-b' style={{ borderColor: '#2f2d2a' }}>
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex-1 p-3 text-xs font-medium transition-colors ${
              activeSection === section.id
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{
              backgroundColor:
                activeSection === section.id ? '#2a2826' : 'transparent',
              borderBottom:
                activeSection === section.id
                  ? '2px solid #8975EA'
                  : '2px solid transparent',
            }}
          >
            <div className='flex flex-col items-center gap-1'>
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className='flex-1 p-4 space-y-4'>
        {activeSection === 'formatting' && (
          <>
            {/* Font Size Control */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Font Size
              </h3>
              <div className='space-y-2'>
                {fontSizes.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => onFontSizeChange(size.value)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors ${
                      currentFontSize === size.value
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    style={{
                      backgroundColor:
                        currentFontSize === size.value
                          ? '#2a2826'
                          : 'transparent',
                    }}
                  >
                    {size.label} ({size.value}px)
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Control */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Theme
              </h3>
              <div className='space-y-2'>
                {themes.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => onThemeChange(theme.value)}
                    className={`w-full text-left p-2 rounded text-xs transition-colors ${
                      currentTheme === theme.value
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                    style={{
                      backgroundColor:
                        currentTheme === theme.value
                          ? '#2a2826'
                          : 'transparent',
                    }}
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Highlight Toggle */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Text Highlighting
              </h3>
              <button
                onClick={() => onHighlightToggle(!isHighlightEnabled)}
                className={`w-full p-2 rounded text-xs transition-colors ${
                  isHighlightEnabled
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
                style={{
                  backgroundColor: isHighlightEnabled ? '#8975EA' : '#2a2826',
                }}
              >
                {isHighlightEnabled
                  ? '✓ Highlighting Enabled'
                  : 'Enable Highlighting'}
              </button>
            </div>
          </>
        )}

        {activeSection === 'tools' && (
          <>
            {/* Reading Tools */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Reading Tools
              </h3>
              <div className='space-y-2'>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📏 Reading Guide
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  🔍 Focus Mode
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📊 Reading Stats
                </button>
              </div>
            </div>

            {/* Text Analysis */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Analysis
              </h3>
              <div className='space-y-2'>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📝 Word Count
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  ⏱️ Reading Time
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  🎯 Difficulty Level
                </button>
              </div>
            </div>
          </>
        )}

        {activeSection === 'export' && (
          <>
            {/* Export Options */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Export Text
              </h3>
              <div className='space-y-2'>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📄 Export as PDF
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📝 Export as Word
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </div>

            {/* Save Options */}
            <div className='space-y-3'>
              <h3 className='text-sm font-medium' style={{ color: '#8975EA' }}>
                Save & Share
              </h3>
              <div className='space-y-2'>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  💾 Save Project
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  🔗 Generate Share Link
                </button>
                <button
                  className='w-full text-left p-2 rounded text-xs text-gray-400 hover:text-gray-200 transition-colors'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  📧 Email Text
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
