// components/home/ChatPanel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import MarkdownRenderer from '../MarkdownRenderer';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  extractedText?: string;
  currentPage?: number;
  totalPages?: number;
}

export default function ChatPanel({
  extractedText,
  currentPage,
  totalPages,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate new scroll height
      textareaRef.current.style.height = 'auto';

      // Calculate new height based on content, with min 60px and max 400px
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(scrollHeight, 60), 400);

      textareaRef.current.style.height = `${newHeight}px`;

      // Only show scrollbar when content exceeds max height
      if (scrollHeight > 400) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder assistant message for streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingMessageId(assistantMessageId);

    try {
      // Prepare context for the AI
      const context = extractedText
        ? `User is viewing a document${
            totalPages && totalPages > 1
              ? ` (page ${currentPage} of ${totalPages})`
              : ''
          }. Document content:\n\n${extractedText}\n\n---\n\n`
        : 'User has not uploaded any document yet.\n\n---\n\n';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          context,
          hasDocument: !!extractedText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content) {
                accumulatedContent += data.content;

                // Update the message with accumulated content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }

              if (data.done) {
                setStreamingMessageId(null);
                setIsLoading(false);
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);

      // Update the assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'Sorry, I encountered an error. Please try again.',
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className='flex flex-col h-full relative pb-30'
      style={{
        backgroundColor: '#1a1a1a',
        color: '#e5e5e5',
      }}
    >
      {/* Messages Area - Only show if there are messages */}
      {messages.length > 0 && (
        <div
          className='flex-1 overflow-y-auto px-6 py-4'
          style={{
            paddingBottom: '120px', // Space for fixed input at bottom
          }}
        >
          {/* Chat Messages */}
          <div className='max-w-4xl mx-auto space-y-6'>
            {messages.map((message) => (
              <div key={message.id} className='space-y-2'>
                {/* Message Header */}
                <div className='flex items-center gap-2 text-sm opacity-60'>
                  <span className='font-medium'>
                    {message.role === 'user' ? 'You' : 'Readly'}
                  </span>
                  <span className='text-xs'>
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Message Content */}
                <div className='text-base leading-relaxed'>
                  {message.role === 'assistant' ? (
                    <div>
                      {/* Render assistant messages with MarkdownRenderer */}
                      <MarkdownRenderer
                        markdownText={message.content}
                        fontSize={15}
                        theme='dark'
                        isHighlightEnabled={true}
                        compact={true}
                        className='chat-message'
                      />

                      {/* Show typing cursor for streaming message */}
                      {streamingMessageId === message.id && (
                        <span
                          className='typing-cursor'
                          style={{
                            color: '#8975EA',
                            animation: 'blink 1s infinite',
                            fontSize: '1.2em',
                            marginLeft: '2px',
                          }}
                        >
                          |
                        </span>
                      )}
                    </div>
                  ) : (
                    // Render user messages as plain text
                    <div
                      className='whitespace-pre-wrap'
                      style={{
                        color: '#e5e5e5',
                        lineHeight: '1.6',
                      }}
                    >
                      {message.content}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className='space-y-2'>
                <div className='flex items-center gap-2 text-sm opacity-60'>
                  <span className='font-medium'>Readly</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='flex space-x-1'>
                    <div
                      className='w-2 h-2 rounded-full animate-pulse'
                      style={{ backgroundColor: '#8975EA' }}
                    ></div>
                    <div
                      className='w-2 h-2 rounded-full animate-pulse'
                      style={{
                        backgroundColor: '#8975EA',
                        animationDelay: '0.2s',
                      }}
                    ></div>
                    <div
                      className='w-2 h-2 rounded-full animate-pulse'
                      style={{
                        backgroundColor: '#8975EA',
                        animationDelay: '0.4s',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Empty space when no messages - takes up remaining space */}
      {messages.length === 0 && (
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center max-w-lg px-6'>
            <h3
              className='text-2xl font-medium mb-4'
              style={{ color: '#e5e5e5' }}
            >
              How can I help you today?
            </h3>
            <p className='text-base opacity-60 mb-8'>
              {extractedText
                ? 'I can help you understand, summarize, and analyze your document. Ask me anything!'
                : "I'm here to help. Upload a document or ask me any question to get started."}
            </p>
          </div>
        </div>
      )}

      {/* Document Context Indicator */}
      {extractedText && (
        <div
          className='absolute top-4 right-6 px-3 py-1 rounded-full text-xs'
          style={{
            backgroundColor: 'rgba(137, 117, 234, 0.2)',
            border: '1px solid rgba(137, 117, 234, 0.3)',
            color: '#8975EA',
          }}
        >
          <div className='flex items-center gap-2'>
            <span className='w-2 h-2 rounded-full bg-green-400'></span>
            <span>
              Document loaded
              {totalPages && totalPages > 1 && (
                <span className='opacity-70'>
                  {' '}
                  • Page {currentPage}/{totalPages}
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Fixed Input Area at Bottom */}
      <div className='absolute bottom-0 left-0 right-0 p-6'>
        <div className='max-w-4xl mx-auto'>
          <form onSubmit={handleSubmit}>
            <div
              className='relative rounded-3xl transition-all duration-200'
              style={{
                backgroundColor: '#2a2a2a',
                border: '1px solid',
                borderColor: input.trim()
                  ? 'rgba(137, 117, 234, 0.6)'
                  : 'rgba(255, 255, 255, 0.15)',
              }}
            >
              {/* Input Area - Above buttons */}
              <div className='px-4 pt-4'>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder='Ask about your document, math problems, or any question...'
                  className='w-full resize-none bg-transparent placeholder-gray-500 focus:outline-none focus:ring-0'
                  style={{
                    color: '#e5e5e5',
                    minHeight: '36px',
                    maxHeight: '400px',
                    fontSize: '16px',
                    lineHeight: '1.4',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    background: 'transparent',
                  }}
                  disabled={isLoading}
                  rows={1}
                />
              </div>

              {/* Bottom Row - Buttons */}
              <div className='flex items-center justify-between p-3 pt-2'>
                {/* Left Feature Buttons */}
                <div className='flex items-center gap-2'>
                  {/* Add File Button */}
                  <button
                    type='button'
                    className='w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-600'
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    title='Add files'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M12 5v14M5 12h14' />
                    </svg>
                  </button>

                  {/* Menu Button */}
                  <button
                    type='button'
                    className='w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-gray-600'
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    title='More options'
                  >
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <line x1='3' y1='6' x2='21' y2='6' />
                      <line x1='3' y1='12' x2='21' y2='12' />
                      <line x1='3' y1='18' x2='21' y2='18' />
                    </svg>
                  </button>

                  {/* Math Mode Indicator */}
                  <div
                    className='h-9 px-3 rounded-xl flex items-center gap-2'
                    style={{ backgroundColor: 'rgba(137, 117, 234, 0.2)' }}
                    title='Math formulas supported'
                  >
                    <span className='text-sm' style={{ color: '#8975EA' }}>
                      ƒ(x)
                    </span>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  type='submit'
                  disabled={!input.trim() || isLoading}
                  className='w-9 h-9 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center'
                  style={{
                    backgroundColor:
                      input.trim() && !isLoading
                        ? '#8975EA'
                        : 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                  }}
                >
                  {isLoading ? (
                    <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  ) : (
                    <svg
                      width='16'
                      height='16'
                      viewBox='0 0 24 24'
                      fill='currentColor'
                      stroke='none'
                    >
                      <path d='M2.01 21L23 12 2.01 3 2 10l15 2-15 2z' />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Helper Text */}
            {messages.length > 0 && (
              <div className='flex items-center justify-center mt-3'>
                <button
                  onClick={clearChat}
                  className='text-xs opacity-40 hover:opacity-70 transition-opacity'
                  style={{ color: '#8975EA' }}
                >
                  Clear conversation
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Chat-specific styles */}
      <style jsx global>{`
        /* Typing cursor animation */
        @keyframes blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }

        .typing-cursor {
          display: inline-block;
          font-weight: bold;
        }
        /* Chat message specific styling */
        .chat-message .unified-markdown-content {
          background: transparent !important;
        }

        .chat-message .rendered-content {
          background: transparent !important;
          padding: 0 !important;
        }

        /* Ensure math renders properly in chat */
        .chat-message .katex {
          font-size: 1em !important;
        }

        .chat-message .katex-display .katex {
          font-size: 1.2em !important;
        }

        /* Improve chat code blocks */
        .chat-message .rendered-content pre {
          background-color: #2a2a2a !important;
          border: 1px solid #3a3a3a;
          border-radius: 6px;
          margin: 0.75rem 0;
          padding: 1rem;
        }

        .chat-message .rendered-content code {
          background-color: #2a2a2a !important;
          border: 1px solid #3a3a3a;
          color: #a78bfa !important;
        }

        /* Chat-specific list styling */
        .chat-message .rendered-content ul,
        .chat-message .rendered-content ol {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
        }

        .chat-message .rendered-content li {
          margin-bottom: 0.25rem;
        }

        /* Chat blockquotes */
        .chat-message .rendered-content blockquote {
          border-left: 3px solid #8975ea;
          background-color: rgba(137, 117, 234, 0.1);
          margin: 0.75rem 0;
          padding: 0.75rem 1rem;
        }
      `}</style>
    </div>
  );
}
