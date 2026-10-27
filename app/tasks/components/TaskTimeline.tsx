import React from 'react';
import type { TaskStatus, TaskTimelineEntry } from '@/shared/services/taskService';
import { formatTaskDate, personName, statusLabel } from '../taskLabels';

/** Raw status codes the API writes into status-change messages. */
const STATUS_CODE = /\b(open|in_progress|follow_up|hold|done|cancelled)\b/g;

const TYPE_META: Record<TaskTimelineEntry['type'], { label: string; icon: string }> = {
  created: { label: 'Assigned', icon: 'ri-user-shared-line' },
  status_change: { label: 'Status', icon: 'ri-flag-line' },
  comment: { label: 'Note', icon: 'ri-chat-3-line' },
  attachment: { label: 'Files', icon: 'ri-attachment-2' },
};

interface TaskTimelineProps {
  entries: TaskTimelineEntry[];
}

/**
 * Chronological activity for one task, newest last.
 */
const TaskTimeline: React.FC<TaskTimelineProps> = ({ entries }) => {
  if (!entries.length) {
    return <p className="text-sm text-[var(--tk-ink-3)]">No activity yet.</p>;
  }

  return (
    <ol className="relative" aria-label="Task activity">
      {entries.map((entry, index) => {
        const meta = TYPE_META[entry.type] || { label: entry.type, icon: 'ri-record-circle-line' };
        const last = index === entries.length - 1;
        return (
          <li key={entry.id || `${entry.at}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-[var(--tk-line)]" aria-hidden />}
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tk-sunken)] text-[var(--tk-ink-2)] ring-1 ring-[var(--tk-line)]"
              aria-hidden
            >
              <i className={meta.icon} />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm text-[var(--tk-ink)]">
                <span className="font-semibold">{personName(entry.actor)}</span>
                <span className="text-[var(--tk-ink-3)]"> · {meta.label}</span>
              </p>
              {entry.message && (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-[var(--tk-ink-2)]">
                  {entry.type === 'status_change'
                    ? entry.message.replace(STATUS_CODE, (code) => statusLabel(code as TaskStatus))
                    : entry.message}
                </p>
              )}
              <p className="mt-1 text-xs text-[var(--tk-ink-3)]">
                <time dateTime={entry.at}>{formatTaskDate(entry.at, true)}</time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default TaskTimeline;
