import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define the paths that should be protected
const protectedPaths = [
  '/dashboard',
  '/dashboards',
  '/dashboards/*',
  '/catalog',
  '/catalog/*',
  '/settings',
  '/settings/*',
  '/replenishment',
  '/replenishment/*',
  '/sales',
  '/sales/*',
  '/inventory',
  '/inventory/*',
  '/reports',
  '/reports/*',
  
  // Add any other protected paths here
]

// Define the paths that should be public
const publicPaths = [
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value

 

  // Check if the path should be protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // If it's a protected path and there's no token, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/auth/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // If user is logged in and tries to access auth pages, redirect to dashboard
  if (isPublicPath && token) {
    const dashboardUrl = new URL('/dashboards/main', request.url)
    return NextResponse.redirect(dashboardUrl)
  }


  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
}