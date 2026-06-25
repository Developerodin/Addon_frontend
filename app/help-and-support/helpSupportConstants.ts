import type { TicketDisposition, TicketPriority, TicketStatus } from '@/shared/types/helpSupport';

/** Display labels for ticket statuses */
export const STATUS_LABELS: Record<TicketStatus, string> = {
  raised: 'Raised',
  pending: 'Pending',
  in_progress: 'In Progress',
  in_review: 'In Review',
  on_hold: 'On Hold',
  awaiting_user: 'Awaiting User',
  resolved: 'Resolved',
  reopened: 'Reopened',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** Tailwind chip classes per status */
export const STATUS_COLORS: Record<TicketStatus, string> = {
  raised: 'bg-blue-100 text-blue-800',
  pending: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  in_review: 'bg-purple-100 text-purple-800',
  on_hold: 'bg-gray-100 text-gray-700',
  awaiting_user: 'bg-orange-100 text-orange-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  reopened: 'bg-rose-100 text-rose-800',
  closed: 'bg-slate-100 text-slate-700',
  cancelled: 'bg-red-100 text-red-800',
};

export const DISPOSITION_LABELS: Record<TicketDisposition, string> = {
  unset: 'Unset',
  user_set_path: 'User Set Path',
  completed: 'Completed',
  pending_discussion: 'Pending Discussion',
  needs_more_info: 'Needs More Info',
  duplicate: 'Duplicate',
  not_reproducible: 'Not Reproducible',
  wont_fix: "Won't Fix",
  deferred: 'Deferred',
  escalated: 'Escalated',
};

export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-sky-100 text-sky-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

/** Human labels for priority */
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

/**
 * Maps a MIME type to a Remix icon class for attachment display.
 * @param mimeType - File MIME type
 * @returns Remix icon class name
 */
export const attachmentIcon = (mimeType?: string): string => {
  const m = mimeType || '';
  if (m.startsWith('image/')) return 'ri-image-line';
  if (m.startsWith('video/')) return 'ri-video-line';
  if (m.startsWith('audio/')) return 'ri-music-2-line';
  if (m.includes('pdf')) return 'ri-file-pdf-2-line';
  if (m.includes('word') || m.includes('document')) return 'ri-file-word-2-line';
  if (m.includes('excel') || m.includes('spreadsheet') || m.includes('sheet')) return 'ri-file-excel-2-line';
  if (m.includes('presentation') || m.includes('powerpoint')) return 'ri-file-ppt-2-line';
  if (m.includes('zip') || m.includes('rar') || m.includes('7z') || m.includes('tar')) return 'ri-folder-zip-line';
  if (m.startsWith('text/')) return 'ri-file-text-line';
  return 'ri-file-line';
};

/** Human labels for category */
export const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  feature_request: 'New Feature Request',
  how_to: 'How To',
  data_issue: 'Data Issue',
  access: 'Access',
  other: 'Other',
};

/** Solid dot colors per status (for timelines / indicators) */
export const STATUS_DOT: Record<TicketStatus, string> = {
  raised: 'bg-blue-500',
  pending: 'bg-amber-500',
  in_progress: 'bg-indigo-500',
  in_review: 'bg-violet-500',
  on_hold: 'bg-gray-400',
  awaiting_user: 'bg-orange-500',
  resolved: 'bg-emerald-500',
  reopened: 'bg-rose-500',
  closed: 'bg-slate-500',
  cancelled: 'bg-red-500',
};

/** Solid dot color per priority */
export const PRIORITY_DOT: Record<TicketPriority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-sky-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

/**
 * Build up-to-two-letter initials from a populated user or string.
 * @param user - Populated user, id string, or null
 */
export function userInitials(user?: { name?: string; email?: string } | string | null): string {
  const label = userDisplayName(user);
  if (!label || label === '—') return '?';
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic avatar background classes keyed by a string */
const AVATAR_PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
];

/**
 * Pick a stable avatar color class from a seed string.
 * @param seed - Any identifying string (name/email/id)
 */
export function avatarColor(seed?: string): string {
  if (!seed) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[hash];
}

/** Super-admin email with full ticket management access */
export const HELP_SUPPORT_SUPER_EMAIL = 'admin@addon.in';

/** Roles that can manage all tickets and analytics */
export const AGENT_ROLES = new Set(['accounts', 'admin', 'super_admin']);

/** Roles that can delete tickets and assign anyone */
export const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/**
 * Normalize role string from auth (handles superadmin variants).
 * @param role - Raw role from user object
 */
export function normalizeHelpSupportRole(role?: string): string | undefined {
  if (!role) return undefined;
  const normalized = role.trim().toLowerCase().replace(/\s+/g, '_');
  if (normalized === 'superadmin') return 'super_admin';
  return normalized;
}

/**
 * Whether the current user is a help & support agent (all tickets, status, analytics).
 * @param role - User role from auth state
 * @param email - User email (admin@addon.in always gets agent access)
 */
export function isHelpSupportAgent(role?: string, email?: string): boolean {
  if (email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL) return true;
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && AGENT_ROLES.has(normalized));
}

/**
 * Whether the user may delete help & support tickets (admin@addon.in only).
 * @param email - User email from auth state
 */
export function canDeleteHelpSupportTickets(email?: string): boolean {
  return email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL;
}

/**
 * Whether the user has full admin ticket powers (delete, assign anyone).
 * @param role - User role from auth state
 * @param email - User email
 */
export function isHelpSupportAdmin(role?: string, email?: string): boolean {
  if (email?.trim().toLowerCase() === HELP_SUPPORT_SUPER_EMAIL) return true;
  const normalized = normalizeHelpSupportRole(role);
  return Boolean(normalized && ADMIN_ROLES.has(normalized));
}

/**
 * Resolve display name from populated user or id.
 * @param user - Populated user or string id
 */
export function userDisplayName(user?: { name?: string; email?: string } | string | null): string {
  if (!user) return '—';
  if (typeof user === 'string') return user;
  return user.name || user.email || '—';
}
