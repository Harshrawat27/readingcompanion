import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  // // Get the pathname
  // const pathname = request.nextUrl.pathname;
  // // Skip middleware for auth pages, API routes, and static files
  // if (
  //   pathname.startsWith('/auth/') ||
  //   pathname.startsWith('/api/') ||
  //   pathname.startsWith('/_next/') ||
  //   pathname.includes('.')
  // ) {
  //   return NextResponse.next();
  // }
  // try {
  //   // Check if user is authenticated
  //   const session = await auth.api.getSession({
  //     headers: request.headers,
  //   });
  //   // If no session and trying to access protected routes, redirect to sign-in
  //   if (
  //     !session &&
  //     pathname !== '/auth/signin' &&
  //     pathname !== '/auth/signup'
  //   ) {
  //     const signInUrl = new URL('/auth/signin', request.url);
  //     return NextResponse.redirect(signInUrl);
  //   }
  //   // If has session and trying to access auth pages, redirect to home
  //   if (
  //     session &&
  //     (pathname === '/auth/signin' || pathname === '/auth/signup')
  //   ) {
  //     const homeUrl = new URL('/', request.url);
  //     return NextResponse.redirect(homeUrl);
  //   }
  //   return NextResponse.next();
  // } catch (error) {
  //   // If there's an error checking auth, allow the request to continue
  //   // This prevents the app from breaking if auth service is down
  //   console.error('Auth middleware error:', error);
  //   return NextResponse.next();
  // }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
