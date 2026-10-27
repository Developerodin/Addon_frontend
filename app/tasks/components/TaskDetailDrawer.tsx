'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  taskService,
  uploadTaskFiles,
  type TaskItem,
  type TaskStatus,
} from '@/shared/services/taskService';
import {
  formatTaskDate,
  isOverdue,
  personId,
  personInitials,
  personName,
  priorityLabel,
  PRIORITY_ICON,
  PRIORITY_PILL,
  STATUS_ICON,
  STATUS_TONE,
  statusLabel,
} from '../taskLabels';
import {
  taskDrawerScrim,
  taskFieldClass,
  taskFocusRing,
  taskIconButton,
  taskLabelClass,
  taskPrimaryButton,
  taskQuietButton,
  taskSecondaryButton,
  taskSectionTitle,
} from '../taskChrome';
import { useDialog } from '../useDialog';
import { FilePicker, SegmentedChoice } from './TaskFormParts';
import TaskTimeline from './TaskTimeline';

interface TaskDetailDrawerProps {
  taskId: string;
  onClose: () => void;
  onChanged: (task: TaskItem) => void;
}

const STATUS_CHOICES: TaskStatus[] = ['open', 'follow_up', 'hold', 'done'];

/** True below the `lg` breakpoint, where the drawer covers the board instead of sitting beside it. */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(max-width: 1023px)').matches
  );
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)');
    const apply = () => setNarrow(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return narrow;
}

/**
 * One task. Beside the board on wide screens, a modal drawer on narrow ones.
 * Only the assignee can change status, notes, and files.
 */
