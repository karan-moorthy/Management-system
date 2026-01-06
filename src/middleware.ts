import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE } from '@/features/auth/constants';
import { getAuthCookieConfig } from '@/lib/cookie-config';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/projects',
  '/tasks',
  '/attendance',
  '/profiles',
  '/admin',
  '/workspaces',
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ['/sign-in', '/sign-up'];

// Public routes that don't need any redirect
const publicRoutes = ['/', '/client/accept'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for public routes
  if (publicRoutes.some(route => pathname === route)) {
    return NextResponse.next();
  }
  
  // Get auth cookie
  const sessionToken = request.cookies.get(AUTH_COOKIE);
  const isAuthenticated = !!sessionToken?.value;

  // If authenticated user tries to access auth pages, redirect to dashboard
  if (isAuthenticated && authRoutes.some(route => pathname.startsWith(route))) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // If unauthenticated user tries to access protected routes, redirect to sign-in
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    // Clear any stale cookies before redirecting
    const signInUrl = new URL('/sign-in', request.url);
    signInUrl.searchParams.set('from', pathname);
    
    const response = NextResponse.redirect(signInUrl);
    
    // If there's a cookie but no valid session, clear it
    if (sessionToken) {
      const cookieOptions = getAuthCookieConfig({ forDeletion: true });
      response.cookies.set({
        name: AUTH_COOKIE,
        value: '',
        expires: new Date(0),
        ...cookieOptions,
      });
    }
    
    return response;
  }

  // For logout endpoint or expired sessions, ensure cookie is cleared
  if (pathname === '/api/auth/logout') {
    const response = NextResponse.next();
    
    // Use standardized cookie configuration for deletion
    const cookieOptions = getAuthCookieConfig({ forDeletion: true });
    
    response.cookies.set({
      name: AUTH_COOKIE,
      value: '',
      expires: new Date(0),
      ...cookieOptions,
    });

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
