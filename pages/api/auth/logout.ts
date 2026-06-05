import type { NextApiRequest, NextApiResponse } from 'next';
import {
  getRequestProtocol,
  shouldUseSecureCookies,
} from '@/shared/utils/cookieSecurity';

/**
 * API route: POST /api/auth/logout — clears accessToken cookie.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const host = req.headers.host || 'localhost';
  const requestUrl = `${getRequestProtocol(req.headers)}://${host}${req.url || ''}`;
  const useSecure = shouldUseSecureCookies(getRequestProtocol(req.headers, requestUrl));

  res.setHeader('Set-Cookie', [
    `accessToken=; Path=/; HttpOnly=false; SameSite=Lax; Max-Age=0${useSecure ? '; Secure' : ''}`,
  ]);
  return res.status(200).json({ success: true });
}
