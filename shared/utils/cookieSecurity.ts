type HeaderSource = Headers | Record<string, string | string[] | undefined>;

/**
 * Reads a single header value from either Web Fetch Headers or Node request headers.
 */
function getHeaderValue(headers: HeaderSource, name: string): string | undefined {
  if (headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

/**
 * Resolves the request protocol, honoring reverse-proxy headers when present.
 */
export function getRequestProtocol(
  headers: HeaderSource,
  requestUrl?: string
): string {
  const forwardedProto = getHeaderValue(headers, 'x-forwarded-proto');
  if (forwardedProto) {
    return forwardedProto.split(',')[0].trim().toLowerCase();
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).protocol.replace(':', '').toLowerCase();
    } catch {
      // Fall through to HTTP when the URL cannot be parsed.
    }
  }

  return 'http';
}

/**
 * Returns true when auth cookies should use the Secure flag (HTTPS only).
 */
export function shouldUseSecureCookies(protocol: string): boolean {
  return protocol.replace(':', '').toLowerCase() === 'https';
}
