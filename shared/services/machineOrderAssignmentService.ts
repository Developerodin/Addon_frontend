import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** Backend OrderStatus enum: Pending, In Progress, Completed, On Hold, Cancelled */
export const OrderStatus = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On Hold',
  CANCELLED: 'Cancelled',
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/** Yarn issue status for an assignment item (e.g. Not Started, In Progress, Completed) */
export type YarnIssueStatusType = 'Not Started' | 'In Progress' | 'Completed';

/** Yarn return status for an assignment item (Pending, In Progress, Completed) */
export type YarnReturnStatusType = 'Pending' | 'In Progress' | 'Completed';

export interface ProductionOrderItem {
  /** Subdocument _id from API – used for PATCH .../items batch update (priority) */
  itemId?: string;
  /** Mongo ID of production order – always send this, never orderNumber */
  productionOrder: string;
  /** Mongo ID of article – always send this, never articleNumber */
  article: string;
  status?: OrderStatusType;
  priority?: number;
  /** Display only – from populated API; never sent in PATCH */
  orderNumber?: string;
  /** Display only – from populated API; never sent in PATCH */
  articleNumber?: string;
  /** Yarn issue status – from API; updated via PATCH .../items/:itemId/yarn-issue-status */
  yarnIssueStatus?: YarnIssueStatusType | string;
  /** Yarn return status – from API; updated via PATCH .../items/:itemId/yarn-return-status */
  yarnReturnStatus?: YarnReturnStatusType | string;
}

