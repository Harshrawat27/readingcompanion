import { useMemo } from 'react';
import {
  markdownToHtml,
  getWordCount,
  getReadingTime,
} from '../../utils/markdownConverter';

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

  // Convert markdown to HTML using Showdown
  const htmlContent = useMemo(() => {
    if (!displayText) return '';
    return markdownToHtml(displayText);
  }, [displayText]);

  // Calculate stats
  const wordCount = useMemo(() => getWordCount(htmlContent), [htmlContent]);
  const readingTime = useMemo(() => getReadingTime(htmlContent), [htmlContent]);

  // Custom CSS styles for the HTML content
  const htmlStyles = useMemo(() => {
    return {
      '--font-size': `${fontSize}px`,
      '--text-color': themeStyles.textColor,
      '--heading-color': themeStyles.textColor,
      '--accent-color': '#8975EA',
      '--highlight-bg': isHighlightEnabled ? '#8975EA40' : 'transparent',
      '--border-color': themeStyles.borderColor,
    } as React.CSSProperties;
  }, [fontSize, themeStyles, isHighlightEnabled]);

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
                      className='w-full h-16 object-cover rounded mb-1'
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
          {htmlContent ? (
            <div
              className='w-full h-full p-6 overflow-y-auto'
              style={{
                backgroundColor: themeStyles.backgroundColor,
                ...htmlStyles,
              }}
            >
              <div
                className='prose prose-invert max-w-none markdown-content'
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

              {/* Add custom CSS styles */}
              <style jsx>{`
                .markdown-content {
                  font-size: var(--font-size);
                  color: var(--text-color);
                  line-height: 1.6;
                }

                .markdown-content .heading-1,
                .markdown-content .heading-2,
                .markdown-content .heading-3,
                .markdown-content .heading-4,
                .markdown-content .heading-5,
                .markdown-content .heading-6 {
                  color: var(--heading-color);
                  font-weight: 600;
                  margin-top: 1.5rem;
                  margin-bottom: 0.75rem;
                }

                .markdown-content .heading-1 {
                  font-size: calc(var(--font-size) * 1.875);
                  border-bottom: 2px solid var(--border-color);
                  padding-bottom: 0.5rem;
                }

                .markdown-content .heading-2 {
                  font-size: calc(var(--font-size) * 1.5);
                }

                .markdown-content .heading-3 {
                  font-size: calc(var(--font-size) * 1.25);
                }

                .markdown-content .markdown-paragraph {
                  margin-bottom: 1rem;
                  line-height: 1.7;
                }

                .markdown-content strong {
                  font-weight: 600;
                  background-color: var(--highlight-bg);
                  padding: 0 2px;
                  border-radius: 2px;
                }

                .markdown-content .markdown-list {
                  margin: 1rem 0;
                  padding-left: 2rem;
                }

                .markdown-content .markdown-list li {
                  margin-bottom: 0.5rem;
                }

                .markdown-content .markdown-table {
                  width: 100%;
                  border-collapse: collapse;
                  margin: 1rem 0;
                  border: 1px solid var(--border-color);
                }

                .markdown-content .markdown-table th,
                .markdown-content .markdown-table td {
                  padding: 0.75rem;
                  border: 1px solid var(--border-color);
                  text-align: left;
                }

                .markdown-content .markdown-table th {
                  background-color: var(--border-color);
                  font-weight: 600;
                }

                .markdown-content .markdown-blockquote {
                  border-left: 4px solid var(--accent-color);
                  margin: 1rem 0;
                  padding: 0.5rem 1rem;
                  background-color: rgba(137, 117, 234, 0.1);
                  font-style: italic;
                }

                .markdown-content .markdown-inline-code {
                  background-color: var(--border-color);
                  padding: 0.125rem 0.25rem;
                  border-radius: 3px;
                  font-family: 'Courier New', monospace;
                  font-size: calc(var(--font-size) * 0.875);
                }

                .markdown-content .markdown-code-block {
                  background-color: var(--border-color);
                  padding: 1rem;
                  border-radius: 6px;
                  overflow-x: auto;
                  margin: 1rem 0;
                }

                .markdown-content .markdown-link {
                  color: var(--accent-color);
                  text-decoration: underline;
                }

                .markdown-content .markdown-link:hover {
                  color: #a78bfa;
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
                    <li>• Navigate between pages using arrow buttons</li>
                    <li>• Export your text in multiple formats</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats */}
      {htmlContent && (
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
