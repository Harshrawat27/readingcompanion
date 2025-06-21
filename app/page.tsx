'use client';

import { useState, useRef, useCallback } from 'react';

export default function Home() {
  const [leftWidth, setLeftWidth] = useState(70); // 70% for main content
  const [isDragging, setIsDragging] = useState(false);
  const [selectedChat, setSelectedChat] = useState('Getting Started');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      // Constrain between 50% and 85%
      const constrainedWidth = Math.min(Math.max(newLeftWidth, 50), 85);
      setLeftWidth(constrainedWidth);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners
  useState(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  });

  const recentChats = [
    'Getting Started with Reading',
    'Book Recommendation System',
    'Reading Progress Tracker',
    'Note-taking Features',
    'Dark Mode Implementation',
    'User Authentication Setup',
    'Database Schema Design',
    'API Integration Guide',
    'Mobile Responsive Design',
    'Performance Optimization',
  ];

  return (
    <div
      ref={containerRef}
      className='flex h-screen w-full text-white overflow-hidden'
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Main Content Area - 70% - Color #262624 */}
      <div
        className='flex flex-col'
        style={{
          width: `${leftWidth}%`,
          backgroundColor: '#262624',
        }}
      >
        {/* Header */}
        <div className='p-6 border-b' style={{ borderColor: '#3a3836' }}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className='w-8 h-8 rounded-lg flex items-center justify-center'
                style={{ backgroundColor: '#8975EA' }}
              >
                <span className='text-white text-sm font-bold'>RC</span>
              </div>
              <span className='text-xl font-medium text-gray-100'>
                Reading Companion
              </span>
            </div>
            <div className='text-sm text-gray-400'>Good afternoon, Harsh</div>
          </div>
        </div>

        {/* Welcome Section */}
        <div className='flex-1 flex flex-col justify-center items-center px-8'>
          <div className='text-center max-w-2xl'>
            <div className='mb-6'>
              <h1 className='text-4xl font-light text-gray-100 mb-4'>
                How can I help you today?
              </h1>
              <p className='text-lg text-gray-400'>
                Your personalized reading companion for tracking progress,
                taking notes, and discovering new books.
              </p>
            </div>

            {/* Chat Input */}
            <div className='mb-8'>
              <div className='relative'>
                <textarea
                  placeholder='Ask me anything about your reading journey...'
                  className='w-full px-4 py-4 text-gray-200 placeholder-gray-500 resize-none focus:outline-none rounded-xl min-h-[80px] border'
                  style={{
                    backgroundColor: '#2a2826',
                    borderColor: '#3a3836',
                  }}
                  rows={3}
                />
                <div className='absolute right-3 bottom-3 flex items-center gap-2'>
                  <button className='p-2 text-gray-500 hover:text-gray-300 transition-colors rounded'>
                    <span className='text-sm'>📎</span>
                  </button>
                  <button className='p-2 text-gray-500 hover:text-gray-300 transition-colors rounded'>
                    <span className='text-sm'>🔍</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='flex flex-wrap gap-3 justify-center mb-8'>
              <button
                className='flex items-center gap-2 px-4 py-3 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-transparent hover:border-gray-600'
                style={{ backgroundColor: '#2a2826' }}
              >
                <span>📝</span>
                <span>Start Reading Log</span>
              </button>
              <button
                className='flex items-center gap-2 px-4 py-3 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-transparent hover:border-gray-600'
                style={{ backgroundColor: '#2a2826' }}
              >
                <span>📚</span>
                <span>Browse Books</span>
              </button>
              <button
                className='flex items-center gap-2 px-4 py-3 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-transparent hover:border-gray-600'
                style={{ backgroundColor: '#2a2826' }}
              >
                <span>📊</span>
                <span>View Progress</span>
              </button>
              <button
                className='flex items-center gap-2 px-4 py-3 rounded-lg text-gray-300 hover:text-white transition-all duration-200 text-sm border border-transparent hover:border-gray-600'
                style={{ backgroundColor: '#2a2826' }}
              >
                <span>💡</span>
                <span>Get Recommendations</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Info */}
        <div className='p-6 border-t' style={{ borderColor: '#3a3836' }}>
          <div className='flex justify-center'>
            <div className='text-xs text-gray-500'>
              Reading Companion v1.0 • Powered by AI
            </div>
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      <div
        className='w-1 cursor-col-resize hover:w-2 transition-all duration-200 relative group'
        style={{ backgroundColor: '#3a3836' }}
        onMouseDown={handleMouseDown}
      >
        <div
          className='absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
          style={{ backgroundColor: '#4a453f' }}
        ></div>
      </div>

      {/* Sidebar - 30% - Color #1F1E1D */}
      <div
        className='flex flex-col'
        style={{
          width: `${100 - leftWidth}%`,
          backgroundColor: '#1F1E1D',
        }}
      >
        {/* Sidebar Header */}
        <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
          <button
            className='w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white font-medium transition-all duration-200 hover:scale-[1.02]'
            style={{ backgroundColor: '#8975EA' }}
          >
            <span className='text-lg'>+</span>
            <span>New Session</span>
          </button>
        </div>

        {/* Navigation */}
        <div className='p-4 border-b' style={{ borderColor: '#2f2d2a' }}>
          <div className='space-y-1'>
            <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white text-left transition-colors nav-button'>
              <span>💬</span>
              <span className='text-sm'>Chat History</span>
            </button>
            <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white text-left transition-colors nav-button'>
              <span>📖</span>
              <span className='text-sm'>My Library</span>
            </button>
            <button className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white text-left transition-colors nav-button'>
              <span>⭐</span>
              <span className='text-sm'>Favorites</span>
            </button>
          </div>
        </div>

        {/* Recent Sessions */}
        <div className='flex-1 overflow-y-auto'>
          <div className='p-4'>
            <h3 className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-3'>
              Recent Sessions
            </h3>
            <div className='space-y-1'>
              {recentChats.map((chat, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all duration-200 border-l-2 ${
                    selectedChat === chat
                      ? 'text-white border-l-2'
                      : 'text-gray-400 hover:text-gray-200 border-l-2 border-transparent'
                  }`}
                  style={{
                    backgroundColor:
                      selectedChat === chat ? '#2a2826' : 'transparent',
                    borderLeftColor:
                      selectedChat === chat ? '#3a3836' : 'transparent',
                  }}
                >
                  <div className='truncate leading-relaxed'>{chat}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reading Stats */}
        <div className='p-4 border-t' style={{ borderColor: '#2f2d2a' }}>
          <h3 className='text-xs font-medium text-gray-500 uppercase tracking-wide mb-3'>
            Today's Stats
          </h3>
          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-400'>Pages Read</span>
              <span className='text-sm font-medium text-gray-200'>24</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-400'>Reading Time</span>
              <span className='text-sm font-medium text-gray-200'>45m</span>
            </div>
            <div className='flex justify-between items-center'>
              <span className='text-xs text-gray-400'>Streak</span>
              <span className='text-sm font-medium text-gray-200'>7 days</span>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className='p-4 border-t' style={{ borderColor: '#2f2d2a' }}>
          <div className='flex items-center gap-3'>
            <div
              className='w-8 h-8 rounded-full flex items-center justify-center'
              style={{ backgroundColor: '#3a3836' }}
            >
              <span className='text-white text-sm font-medium'>HR</span>
            </div>
            <div className='flex-1 min-w-0'>
              <div className='text-sm font-medium text-gray-200'>
                Harsh Rawat
              </div>
              <div className='text-xs text-gray-500'>Pro Reader</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
