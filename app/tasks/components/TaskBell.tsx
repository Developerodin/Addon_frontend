'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { taskService, type TaskNotificationItem } from '@/shared/services/taskService';
import { taskFocusRing } from '../taskChrome';

interface TaskBellProps {
  screen: 'manager' | 'my';
  onOpen: (taskId: string) => void;
}

/**
 * Bell for one task screen. Polls every 30 seconds and opens the task when a note is chosen.
 */
const TaskBell: React.FC<TaskBellProps> = ({ screen, onOpen }) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<TaskNotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await taskService.listNotifications(screen);
      setNotes(res.results);
      setUnread(res.unreadCount);
    } catch (error) {
      console.error('Failed to load task notifications:', error);
    }
  }, [screen]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = async (note: TaskNotificationItem) => {
    try {
      if (!note.readAt) await taskService.markNotificationsRead({ id: note.id });
      setOpen(false);
      await load();
      onOpen(note.task);
    } catch (error) {
      console.error('Failed to open task notification:', error);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--tk-line)] bg-[var(--tk-surface)] text-[var(--tk-ink)] transition-colors hover:bg-[var(--tk-sunken)] ${taskFocusRing}`}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <i className="ri-notification-3-line text-lg" aria-hidden />
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 min-w-[1.25rem] rounded-full bg-[#DC2626] px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-[var(--tk-surface)]"
            aria-hidden
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Task notifications"
          className="absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[var(--tk-line)] bg-[var(--tk-surface)] shadow-[var(--tk-shadow-raised)]"
        >
          <p className="border-b border-[var(--tk-line)] px-4 py-3 text-sm font-semibold text-[var(--tk-ink)]">Notifications</p>
          {notes.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <i className="ri-notification-off-line text-2xl text-[var(--tk-ink-3)]" aria-hidden />
              <p className="mt-2 text-sm text-[var(--tk-ink-3)]">You’re all caught up.</p>
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto p-1">
              {notes.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() => choose(note)}
                    className={`flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--tk-sunken)] ${taskFocusRing}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.readAt ? 'bg-transparent' : 'bg-[var(--tk-accent)]'}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm text-[var(--tk-ink)] ${note.readAt ? 'font-medium' : 'font-semibold'}`}>
                        {note.title}
                        {!note.readAt && <span className="sr-only"> (unread)</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--tk-ink-3)]">{note.message}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskBell;
