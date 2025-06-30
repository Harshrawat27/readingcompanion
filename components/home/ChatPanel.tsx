// components/home/ChatPanel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Handle streaming response
  const handleStreamingResponse = async (
    response: Response,
    assistantMessageId: string
  ) => {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      setIsStreaming(true);
      setStreamingMessageId(assistantMessageId);

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content') {
                // Update the streaming message with new content
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: msg.content + data.content }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                // Mark streaming as complete
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, isStreaming: false }
                      : msg
                  )
                );
                return; // Exit the function
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', parseError);
            }
          }
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingMessageId(null);
      reader.releaseLock();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    // Create assistant message placeholder for streaming
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

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
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if response is streaming
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        await handleStreamingResponse(response, assistantMessageId);
      } else {
        // Fallback to non-streaming response
        const data = await response.json();
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: data.message, isStreaming: false }
              : msg
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);

      // Handle aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== assistantMessageId)
        );
        return;
      }

      // Update assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: 'Sorry, I encountered an error. Please try again.',
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  // Stop streaming
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    // Stop any ongoing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsStreaming(false);
    setStreamingMessageId(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className='flex flex-col h-full relative'
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
          <div className='max-w-4xl mx-auto space-y-6 pb-30'>
            {messages.map((message) => (
              <div
                key={message.id}
                // Conditionally apply classes to align messages
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className='max-w-lg'>
                  {/* Message Header */}
                  <div
                    className={`flex items-center gap-2 text-sm opacity-60 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <span className='font-medium'>
                      {message.role === 'user' ? 'You' : 'Readly'}
                    </span>
                    <span className='text-xs'>
                      {formatTime(message.timestamp)}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div
                    className='text-base leading-relaxed whitespace-pre-wrap p-4 rounded-lg'
                    style={{
                      // Conditional background and text color
                      backgroundColor:
                        message.role === 'user' ? '#000000' : 'transparent',
                      color: '#e5e5e5',
                      lineHeight: '1.6',
                    }}
                  >
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className='flex justify-start'>
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
                  placeholder='Ask about your document or any question...'
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

                  {/* Research Button */}
                  <button
                    type='button'
                    className='h-9 px-4 rounded-xl flex items-center gap-2 transition-colors hover:bg-gray-600'
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                    title='Research'
                  >
                    <svg
                      width='14'
                      height='14'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <circle cx='11' cy='11' r='8' />
                      <path d='m21 21-4.35-4.35' />
                    </svg>
                    <span className='text-sm text-gray-300'>Research</span>
                  </button>

                  {/* Stop button when streaming */}
                  {isStreaming && (
                    <button
                      type='button'
                      onClick={stopStreaming}
                      className='h-9 px-4 rounded-xl flex items-center gap-2 transition-colors hover:bg-red-600'
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      title='Stop generation'
                    >
                      <div className='w-3 h-3 bg-red-400 rounded-sm'></div>
                      <span className='text-sm text-red-400'>Stop</span>
                    </button>
                  )}
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
    </div>
  );
}
