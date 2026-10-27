import React from 'react';
import type { TaskItem } from '@/shared/services/taskService';
import {
  formatTaskDate,
  isOverdue,
  personInitials,
  personName,
  priorityLabel,
  PRIORITY_ICON,
  PRIORITY_PILL,
  statusLabel,
} from '../taskLabels';
import { taskFocusRing } from '../taskChrome';

interface TaskCardProps {
  task: TaskItem;
  selected: boolean;
  onOpen: (taskId: string) => void;
}

/**
 * One task on the board. Status lives in the column; the card names priority and the due date.
 */
const TaskCard: React.FC<TaskCardProps> = ({ task, selected, onOpen }) => {
  const overdue = isOverdue(task);

  return (
    <button
      type="button"
      onClick={() => onOpen(task.id)}
      aria-current={selected || undefined}
      className={`group w-full rounded-2xl border bg-[var(--tk-surface)] p-3.5 text-left shadow-[var(--tk-shadow)] transition-[border-color,box-shadow] hover:border-[var(--tk-line-strong)] active:shadow-none ${taskFocusRing} ${
        selected ? 'border-[var(--tk-accent)] ring-1 ring-[var(--tk-accent)]' : 'border-[var(--tk-line)]'
      }`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_PILL[task.priority]}`}>
          <i className={`${PRIORITY_ICON[task.priority]} text-[13px]`} aria-hidden />
          {priorityLabel(task.priority)}
          <span className="sr-only"> priority</span>
        </span>
        {((task.attachments?.length ?? 0) > 0 || (task.images?.length ?? 0) > 0) && (
          <span className="inline-flex items-center gap-0.5 text-xs text-[var(--tk-ink-3)]">
            <i className="ri-attachment-2" aria-hidden />
            <span className="tabular-nums">{(task.attachments?.length ?? 0) + (task.images?.length ?? 0)}</span>
            <span className="sr-only"> attachments</span>
          </span>
        )}
      </span>
      <span className="mt-2 line-clamp-3 block text-sm font-semibold leading-5 text-[var(--tk-ink)]">{task.title}</span>
      <span className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-2 text-[var(--tk-ink-2)]">
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tk-accent-soft)] text-[11px] font-semibold text-[var(--tk-accent-ink)]"
            aria-hidden
          >
            {personInitials(task.assignee)}
          </span>
          <span className="truncate">{personName(task.assignee)}</span>
        </span>
        <span
          className={`inline-flex shrink-0 items-center gap-1 font-medium ${
            overdue ? 'text-[var(--tk-danger)]' : 'text-[var(--tk-ink-3)]'
          }`}
        >
          <i className={overdue ? 'ri-error-warning-line' : 'ri-calendar-line'} aria-hidden />
          {overdue ? `Overdue · ${formatTaskDate(task.dueDate)}` : task.dueDate ? formatTaskDate(task.dueDate) : 'No date'}
        </span>
      </span>
      <span className="sr-only">, {statusLabel(task.status)}</span>
    </button>
  );
};

export default TaskCard;
