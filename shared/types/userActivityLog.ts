/** User activity log enums and types */

export const ACTIVITY_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'list',
  'login',
  'logout',
  'other',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface ActivityLogUser {
  id: string;
  name: string;
  email: string;
}

export interface ActivityLogEntry {
  id: string;
  userId: ActivityLogUser;
  method: HttpMethod;
  path: string;
  route: string;
  statusCode: number;
  action: ActivityAction;
  resource: string;
  resourceId: string | null;
  durationMs: number;
  ip: string;
  userAgent: string;
  requestMeta: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface ActivityLogsResponse {
  results: ActivityLogEntry[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ActivityStatsResponse {
  byAction: { _id: string; count: number }[];
  byResource: { _id: string; count: number }[];
  totals: {
    totalCalls: number;
    creates: number;
    updates: number;
    deletes: number;
    reads: number;
    lists: number;
    logins: number;
    errors: number;
  };
}

export const SORT_BY_OPTIONS = [
  'createdAt',
  'method',
  'path',
  'statusCode',
  'durationMs',
  'action',
  'resource',
] as const;
export type SortByOption = (typeof SORT_BY_OPTIONS)[number];

export const SORT_ORDER_OPTIONS = ['asc', 'desc'] as const;
export type SortOrderOption = (typeof SORT_ORDER_OPTIONS)[number];

export interface ActivityLogsQueryParams {
  page?: number;
  limit?: number;
  resource?: string;
  action?: ActivityAction | string;
  method?: HttpMethod | string;
  statusCode?: number;
  errorsOnly?: boolean;
  pathSearch?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: SortByOption | string;
  sortOrder?: SortOrderOption | string;
  /** Admin-only: filter by user when using getAllLogs */
  userId?: string;
}

export interface ActivityStatsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  resource?: string;
  action?: ActivityAction | string;
  method?: HttpMethod | string;
}