const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({ taskId, onClose, onChanged }) => {
  const narrow = useNarrow();
  const panelRef = useDialog<HTMLElement>({ modal: narrow, onEscape: onClose });
  const currentUserId = useSelector(
    (state: { auth?: { user?: { id?: string; _id?: string } } }) =>
      state.auth?.user?.id || state.auth?.user?._id || ''
  );
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState<'status' | 'note' | null>(null);
  const [statusDraft, setStatusDraft] = useState<TaskStatus>('open');
  const [remark, setRemark] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const next = await taskService.getTask(taskId);
        if (active) {
          setTask(next);
          setStatusDraft(next.status);
          setRemark('');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Couldn’t load this task.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [taskId]);

  const applyTask = (next: TaskItem) => {
    setTask(next);
    setStatusDraft(next.status);
    onChanged(next);
  };

  const canUpdate = Boolean(task && personId(task.assignee) === currentUserId);
  const statusChanged = Boolean(task && statusDraft !== task.status);
  const needsRemark = statusChanged && (statusDraft === 'hold' || statusDraft === 'done');
  const statusOptions = task && !STATUS_CHOICES.includes(task.status) ? [task.status, ...STATUS_CHOICES] : STATUS_CHOICES;
  const overdue = task ? isOverdue(task) : false;

  const saveStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task || !canUpdate || !statusChanged) return;
    if (needsRemark && !remark.trim()) {
      setError(`Add a remark to move this task to ${statusLabel(statusDraft)}.`);
      document.getElementById('task-remark')?.focus();
      return;
    }
    setSaving('status');
    setError('');
    try {
      applyTask(await taskService.updateTask(task.id, { status: statusDraft, remark: remark.trim() }));
      setRemark('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t update the status. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const handleTimeline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!task) return;
    if (!comment.trim() && images.length === 0 && files.length === 0) {
      setError('Write a note or attach a file first.');
      document.getElementById('task-comment')?.focus();
      return;
    }
    setSaving('note');
    setError('');
    try {
      const [uploadedImages, uploadedFiles] = await Promise.all([uploadTaskFiles(images), uploadTaskFiles(files)]);
      applyTask(
        await taskService.addTimeline(task.id, {
          comment: comment.trim(),
          images: uploadedImages,
          attachments: uploadedFiles,
        })
      );
      setComment('');
      setImages([]);
      setFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t add the note. Try again.');
    } finally {
      setSaving(null);
    }
  };

  const tone = task ? STATUS_TONE[task.status] : null;

  return (
    <>
      {narrow && <div className={taskDrawerScrim} onClick={onClose} aria-hidden />}
      <aside
        ref={panelRef}
        tabIndex={-1}
        className={
          narrow
            ? 'tk-layer tk-drawer-enter fixed inset-y-0 right-0 z-[95] flex w-full flex-col bg-[var(--tk-surface)] text-[var(--tk-ink)] shadow-[var(--tk-shadow-raised)] focus:outline-none sm:w-[min(520px,100vw)] sm:border-l sm:border-[var(--tk-line)]'
            : 'tk-drawer-enter sticky top-3 flex h-[calc(100vh-88px)] w-[400px] shrink-0 flex-col overflow-hidden rounded-2xl border border-[var(--tk-line)] bg-[var(--tk-surface)] text-[var(--tk-ink)] shadow-[var(--tk-shadow-raised)] focus:outline-none xl:w-[440px]'
        }
        role={narrow ? 'dialog' : 'complementary'}
        aria-modal={narrow || undefined}
        aria-labelledby="task-detail-title"
      >
        <header className="flex items-start gap-3 border-b border-[var(--tk-line)] px-4 py-3 sm:px-5">
          <div className="min-w-0 flex-1 pt-1">
            {task && tone && (
              <div className="mb-1.5 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${tone.surface} ${tone.ink}`}>
                  <i className={STATUS_ICON[task.status]} aria-hidden />
                  {statusLabel(task.status)}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${PRIORITY_PILL[task.priority]}`}>
                  <i className={PRIORITY_ICON[task.priority]} aria-hidden />
                  {priorityLabel(task.priority)} priority
                </span>
              </div>
            )}
            <h2 id="task-detail-title" className="break-words text-lg font-semibold leading-6 text-[var(--tk-ink)]">
              {loading ? 'Loading task…' : task?.title || 'Task'}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task" className={taskIconButton} data-autofocus>
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="space-y-3 px-5 py-5" role="status" aria-label="Loading task">
              {[80, 60, 90, 40].map((width) => (
                <div
                  key={width}
                  className="h-4 animate-pulse rounded bg-[var(--tk-sunken)] motion-reduce:animate-none"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          ) : !task ? (
            <div className="px-5 py-16 text-center">
              <i className="ri-error-warning-line text-3xl text-[var(--tk-danger)]" aria-hidden />
              <p className="mt-2 text-sm font-semibold text-[var(--tk-ink)]">This task couldn’t be opened</p>
              <p className="mt-1 text-sm text-[var(--tk-ink-3)]">{error || 'It may have been removed.'}</p>
              <button type="button" onClick={onClose} className={`${taskSecondaryButton} mt-4`}>Back to board</button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 px-4 py-5 sm:px-5">
              {error && (
                <p className="flex items-start gap-2 rounded-xl bg-[var(--tk-danger-soft)] px-3 py-2.5 text-sm text-[var(--tk-danger)]" role="alert">
                  <i className="ri-error-warning-line mt-0.5" aria-hidden />
                  {error}
                </p>
              )}

              <dl className="divide-y divide-[var(--tk-line)] rounded-xl border border-[var(--tk-line)] text-sm">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[var(--tk-ink-3)]">Assignee</dt>
                  <dd className="flex min-w-0 items-center gap-2 font-medium text-[var(--tk-ink)]">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tk-accent-soft)] text-[11px] font-semibold text-[var(--tk-accent-ink)]" aria-hidden>
                      {personInitials(task.assignee)}
                    </span>
                    <span className="truncate">{personName(task.assignee)}</span>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[var(--tk-ink-3)]">Assigned by</dt>
                  <dd className="truncate font-medium text-[var(--tk-ink)]">{personName(task.assignedBy)}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-[var(--tk-ink-3)]">Due</dt>
                  <dd className={`inline-flex items-center gap-1 font-medium ${overdue ? 'text-[var(--tk-danger)]' : 'text-[var(--tk-ink)]'}`}>
                    {overdue && <i className="ri-error-warning-line" aria-hidden />}
                    {overdue ? `Overdue · ${formatTaskDate(task.dueDate)}` : formatTaskDate(task.dueDate)}
                  </dd>
                </div>
              </dl>

              <section aria-labelledby="task-desc-heading">
                <h3 id="task-desc-heading" className={taskSectionTitle}>Description</h3>
                <p className={`mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 ${task.description ? 'text-[var(--tk-ink-2)]' : 'text-[var(--tk-ink-3)]'}`}>
                  {task.description || 'No description added.'}
                </p>
              </section>

              {(task.images?.length > 0 || task.attachments?.length > 0) && (
                <section aria-labelledby="task-files-heading" className="space-y-3">
                  <h3 id="task-files-heading" className={taskSectionTitle}>Attachments</h3>
                  {task.images?.length > 0 && (
                    <ul className="grid grid-cols-3 gap-2">
                      {task.images.map((image) => (
                        <li key={image.url}>
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`block overflow-hidden rounded-lg ring-1 ring-[var(--tk-line)] ${taskFocusRing}`}
                            aria-label={`Open image ${image.name} in a new tab`}
                          >
                            <img src={image.url} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                  {task.attachments?.length > 0 && (
                    <ul className="space-y-1">
                      {task.attachments.map((file) => (
                        <li key={file.url}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[var(--tk-accent-ink)] hover:bg-[var(--tk-sunken)] ${taskFocusRing}`}
                          >
                            <i className="ri-file-text-line text-base" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{file.name}</span>
                            <i className="ri-external-link-line text-[var(--tk-ink-3)]" aria-hidden />
                            <span className="sr-only">(opens in a new tab)</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {canUpdate ? (
                <>
                  <form onSubmit={saveStatus} className="space-y-3 rounded-2xl bg-[var(--tk-sunken)] p-3 sm:p-4">
                    <SegmentedChoice
                      label="Status"
                      name="task-status"
                      value={statusDraft}
                      disabled={saving !== null}
                      onChange={(next) => {
                        setStatusDraft(next);
                        if (error) setError('');
                      }}
                      options={statusOptions.map((status) => ({
                        value: status,
                        label: statusLabel(status),
                        icon: STATUS_ICON[status],
                        activeClass: `${STATUS_TONE[status].surface} ${STATUS_TONE[status].ink}`,
                      }))}
                    />
                    {needsRemark && (
                      <div>
                        <label className={taskLabelClass} htmlFor="task-remark">
                          Remark <span className="text-[var(--tk-ink-3)]">(required for {statusLabel(statusDraft)})</span>
                        </label>
                        <textarea
                          id="task-remark"
                          value={remark}
                          onChange={(event) => setRemark(event.target.value)}
                          rows={2}
                          placeholder={statusDraft === 'done' ? 'What was done?' : 'Why is this on hold?'}
                          className={taskFieldClass}
                        />
                      </div>
                    )}
                    {statusChanged && (
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setStatusDraft(task.status)} disabled={saving !== null} className={taskQuietButton}>
                          Cancel
                        </button>
                        <button type="submit" disabled={saving !== null} className={taskPrimaryButton}>
                          {saving === 'status' && <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />}
                          {saving === 'status' ? 'Saving…' : `Move to ${statusLabel(statusDraft)}`}
                        </button>
                      </div>
                    )}
                  </form>

                  <form onSubmit={handleTimeline} className="space-y-3 rounded-2xl bg-[var(--tk-sunken)] p-3 sm:p-4">
                    <div>
                      <label className={taskLabelClass} htmlFor="task-comment">Add a note</label>
                      <textarea
                        id="task-comment"
                        value={comment}
                        onChange={(event) => setComment(event.target.value)}
                        rows={3}
                        placeholder="Share progress or a question"
                        className={`${taskFieldClass} resize-y`}
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <FilePicker label="Images" icon="ri-image-line" accept="image/*" files={images} onChange={setImages} disabled={saving !== null} />
                      <FilePicker label="Files" icon="ri-file-line" files={files} onChange={setFiles} disabled={saving !== null} />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={saving !== null} className={statusChanged ? taskSecondaryButton : taskPrimaryButton}>
                        {saving === 'note' && <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />}
                        {saving === 'note' ? 'Posting…' : 'Post note'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <p className="flex items-start gap-2 rounded-xl bg-[var(--tk-sunken)] px-3 py-3 text-sm text-[var(--tk-ink-2)]">
                  <i className="ri-lock-line mt-0.5 text-[var(--tk-ink-3)]" aria-hidden />
                  Only {personName(task.assignee)} can change the status or add notes.
                </p>
              )}

              <section aria-labelledby="task-activity-heading" className="border-t border-[var(--tk-line)] pt-5">
                <h3 id="task-activity-heading" className={`${taskSectionTitle} mb-4`}>Activity</h3>
                <TaskTimeline entries={task.timeline || []} />
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default TaskDetailDrawer;
