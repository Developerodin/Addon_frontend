'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { userService, type User } from '@/shared/services/userService';
import { taskService, type TaskItem, type TaskPriority } from '@/shared/services/taskService';
import { taskPrimaryButton } from '../taskChrome';
import TaskBoard from './TaskBoard';
import TaskDetailDrawer from './TaskDetailDrawer';
import AssignTaskForm from './AssignTaskForm';
import TaskBell from './TaskBell';

interface TasksScreenProps {
  mode: 'manager' | 'my';
}

/**
 * Shared task list. Manager assigns and sees tasks they created. My Tasks shows work assigned to the caller.
 */
const TasksScreen: React.FC<TasksScreenProps> = ({ mode }) => {
  const { hasSubPermission, isLoading: navLoading } = useNavigation();
  const child = mode === 'manager' ? 'Task Manager' : 'My Tasks';
  const allowed = hasSubPermission('/tasks', child);
  const isManager = mode === 'manager';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState<'' | TaskPriority>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await taskService.listTasks({
        scope: mode,
        page,
        limit: 80,
        sortBy: 'createdAt:desc',
        ...(priority && { priority }),
        ...(search && { search }),
        ...(isManager && assigneeId && { assignee: assigneeId }),
      });
      setTasks(res.results);
      setTotalPages(res.totalPages);
      setTotalResults(res.totalResults);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [page, priority, search, assigneeId, isManager, mode]);

  useEffect(() => {
    if (navLoading || !allowed) return;
    loadTasks();
  }, [navLoading, allowed, loadTasks]);

  useEffect(() => {
    if (!isManager) return;
    userService
      .getUsers({ limit: 100, page: 1 })
      .then((res) => setUsers(res.results))
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to load users');
      });
  }, [isManager]);

  const handleChanged = (next: TaskItem) => {
    setTasks((current) => current.map((task) => (task.id === next.id ? next : task)));
  };

  if (!navLoading && !allowed) {
    return (
      <>
        <Seo title={child} />
        <div className="main-content tk-scope !bg-[var(--tk-canvas)] !p-3">
          <div className="rounded-2xl border border-[var(--tk-line)] bg-[var(--tk-surface)] px-6 py-12 text-center">
            <i className="ri-lock-line text-3xl text-[var(--tk-ink-3)]" aria-hidden />
            <p className="mt-2 text-sm font-semibold text-[var(--tk-ink)]">You don’t have access to {child}</p>
            <p className="mt-1 text-sm text-[var(--tk-ink-3)]">Ask an admin to turn it on for your account.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={child} />
      <div className="main-content tk-scope min-h-[calc(100vh-3.75rem)] !bg-[var(--tk-canvas)] !p-3 text-[var(--tk-ink)] sm:!p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--tk-ink)]">{child}</h1>
                <p className="mt-1 text-sm text-[var(--tk-ink-3)]">
                  {isManager ? 'Tasks you assigned' : 'Tasks assigned to you'}
                  {!loading && totalResults > 0 && <span className="tabular-nums"> · {totalResults}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <TaskBell screen={mode} onOpen={setOpenTaskId} />
                {isManager && (
                  <button type="button" onClick={() => setAssignOpen(true)} className={taskPrimaryButton}>
                    <i className="ri-add-line text-base" aria-hidden />
                    Assign task
                  </button>
                )}
              </div>
            </div>
            <TaskBoard
              tasks={tasks}
              loading={loading || navLoading}
              isManager={isManager}
              search={searchInput}
              priority={priority}
              assigneeId={assigneeId}
              users={users}
              selectedId={openTaskId}
              page={page}
              totalPages={totalPages}
              totalResults={totalResults}
              onSearch={(value) => {
                setSearchInput(value);
                setPage(1);
              }}
              onPriority={(next) => {
                setPriority(next);
                setPage(1);
              }}
              onAssignee={(userId) => {
                setAssigneeId(userId);
                setPage(1);
              }}
              onClearFilters={() => {
                setSearchInput('');
                setSearch('');
                setPriority('');
                setAssigneeId('');
                setPage(1);
              }}
              onPage={setPage}
              onOpen={setOpenTaskId}
            />
          </div>
          {openTaskId && (
            <TaskDetailDrawer
              taskId={openTaskId}
              onClose={() => setOpenTaskId(null)}
              onChanged={handleChanged}
            />
          )}
        </div>
      </div>
      {assignOpen && (
        <AssignTaskForm
          onClose={() => setAssignOpen(false)}
          onCreated={() => {
            setAssignOpen(false);
            toast.success('Task assigned');
            if (page === 1) {
              loadTasks();
            } else {
              setPage(1);
            }
          }}
        />
      )}
    </>
  );
};

export default TasksScreen;
