import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { token } = await request.json();
  const response = NextResponse.json({ success: true });
  
  // Determine if we're in development (HTTP) or production (HTTPS)
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLocalNetwork = origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    origin.match(/^http:\/\/192\.168\.\d+\.\d+/);
  
  // Secure cookies only work over HTTPS, so disable for HTTP (development/local network)
  const useSecure = !isDevelopment && !isLocalNetwork;
  
  response.cookies.set('accessToken', token, {
    httpOnly: false, // Changed to false so JavaScript can access it
    path: '/',
    sameSite: 'lax',
    secure: useSecure, // false for HTTP (localhost/IP), true for HTTPS production
    maxAge: 60 * 60 * 24 * 7, // 7 days
    // Don't set domain - let it default to current host (works for both localhost and IP)
  });
  
  return response;
} 