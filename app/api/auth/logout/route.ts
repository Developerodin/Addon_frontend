import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  
  // Determine if we're in development (HTTP) or production (HTTPS)
  const origin = request.headers.get('origin') || request.headers.get('referer') || '';
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLocalNetwork = origin.includes('localhost') || 
    origin.includes('127.0.0.1') || 
    origin.match(/^http:\/\/192\.168\.\d+\.\d+/);
  
  const useSecure = !isDevelopment && !isLocalNetwork;
  
  response.cookies.set('accessToken', '', {
    httpOnly: false, // Changed to false to match set-cookie
    path: '/',
    sameSite: 'lax',
    secure: useSecure,
    expires: new Date(0), // Expire the cookie
  });
  return response;
} 