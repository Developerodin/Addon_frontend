/**
 * Format milliseconds as a human-readable duration (e.g. "2d 4h 12m").
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function humanizeDuration(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) return '—';
  if (ms < 1000) return '<1s';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours % 24) parts.push(`${hours % 24}h`);
  if (minutes % 60 && days === 0) parts.push(`${minutes % 60}m`);
  if (!parts.length) parts.push(`${seconds % 60}s`);

  return parts.slice(0, 2).join(' ');
}

/**
 * Live duration since a timestamp.
 * @param enteredAt - ISO date string when current status began
 * @returns Milliseconds elapsed
 */
export function liveDurationMs(enteredAt?: string | null): number {
  if (!enteredAt) return 0;
  return Math.max(0, Date.now() - new Date(enteredAt).getTime());
}
