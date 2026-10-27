'use client';

import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { userService, type User } from '@/shared/services/userService';
import { taskService, uploadTaskFiles, type TaskPriority } from '@/shared/services/taskService';
import { useDialog } from '../useDialog';
import {
  taskDrawerPanel,
  taskDrawerScrim,
  taskFieldClass,
  taskHintClass,
  taskIconButton,
  taskLabelClass,
  taskPrimaryButton,
  taskQuietButton,
  taskSectionTitle,
} from '../taskChrome';
import { personInitials, PRIORITY_ICON, PRIORITY_PILL } from '../taskLabels';
import { FilePicker, SegmentedChoice } from './TaskFormParts';

interface AssignTaskFormProps {
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: string; activeClass: string }[] = [
  { value: 'low', label: 'Low', icon: PRIORITY_ICON.low, activeClass: PRIORITY_PILL.low },
  { value: 'medium', label: 'Medium', icon: PRIORITY_ICON.medium, activeClass: PRIORITY_PILL.medium },
  { value: 'high', label: 'High', icon: PRIORITY_ICON.high, activeClass: PRIORITY_PILL.high },
];

/**
 * Right-hand drawer used to assign a task to another user. Full screen on phones.
 */
const AssignTaskForm: React.FC<AssignTaskFormProps> = ({ onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState<User | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; assignee?: string }>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty = Boolean(
    title.trim() || description.trim() || dueDate || assignee || images.length || files.length || priority !== 'medium'
  );

  const requestClose = () => {
    if (saving) return;
    if (dirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    onClose();
  };

  const panelRef = useDialog<HTMLFormElement>({
    modal: true,
    onEscape: () => (confirmDiscard ? setConfirmDiscard(false) : requestClose()),
  });

  useEffect(() => {
    setUsersLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await userService.getUsers({ search: userQuery || undefined, limit: 20, page: 1 });
        setUsers(res.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Couldn’t load people. Check your connection and try again.');
      } finally {
        setUsersLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [userQuery]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: typeof fieldErrors = {};
    if (!title.trim()) nextErrors.title = 'Add a title so the assignee knows what to do.';
    if (!assignee) nextErrors.assignee = 'Choose who this task is for.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstId = nextErrors.title ? 'assign-title' : 'assignee-search';
      document.getElementById(firstId)?.focus();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const [uploadedImages, uploadedFiles] = await Promise.all([uploadTaskFiles(images), uploadTaskFiles(files)]);
      await taskService.createTask({
        title: title.trim(),
        description: description.trim(),
        assignee: assignee!.id,
        priority,
        dueDate: dueDate || null,
        images: uploadedImages,
        attachments: uploadedFiles,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t assign the task. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={taskDrawerScrim} onClick={requestClose} aria-hidden />
      <form
        ref={panelRef}
        tabIndex={-1}
        onSubmit={handleSubmit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-task-title"
        aria-describedby="assign-task-desc"
        className={taskDrawerPanel}
      >
        <header className="flex items-center gap-3 border-b border-[var(--tk-line)] px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id="assign-task-title" className="text-lg font-semibold text-[var(--tk-ink)]">Assign task</h2>
            <p id="assign-task-desc" className="text-[13px] text-[var(--tk-ink-3)]">
              The assignee is notified as soon as you assign it.
            </p>
          </div>
          <button type="button" onClick={requestClose} aria-label="Close" className={taskIconButton}>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {error && (
            <p className="flex items-start gap-2 rounded-xl bg-[var(--tk-danger-soft)] px-3 py-2.5 text-sm text-[var(--tk-danger)]" role="alert">
              <i className="ri-error-warning-line mt-0.5" aria-hidden />
              {error}
            </p>
          )}

          <section className="space-y-4" aria-labelledby="assign-section-details">
            <h3 id="assign-section-details" className={taskSectionTitle}>Details</h3>
            <div>
              <label className={taskLabelClass} htmlFor="assign-title">
                Title <span className="text-[var(--tk-ink-3)]">(required)</span>
              </label>
              <input
                id="assign-title"
                data-autofocus
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (fieldErrors.title) setFieldErrors((current) => ({ ...current, title: undefined }));
                }}
                maxLength={200}
                placeholder="e.g. Recount yarn stock in bay 3"
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={fieldErrors.title ? 'assign-title-error' : undefined}
                className={`${taskFieldClass} ${fieldErrors.title ? '!border-[var(--tk-danger)]' : ''}`}
              />
              {fieldErrors.title && (
                <p id="assign-title-error" className="mt-1 text-xs font-medium text-[var(--tk-danger)]">{fieldErrors.title}</p>
              )}
            </div>
            <div>
              <label className={taskLabelClass} htmlFor="assign-description">Description</label>
              <textarea
                id="assign-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                placeholder="Add the steps, context, or what done looks like"
                className={`${taskFieldClass} resize-y`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
              <SegmentedChoice
                label="Priority"
                name="assign-priority"
                value={priority}
                options={PRIORITY_OPTIONS}
                onChange={setPriority}
              />
              <div>
                <label className={taskLabelClass} htmlFor="assign-due">Due date</label>
                <input
                  id="assign-due"
                  type="date"
                  value={dueDate}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={`${taskFieldClass} min-h-10`}
                />
              </div>
            </div>
          </section>

          <section className="space-y-2" aria-labelledby="assign-section-person">
            <div className="flex items-center justify-between gap-2">
              <h3 id="assign-section-person" className={taskSectionTitle}>
                Assign to <span className="font-medium text-[var(--tk-ink-3)]">(required)</span>
              </h3>
            </div>
            {assignee && (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--tk-accent)] bg-[var(--tk-accent-soft)] px-3 py-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tk-accent)] text-xs font-semibold text-white" aria-hidden>
                  {personInitials({ id: assignee.id, name: assignee.name })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--tk-ink)]">{assignee.name}</span>
                  <span className="block truncate text-xs text-[var(--tk-ink-2)]">{assignee.email}</span>
                </span>
                <button type="button" onClick={() => setAssignee(null)} className={`${taskQuietButton} min-h-9 px-3 text-[13px]`}>
                  Change
                </button>
              </div>
            )}
            {!assignee && (
              <>
                <div className="relative">
                  <label className="sr-only" htmlFor="assignee-search">Search people</label>
                  <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tk-ink-3)]" aria-hidden />
                  <input
                    id="assignee-search"
                    type="search"
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Search by name or email"
                    aria-invalid={Boolean(fieldErrors.assignee)}
                    aria-describedby={fieldErrors.assignee ? 'assignee-error' : undefined}
                    aria-controls="assignee-list"
                    className={`${taskFieldClass} mt-0 pl-9 ${fieldErrors.assignee ? '!border-[var(--tk-danger)]' : ''}`}
                  />
                </div>
                {fieldErrors.assignee && (
                  <p id="assignee-error" className="text-xs font-medium text-[var(--tk-danger)]">{fieldErrors.assignee}</p>
                )}
                <ul
                  id="assignee-list"
                  className="max-h-72 overflow-y-auto rounded-xl border border-[var(--tk-line)] bg-[var(--tk-surface)] p-1"
                  aria-label="People"
                  aria-busy={usersLoading}
                >
                  {usersLoading && users.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-[var(--tk-ink-3)]">Loading people…</li>
                  ) : users.length === 0 ? (
                    <li className="px-3 py-3 text-sm text-[var(--tk-ink-3)]">
                      No one matches “{userQuery}”. Try another name or email.
                    </li>
                  ) : (
                    users.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignee(user);
                            setFieldErrors((current) => ({ ...current, assignee: undefined }));
                          }}
                          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--tk-ink)] hover:bg-[var(--tk-sunken)] focus-visible:bg-[var(--tk-sunken)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--tk-accent)]"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--tk-accent-soft)] text-xs font-semibold text-[var(--tk-accent-ink)]" aria-hidden>
                            {personInitials({ id: user.id, name: user.name })}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{user.name}</span>
                            <span className="block truncate text-xs text-[var(--tk-ink-3)]">{user.email}</span>
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </>
            )}
          </section>

          <section className="space-y-2" aria-labelledby="assign-section-files">
            <h3 id="assign-section-files" className={taskSectionTitle}>Attachments</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <FilePicker label="Add images" icon="ri-image-line" accept="image/*" files={images} onChange={setImages} disabled={saving} />
              <FilePicker label="Add files" icon="ri-file-line" files={files} onChange={setFiles} disabled={saving} />
            </div>
            <p className={taskHintClass}>Files upload when you assign the task.</p>
          </section>
        </div>

        <footer className="border-t border-[var(--tk-line)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          {confirmDiscard ? (
            <div className="flex flex-wrap items-center justify-between gap-2" role="alertdialog" aria-labelledby="assign-discard-text">
              <p id="assign-discard-text" className="text-sm font-medium text-[var(--tk-ink)]">Discard this task? Your changes won’t be saved.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDiscard(false)} className={taskQuietButton} autoFocus>
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--tk-danger-soft)] px-4 text-sm font-semibold text-[var(--tk-danger)] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tk-danger)]"
                >
                  Discard
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={requestClose} disabled={saving} className={taskQuietButton}>Cancel</button>
              <button type="submit" disabled={saving} className={taskPrimaryButton} aria-busy={saving}>
                {saving && <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />}
                {saving ? 'Assigning…' : 'Assign task'}
              </button>
            </div>
          )}
        </footer>
      </form>
    </>
  );
};

export default AssignTaskForm;
