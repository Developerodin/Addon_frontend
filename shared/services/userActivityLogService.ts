import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  ActivityLogsResponse,
  ActivityStatsResponse,
  ActivityLogsQueryParams,
  ActivityStatsQueryParams,
} from '@/shared/types/userActivityLog';

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const token = Cookies.get('accessToken');
    if (token) return token;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch {
    return null;
  }
};

class UserActivityLogService {
  private baseURL = `${API_BASE_URL}/user-activity-logs`;

  private async makeRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    return response.json();
  }

  private buildLogsParams(params?: ActivityLogsQueryParams): URLSearchParams {
    const sp = new URLSearchParams();
    if (params?.page) sp.append('page', String(params.page));
    if (params?.limit) sp.append('limit', String(params.limit));
    if (params?.resource) sp.append('resource', params.resource);
    if (params?.action) sp.append('action', params.action);
    if (params?.method) sp.append('method', params.method);
    if (params?.statusCode != null) sp.append('statusCode', String(params.statusCode));
    if (params?.errorsOnly === true) sp.append('errorsOnly', 'true');
    if (params?.pathSearch) sp.append('pathSearch', params.pathSearch);
    if (params?.dateFrom) sp.append('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.append('dateTo', params.dateTo);
    if (params?.sortBy) sp.append('sortBy', params.sortBy);
    if (params?.sortOrder) sp.append('sortOrder', params.sortOrder);
    if (params?.userId) sp.append('userId', params.userId);
    return sp;
  }

  /** Get own logs or admin logs for another user (GET /me or /:userId) */
  async getLogs(
    target: 'me' | string,
    params?: ActivityLogsQueryParams
  ): Promise<ActivityLogsResponse> {
    const sp = this.buildLogsParams(params);
    const query = sp.toString() ? `?${sp}` : '';
    const path = target === 'me' ? '/me' : `/${target}`;
    return this.makeRequest<ActivityLogsResponse>(`${this.baseURL}${path}${query}`);
  }

  /** Admin-only: Get all logs (GET /user-activity-logs) with optional userId filter */
  async getAllLogs(params?: ActivityLogsQueryParams): Promise<ActivityLogsResponse> {
    const sp = this.buildLogsParams(params);
    const query = sp.toString() ? `?${sp}` : '';
    return this.makeRequest<ActivityLogsResponse>(`${this.baseURL}${query}`);
  }

  /** Get own stats or admin stats for another user */
  async getStats(
    target: 'me' | string,
    params?: ActivityStatsQueryParams
  ): Promise<ActivityStatsResponse> {
    const sp = new URLSearchParams();
    if (params?.dateFrom) sp.append('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.append('dateTo', params.dateTo);
    if (params?.resource) sp.append('resource', params.resource);
    if (params?.action) sp.append('action', params.action);
    if (params?.method) sp.append('method', params.method);

    const query = sp.toString() ? `?${sp}` : '';
    const path = target === 'me' ? '/me/stats' : `/${target}/stats`;
    return this.makeRequest<ActivityStatsResponse>(`${this.baseURL}${path}${query}`);
  }
}

export const userActivityLogService = new UserActivityLogService();
