import React from 'react';
import type { TaskItem, TaskPriority, TaskStatus } from '@/shared/services/taskService';
import type { User } from '@/shared/services/userService';
import { BOARD_COLUMNS, STATUS_ICON, STATUS_TONE, statusLabel } from '../taskLabels';
import { taskFieldClass, taskQuietButton, taskSecondaryButton } from '../taskChrome';
import TaskCard from './TaskCard';

interface TaskBoardProps {
  tasks: TaskItem[];
  loading: boolean;
  isManager: boolean;
  search: string;
  priority: '' | TaskPriority;
  assigneeId: string;
  users: User[];
  selectedId: string | null;
  page: number;
  totalPages: number;
  totalResults: number;
  onSearch: (value: string) => void;
  onPriority: (priority: '' | TaskPriority) => void;
  onAssignee: (userId: string) => void;
  onClearFilters: () => void;
  onPage: (page: number) => void;
  onOpen: (taskId: string) => void;
}

const EXTRA_STATUSES: TaskStatus[] = ['in_progress', 'cancelled'];

const filterSelect = `${taskFieldClass} mt-0 min-w-0 flex-1 pr-8 sm:!w-auto sm:min-w-[9rem] sm:flex-none`;

/**
 * Kanban of the tasks already loaded. Columns name the status so color is not the only signal.
 */
const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  loading,
  isManager,
  search,
  priority,
  assigneeId,
  users,
  selectedId,
  page,
  totalPages,
  totalResults,
  onSearch,
  onPriority,
  onAssignee,
  onClearFilters,
  onPage,
  onOpen,
}) => {
  const extras = EXTRA_STATUSES.filter((status) => tasks.some((task) => task.status === status));
  const columns = [...BOARD_COLUMNS, ...extras.map((status) => ({ status, label: statusLabel(status) }))];
  const filtered = Boolean(search.trim() || priority || assigneeId);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="search" aria-label="Filter tasks">
        <label className="relative min-w-0 basis-full sm:min-w-[12rem] sm:flex-[1_1_16rem] sm:basis-auto">
          <span className="sr-only">Search tasks</span>
          <i className="ri-search-line pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tk-ink-3)]" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search tasks"
            className={`${taskFieldClass} mt-0 pl-9`}
          />
        </label>
        <label className="sr-only" htmlFor="task-priority-filter">Priority</label>
        <select
          id="task-priority-filter"
          value={priority}
          onChange={(event) => onPriority(event.target.value as '' | TaskPriority)}
          className={filterSelect}
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {isManager && (
          <>
            <label className="sr-only" htmlFor="task-assignee-filter">Assignee</label>
            <select
              id="task-assignee-filter"
              value={assigneeId}
              onChange={(event) => onAssignee(event.target.value)}
              className={`${filterSelect} sm:max-w-[14rem]`}
            >
              <option value="">Everyone</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </>
        )}
        {filtered && (
          <button type="button" onClick={onClearFilters} className={`${taskQuietButton} px-3`}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden" role="status" aria-label="Loading tasks">
          {BOARD_COLUMNS.map((column) => (
            <div key={column.status} className="flex min-w-[260px] flex-1 flex-col gap-2 rounded-2xl bg-[var(--tk-sunken)] p-2" aria-hidden>
              <div className="h-9 animate-pulse rounded-xl bg-[var(--tk-line)] motion-reduce:animate-none" />
              {[0, 1].map((key) => (
                <div key={key} className="h-[104px] animate-pulse rounded-2xl bg-[var(--tk-surface)] motion-reduce:animate-none" />
              ))}
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--tk-line-strong)] bg-[var(--tk-surface)] px-6 py-16 text-center">
          <i className={`${filtered ? 'ri-filter-off-line' : 'ri-task-line'} text-3xl text-[var(--tk-ink-3)]`} aria-hidden />
          <p className="mt-3 text-sm font-semibold text-[var(--tk-ink)]">
            {filtered ? 'No tasks match these filters' : 'No tasks yet'}
          </p>
          <p className="mt-1 text-sm text-[var(--tk-ink-3)]">
            {filtered
              ? 'Try a different search, or clear the filters to see every task.'
              : isManager
                ? 'Assign a task to put the first card on the board.'
                : 'Tasks assigned to you will show up here.'}
          </p>
          {filtered && (
            <button type="button" onClick={onClearFilters} className={`${taskSecondaryButton} mt-4`}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div
          className="relative -mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-3 sm:snap-none"
          role="list"
          aria-label="Task columns"
        >
          {columns.map((column) => {
            const columnTasks = tasks.filter((task) => task.status === column.status);
            const tone = STATUS_TONE[column.status];
            return (
              <section
                key={column.status}
                role="listitem"
                aria-labelledby={`task-col-${column.status}`}
                className="flex w-[82vw] max-w-[320px] shrink-0 snap-start flex-col rounded-2xl bg-[var(--tk-sunken)] p-2 sm:w-auto sm:min-w-[240px] sm:max-w-none sm:flex-1"
              >
                <header className={`mb-2 flex items-center justify-between rounded-xl px-3 py-2 ${tone.surface} ${tone.ink}`}>
                  <h2 id={`task-col-${column.status}`} className="flex items-center gap-1.5 text-sm font-semibold">
                    <i className={STATUS_ICON[column.status]} aria-hidden />
                    {column.label}
                  </h2>
                  <span className="text-sm font-semibold tabular-nums">
                    {columnTasks.length}
                    <span className="sr-only"> tasks</span>
                  </span>
                </header>
                <div className="flex flex-col gap-2">
                  {columnTasks.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-[var(--tk-line-strong)] px-2 py-6 text-center text-xs text-[var(--tk-ink-3)]">
                      No {column.label.toLowerCase()} tasks
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} selected={task.id === selectedId} onOpen={onOpen} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm text-[var(--tk-ink-3)]" aria-label="Task pages">
          <span className="tabular-nums">{totalResults} tasks</span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} className={`${taskQuietButton} px-3`}>
              <i className="ri-arrow-left-s-line" aria-hidden />
              Previous
            </button>
            <span className="px-2 tabular-nums" aria-current="page">
              Page {page} of {totalPages}
            </span>
            <button type="button" onClick={() => onPage(page + 1)} disabled={page >= totalPages} className={`${taskQuietButton} px-3`}>
              Next
              <i className="ri-arrow-right-s-line" aria-hidden />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default TaskBoard;
