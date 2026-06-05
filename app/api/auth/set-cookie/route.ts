import { NextResponse } from 'next/server';
import {
  getRequestProtocol,
  shouldUseSecureCookies,
} from '@/shared/utils/cookieSecurity';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { token } = await request.json();
  const response = NextResponse.json({ success: true });

  const protocol = getRequestProtocol(request.headers, request.url);
  const useSecure = shouldUseSecureCookies(protocol);
  
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