import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isAccessTokenExpired } from '@/shared/utils/authToken'

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

/**
 * Clears an invalid access token cookie on the response.
 */
function clearAccessTokenCookie(response: NextResponse): void {
  response.cookies.set('accessToken', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  })
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('accessToken')?.value
  const tokenExpired = token ? isAccessTokenExpired(token) : true
  const hasValidToken = Boolean(token) && !tokenExpired

  // Check if the path should be protected
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path))
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Root: send users with a valid session to dashboard, expired/missing to login
  if (pathname === '/') {
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboards/main', request.url))
    }
    const response = NextResponse.redirect(new URL('/auth/login', request.url))
    if (token && tokenExpired) {
      clearAccessTokenCookie(response)
    }
    return response
  }

  // Protected routes require a non-expired token
  if (isProtectedPath && !hasValidToken) {
    const loginUrl = new URL('/auth/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    if (token && tokenExpired) {
      clearAccessTokenCookie(response)
    }
    return response
  }

  // Auth pages: only redirect away when the token is still valid
  if (isPublicPath && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboards/main', request.url))
  }

  if (isPublicPath && token && tokenExpired) {
    const response = NextResponse.next()
    clearAccessTokenCookie(response)
    return response
  }

  return NextResponse.next()
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
}