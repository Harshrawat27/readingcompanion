'use client';

import { useState, useEffect } from 'react';
import showdown from 'showdown';
import {
  MathTextProcessor,
  type ParsedContent,
} from '../utils/MathTextProcessor';
import { KaTeXMathRenderer } from '../utils/KatexMathRenderer';

interface MathMarkdownRendererProps {
  markdownText: string;
  fontSize?: number;
  theme?: string;
  isHighlightEnabled?: boolean;
  onRenderComplete?: (success: boolean, mathCount: number) => void;
}

const MathMarkdownRenderer = ({
  markdownText,
  fontSize = 16,
  theme = 'dark',
  isHighlightEnabled = false,
  onRenderComplete,
}: MathMarkdownRendererProps) => {
  const [html, setHtml] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mathStats, setMathStats] = useState({ inline: 0, display: 0 });

  useEffect(() => {
    processMathMarkdown();
  }, [markdownText]);

  const processMathMarkdown = async () => {
    if (!markdownText) {
      setHtml('');
      setError(null);
      setMathStats({ inline: 0, display: 0 });
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Preprocess text (handle escaped dollars)
      const preprocessedText = MathTextProcessor.preprocessText(markdownText);

      // Step 2: Parse and separate math from text
      const parsed: ParsedContent = MathTextProcessor.parse(preprocessedText);

      if (!parsed.hasValidMath) {
        // No math found, process as regular markdown
        const regularHtml = await processRegularMarkdown(preprocessedText);
        setHtml(MathTextProcessor.postprocessText(regularHtml));
        setMathStats({ inline: 0, display: 0 });
        onRenderComplete?.(true, 0);
      } else {
        // Process text and math in parallel
        const [markdownHtml, renderedMath] = await Promise.all([
          processRegularMarkdown(parsed.textParts.join('')),
          KaTeXMathRenderer.renderMathBatch(parsed.mathParts),
        ]);

        // Step 3: Reconstruct the final HTML
        const finalHtml = MathTextProcessor.reconstructText(
          parsed.textParts,
          parsed.mathParts,
          renderedMath
        );

        // Step 4: Process the reconstructed text through markdown
        const processedHtml = await processReconstructedMarkdown(finalHtml);

        setHtml(MathTextProcessor.postprocessText(processedHtml));

        // Update stats
        const inlineCount = parsed.mathParts.filter(
          (m) => m.type === 'inline'
        ).length;
        const displayCount = parsed.mathParts.filter(
          (m) => m.type === 'display'
        ).length;
        setMathStats({ inline: inlineCount, display: displayCount });

        onRenderComplete?.(true, parsed.mathParts.length);
      }
    } catch (err) {
      console.error('Math markdown processing failed:', err);
      setError(err instanceof Error ? err.message : 'Processing failed');

      // Fallback to regular markdown
      try {
        const fallbackHtml = await processRegularMarkdown(markdownText);
        setHtml(fallbackHtml);
        onRenderComplete?.(false, 0);
      } catch (fallbackErr) {
        // Final fallback to escaped text
        const escapedText = escapeHtml(markdownText).replace(/\n/g, '<br>');
        setHtml(`<div class="fallback-content">${escapedText}</div>`);
        onRenderComplete?.(false, 0);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const processRegularMarkdown = async (text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      try {
        const converter = new showdown.Converter({
          tables: true,
          strikethrough: true,
          tasklists: true,
          ghCodeBlocks: true,
          simpleLineBreaks: false,
          headerLevelStart: 1,
          noHeaderId: false,
          requireSpaceBeforeHeadingText: true,
          openLinksInNewWindow: false,
          emoji: false,
          underline: false,
        });

        const html = converter.makeHtml(text);
        resolve(html);
      } catch (error) {
        reject(error);
      }
    });
  };

  const processReconstructedMarkdown = async (
    text: string
  ): Promise<string> => {
    // For reconstructed text, we need to be more careful about markdown processing
    // since it contains rendered math HTML that shouldn't be processed again

    try {
      // Split by math containers to avoid processing math HTML
      const parts = text.split(/(<span class="katex-[^>]*>.*?<\/span>)/g);

      const processedParts = await Promise.all(
        parts.map(async (part, index) => {
          if (
            part.includes('katex-') ||
            part.includes('math-fallback') ||
            part.includes('math-error')
          ) {
            // This is rendered math, don't process it
            return part;
          } else {
            // This is regular text, process it with markdown
            return await processRegularMarkdown(part);
          }
        })
      );

      return processedParts.join('');
    } catch (error) {
      console.warn(
        'Reconstructed markdown processing failed, using simple processing:',
        error
      );
      return text;
    }
  };

  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

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

  return (
    <div
      className='math-markdown-content'
      style={
        {
          '--font-size': `${fontSize}px`,
          '--text-color': themeStyles.textColor,
          '--heading-color': themeStyles.textColor,
          '--accent-color': '#8975EA',
          '--highlight-bg': isHighlightEnabled ? '#8975EA40' : 'transparent',
          '--border-color': themeStyles.borderColor,
          fontSize: `${fontSize}px`,
          color: themeStyles.textColor,
          lineHeight: 1.7,
          wordWrap: 'break-word',
          maxWidth: '100%',
          position: 'relative',
        } as React.CSSProperties
      }
    >
      {/* Processing indicator */}
      {isProcessing && (
        <div className='math-processing-indicator'>
          <div className='processing-spinner'></div>
          <span>Processing math formulas...</span>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className='math-error-banner'>
          <strong>Math Processing Error:</strong> {error}
          <br />
          <small>Displaying content with basic formatting.</small>
        </div>
      )}

      {/* Math stats (only show if there's math) */}
      {(mathStats.inline > 0 || mathStats.display > 0) && (
        <div className='math-stats'>
          Math formulas: {mathStats.inline} inline, {mathStats.display} display
        </div>
      )}

      {/* Main content */}
      <div
        className='rendered-content'
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Styles */}
      <style jsx>{`
        .math-markdown-content {
          font-family: var(--font-geist-sans), -apple-system, BlinkMacSystemFont,
            'Segoe UI', Roboto, sans-serif;
        }

        .math-processing-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem;
          background-color: rgba(137, 117, 234, 0.1);
          border: 1px solid var(--accent-color);
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          color: var(--accent-color);
        }

        .processing-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid var(--accent-color);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .math-error-banner {
          padding: 0.75rem;
          background-color: #2a1a1a;
          color: #ff6b6b;
          border: 1px solid #ff6b6b;
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.875rem;
        }

        .math-stats {
          padding: 0.25rem 0.5rem;
          background-color: var(--border-color);
          color: var(--accent-color);
          border-radius: 4px;
          margin-bottom: 1rem;
          font-size: 0.75rem;
          text-align: center;
        }

        .fallback-content {
          padding: 1rem;
          background-color: var(--border-color);
          border: 1px dashed #666;
          border-radius: 4px;
          font-family: monospace;
        }

        /* Enhanced markdown styles */
        .rendered-content h1,
        .rendered-content h2,
        .rendered-content h3,
        .rendered-content h4,
        .rendered-content h5,
        .rendered-content h6 {
          color: var(--heading-color);
          font-weight: 600;
          margin-top: 2rem;
          margin-bottom: 1rem;
          line-height: 1.3;
        }

        .rendered-content h1 {
          font-size: calc(var(--font-size) * 2);
          border-bottom: 2px solid var(--border-color);
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .rendered-content h2 {
          font-size: calc(var(--font-size) * 1.6);
        }

        .rendered-content h3 {
          font-size: calc(var(--font-size) * 1.3);
        }

        .rendered-content h4 {
          font-size: calc(var(--font-size) * 1.1);
        }

        .rendered-content p {
          margin-bottom: 1.2rem;
          line-height: 1.7;
        }

        .rendered-content strong {
          font-weight: 600;
          background-color: var(--highlight-bg);
          padding: 0 2px;
          border-radius: 2px;
        }

        .rendered-content em {
          font-style: italic;
          color: #a78bfa;
        }

        .rendered-content ul,
        .rendered-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .rendered-content li {
          margin-bottom: 0.5rem;
          line-height: 1.6;
        }

        .rendered-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }

        .rendered-content th,
        .rendered-content td {
          padding: 0.75rem;
          border: 1px solid var(--border-color);
          text-align: left;
          vertical-align: top;
        }

        .rendered-content th {
          background-color: var(--border-color);
          font-weight: 600;
        }

        .rendered-content blockquote {
          border-left: 4px solid var(--accent-color);
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background-color: rgba(137, 117, 234, 0.1);
          font-style: italic;
          border-radius: 0 6px 6px 0;
        }

        .rendered-content code {
          background-color: var(--border-color);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: calc(var(--font-size) * 0.9);
          color: #a78bfa;
        }

        .rendered-content pre {
          background-color: var(--border-color);
          padding: 1.5rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1.5rem 0;
          font-family: 'Courier New', monospace;
          font-size: calc(var(--font-size) * 0.9);
          line-height: 1.5;
        }

        .rendered-content pre code {
          background: none;
          padding: 0;
          border-radius: 0;
          color: #e5e7eb;
        }

        .rendered-content a {
          color: var(--accent-color);
          text-decoration: underline;
          text-decoration-color: rgba(137, 117, 234, 0.5);
        }

        .rendered-content a:hover {
          color: #a78bfa;
          text-decoration-color: #a78bfa;
        }

        .rendered-content hr {
          border: none;
          height: 2px;
          background-color: var(--border-color);
          margin: 2rem 0;
          border-radius: 1px;
        }

        .rendered-content del {
          text-decoration: line-through;
          opacity: 0.7;
        }

        .rendered-content img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 1rem 0;
        }

        /* Math-specific styles */
        .rendered-content .katex-display-container {
          display: block;
          text-align: center;
          margin: 2rem 0;
          overflow-x: auto;
        }

        .rendered-content .katex-inline-container {
          display: inline;
          vertical-align: baseline;
        }

        .rendered-content .math-fallback-inline,
        .rendered-content .math-fallback-display {
          font-family: 'Courier New', monospace;
          background-color: var(--border-color);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          color: #a78bfa;
          border: 1px dashed #666;
        }

        .rendered-content .math-fallback-display {
          display: block;
          text-align: center;
          margin: 1rem 0;
          padding: 1rem;
        }

        .rendered-content .math-error-inline,
        .rendered-content .math-error-display {
          font-family: 'Courier New', monospace;
          background-color: #2a1a1a;
          color: #ff6b6b;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid #ff6b6b;
        }

        .rendered-content .math-error-display {
          display: block;
          text-align: center;
          margin: 1rem 0;
          padding: 1rem;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .math-markdown-content {
            font-size: calc(var(--font-size) * 0.9);
          }

          .rendered-content table {
            font-size: calc(var(--font-size) * 0.8);
          }

          .math-stats {
            font-size: 0.7rem;
          }

          .rendered-content .katex-display-container {
            margin: 1rem 0;
          }

          .rendered-content .katex-display-container .katex {
            font-size: 1.1em;
          }
        }

        /* Dark theme KaTeX integration */
        .rendered-content .katex {
          color: var(--text-color) !important;
        }

        .rendered-content .katex .accent {
          color: var(--accent-color) !important;
        }

        .rendered-content .katex .mord {
          color: var(--text-color) !important;
        }

        .rendered-content .katex .mop {
          color: #a78bfa !important;
        }

        .rendered-content .katex .mbin {
          color: #8975ea !important;
        }

        .rendered-content .katex .mrel {
          color: #8975ea !important;
        }
      `}</style>

      {/* Include KaTeX styles globally */}
      <style jsx global>{`
        /* KaTeX container styles */
        .katex-display-container {
          display: block;
          text-align: center;
          margin: 1rem 0;
        }

        .katex-inline-container {
          display: inline;
        }

        /* Fallback styles when KaTeX is not available */
        .math-fallback-inline,
        .math-fallback-display {
          font-family: 'Courier New', monospace;
          background-color: var(--border-color, #3a3836);
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          color: #a78bfa;
          border: 1px dashed #666;
        }

        .math-fallback-display {
          display: block;
          text-align: center;
          margin: 1rem 0;
          padding: 1rem;
        }

        /* Error styles */
        .math-error-inline,
        .math-error-display {
          font-family: 'Courier New', monospace;
          background-color: #2a1a1a;
          color: #ff6b6b;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          border: 1px solid #ff6b6b;
        }

        .math-error-display {
          display: block;
          text-align: center;
          margin: 1rem 0;
          padding: 1rem;
        }

        /* Override KaTeX styles for better theme integration */
        .katex {
          color: var(--text-color, #ffffff) !important;
        }

        .katex .accent {
          color: var(--accent-color, #8975ea) !important;
        }

        /* Responsive math */
        @media (max-width: 768px) {
          .katex-display-container .katex {
            font-size: 1.1em;
          }

          .math-fallback-display {
            font-size: 0.9em;
            padding: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default MathMarkdownRenderer;
