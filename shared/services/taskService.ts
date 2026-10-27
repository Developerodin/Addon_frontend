import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import { FileUploadService, type UploadedFile } from '@/shared/services/fileUploadService';

export type TaskStatus = 'open' | 'in_progress' | 'follow_up' | 'hold' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TimelineType = 'created' | 'status_change' | 'comment' | 'attachment';

export interface TaskFile {
  url: string;
  key?: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export interface TaskUserRef {
  id: string;
  name: string;
  email?: string;
}

export interface TaskTimelineEntry {
  id?: string;
  type: TimelineType;
  message: string;
  actor?: TaskUserRef | string;
  at: string;
  fromStatus?: string;
  toStatus?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: TaskUserRef | string;
  assignedBy: TaskUserRef | string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string | null;
  images: TaskFile[];
  attachments: TaskFile[];
  timeline: TaskTimelineEntry[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskListResponse {
  results: TaskItem[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface TaskListQuery {
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  assignee?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  scope: 'manager' | 'my';
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  assignee: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  images?: TaskFile[];
  attachments?: TaskFile[];
}

export interface TaskNotificationItem {
  id: string;
  task: string;
  type: 'assigned' | 'completed' | 'status' | 'comment' | 'attachment';
  title: string;
  message: string;
  readAt?: string | null;
  createdAt?: string;
}

export interface TaskNotificationList {
  results: TaskNotificationItem[];
  unreadCount: number;
}

export interface TimelinePayload {
  comment?: string;
  images?: TaskFile[];
  attachments?: TaskFile[];
}

/**
 * Reads the access token the same way the user service does.
 */
function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const fromCookie = Cookies.get('accessToken');
    if (fromCookie) return fromCookie;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch (error) {
    console.error('Failed to read access token:', error);
    return null;
  }
}

/**
 * Pulls the API message out of an error body.
 */
async function readError(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { message?: string };
    if (body.message) return body.message;
  } catch (error) {
    console.error('Task API returned a non-JSON error:', error);
  }
  return text || `Request failed (${response.status})`;
}

/**
 * Maps an S3 upload result onto the file shape the task API stores.
 */
export function toTaskFile(file: UploadedFile): TaskFile {
  return {
    url: file.url,
    key: file.key,
    name: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
  };
}

/**
 * Uploads files one at a time through the shared upload endpoint.
 */
export async function uploadTaskFiles(files: File[]): Promise<TaskFile[]> {
  const uploaded: TaskFile[] = [];
  for (const file of files) {
    const result = await FileUploadService.uploadFile(file);
    uploaded.push(toTaskFile(result));
  }
  return uploaded;
}

class TaskService {
  private baseURL = `${API_BASE_URL}/tasks`;

  /**
   * Authenticated JSON request against /v1/tasks.
   */
  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) throw new Error(await readError(response));
    return response.json();
  }

  /**
   * Lists tasks visible to the current user.
   */
  async listTasks(params?: TaskListQuery): Promise<TaskListResponse> {
    const search = new URLSearchParams();
    if (!params) return this.request('/');
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.append(key, String(value));
    });
    const query = search.toString();
    return this.request(query ? `/?${query}` : '/');
  }

  /** Loads one task, including timeline and files. */
  async getTask(taskId: string): Promise<TaskItem> {
    return this.request(`/${taskId}`);
  }

  /** Admin creates a task for another user. */
  async createTask(payload: CreateTaskPayload): Promise<TaskItem> {
    return this.request('/', { method: 'POST', body: JSON.stringify(payload) });
  }

  /** Assignee updates status. Hold and Complete send a remark. */
  async updateTask(taskId: string, payload: { status: TaskStatus; remark?: string }): Promise<TaskItem> {
    return this.request(`/${taskId}`, { method: 'PATCH', body: JSON.stringify(payload) });
  }

  /** Adds a comment and/or newly uploaded files. */
  async addTimeline(taskId: string, payload: TimelinePayload): Promise<TaskItem> {
    return this.request(`/${taskId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Unread and recent notes for one screen bell. */
  async listNotifications(screen: 'manager' | 'my'): Promise<TaskNotificationList> {
    return this.request(`/notifications?screen=${screen}`);
  }

  /** Marks one note read, or every unread note on a screen. */
  async markNotificationsRead(payload: { id?: string; screen?: 'manager' | 'my'; all?: boolean }): Promise<TaskNotificationItem | TaskNotificationList> {
    return this.request('/notifications/read', { method: 'POST', body: JSON.stringify(payload) });
  }
}

export const taskService = new TaskService();
