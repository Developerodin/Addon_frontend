'use client';

import TasksScreen from '../components/TasksScreen';

/**
 * My Tasks: work assigned to the signed-in user.
 */
export default function MyTasksPage() {
  return <TasksScreen mode="my" />;
}
