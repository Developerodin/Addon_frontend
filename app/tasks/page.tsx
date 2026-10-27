'use client';

import TasksScreen from './components/TasksScreen';

/**
 * Task Manager: tasks the signed-in user assigned.
 */
export default function TasksPage() {
  return <TasksScreen mode="manager" />;
}
