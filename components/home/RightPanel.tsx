'use client';

import { useState } from 'react';
import PDFUpload from '../PDFUpload';

// Import our types
interface PageData {
  pageNumber: number;
  canvas?: HTMLCanvasElement;
  imageData: string;
  extractedText?: string;
  width: number;
  height: number;
}

interface RightPanelProps {
  onTextExtracted: (text: string) => void;
  onPagesExtracted?: (pages: PageData[]) => void; // New prop for multi-page
  extractedText: string;
}

export default function RightPanel({
  onTextExtracted,
  onPagesExtracted,
  extractedText,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('extract');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [pagesData, setPagesData] = useState<PageData[]>([]);

  const tabs = [
    { id: 'extract', label: 'Extract', icon: '📄' }, // Changed icon for PDF
    { id: 'analyze', label: 'Analyze', icon: '🤖' },
    { id: 'enhance', label: 'Enhance', icon: '✨' },
  ];

  const aiFeatures = [
    {
      id: 'summarize',
      title: 'Summarize Text',
      description: 'Get a concise summary of the extracted content',
      icon: '📝',
    },
    {
      id: 'translate',
      title: 'Translate',
      description: 'Translate text to different languages',
      icon: '🌐',
    },
    {
      id: 'keywords',
      title: 'Extract Keywords',
      description: 'Identify key terms and concepts',
      icon: '🔑',
    },
    {
      id: 'questions',
      title: 'Generate Questions',
      description: 'Create study questions from the text',
      icon: '❓',
    },
  ];

  const enhanceFeatures = [
    {
      id: 'grammar',
      title: 'Fix Grammar',
      description: 'Correct grammatical errors in the text',
      icon: '📚',
    },
    {
      id: 'format',
      title: 'Improve Formatting',
      description: 'Better structure and readability',
      icon: '📋',
    },
    {
      id: 'expand',
      title: 'Expand Content',
      description: 'Add more detail to brief points',
      icon: '📈',
    },
    {
      id: 'simplify',
      title: 'Simplify Language',
      description: 'Make complex text easier to understand',
      icon: '💡',
    },
  ];

  // Handle PDF pages extracted
  const handlePagesExtracted = (pages: PageData[]) => {
    console.log(`Received ${pages.length} pages from PDF`);
    setPagesData(pages);

    // For now, let's just extract text from the first page to test
    if (pages.length > 0) {
      extractTextFromPage(pages[0]);
    }

    // Call the parent callback if provided
    if (onPagesExtracted) {
      onPagesExtracted(pages);
    }
  };

  // Extract text from a single page using our existing vision API
  const extractTextFromPage = async (pageData: PageData) => {
    try {
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: pageData.imageData,
          prompt: `Analyze this PDF page and extract ALL text while preserving the EXACT original formatting and structure. 

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
3. Maintain original spacing and line breaks
4. Preserve the reading order and layout structure
5. Keep tables in proper markdown table format if present
6. Maintain any indentation or grouping

This is page ${pageData.pageNumber}. Extract EVERYTHING visible and return ONLY the properly formatted markdown text with no additional commentary.`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const extractedText = data.text;

        // Update the page data with extracted text
        pageData.extractedText = extractedText;

        // For testing, send the text to the main panel
        onTextExtracted(
          `=== PAGE ${pageData.pageNumber} ===\n\n${extractedText}`
        );

        console.log(`Text extracted from page ${pageData.pageNumber}`);
      } else {
        console.error('Failed to extract text from page:', data.error);
      }
    } catch (error) {
      console.error('Error extracting text from page:', error);
    }
  };

  const handleAiFeature = async (featureId: string) => {
    if (!extractedText) {
      setAiResult('Please extract some text first before using AI features.');
      return;
    }

    setAiProcessing(true);
    setAiResult('');

    try {
      // Simulate AI processing (replace with actual API calls)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      switch (featureId) {
        case 'summarize':
          setAiResult(
            'Summary: This is a simulated summary of your extracted text. The actual implementation would call an AI API to generate a real summary.'
          );
          break;
        case 'translate':
          setAiResult(
            'Translation: Esta es una traducción simulada de su texto extraído.'
          );
          break;
        case 'keywords':
          setAiResult(
            'Keywords: technology, innovation, development, analysis, implementation, optimization'
          );
          break;
        case 'questions':
          setAiResult(
            'Study Questions:\n1. What are the main concepts discussed?\n2. How can these ideas be applied?\n3. What are the key benefits mentioned?'
          );
          break;
        case 'grammar':
          setAiResult(
            'Grammar corrected text would appear here with improved sentence structure and fixed errors.'
          );
          break;
        case 'format':
          setAiResult(
            'Formatted text with improved structure, proper headings, and better organization would appear here.'
          );
          break;
        case 'expand':
          setAiResult(
            'Expanded content with additional details, explanations, and context would be generated here.'
          );
          break;
        case 'simplify':
          setAiResult(
            'Simplified version of the text with easier vocabulary and shorter sentences would appear here.'
          );
          break;
        default:
          setAiResult('AI feature not implemented yet.');
      }
    } catch (error) {
      setAiResult('Error processing AI request. Please try again.');
    } finally {
      setAiProcessing(false);
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
        <h2 className='text-xl font-semibold'>AI Assistant</h2>
        {pagesData.length > 0 && (
          <div className='text-xs text-gray-400 mt-1'>
            {pagesData.length} pages loaded
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className='flex border-b' style={{ borderColor: '#2f2d2a' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 p-3 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            style={{
              backgroundColor: activeTab === tab.id ? '#2a2826' : 'transparent',
              borderBottom:
                activeTab === tab.id
                  ? '2px solid #8975EA'
                  : '2px solid transparent',
            }}
          >
            <div className='flex flex-col items-center gap-1'>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className='flex-1 overflow-y-auto'>
        {activeTab === 'extract' && (
          <div className='p-4'>
            {/* PDF Upload Component */}
            <PDFUpload onPagesExtracted={handlePagesExtracted} />

            {/* Pages Preview */}
            {pagesData.length > 0 && (
              <div
                className='mt-6 p-4 rounded-lg'
                style={{ backgroundColor: '#2a2826' }}
              >
                <h3
                  className='text-sm font-medium mb-3'
                  style={{ color: '#8975EA' }}
                >
                  Extracted Pages ({pagesData.length}):
                </h3>
                <div className='space-y-2 max-h-32 overflow-y-auto'>
                  {pagesData.map((page) => (
                    <div
                      key={page.pageNumber}
                      className='flex items-center justify-between p-2 rounded'
                      style={{ backgroundColor: '#1f1e1d' }}
                    >
                      <span className='text-xs text-gray-300'>
                        Page {page.pageNumber}
                      </span>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs text-gray-500'>
                          {page.width}×{page.height}
                        </span>
                        <button
                          onClick={() => extractTextFromPage(page)}
                          className='text-xs px-2 py-1 rounded'
                          style={{ backgroundColor: '#8975EA', color: 'white' }}
                        >
                          Extract
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div
              className='mt-6 p-4 rounded-lg'
              style={{ backgroundColor: '#2a2826' }}
            >
              <h3
                className='text-sm font-medium mb-2'
                style={{ color: '#8975EA' }}
              >
                How it works:
              </h3>
              <ul className='text-xs text-gray-400 space-y-1'>
                <li>• Upload a PDF document (up to 50MB)</li>
                <li>• Each page is converted to high-quality images</li>
                <li>• Click "Extract" on any page to get its text</li>
                <li>• Text appears in the main panel with formatting</li>
                <li>• Use other tabs for AI-powered analysis</li>
              </ul>
            </div>
          </div>
        )}

        {/* Keep the existing analyze and enhance tabs unchanged */}
        {activeTab === 'analyze' && (
          <div className='p-4 space-y-4'>
            <div className='mb-4'>
              <h3
                className='text-sm font-medium mb-3'
                style={{ color: '#8975EA' }}
              >
                AI Analysis Tools
              </h3>
              <p className='text-xs text-gray-400 mb-4'>
                Analyze your extracted text with AI-powered insights
              </p>
            </div>

            <div className='space-y-3'>
              {aiFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleAiFeature(feature.id)}
                  disabled={aiProcessing || !extractedText}
                  className='w-full p-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  <div className='flex items-start gap-3'>
                    <span className='text-lg'>{feature.icon}</span>
                    <div className='flex-1'>
                      <div className='text-sm font-medium text-white'>
                        {feature.title}
                      </div>
                      <div className='text-xs text-gray-400 mt-1'>
                        {feature.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* AI Result Display */}
            {(aiProcessing || aiResult) && (
              <div
                className='mt-6 p-4 rounded-lg border'
                style={{ backgroundColor: '#2a2826', borderColor: '#3a3836' }}
              >
                <h4
                  className='text-sm font-medium mb-2'
                  style={{ color: '#8975EA' }}
                >
                  AI Result:
                </h4>
                {aiProcessing ? (
                  <div className='flex items-center gap-2 text-xs text-gray-400'>
                    <div className='w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                    <span>Processing with AI...</span>
                  </div>
                ) : (
                  <div className='text-xs text-gray-300 whitespace-pre-line'>
                    {aiResult}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enhance' && (
          <div className='p-4 space-y-4'>
            <div className='mb-4'>
              <h3
                className='text-sm font-medium mb-3'
                style={{ color: '#8975EA' }}
              >
                Text Enhancement
              </h3>
              <p className='text-xs text-gray-400 mb-4'>
                Improve and enhance your extracted text with AI
              </p>
            </div>

            <div className='space-y-3'>
              {enhanceFeatures.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleAiFeature(feature.id)}
                  disabled={aiProcessing || !extractedText}
                  className='w-full p-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed'
                  style={{ backgroundColor: '#2a2826' }}
                >
                  <div className='flex items-start gap-3'>
                    <span className='text-lg'>{feature.icon}</span>
                    <div className='flex-1'>
                      <div className='text-sm font-medium text-white'>
                        {feature.title}
                      </div>
                      <div className='text-xs text-gray-400 mt-1'>
                        {feature.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Enhancement Result Display */}
            {(aiProcessing || aiResult) && (
              <div
                className='mt-6 p-4 rounded-lg border'
                style={{ backgroundColor: '#2a2826', borderColor: '#3a3836' }}
              >
                <h4
                  className='text-sm font-medium mb-2'
                  style={{ color: '#8975EA' }}
                >
                  Enhanced Text:
                </h4>
                {aiProcessing ? (
                  <div className='flex items-center gap-2 text-xs text-gray-400'>
                    <div className='w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin'></div>
                    <span>Enhancing text with AI...</span>
                  </div>
                ) : (
                  <div className='space-y-3'>
                    <div className='text-xs text-gray-300 whitespace-pre-line'>
                      {aiResult}
                    </div>
                    {aiResult && (
                      <button
                        onClick={() => onTextExtracted(aiResult)}
                        className='w-full py-2 px-3 rounded text-xs font-medium transition-colors'
                        style={{ backgroundColor: '#8975EA', color: '#ffffff' }}
                      >
                        Replace Original Text
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='p-4 border-t' style={{ borderColor: '#2f2d2a' }}>
        <div className='text-xs text-gray-500 text-center'>
          {pagesData.length > 0 ? (
            <span>✓ {pagesData.length} pages ready for processing</span>
          ) : extractedText ? (
            <span>✓ Text ready for AI processing</span>
          ) : (
            <span>Upload a PDF to unlock AI features</span>
          )}
        </div>
      </div>
    </div>
  );
}