export interface MachineOrderAssignment {
  id: string;
  machine: string | { id: string; machineCode?: string; name?: string };
  activeNeedle: string;
  productionOrderItems: ProductionOrderItem[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Populated refs as returned by GET /top-items */
export interface PopulatedOrderRef {
  _id?: string;
  id?: string;
  orderNumber?: string;
  orderNote?: string;
  currentFloor?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface PopulatedArticleRef {
  _id?: string;
  id?: string;
  articleNumber?: string;
  plannedQuantity?: number;
  linkingType?: string;
  priority?: string;
  status?: string;
  remarks?: string;
  [key: string]: unknown;
}

/** Item shape from top-items API (productionOrder and article populated) */
export interface ProductionOrderItemPopulated {
  itemId?: string;
  id?: string;
  productionOrder: string | PopulatedOrderRef;
  article: string | PopulatedArticleRef;
  orderNumber?: string;
  articleNumber?: string;
  status?: string;
  priority?: number;
  /** Yarn issue status: Pending, In Progress, Completed */
  yarnIssueStatus?: string;
}

/** Assignment shape from GET /top-items (items have populated order and article) */
export interface MachineOrderAssignmentTopItems {
  id: string;
  _id?: string;
  machine: string | { id?: string; _id?: string; machineCode?: string; name?: string };
  activeNeedle: string;
  productionOrderItems: ProductionOrderItemPopulated[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MachineOrderAssignmentLog {
  id?: string;
  assignmentId?: string;
  userId?: string;
  userName?: string;
  orderNumber?: string;
  articleNumber?: string;
  action: string;
  remarks?: string;
  changes?: Record<string, unknown>[];
  timestamp: string;
  createdAt?: string;
}

/** Query params for GET .../machines/:machineId/audit-logs */
export type MachineAuditLogChangeType =
  | 'all'
  | 'order_status'
  | 'yarn_issue'
  | 'yarn_return'
  | 'removal';

export interface MachineAuditLogsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  action?: string;
  changeType?: MachineAuditLogChangeType;
  orderStatus?: OrderStatusType;
  yarnIssueStatus?: string;
  yarnReturnStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface MachineAuditLogsResponse {
  machine: Record<string, unknown> | null;
  assignment: MachineOrderAssignment | null;
  assignmentId: string | null;
  logs: {
    results: MachineOrderAssignmentLog[];
    page: number;
    limit: number;
    totalPages: number;
    totalResults: number;
  };
  filtersApplied: Record<string, unknown>;
  message?: string;
}

export interface ListAssignmentsParams {
  page?: number;
  limit?: number;
  machine?: string;
  activeNeedle?: string;
  isActive?: boolean;
}

export interface PaginatedAssignments {
  results: MachineOrderAssignment[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateAssignmentBody {
  machine: string;
  activeNeedle: string;
  productionOrderItems: { productionOrder: string; article: string }[];
}

export interface UpdateAssignmentBody {
  activeNeedle?: string;
  productionOrderItems?: ProductionOrderItem[];
  isActive?: boolean;
}

function getAuthHeaders(): HeadersInit {
  const token =
    (typeof document !== 'undefined' ? Cookies.get('accessToken') : null) ||
    (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const BASE = `${API_BASE_URL}/production/machine-order-assignments`;

function normalizeAssignment(raw: any): MachineOrderAssignment {
  const machineId = typeof raw.machine === 'object' ? raw.machine?.id ?? raw.machine?._id : raw.machine;
  return {
    id: raw.id ?? raw._id,
    machine: raw.machine ?? machineId,
    activeNeedle: raw.activeNeedle ?? '',
    productionOrderItems: Array.isArray(raw.productionOrderItems)
      ? raw.productionOrderItems.map((item: any) => ({
          itemId: item.itemId ?? item.id ?? item._id,
          productionOrder: item.productionOrder?.id ?? item.productionOrder?._id ?? item.productionOrder,
          article: item.article?.id ?? item.article?._id ?? item.article,
          status: item.status,
          priority: item.priority,
          orderNumber: item.productionOrder?.orderNumber ?? undefined,
          articleNumber: item.article?.articleNumber ?? undefined,
          yarnIssueStatus: item.yarnIssueStatus,
          yarnReturnStatus: item.yarnReturnStatus,
        }))
      : [],
    isActive: raw.isActive !== false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/** Machine ID -> active needle string (for production order machine dropdown: filter + display) */
export async function getMachineActiveNeedleMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  let page = 1;
  const limit = 100;
  let hasMore = true;
  while (hasMore) {
    const data = await listMachineOrderAssignments({ page, limit, isActive: true });
    data.results.forEach((a) => {
      const mid =
        typeof a.machine === 'object' && a.machine
          ? (a.machine as { id?: string }).id ?? (a.machine as { _id?: string })._id
          : a.machine;
      const needle = (a.activeNeedle ?? '').trim();
      if (mid) map.set(String(mid), needle);
    });
    hasMore = page < data.totalPages;
    page += 1;
  }
  return map;
}

/** List machine order assignments with filters and pagination */
export async function listMachineOrderAssignments(
  params: ListAssignmentsParams = {}
): Promise<PaginatedAssignments> {
  const { page = 1, limit = 20, machine, activeNeedle, isActive } = params;
  const q = new URLSearchParams();
  q.set('page', String(page));
  q.set('limit', String(limit));
  if (machine) q.set('machine', machine);
  if (activeNeedle) q.set('activeNeedle', activeNeedle);
  if (isActive !== undefined) q.set('isActive', String(isActive));
  const res = await fetch(`${BASE}?${q.toString()}`, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch assignments');
  }
  const data = await res.json();
  const results = (data.results ?? data.data?.results ?? []).map(normalizeAssignment);
  return {
    results,
    page: data.page ?? page,
    limit: data.limit ?? limit,
    totalPages: data.totalPages ?? 1,
    totalResults: data.totalResults ?? results.length,
  };
}

/** GET /top-items – assignments with populated productionOrder and article (no pagination). Used for yarn-issue machine view. */
export async function getTopItemsAssignments(): Promise<MachineOrderAssignmentTopItems[]> {
  const res = await fetch(`${BASE}/top-items`, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch top-items assignments');
  }
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  return raw.map((row: any) => ({
    id: row.id ?? row._id,
    _id: row._id,
    machine: row.machine,
    activeNeedle: row.activeNeedle ?? '',
    productionOrderItems: Array.isArray(row.productionOrderItems)
      ? row.productionOrderItems.map((item: any) => ({
          itemId: item.id ?? item._id,
          productionOrder: item.productionOrder ?? item.productionOrderId,
          article: item.article ?? item.articleId,
          orderNumber: item.orderNumber ?? item.productionOrder?.orderNumber,
          articleNumber: item.articleNumber ?? item.article?.articleNumber,
          status: item.status,
          priority: item.priority,
          yarnIssueStatus: item.yarnIssueStatus,
        }))
      : [],
    isActive: row.isActive !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** One BOM yarn line for an order (outstanding = required − issued for that PO/article/yarn). */
export interface YarnIssuePendingSummaryLine {
  articleNumber: string;
  yarnName: string;
  requiredGrams: number;
  issuedGrams: number;
  outstandingGrams: number;
}

/** Aggregated outstanding requirement for one yarn catalog across pending queue lines. */
export interface YarnIssuePendingSummaryByYarn {
  yarnKey: string;
  yarnCatalogId: string | null;
  yarnName: string;
  yarnType: string | null;
  totalRequiredGrams: number;
  totalIssuedGrams: number;
  totalOutstandingGrams: number;
  /** Net weight in short-term (ST) racks from available cones, grams */
  shortTermNetGrams: number;
  shortTermConeCount: number;
}

/** Per-order breakdown of outstanding yarn lines. */
export interface YarnIssuePendingSummaryByOrder {
  orderId: string;
  orderNumber: string;
  lines: YarnIssuePendingSummaryLine[];
}

/** Response from GET .../yarn-issue-pending-summary */
export interface YarnIssuePendingSummary {
  generatedAt: string;
  pendingLineCount: number;
  byYarn: YarnIssuePendingSummaryByYarn[];
  byOrder: YarnIssuePendingSummaryByOrder[];
  skippedArticles: { orderNumber: string; articleNumber: string; reason: string }[];
}

/**
 * Outstanding yarn to issue: BOM requirement minus yarn_issued, for every machine-queue
 * (PO+article) row whose yarn issue status is not Completed (excludes Completed/On Hold PO rows).
 */
export async function getYarnIssuePendingSummary(): Promise<YarnIssuePendingSummary> {
  const res = await fetch(`${BASE}/yarn-issue-pending-summary`, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch yarn issue summary');
  }
  return res.json() as Promise<YarnIssuePendingSummary>;
}

/** One machine's pending knitting workload from active assignment queue. */
export interface MachinePendingQuantityResult {
  machineId: string;
  machineCode: string | null;
  activeNeedle: string | null;
  pendingQuantity: number;
  activeItemCount: number;
  generatedAt?: string;
}

/** Batch response for machine picker drawer. */
export interface MachinePendingQuantitiesResponse {
  generatedAt: string;
  results: MachinePendingQuantityResult[];
}

/**
 * Pending knitting quantity for one machine (active queue only).
 * GET .../machines/:machineId/pending-quantity
 */
export async function getMachinePendingQuantity(machineId: string): Promise<MachinePendingQuantityResult> {
  const res = await fetch(`${BASE}/machines/${encodeURIComponent(machineId)}/pending-quantity`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch machine pending quantity');
  }
  return res.json() as Promise<MachinePendingQuantityResult>;
}

/**
 * Pending knitting quantities for machines shown in the picker drawer.
 * GET .../machines/pending-quantities?machineIds=id1,id2
 */
export async function getMachinePendingQuantities(machineIds: string[]): Promise<MachinePendingQuantitiesResponse> {
  const ids = [...new Set(machineIds.map((id) => String(id).trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { generatedAt: new Date().toISOString(), results: [] };
  }
  const q = new URLSearchParams();
  q.set('machineIds', ids.join(','));
  const res = await fetch(`${BASE}/machines/pending-quantities?${q.toString()}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch machine pending quantities');
  }
  return res.json() as Promise<MachinePendingQuantitiesResponse>;
}

/** GET /completed-items – assignments with completed PO items (populated). Used for yarn-return machine view. */
export async function getCompletedItemsAssignments(): Promise<MachineOrderAssignmentTopItems[]> {
  const res = await fetch(`${BASE}/completed-items`, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch completed-items assignments');
  }
  const data = await res.json();
  const raw = Array.isArray(data) ? data : data.results ?? data.data ?? [];
  return raw.map((row: any) => ({
    id: row.id ?? row._id,
    _id: row._id,
    machine: row.machine,
    activeNeedle: row.activeNeedle ?? '',
    productionOrderItems: Array.isArray(row.productionOrderItems)
      ? row.productionOrderItems.map((item: any) => ({
          itemId: item.id ?? item._id,
          productionOrder: item.productionOrder ?? item.productionOrderId,
          article: item.article ?? item.articleId,
          orderNumber: item.orderNumber ?? item.productionOrder?.orderNumber,
          articleNumber: item.articleNumber ?? item.article?.articleNumber,
          status: item.status,
          priority: item.priority,
        }))
      : [],
    isActive: row.isActive !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** Get one assignment by id */
export async function getMachineOrderAssignment(id: string): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${id}`, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch assignment');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Get active assignment for a machine (first active one). Used to link new order items to needle config. */
export async function getAssignmentByMachineId(machineId: string): Promise<MachineOrderAssignment | null> {
  const data = await listMachineOrderAssignments({ machine: machineId, isActive: true, limit: 1, page: 1 });
  return data.results[0] ?? null;
}

/**
 * Append production order items to a machine assignment (updates needle config for that machine).
 * Uses previousAssignment.productionOrderItems when provided so we don't rely only on GET-by-id
 * (which may omit or truncate items); otherwise fetches assignment by id and merges.
 */
export async function addProductionOrderItemsToAssignment(
  assignmentId: string,
  newItems: ProductionOrderItem[],
  previousAssignment?: MachineOrderAssignment | null
): Promise<MachineOrderAssignment> {
  const existing =
    previousAssignment?.productionOrderItems?.length
      ? previousAssignment.productionOrderItems
      : (await getMachineOrderAssignment(assignmentId)).productionOrderItems ?? [];
  const sanitizedNew = sanitizeProductionOrderItemsForApi(
    newItems.map((item) => ({
      ...item,
      status: item.status ?? OrderStatus.PENDING,
    }))
  );
  const merged = [...existing, ...sanitizedNew];
  return updateMachineOrderAssignment(assignmentId, { productionOrderItems: merged });
}

/** Update queue priority for one (order, article) in the assignment for the given machine. Used from floor supervisor (e.g. knitting) edit modal. */
export async function updateProductionOrderItemPriority(
  machineId: string,
  orderId: string,
  articleId: string,
  priority: number
): Promise<void> {
  const assignment = await getAssignmentByMachineId(machineId);
  if (!assignment?.id) return;
  const items = assignment.productionOrderItems ?? [];
  const orderStr = String(orderId);
  const articleStr = String(articleId);
  const updated = items.map((item) => {
    const po = String(item.productionOrder ?? '');
    const art = String(item.article ?? '');
    if (po === orderStr && art === articleStr) {
      return { ...item, priority, status: item.status ?? OrderStatus.PENDING };
    }
    return item;
  });
  await updateMachineOrderAssignment(assignment.id, { productionOrderItems: updated });
}

/** Batch update item priorities. PATCH :assignmentId/items with { items: [{ itemId, priority }, ...] }. Returns updated assignment (populated). */
export async function updateAssignmentItemsPriorities(
  assignmentId: string,
  items: { itemId: string; priority: number }[]
): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${assignmentId}/items`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to update item priorities');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Update a single item's status. PATCH :assignmentId/items/:itemId/status with { status }. Returns updated assignment. */
export async function updateAssignmentItemStatus(
  assignmentId: string,
  itemId: string,
  status: OrderStatusType
): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${assignmentId}/items/${itemId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || (err as { error?: string }).error || res.statusText || 'Failed to update item status';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to update item status');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Update a single item's yarn issue status. PATCH :assignmentId/items/:itemId/yarn-issue-status with { yarnIssueStatus }. Returns updated assignment. */
export async function updateAssignmentItemYarnIssueStatus(
  assignmentId: string,
  itemId: string,
  yarnIssueStatus: YarnIssueStatusType | string
): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${assignmentId}/items/${itemId}/yarn-issue-status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ yarnIssueStatus }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || (err as { error?: string }).error || res.statusText || 'Failed to update yarn issue status';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to update yarn issue status');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Delete a single item from assignment. DELETE :assignmentId/items/:itemId. Returns updated assignment or refetches on 204. */
export async function deleteAssignmentItem(
  assignmentId: string,
  itemId: string
): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${assignmentId}/items/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || (err as { error?: string }).error || res.statusText || 'Failed to delete item';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to delete item');
  }
  if (res.status === 204) {
    return getMachineOrderAssignment(assignmentId);
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Update a single item's yarn return status. PATCH :assignmentId/items/:itemId/yarn-return-status with { yarnReturnStatus }. Returns updated assignment. */
export async function updateAssignmentItemYarnReturnStatus(
  assignmentId: string,
  itemId: string,
  yarnReturnStatus: YarnReturnStatusType | string
): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${assignmentId}/items/${itemId}/yarn-return-status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ yarnReturnStatus }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = (err as { message?: string }).message || (err as { error?: string }).error || res.statusText || 'Failed to update yarn return status';
    throw new Error(typeof msg === 'string' ? msg : 'Failed to update yarn return status');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Create assignment */
export async function createMachineOrderAssignment(
  body: CreateAssignmentBody
): Promise<MachineOrderAssignment> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to create assignment');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Mongo ObjectId is 24 hex chars. Short codes (e.g. ARTMLJSS8X0039) must not be sent as article. */
const MONGO_ID_REGEX = /^[a-fA-F0-9]{24}$/;

/** Payload for PATCH: only fields API accepts. Only items with valid Mongo ids for productionOrder and article.
 * Omit empty optional fields so merge leaves existing yarn/status untouched.
 * Priority is forwarded when explicitly set so machine moves can preserve queue position.
 */
function sanitizeProductionOrderItemsForApi(
  items: ProductionOrderItem[]
): {
  productionOrder: string;
  article: string;
  status?: OrderStatusType;
  yarnIssueStatus?: string;
  yarnReturnStatus?: string;
  priority?: number;
}[] {
  return items
    .map((item) => {
      const po = String(item.productionOrder ?? '').trim();
      const art = String(item.article ?? '').trim();
      if (!po || !art) return null;
      if (!MONGO_ID_REGEX.test(po) || !MONGO_ID_REGEX.test(art)) return null;
      const out: {
        productionOrder: string;
        article: string;
        status?: OrderStatusType;
        yarnIssueStatus?: string;
        yarnReturnStatus?: string;
        priority?: number;
      } = {
        productionOrder: po,
        article: art,
      };
      const st = item.status;
      if (st !== undefined && st !== null && String(st).trim() !== '') {
        out.status = st;
      }
      const yis = item.yarnIssueStatus;
      if (yis !== undefined && yis !== null && String(yis).trim() !== '') {
        out.yarnIssueStatus = String(yis);
      }
      const yrs = item.yarnReturnStatus;
      if (yrs !== undefined && yrs !== null && String(yrs).trim() !== '') {
        out.yarnReturnStatus = String(yrs);
      }
      if (typeof item.priority === 'number' && Number.isFinite(item.priority) && item.priority >= 1) {
        out.priority = Math.floor(item.priority);
      }
      return out;
    })
    .filter((x): x is NonNullable<typeof x> => x != null);
}

/** Update assignment (audit logged on backend) */
export async function updateMachineOrderAssignment(
  id: string,
  body: UpdateAssignmentBody
): Promise<MachineOrderAssignment> {
  const payload = { ...body };
  if (Array.isArray(payload.productionOrderItems)) {
    payload.productionOrderItems = sanitizeProductionOrderItemsForApi(payload.productionOrderItems);
  }
  const res = await fetch(`${BASE}/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to update assignment');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Delete assignment (audit logged on backend) */
export async function deleteMachineOrderAssignment(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to delete assignment');
  }
}

/** Reset assignment – POST :id/reset, no body */
export async function resetMachineOrderAssignment(id: string): Promise<MachineOrderAssignment> {
  const res = await fetch(`${BASE}/${id}/reset`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to reset assignment');
  }
  const data = await res.json();
  return normalizeAssignment(data.data ?? data);
}

/** Logs for a single assignment (dateFrom, dateTo optional) */
export async function getAssignmentLogs(
  assignmentId: string,
  params: { dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}
): Promise<{ results: MachineOrderAssignmentLog[]; totalResults?: number }> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  const url = `${BASE}/${assignmentId}/logs${query ? `?${query}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch logs');
  }
  const data = await res.json();
  const results = data.results ?? data.data?.results ?? [];
  return { results, totalResults: data.totalResults ?? data.total };
}

/** Logs by user (for assignment actions) */
export async function getUserAssignmentLogs(
  userId: string,
  params: { dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}
): Promise<{ results: MachineOrderAssignmentLog[] }> {
  const q = new URLSearchParams();
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  const query = q.toString();
  const url = `${BASE}/logs/user/${userId}${query ? `?${query}` : ''}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch user logs');
  }
  const data = await res.json();
  return { results: data.results ?? data.data?.results ?? [] };
}

function normalizeAuditLog(raw: any): MachineOrderAssignmentLog {
  const id = raw.id ?? raw._id;
  const parseObjectIdTime = (val: unknown): string | undefined => {
    if (typeof val !== 'string' || val.length < 8) return undefined;
    const hex = val.slice(0, 8);
    if (!/^[a-fA-F0-9]{8}$/.test(hex)) return undefined;
    const ms = Number.parseInt(hex, 16) * 1000;
    if (!Number.isFinite(ms)) return undefined;
    return new Date(ms).toISOString();
  };
  const u = raw.userId;
  let userIdStr: string | undefined;
  let userNameStr: string | undefined;
  if (typeof u === 'object' && u && u !== null) {
    userIdStr = String(u.id ?? u._id ?? '');
    userNameStr = (u.name ?? u.fullName ?? u.email ?? u.userName ?? '') as string | undefined;
  } else if (u != null && u !== '') {
    userIdStr = String(u);
  }
  return {
    id,
    assignmentId: raw.assignmentId,
    userId: userIdStr,
    userName: userNameStr ?? raw.userName,
    orderNumber:
      raw.orderNumber ?? raw.productionOrder?.orderNumber ?? raw.productionOrderItems?.[0]?.productionOrder?.orderNumber,
    articleNumber: raw.articleNumber ?? raw.article?.articleNumber ?? raw.productionOrderItems?.[0]?.article?.articleNumber,
    action: raw.action ?? '',
    remarks: raw.remarks,
    changes: raw.changes,
    timestamp: raw.timestamp ?? raw.createdAt ?? raw.updatedAt ?? parseObjectIdTime(id) ?? '',
    createdAt: raw.createdAt ?? raw.updatedAt ?? parseObjectIdTime(id),
  };
}

/** Machine-scoped audit logs (assignment + machine context). GET .../machines/:machineId/audit-logs */
export async function getMachineAuditLogsByMachineId(
  machineId: string,
  params: MachineAuditLogsQueryParams = {}
): Promise<MachineAuditLogsResponse> {
  const {
    dateFrom,
    dateTo,
    action,
    changeType,
    orderStatus,
    yarnIssueStatus,
    yarnReturnStatus,
    page = 1,
    limit = 10,
    sortBy = 'createdAt:desc',
  } = params;
  const q = new URLSearchParams();
  if (dateFrom) q.set('dateFrom', dateFrom);
  if (dateTo) q.set('dateTo', dateTo);
  if (action) q.set('action', action);
  if (changeType && changeType !== 'all') q.set('changeType', changeType);
  if (orderStatus) q.set('orderStatus', orderStatus);
  if (yarnIssueStatus) q.set('yarnIssueStatus', yarnIssueStatus);
  if (yarnReturnStatus) q.set('yarnReturnStatus', yarnReturnStatus);
  q.set('page', String(page));
  q.set('limit', String(Math.min(100, Math.max(1, limit))));
  if (sortBy) q.set('sortBy', sortBy);

  const url = `${BASE}/machines/${encodeURIComponent(machineId)}/audit-logs?${q.toString()}`;
  const res = await fetch(url, { method: 'GET', headers: getAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || 'Failed to fetch machine audit logs');
  }
  const data = await res.json();
  const payload = data.data ?? data;
  const logsBlock = payload.logs ?? {};
  const rawResults = logsBlock.results ?? [];
  const assignmentRaw = payload.assignment;
  return {
    machine: payload.machine ?? null,
    assignment: assignmentRaw
      ? normalizeAssignment(assignmentRaw)
      : null,
    assignmentId: payload.assignmentId ?? null,
    logs: {
      results: Array.isArray(rawResults) ? rawResults.map(normalizeAuditLog) : [],
      page: logsBlock.page ?? page,
      limit: logsBlock.limit ?? limit,
      totalPages: logsBlock.totalPages ?? 1,
      totalResults: logsBlock.totalResults ?? rawResults.length,
    },
    filtersApplied: payload.filtersApplied ?? {},
    message: typeof payload.message === 'string' ? payload.message : undefined,
  };
}
