import { format, isPast, isValid, parseISO, startOfDay } from 'date-fns';
import type { TaskItem, TaskPriority, TaskStatus, TaskUserRef } from '@/shared/services/taskService';

export const STATUS_FILTERS: { value: '' | TaskStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'follow_up', label: 'Follow up' },
  { value: 'hold', label: 'Hold' },
  { value: 'done', label: 'Complete' },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  follow_up: 'Follow up',
  hold: 'Hold',
  done: 'Complete',
  cancelled: 'Cancelled',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/** Background and ink for each status. Every place a status shows uses these, so one color means one status. */
export const STATUS_TONE: Record<TaskStatus, { surface: string; ink: string; dot: string }> = {
  open: { surface: 'bg-[var(--tk-open-bg)]', ink: 'text-[var(--tk-open-ink)]', dot: 'bg-[var(--tk-open-ink)]' },
  in_progress: { surface: 'bg-[var(--tk-open-bg)]', ink: 'text-[var(--tk-open-ink)]', dot: 'bg-[var(--tk-open-ink)]' },
  follow_up: { surface: 'bg-[var(--tk-follow-bg)]', ink: 'text-[var(--tk-follow-ink)]', dot: 'bg-[var(--tk-follow-ink)]' },
  hold: { surface: 'bg-[var(--tk-hold-bg)]', ink: 'text-[var(--tk-hold-ink)]', dot: 'bg-[var(--tk-hold-ink)]' },
  done: { surface: 'bg-[var(--tk-done-bg)]', ink: 'text-[var(--tk-done-ink)]', dot: 'bg-[var(--tk-done-ink)]' },
  cancelled: { surface: 'bg-[var(--tk-neutral-bg)]', ink: 'text-[var(--tk-neutral-ink)]', dot: 'bg-[var(--tk-neutral-ink)]' },
};

/** Icon shape per status so the column is not told apart by color alone. */
export const STATUS_ICON: Record<TaskStatus, string> = {
  open: 'ri-checkbox-blank-circle-line',
  in_progress: 'ri-loader-4-line',
  follow_up: 'ri-reply-line',
  hold: 'ri-pause-circle-line',
  done: 'ri-checkbox-circle-line',
  cancelled: 'ri-close-circle-line',
};

export const BOARD_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'open', label: 'Open' },
  { status: 'follow_up', label: 'Follow up' },
  { status: 'hold', label: 'Hold' },
  { status: 'done', label: 'Complete' },
];

export const PRIORITY_PILL: Record<TaskPriority, string> = {
  low: 'bg-[var(--tk-neutral-bg)] text-[var(--tk-neutral-ink)]',
  medium: 'bg-[var(--tk-med-bg)] text-[var(--tk-med-ink)]',
  high: 'bg-[var(--tk-high-bg)] text-[var(--tk-high-ink)]',
};

/** Arrow per priority: shape repeats what the pill color says. */
export const PRIORITY_ICON: Record<TaskPriority, string> = {
  low: 'ri-arrow-down-line',
  medium: 'ri-equal-line',
  high: 'ri-arrow-up-line',
};

/**
 * Display name for a populated user or a raw id.
 */
export function personName(user: TaskUserRef | string | undefined): string {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return 'User';
  return user.name || user.email || 'User';
}

/**
 * Id of a populated user or a raw id string.
 */
export function personId(user: TaskUserRef | string | undefined): string {
  if (!user) return '';
  if (typeof user === 'string') return user;
  return user.id || '';
}

/**
 * Two-letter mark for an assignee chip. Color is never the only signal.
 */
export function personInitials(user: TaskUserRef | string | undefined): string {
  const name = personName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '');
  return letters.toUpperCase() || '?';
}

/**
 * Human label for a task status.
 */
export function statusLabel(status: TaskStatus): string {
  return STATUS_LABELS[status] || status;
}

/**
 * Human label for a task priority.
 */
export function priorityLabel(priority: TaskPriority): string {
  return PRIORITY_LABELS[priority] || priority;
}

/**
 * Formats an ISO date for cards and the timeline. Returns a fallback when empty.
 */
export function formatTaskDate(value?: string | null, withTime = false): string {
  if (!value) return 'No due date';
  const date = parseISO(value);
  if (!isValid(date)) return 'No due date';
  return format(date, withTime ? 'dd MMM yyyy, HH:mm' : 'dd MMM yyyy');
}

/**
 * True when the due date is before today and the task is still active.
 */
export function isOverdue(task: Pick<TaskItem, 'dueDate' | 'status'>): boolean {
  if (!task.dueDate || task.status === 'done' || task.status === 'cancelled' || task.status === 'hold') return false;
  const date = parseISO(task.dueDate);
  if (!isValid(date)) return false;
  return isPast(startOfDay(date)) && startOfDay(date).getTime() < startOfDay(new Date()).getTime();
}
