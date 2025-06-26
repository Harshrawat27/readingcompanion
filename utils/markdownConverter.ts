import { Converter } from 'showdown';

// Configure Showdown converter with optimal settings
const createMarkdownConverter = () => {
  const converter = new Converter({
    // Basic options
    tables: true, // Enable table support
    strikethrough: true, // Enable ~~strikethrough~~
    tasklists: true, // Enable task lists [ ] and [x]
    smoothLivePreview: true, // Better live preview

    // HTML output options
    noHeaderId: false, // Generate header IDs for navigation
    headerLevelStart: 1, // Start headers at h1

    // Text processing
    simpleLineBreaks: false, // Require double line breaks for paragraphs
    requireSpaceBeforeHeadingText: true, // Require space after # for headers

    // Code and syntax
    ghCodeBlocks: true, // GitHub-style code blocks

    // Links and images
    openLinksInNewWindow: false, // Don't auto-add target="_blank"

    // Misc
    emoji: false, // Disable emoji parsing (for performance)
    underline: false, // Disable __underline__ (conflicts with bold)
  });

  return converter;
};

// Create a singleton converter instance
let converterInstance: Converter | null = null;

export const getMarkdownConverter = (): Converter => {
  if (!converterInstance) {
    converterInstance = createMarkdownConverter();
  }
  return converterInstance;
};

// Main conversion function
export const markdownToHtml = (markdown: string): string => {
  try {
    const converter = getMarkdownConverter();

    // Pre-process the markdown for better conversion
    const processedMarkdown = preprocessMarkdown(markdown);

    // Convert to HTML
    const html = converter.makeHtml(processedMarkdown);

    // Post-process the HTML for better styling
    const processedHtml = postprocessHtml(html);

    return processedHtml;
  } catch (error) {
    console.error('Error converting markdown to HTML:', error);
    // Fallback: return the original markdown wrapped in a div
    return `<div class="markdown-error">${escapeHtml(markdown)}</div>`;
  }
};

// Pre-process markdown before conversion
const preprocessMarkdown = (markdown: string): string => {
  let processed = markdown;

  // Ensure proper spacing around headers
  processed = processed.replace(/^(#{1,6})\s*(.+)$/gm, '$1 $2');

  // Fix common list formatting issues
  processed = processed.replace(/^\s*[-*+]\s+/gm, '- ');
  processed = processed.replace(/^\s*(\d+)\.\s+/gm, '$1. ');

  // Ensure proper table formatting
  processed = processed.replace(/\|\s*([^|\n]+)\s*\|/g, '| $1 |');

  // Fix blockquotes
  processed = processed.replace(/^>\s*/gm, '> ');

  return processed;
};

// Post-process HTML for better styling and structure
const postprocessHtml = (html: string): string => {
  let processed = html;

  // Add CSS classes for better styling
  processed = processed.replace(/<h([1-6])>/g, '<h$1 class="heading-$1">');
  processed = processed.replace(/<table>/g, '<table class="markdown-table">');
  processed = processed.replace(
    /<blockquote>/g,
    '<blockquote class="markdown-blockquote">'
  );
  processed = processed.replace(
    /<code>/g,
    '<code class="markdown-inline-code">'
  );
  processed = processed.replace(
    /<pre><code>/g,
    '<pre class="markdown-code-block"><code>'
  );
  processed = processed.replace(/<ul>/g, '<ul class="markdown-list">');
  processed = processed.replace(
    /<ol>/g,
    '<ol class="markdown-list markdown-ordered">'
  );

  // Add paragraph classes
  processed = processed.replace(/<p>/g, '<p class="markdown-paragraph">');

  // Improve link handling
  processed = processed.replace(
    /<a href="([^"]*)">/g,
    '<a href="$1" class="markdown-link">'
  );

  return processed;
};

// HTML escape utility for fallback
const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Utility to extract plain text from HTML (for stats)
export const htmlToPlainText = (html: string): string => {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Utility to get word count from HTML
export const getWordCount = (html: string): number => {
  const plainText = htmlToPlainText(html);
  return plainText.split(/\s+/).filter((word) => word.length > 0).length;
};

// Utility to estimate reading time
export const getReadingTime = (
  html: string,
  wordsPerMinute: number = 200
): number => {
  const wordCount = getWordCount(html);
  return Math.ceil(wordCount / wordsPerMinute);
};
