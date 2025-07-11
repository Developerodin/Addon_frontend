import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('accessToken', '', {
    httpOnly: false, // Changed to false to match set-cookie
    path: '/',
    expires: new Date(0), // Expire the cookie
  });
  return response;
} 