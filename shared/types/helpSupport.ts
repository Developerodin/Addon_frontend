export type TicketStatus =
  | 'raised'
  | 'pending'
  | 'in_progress'
  | 'in_review'
  | 'on_hold'
  | 'awaiting_user'
  | 'resolved'
  | 'reopened'
  | 'closed'
  | 'cancelled';

export type TicketDisposition =
  | 'unset'
  | 'user_set_path'
  | 'completed'
  | 'pending_discussion'
  | 'needs_more_info'
  | 'duplicate'
  | 'not_reproducible'
  | 'wont_fix'
  | 'deferred'
  | 'escalated';

export type TicketCategory = 'bug' | 'feature_request' | 'how_to' | 'data_issue' | 'access' | 'other';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketAttachment {
  fileName?: string;
  url?: string;
  key?: string;
  size?: number;
  mimeType?: string;
}

export interface TicketUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface StatusHistoryEntry {
  id?: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedBy?: TicketUser | string;
  note?: string;
  enteredAt: string;
  exitedAt?: string | null;
  durationMs?: number | null;
}

export interface TicketComment {
  id?: string;
  author?: TicketUser | string;
  body: string;
  attachments?: TicketAttachment[];
  isInternal?: boolean;
  createdAt?: string;
}

export interface HelpSupportTicket {
  id: string;
  ticketNumber: string;
  title: string;
  description?: string;
  pointsToBeCovered?: string[];
  category?: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  disposition: TicketDisposition;
  dispositionChangedAt?: string | null;
  raisedBy?: TicketUser | string;
  assignedTo?: TicketUser | string | null;
  attachments?: TicketAttachment[];
  tags?: string[];
  statusHistory?: StatusHistoryEntry[];
  comments?: TicketComment[];
  timeInStatus?: Record<string, number>;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  slaDueAt?: string | null;
  totalActiveTimeMs?: number;
  totalLifetimeMs?: number;
  timeToFirstResponseMs?: number | null;
  timeToResolutionMs?: number | null;
  currentStatusEnteredAt?: string | null;
  allowedNextStatuses?: TicketStatus[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketsListResponse {
  results: HelpSupportTicket[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface TicketsQueryParams {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  disposition?: TicketDisposition;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  raisedBy?: string;
  search?: string;
  sortBy?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  assignedTo?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  raisedBy?: string;
  bucket?: 'day' | 'week';
}

export interface AnalyticsSummary {
  range: { from: string | null; to: string | null };
  totalTickets: number;
  openCount: number;
  resolvedCount: number;
  closedCount: number;
  avgTimeToFirstResponseMs: number | null;
  avgTimeToResolutionMs: number | null;
  slaBreachCount: number;
  slaBreachRate: number;
}

export interface TimeInStatusAnalytics {
  range: { from: string | null; to: string | null };
  totalTickets: number;
  totalTimeMs: number;
  perStatus: Record<string, { totalMs: number; avgMs: number; tickets: number }>;
}

export interface CreateTicketPayload {
  title: string;
  description?: string;
  pointsToBeCovered?: string[];
  category?: TicketCategory;
  priority?: TicketPriority;
  attachments?: TicketAttachment[];
  tags?: string[];
}
