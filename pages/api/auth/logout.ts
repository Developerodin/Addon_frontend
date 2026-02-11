import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route: POST /api/auth/logout — clears accessToken cookie.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = (req.headers.origin || req.headers.referer || '') as string;
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLocalNetwork =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    /^http:\/\/192\.168\.\d+\.\d+/.test(origin);
  const useSecure = !isDevelopment && !isLocalNetwork;

  res.setHeader('Set-Cookie', [
    `accessToken=; Path=/; HttpOnly=false; SameSite=Lax; Max-Age=0${useSecure ? '; Secure' : ''}`,
  ]);
  return res.status(200).json({ success: true });
}
