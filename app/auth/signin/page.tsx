'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError('Invalid email or password');
      } else {
        router.push('/'); // Redirect to main app
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch (err) {
      setError('Google sign-in failed');
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError('');

    try {
      await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/',
      });
    } catch (err) {
      setError('GitHub sign-in failed');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Implement magic link functionality
      setError('Magic link feature coming soon!');
    } catch (err) {
      setError('Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'>
      {/* Left side - Sign In */}
      <div className='w-full lg:w-1/2 flex flex-col'>
        <div className='flex-grow flex items-center justify-center p-8'>
          <div className='w-full max-w-md'>
            {/* Header */}
            <h1 className='text-4xl font-bold mb-8 text-white'>
              Your ideas, <br />
              amplified
            </h1>
            <p className='text-lg text-gray-300 mb-10'>
              Privacy-first AI that helps you create in confidence.
            </p>

            {/* Error Display */}
            {error && (
              <div className='mb-6 p-3 bg-red-500/20 border border-red-500 rounded-md text-red-200'>
                {error}
              </div>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className='w-full mb-4 flex items-center justify-center gap-2 rounded-md py-3 px-4 border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 transition-colors'
              disabled={loading}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 48 48'
              >
                <path
                  fill='#FFC107'
                  d='M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z'
                />
                <path
                  fill='#FF3D00'
                  d='M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z'
                />
                <path
                  fill='#4CAF50'
                  d='M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z'
                />
                <path
                  fill='#1976D2'
                  d='M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z'
                />
              </svg>
              Continue with Google
            </button>

            {/* GitHub Sign In */}
            <button
              onClick={handleGitHubSignIn}
              className='w-full mb-4 flex items-center justify-center gap-2 rounded-md py-3 px-4 border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 transition-colors'
              disabled={loading}
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='currentColor'
              >
                <path d='M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' />
              </svg>
              Continue with GitHub
            </button>

            {/* OR Divider */}
            <div className='relative my-6'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-600'></div>
              </div>
              <div className='relative flex justify-center'>
                <span className='bg-gray-900 px-3 text-sm text-gray-400'>
                  OR
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <div className='space-y-4'>
              <div>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='Enter your personal or work email'
                  className='w-full rounded-md py-3 px-4 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  disabled={loading}
                />
              </div>

              <div className='relative'>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='Password'
                  className='w-full rounded-md py-3 px-4 bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent'
                  disabled={loading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300'
                >
                  {showPassword ? (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
                      <line x1='1' y1='1' x2='23' y2='23' />
                    </svg>
                  ) : (
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                      <circle cx='12' cy='12' r='3' />
                    </svg>
                  )}
                </button>
              </div>

              <button
                type='button'
                onClick={handleEmailPasswordSignIn}
                className='w-full rounded-md py-3 bg-purple-600 text-white font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Continue with email'}
              </button>
            </div>

            {/* Magic Link */}
            <button
              onClick={handleMagicLink}
              className='w-full mt-3 text-purple-400 text-sm text-center hover:underline'
              disabled={loading}
            >
              Send a magic link instead
            </button>

            {/* Sign Up Link */}
            <div className='mt-8 text-center text-gray-400 text-sm'>
              Don't have an account?{' '}
              <Link
                href='/auth/signup'
                className='text-purple-400 hover:underline'
              >
                Sign up
              </Link>
            </div>

            {/* Learn More */}
            <div className='mt-16 text-center'>
              <button className='text-gray-400 text-sm hover:text-gray-300 flex items-center justify-center mx-auto'>
                Learn more
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='16'
                  height='16'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='ml-1'
                >
                  <path d='M6 9l6 6 6-6' />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Preview */}
      <div className='hidden lg:block lg:w-1/2 bg-gray-50 p-8'>
        <div className='h-full rounded-lg bg-white shadow-sm p-6 flex items-center justify-center'>
          <div className='text-center'>
            <div className='inline-block w-12 h-12 rounded-full bg-purple-100 mb-4 flex items-center justify-center'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='24'
                height='24'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                className='text-purple-600'
              >
                <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
                <polyline points='14,2 14,8 20,8' />
                <line x1='16' y1='13' x2='8' y2='13' />
                <line x1='16' y1='17' x2='8' y2='17' />
                <polyline points='10,9 9,9 8,9' />
              </svg>
            </div>
            <div className='bg-gray-100 h-6 w-64 rounded mb-3 mx-auto'></div>
            <div className='bg-gray-100 h-4 w-48 rounded mb-6 mx-auto'></div>
            <div className='space-y-2 mb-6'>
              <div className='bg-gray-100 h-3 w-full rounded'></div>
              <div className='bg-gray-100 h-3 w-full rounded'></div>
              <div className='bg-gray-100 h-3 w-3/4 rounded'></div>
            </div>
            <div className='flex justify-center mt-4 space-x-2'>
              <div className='w-2 h-2 rounded-full bg-gray-300'></div>
              <div className='w-2 h-2 rounded-full bg-purple-500'></div>
              <div className='w-2 h-2 rounded-full bg-gray-300'></div>
              <div className='w-2 h-2 rounded-full bg-gray-300'></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
