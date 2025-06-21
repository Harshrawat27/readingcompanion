'use client';

interface MiddlePanelProps {
  extractedText: string;
  fontSize: number;
  theme: string;
  isHighlightEnabled: boolean;
  onClearText: () => void;
}

export default function MiddlePanel({
  extractedText,
  fontSize,
  theme,
  isHighlightEnabled,
  onClearText,
}: MiddlePanelProps) {
  // Theme configurations
  const getThemeStyles = (theme: string) => {
    switch (theme) {
      case 'sepia':
        return {
          backgroundColor: '#2d2a23',
          textColor: '#f4f1e8',
          borderColor: '#3d3a33',
        };
      case 'contrast':
        return {
          backgroundColor: '#000000',
          textColor: '#ffffff',
          borderColor: '#333333',
        };
      default: // dark
        return {
          backgroundColor: '#262624',
          textColor: '#ffffff',
          borderColor: '#3a3836',
        };
    }
  };

  const themeStyles = getThemeStyles(theme);

  // Simple markdown parser with theme support
  const parseMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      const key = `line-${index}`;
      const baseStyle = {
        fontSize: `${fontSize}px`,
        color: themeStyles.textColor,
      };

      // Main headings (# )
      if (line.startsWith('# ')) {
        return (
          <h1
            key={key}
            className='font-bold mb-4 mt-6'
            style={{
              ...baseStyle,
              fontSize: `${fontSize + 8}px`,
              color: themeStyles.textColor,
            }}
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
            className='font-semibold mb-3 mt-5'
            style={{
              ...baseStyle,
              fontSize: `${fontSize + 4}px`,
              color: themeStyles.textColor,
            }}
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
            className='font-medium mb-2 mt-4'
            style={{
              ...baseStyle,
              fontSize: `${fontSize + 2}px`,
              color: themeStyles.textColor,
            }}
          >
            {line.substring(4)}
          </h3>
        );
      }

      // Bullet points (- )
      if (line.startsWith('- ')) {
        return (
          <div key={key} className='flex items-start mb-1'>
            <span
              className='mr-2 mt-1'
              style={{ color: '#8975EA', fontSize: `${fontSize}px` }}
            >
              •
            </span>
            <span style={baseStyle}>{line.substring(2)}</span>
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
                style={{ color: '#8975EA', fontSize: `${fontSize}px` }}
              >
                {match[1]}.
              </span>
              <span style={baseStyle}>{match[2]}</span>
            </div>
          );
        }
      }

      // Bold text (**text**)
      if (line.includes('**')) {
        const parts = line.split(/(\*\*.*?\*\*)/);
        return (
          <p key={key} className='mb-2 leading-relaxed' style={baseStyle}>
            {parts.map((part, i) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong
                    key={i}
                    className='font-semibold'
                    style={{
                      backgroundColor: isHighlightEnabled
                        ? '#8975EA40'
                        : 'transparent',
                    }}
                  >
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
          <p key={key} className='mb-2 leading-relaxed' style={baseStyle}>
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
        <p key={key} className='mb-2 leading-relaxed' style={baseStyle}>
          {line}
        </p>
      );
    });
  };

  return (
    <div
      className='flex flex-col h-full overflow-hidden'
      style={{
        backgroundColor: themeStyles.backgroundColor,
        color: themeStyles.textColor,
      }}
    >
      {/* Header */}
      <div
        className='flex items-center justify-between p-6 border-b'
        style={{ borderColor: themeStyles.borderColor }}
      >
        <h1 className='text-2xl font-semibold'>Extracted Text</h1>
        <div className='flex items-center gap-3'>
          {/* Theme indicator */}
          <div className='text-xs text-gray-400 capitalize'>
            {theme} • {fontSize}px
          </div>

          {/* Clear button */}
          {extractedText && (
            <button
              onClick={onClearText}
              className='px-3 py-1 text-sm rounded border hover:bg-opacity-10 hover:bg-white transition-colors'
              style={{
                borderColor: themeStyles.borderColor,
                color: '#9ca3af',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className='flex-1 overflow-hidden'>
        {extractedText ? (
          <div
            className='w-full h-full p-6 overflow-y-auto'
            style={{
              backgroundColor: themeStyles.backgroundColor,
            }}
          >
            <div className='prose prose-invert max-w-none'>
              {parseMarkdown(extractedText)}
            </div>
          </div>
        ) : (
          <div className='flex-1 flex items-center justify-center h-full'>
            <div className='text-center'>
              <div className='text-4xl mb-4'>📄</div>
              <p className='text-gray-300 text-lg'>
                Upload an image to extract text
              </p>
              <p className='text-sm text-gray-500 mt-2'>
                The extracted text will appear here with your formatting
                preferences
              </p>

              {/* Quick tips */}
              <div
                className='mt-6 p-4 rounded-lg max-w-md mx-auto'
                style={{ backgroundColor: themeStyles.borderColor }}
              >
                <h3
                  className='text-sm font-medium mb-2'
                  style={{ color: '#8975EA' }}
                >
                  Pro Tips:
                </h3>
                <ul className='text-xs text-gray-400 space-y-1 text-left'>
                  <li>• Use the left panel to adjust font size and theme</li>
                  <li>• Enable highlighting to emphasize bold text</li>
                  <li>• Export your text in multiple formats</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {extractedText && (
        <div
          className='p-4 border-t'
          style={{ borderColor: themeStyles.borderColor }}
        >
          <div className='flex justify-between text-xs text-gray-500'>
            <span>
              Words:{' '}
              {
                extractedText.split(/\s+/).filter((word) => word.length > 0)
                  .length
              }
            </span>
            <span>Characters: {extractedText.length}</span>
            <span>
              Reading time: ~
              {Math.ceil(extractedText.split(/\s+/).length / 200)} min
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
