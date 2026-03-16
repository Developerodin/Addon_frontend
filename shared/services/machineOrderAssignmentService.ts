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
  assignmentId: string;
  userId?: string;
  userName?: string;
  action: string;
  changes?: Record<string, unknown>[];
  timestamp: string;
  createdAt?: string;
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

/** Payload for PATCH: only fields API accepts. Only items with valid Mongo ids for productionOrder and article. */
function sanitizeProductionOrderItemsForApi(
  items: ProductionOrderItem[]
): { productionOrder: string; article: string; status?: OrderStatusType; priority?: number }[] {
  return items
    .map((item) => {
      const po = String(item.productionOrder ?? '').trim();
      const art = String(item.article ?? '').trim();
      if (!po || !art) return null;
      if (!MONGO_ID_REGEX.test(po) || !MONGO_ID_REGEX.test(art)) return null;
      return {
        productionOrder: po,
        article: art,
        status: item.status,
        priority: item.priority,
      };
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
