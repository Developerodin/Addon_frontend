import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  AnalyticsQueryParams,
  AnalyticsSummary,
  CreateTicketPayload,
  HelpSupportTicket,
  TicketsListResponse,
  TicketsQueryParams,
  TimeInStatusAnalytics,
  TicketAttachment,
  TicketComment,
  TicketDisposition,
  TicketStatus,
} from '@/shared/types/helpSupport';

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

/**
 * API client for Help & Support module.
 */
class HelpSupportService {
  private baseURL = `${API_BASE_URL}/help-support`;

  /**
   * Authenticated fetch wrapper.
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json();
  }

  private buildQuery(params?: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    if (!params) return '';
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') sp.append(key, String(value));
    });
    const q = sp.toString();
    return q ? `?${q}` : '';
  }

  /** List tickets with filters */
  async listTickets(params?: TicketsQueryParams): Promise<TicketsListResponse> {
    return this.request(`/tickets${this.buildQuery(params as Record<string, string | number | undefined>)}`);
  }

  /** Get single ticket */
  async getTicket(ticketId: string): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}`);
  }

  /** Create ticket */
  async createTicket(payload: CreateTicketPayload): Promise<HelpSupportTicket> {
    return this.request('/tickets', { method: 'POST', body: JSON.stringify(payload) });
  }

  /** Update ticket fields */
  async updateTicket(ticketId: string, payload: Partial<CreateTicketPayload>): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /** Change status */
  async updateStatus(ticketId: string, status: TicketStatus, note?: string): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  /** Set disposition */
  async updateDisposition(
    ticketId: string,
    disposition: TicketDisposition,
    note?: string
  ): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}/disposition`, {
      method: 'PATCH',
      body: JSON.stringify({ disposition, note }),
    });
  }

  /** Assign ticket */
  async assignTicket(ticketId: string, assignedTo: string): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTo }),
    });
  }

  /** Soft-delete a ticket (super admin only) */
  async deleteTicket(ticketId: string): Promise<void> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}`, { method: 'DELETE' });
  }

  /** Add comment */
  async addComment(
    ticketId: string,
    body: string,
    options?: { isInternal?: boolean; attachments?: TicketAttachment[] }
  ): Promise<HelpSupportTicket> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body,
        isInternal: options?.isInternal,
        ...(options?.attachments?.length ? { attachments: options.attachments } : {}),
      }),
    });
  }

  /** List comments */
  async listComments(ticketId: string): Promise<{ results: TicketComment[] }> {
    return this.request(`/tickets/${encodeURIComponent(ticketId)}/comments`);
  }

  /** Analytics summary */
  async getAnalyticsSummary(params?: AnalyticsQueryParams): Promise<AnalyticsSummary> {
    return this.request(
      `/analytics/summary${this.buildQuery(params as Record<string, string | number | undefined>)}`
    );
  }

  /** Time-in-status analytics */
  async getTimeInStatus(params?: AnalyticsQueryParams): Promise<TimeInStatusAnalytics> {
    return this.request(
      `/analytics/time-in-status${this.buildQuery(params as Record<string, string | number | undefined>)}`
    );
  }

  /** By status breakdown */
  async getByStatus(params?: AnalyticsQueryParams) {
    return this.request(`/analytics/by-status${this.buildQuery(params as Record<string, string | number | undefined>)}`);
  }

  /** By disposition breakdown */
  async getByDisposition(params?: AnalyticsQueryParams) {
    return this.request(
      `/analytics/by-disposition${this.buildQuery(params as Record<string, string | number | undefined>)}`
    );
  }

  /** Agent workload */
  async getAgentWorkload(params?: AnalyticsQueryParams) {
    return this.request(
      `/analytics/agent-workload${this.buildQuery(params as Record<string, string | number | undefined>)}`
    );
  }

  /** Trend data */
  async getTrend(params?: AnalyticsQueryParams) {
    return this.request(`/analytics/trend${this.buildQuery(params as Record<string, string | number | undefined>)}`);
  }
}

export const helpSupportService = new HelpSupportService();
