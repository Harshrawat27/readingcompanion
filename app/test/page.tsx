'use client';

import { useState, useRef } from 'react';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { markdownProcessor } from '../../utils/UnifiedMarkdownProcessor';

export default function TestPage() {
  const [markdownInput, setMarkdownInput] = useState(`# Test Heading

This is a **bold paragraph** with some *italic text* and regular text.

## Secondary Heading

Here's another paragraph with multiple lines.
This should be on the same paragraph.

But this should be a new paragraph.

### Math Examples

Inline math: $x = y + z$ and more text here.

Display math:
$$E = mc^2$$

$$\\frac{d}{dx}\\int_a^x f(t)dt = f(x)$$

### Lists

- First item
- Second item with **bold**
- Third item

1. Numbered item
2. Another numbered item
3. Final item

### Code

Inline code: \`console.log('hello')\`

Block code:
\`\`\`javascript
function test() {
  return "Hello World";
}
\`\`\`

### Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| **Bold** | *Italic* | Normal   |

### Other Elements

> This is a blockquote with some text

---

[This is a link](https://example.com)

~~Strikethrough text~~
`);

  const [renderedHtml, setRenderedHtml] = useState('');
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [rawHtml, setRawHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleMarkdownChange = async (value: string) => {
    setMarkdownInput(value);

    try {
      // Process with our markdown processor
      const result = await markdownProcessor.processMarkdown(value);
      setRenderedHtml(result.html);
      setRawHtml(result.html);
      setProcessingStats(result.stats);
    } catch (error) {
      console.error('Processing failed:', error);
      setRenderedHtml(`<p style="color: red;">Processing failed: ${error}</p>`);
      setRawHtml('');
    }
  };

  // Process initial markdown on mount
  useState(() => {
    handleMarkdownChange(markdownInput);
  });

  const handleRenderComplete = (success: boolean, stats: any) => {
    console.log('Render complete:', { success, stats });
    setProcessingStats(stats);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(rawHtml);
    alert('HTML copied to clipboard!');
  };

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdownInput);
    alert('Markdown copied to clipboard!');
  };

  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      {/* Header */}
      <div className='border-b border-gray-700 p-4'>
        <h1 className='text-2xl font-bold text-white'>Markdown Test Page</h1>
        <p className='text-gray-400 mt-1'>
          Test the markdown processor - edit on the left, see results on the
          right
        </p>

        {/* Stats */}
        {processingStats && (
          <div className='mt-3 flex items-center gap-4 text-sm text-gray-300'>
            <span>
              📊 Math: {processingStats.inlineMath}i +{' '}
              {processingStats.displayMath}d
            </span>
            <span>📋 Tables: {processingStats.tables}</span>
            <span>💻 Code: {processingStats.codeBlocks}</span>
            <span>⏱️ {processingStats.processingTime}ms</span>
          </div>
        )}
      </div>

      <div className='flex h-[calc(100vh-120px)]'>
        {/* Left Panel - Markdown Input */}
        <div className='w-1/2 border-r border-gray-700 flex flex-col'>
          <div className='border-b border-gray-700 p-3 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-200'>
              Markdown Input
            </h2>
            <button
              onClick={copyMarkdown}
              className='px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors'
            >
              Copy MD
            </button>
          </div>

          <div className='flex-1 p-4'>
            <textarea
              ref={textareaRef}
              value={markdownInput}
              onChange={(e) => handleMarkdownChange(e.target.value)}
              className='w-full h-full resize-none bg-gray-800 text-gray-100 p-4 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm leading-relaxed'
              placeholder='Type your markdown here...'
              style={{
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                lineHeight: '1.6',
                tabSize: 2,
              }}
            />
          </div>
        </div>

        {/* Right Panel - Split between Rendered and Raw HTML */}
        <div className='w-1/2 flex flex-col'>
          {/* Rendered Output */}
          <div className='h-full border-b border-gray-700 flex flex-col'>
            <div className='border-b border-gray-700 p-3 flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-200'>
                Rendered Output
              </h2>
              <div className='flex gap-2'>
                <span className='text-xs text-gray-400'>
                  Using MarkdownRenderer
                </span>
              </div>
            </div>

            <div className='flex-1 overflow-auto p-4 bg-gray-800'>
              <MarkdownRenderer
                markdownText={markdownInput}
                fontSize={16}
                theme='dark'
                isHighlightEnabled={true}
                onRenderComplete={handleRenderComplete}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global styles for this test page */}
      <style jsx global>{`
        /* Custom scrollbar for test page */
        .overflow-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-auto::-webkit-scrollbar-track {
          background: #374151;
        }

        .overflow-auto::-webkit-scrollbar-thumb {
          background: #6b7280;
          border-radius: 4px;
        }

        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Ensure proper spacing in the test page renderer */
        .unified-markdown-content .rendered-content {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}
