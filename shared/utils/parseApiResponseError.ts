/**
 * Extract a user-facing message from a failed API JSON body.
 * @param body - Parsed response JSON (or empty object)
 * @param status - HTTP status code
 */
export function parseApiResponseError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const message = record.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
    if (Array.isArray(record.errors) && record.errors.length > 0) {
      return record.errors.map(String).join(" · ");
    }
  }
  return `Request failed (${status})`;
}
