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
          itemId: item.id ?? item._id,
          productionOrder: item.productionOrder?.id ?? item.productionOrder?._id ?? item.productionOrder,
          article: item.article?.id ?? item.article?._id ?? item.article,
          status: item.status,
          priority: item.priority,
          orderNumber: item.productionOrder?.orderNumber ?? undefined,
          articleNumber: item.article?.articleNumber ?? undefined,
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
