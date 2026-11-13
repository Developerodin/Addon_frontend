import type { SyncDecision } from '@/shared/services/syncReviewService';

export type DecisionOption = {
  value: SyncDecision;
  label: string;
  description: string;
};

/** Plain-language resolve options for the server the admin is logged into. */
export function getDecisionOptions(
  serverSiteId: string | null,
  factorySiteId: string | null,
  cloudSiteId: string | null
): DecisionOption[] {
  const thisSite = serverSiteId || 'this server';
  const otherSite =
    serverSiteId && factorySiteId === serverSiteId
      ? cloudSiteId || 'other site'
      : serverSiteId && cloudSiteId === serverSiteId
        ? factorySiteId || 'other site'
        : [factorySiteId, cloudSiteId].filter(Boolean).join(' / ') || 'other site';

  return [
    {
      value: 'KEEP_LOCAL',
      label: `Keep this server (${thisSite})`,
      description: 'Record that the value on the server you are using should win when data is applied later.',
    },
    {
      value: 'KEEP_REMOTE',
      label: `Keep the other site (${otherSite})`,
      description: 'Record that the other site’s value should win when data is applied later.',
    },
    {
      value: 'MANUAL',
      label: 'Mark for manual fix',
      description: 'No automatic winner. Someone will fix this by hand in the business system.',
    },
  ];
}

export function friendlyDecisionLabel(
  decision: SyncDecision | null | undefined,
  serverSiteId: string | null
): string {
  if (!decision) return '—';
  if (decision === 'MANUAL') return 'Manual fix';
  if (decision === 'KEEP_LOCAL') return `Kept this server${serverSiteId ? ` (${serverSiteId})` : ''}`;
  return 'Kept other site';
}

/** Display value for one payload key. */
export function formatConflictValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'base')
      .map(([key, item]) => `${key}: ${formatConflictValue(item)}`)
      .join(', ');
  }
  return JSON.stringify(value);
}

const TRUNCATE_LEN = 120;

export function truncateDisplay(full: string, max = TRUNCATE_LEN): { text: string; truncated: boolean } {
  if (full.length <= max) return { text: full, truncated: false };
  return { text: `${full.slice(0, max)}…`, truncated: true };
}
