import { useMemo } from 'react';
import MarkdownRenderer from '../MarkdownRenderer';

interface PageData {
  pageNumber: number;
  canvas?: HTMLCanvasElement;
  imageData: string;
  extractedText?: string;
  width: number;
  height: number;
}

interface MiddlePanelProps {
  extractedText: string;
  fontSize: number;
  theme: string;
  isHighlightEnabled: boolean;
  onClearText: () => void;
  pages?: PageData[];
  currentPage?: number;
  onPageChange?: (pageNumber: number) => void;
}

export default function MiddlePanel({
  extractedText,
  fontSize,
  theme,
  isHighlightEnabled,
  onClearText,
  pages = [],
  currentPage = 1,
  onPageChange,
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

  // Determine what content to display
  const isMultiPageMode = pages.length > 0;
  const currentPageData = pages.find((p) => p.pageNumber === currentPage);
  const displayText = isMultiPageMode
    ? currentPageData?.extractedText || ''
    : extractedText;

  // Calculate stats
  const wordCount = useMemo(() => {
    if (!displayText) return 0;
    return displayText.split(/\s+/).filter((word) => word.length > 0).length;
  }, [displayText]);

  const readingTime = useMemo(() => {
    return Math.max(1, Math.ceil(wordCount / 200));
  }, [wordCount]);

  // Navigation handlers
  const goToPreviousPage = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages.length && onPageChange) {
      onPageChange(currentPage + 1);
    }
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
        <div className='flex items-center gap-4'>
          <h1 className='text-2xl font-semibold'>
            {isMultiPageMode ? 'Document Reader' : 'Extracted Text'}
          </h1>

          {/* Page Navigation */}
          {isMultiPageMode && pages.length > 0 && (
            <div className='flex items-center gap-2'>
              <button
                onClick={goToPreviousPage}
                disabled={currentPage <= 1}
                className='w-8 h-8 rounded flex items-center justify-center transition-colors disabled:opacity-30'
                style={{
                  backgroundColor:
                    currentPage > 1 ? '#8975EA' : themeStyles.borderColor,
                  color: currentPage > 1 ? '#ffffff' : themeStyles.textColor,
                }}
              >
                ←
              </button>

              <span className='text-sm text-gray-400 min-w-[80px] text-center'>
                Page {currentPage} of {pages.length}
              </span>

              <button
                onClick={goToNextPage}
                disabled={currentPage >= pages.length}
                className='w-8 h-8 rounded flex items-center justify-center transition-colors disabled:opacity-30'
                style={{
                  backgroundColor:
                    currentPage < pages.length
                      ? '#8975EA'
                      : themeStyles.borderColor,
                  color:
                    currentPage < pages.length
                      ? '#ffffff'
                      : themeStyles.textColor,
                }}
              >
                →
              </button>
            </div>
          )}
        </div>

        <div className='flex items-center gap-3'>
          {/* Theme indicator */}
          <div className='text-xs text-gray-400 capitalize'>
            {theme} • {fontSize}px
            {isMultiPageMode && ` • ${pages.length} pages`}
          </div>

          {/* Clear button */}
          {(extractedText || pages.length > 0) && (
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
      <div className='flex-1 overflow-hidden flex'>
        {/* Page Thumbnails Sidebar (only for multi-page) */}
        {isMultiPageMode && pages.length > 1 && (
          <div
            className='w-32 border-r overflow-y-auto'
            style={{ borderColor: themeStyles.borderColor }}
          >
            <div className='p-2 space-y-2'>
              {pages.map((page) => (
                <button
                  key={page.pageNumber}
                  onClick={() => onPageChange && onPageChange(page.pageNumber)}
                  className={`w-full p-2 rounded text-left transition-colors ${
                    currentPage === page.pageNumber ? 'ring-2' : ''
                  }`}
                  style={{
                    backgroundColor:
                      currentPage === page.pageNumber
                        ? '#8975EA20'
                        : 'transparent',
                    outline:
                      currentPage === page.pageNumber
                        ? '2px solid #8975EA'
                        : 'none',
                  }}
                >
                  {/* Page thumbnail */}
                  {page.imageData && (
                    <img
                      src={page.imageData}
                      alt={`Page ${page.pageNumber}`}
                      className='w-full aspect-[210/297] object-cover rounded mb-1'
                    />
                  )}
                  <div className='text-xs text-center'>
                    <div
                      className={
                        currentPage === page.pageNumber
                          ? 'text-white font-medium'
                          : 'text-gray-400'
                      }
                    >
                      Page {page.pageNumber}
                    </div>
                    {page.extractedText && (
                      <div className='text-green-400'>✓</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className='flex-1 overflow-hidden'>
          {displayText ? (
            <div
              className='w-full h-full p-6 overflow-y-auto'
              style={{
                backgroundColor: themeStyles.backgroundColor,
              }}
            >
              <MarkdownRenderer
                markdownText={displayText}
                fontSize={fontSize}
                theme={theme}
                isHighlightEnabled={isHighlightEnabled}
              />

              {/* CSS Styles for Markdown Content */}
              <style jsx global>{`
                .markdown-content {
                  font-family: var(--font-geist-sans), -apple-system,
                    BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                .markdown-content h1,
                .markdown-content h2,
                .markdown-content h3,
                .markdown-content h4,
                .markdown-content h5,
                .markdown-content h6 {
                  color: var(--heading-color);
                  font-weight: 600;
                  margin-top: 2rem;
                  margin-bottom: 1rem;
                  line-height: 1.3;
                }

                .markdown-content h1 {
                  font-size: calc(var(--font-size) * 2);
                  border-bottom: 2px solid var(--border-color);
                  padding-bottom: 0.5rem;
                  margin-bottom: 1.5rem;
                }

                .markdown-content h2 {
                  font-size: calc(var(--font-size) * 1.6);
                }

                .markdown-content h3 {
                  font-size: calc(var(--font-size) * 1.3);
                }

                .markdown-content h4 {
                  font-size: calc(var(--font-size) * 1.1);
                }

                .markdown-content p {
                  margin-bottom: 1.2rem;
                  line-height: 1.7;
                }

                .markdown-content strong {
                  font-weight: 600;
                  background-color: var(--highlight-bg);
                  padding: 0 2px;
                  border-radius: 2px;
                }

                .markdown-content em {
                  font-style: italic;
                  color: #a78bfa;
                }

                .markdown-content ul,
                .markdown-content ol {
                  margin: 1rem 0;
                  padding-left: 2rem;
                }

                .markdown-content li {
                  margin-bottom: 0.5rem;
                  line-height: 1.6;
                }

                .markdown-content table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1.5rem 0;
                  border: 1px solid var(--border-color);
                  border-radius: 6px;
                  overflow: hidden;
                }

                .markdown-content th,
                .markdown-content td {
                  padding: 0.75rem;
                  border: 1px solid var(--border-color);
                  text-align: left;
                  vertical-align: top;
                }

                .markdown-content th {
                  background-color: var(--border-color);
                  font-weight: 600;
                }

                .markdown-content blockquote {
                  border-left: 4px solid var(--accent-color);
                  margin: 1.5rem 0;
                  padding: 1rem 1.5rem;
                  background-color: rgba(137, 117, 234, 0.1);
                  font-style: italic;
                  border-radius: 0 6px 6px 0;
                }

                .markdown-content code {
                  background-color: var(--border-color);
                  padding: 0.2rem 0.4rem;
                  border-radius: 4px;
                  font-family: 'Courier New', monospace;
                  font-size: calc(var(--font-size) * 0.9);
                  color: #a78bfa;
                }

                .markdown-content pre {
                  background-color: var(--border-color);
                  padding: 1.5rem;
                  border-radius: 8px;
                  overflow-x: auto;
                  margin: 1.5rem 0;
                  font-family: 'Courier New', monospace;
                  font-size: calc(var(--font-size) * 0.9);
                  line-height: 1.5;
                }

                .markdown-content pre code {
                  background: none;
                  padding: 0;
                  border-radius: 0;
                  color: #e5e7eb;
                }

                .markdown-content a {
                  color: var(--accent-color);
                  text-decoration: underline;
                  text-decoration-color: rgba(137, 117, 234, 0.5);
                }

                .markdown-content a:hover {
                  color: #a78bfa;
                  text-decoration-color: #a78bfa;
                }

                .markdown-content hr {
                  border: none;
                  height: 2px;
                  background-color: var(--border-color);
                  margin: 2rem 0;
                  border-radius: 1px;
                }

                .markdown-content del {
                  text-decoration: line-through;
                  opacity: 0.7;
                }

                .markdown-content img {
                  max-width: 100%;
                  height: auto;
                  border-radius: 6px;
                  margin: 1rem 0;
                }

                /* Responsive adjustments */
                @media (max-width: 768px) {
                  .markdown-content {
                    font-size: calc(var(--font-size) * 0.9);
                  }

                  .markdown-content table {
                    font-size: calc(var(--font-size) * 0.8);
                  }
                }
              `}</style>
            </div>
          ) : (
            <div className='flex-1 flex items-center justify-center h-full'>
              <div className='text-center'>
                <div className='text-4xl mb-4'>
                  {isMultiPageMode ? '📄' : '📄'}
                </div>
                <p className='text-gray-300 text-lg'>
                  {isMultiPageMode
                    ? `Page ${currentPage} - No text extracted yet`
                    : 'Upload an image or PDF to extract text'}
                </p>
                <p className='text-sm text-gray-500 mt-2'>
                  {isMultiPageMode
                    ? 'Click "Extract text" in the right panel to process this page'
                    : 'The extracted text will appear here with your formatting preferences'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      {displayText && (
        <div
          className='p-4 border-t'
          style={{ borderColor: themeStyles.borderColor }}
        >
          <div className='flex justify-between text-xs text-gray-500'>
            <span>Words: {wordCount.toLocaleString()}</span>
            <span>Characters: {displayText.length.toLocaleString()}</span>
            <span>Reading time: ~{readingTime} min</span>
            {isMultiPageMode && (
              <span>
                Page {currentPage}/{pages.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
