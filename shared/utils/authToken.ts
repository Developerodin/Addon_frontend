/**
 * Returns true when a JWT access token is missing, malformed, or past its exp claim.
 */
export function isAccessTokenExpired(token: string | undefined | null): boolean {
  if (!token) {
    return true;
  }

  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return true;
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (!payload.exp) {
      return true;
    }

    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/**
 * Returns true when the token exists and is not expired.
 */
export function isAccessTokenValid(token: string | undefined | null): boolean {
  return Boolean(token) && !isAccessTokenExpired(token);
}
