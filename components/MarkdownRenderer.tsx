'use client';

import { useState, useEffect } from 'react';
import showdown from 'showdown';

interface MarkdownRendererProps {
  markdownText: string;
  fontSize?: number;
  theme?: string;
  isHighlightEnabled?: boolean;
}

const MarkdownRenderer = ({
  markdownText,
  fontSize = 16,
  theme = 'dark',
  isHighlightEnabled = false,
}: MarkdownRendererProps) => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!markdownText) {
      setHtml('');
      return;
    }

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

      setHtml(converter.makeHtml(markdownText));
    } catch (error) {
      console.error('Markdown conversion failed:', error);
      // Fallback to plain text with basic HTML escaping
      const escapedText = markdownText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
      setHtml(`<div>${escapedText}</div>`);
    }
  }, [markdownText]);

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
      className='markdown-content'
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
        } as React.CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;
