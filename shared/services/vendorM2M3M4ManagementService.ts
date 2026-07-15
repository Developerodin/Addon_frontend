import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";
import vendorProductionFlowService, {
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";
import type { TransferItem } from "@/shared/services/productionService";

export type VendorM2EntryStatus = "OPEN" | "PARTIAL" | "RESOLVED";
export type VendorM2LogType = "ENTRY" | "MERGE_TO_M1" | "TRANSFER_TO_M3" | "TRANSFER_TO_M4";
export type VendorM3LogType = "ENTRY" | "OUTWARD";
export type VendorM4LogType = "ENTRY" | "OUTWARD";

export type VendorM2SourceFloorKey = "secondaryChecking" | "finalChecking";

/** Human-readable labels for vendor QC floor keys. */
export const VENDOR_QC_FLOOR_LABELS: Record<VendorM2SourceFloorKey, string> = {
  secondaryChecking: "Secondary Checking",
  finalChecking: "Final Checking",
};

/**
 * Format a vendor QC floor key for display.
 * @param floor - Floor key or null
 */
export function formatVendorQcFloor(floor?: string | null): string {
  if (!floor) return "—";
  return VENDOR_QC_FLOOR_LABELS[floor as VendorM2SourceFloorKey] ?? floor;
}

export interface VendorM2EntryRow {
  id: string;
  entryId: string;
  type: VendorM2LogType;
  status?: VendorM2EntryStatus | null;
  originalQuantity?: number;
  remainingQuantity?: number;
  vendorProductionFlowId: string;
  referenceCode: string;
  productName?: string;
  productVendorCode?: string;
  vpoNumber: string;
  sourceFloor?: VendorM2SourceFloorKey | null;
  quantity: number;
  cascadeFloors?: string[];
  remarks?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  floorSupervisorId?: string;
  timestamp: string;
  canMergeToM1?: boolean;
  mergeBlockedReason?: string | null;
}

export interface VendorM2EntriesResponse {
  results: VendorM2EntryRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface VendorM2Statistics {
  openEntryCount: number;
  partialEntryCount: number;
  resolvedEntryCount: number;
  totalOpenQuantity: number;
}

export interface VendorM3Snapshot {
  byFloor: {
    secondaryChecking: number;
    finalChecking: number;
  };
  onHand: number;
  outwardTotal: number;
  availableForOutward: number;
}

export interface VendorM4Snapshot {
  byFloor: {
    finalChecking: number;
  };
  onHand: number;
  outwardTotal: number;
  availableForOutward: number;
}

export interface VendorM3FlowRow {
  id: string;
  _id?: string;
  vendorProductionFlowId: string;
  referenceCode: string;
  productName?: string;
  productVendorCode?: string;
  vpoNumber: string;
  vendor?: string | { id?: string; header?: { vendorName?: string } };
  vendorPurchaseOrder?: string | { id?: string; vpoNumber?: string };
  currentFloorKey?: string;
  m3Snapshot: VendorM3Snapshot;
}

export interface VendorM4FlowRow {
  id: string;
  _id?: string;
  vendorProductionFlowId: string;
  referenceCode: string;
  productName?: string;
  productVendorCode?: string;
  vpoNumber: string;
  vendor?: string | { id?: string; header?: { vendorName?: string } };
  vendorPurchaseOrder?: string | { id?: string; vpoNumber?: string };
  currentFloorKey?: string;
  m4Snapshot: VendorM4Snapshot;
}

export interface VendorM3FlowsResponse {
  results: VendorM3FlowRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface VendorM4FlowsResponse {
  results: VendorM4FlowRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface VendorM3LogEntry {
  id: string;
  type: VendorM3LogType;
  vendorProductionFlowId: string;
  referenceCode: string;
  vpoNumber: string;
  sourceFloor?: string | null;
  quantity: number;
  previousOnHand?: number;
  newOnHand?: number;
  previousOutwardTotal?: number;
  newOutwardTotal?: number;
  availableAfter?: number;
  remarks?: string;
  userId: string;
  userName?: string;
  floorSupervisorId?: string;
  timestamp: string;
}

export interface VendorM4LogEntry {
  id: string;
  type: VendorM4LogType;
  vendorProductionFlowId: string;
  referenceCode: string;
  vpoNumber: string;
  sourceFloor?: string | null;
  quantity: number;
  previousOnHand?: number;
  newOnHand?: number;
  previousOutwardTotal?: number;
  newOutwardTotal?: number;
  availableAfter?: number;
  remarks?: string;
  userId: string;
  userName?: string;
  floorSupervisorId?: string;
  timestamp: string;
}

export interface VendorM3Statistics {
  flowCount: number;
  totalOnHand: number;
  totalOutwarded: number;
  totalAvailable: number;
}

export interface VendorM4Statistics {
  flowCount: number;
  totalOnHand: number;
  totalOutwarded: number;
  totalAvailable: number;
}

export interface VendorM3FlowSummary extends VendorM3FlowRow {
  recentLogs: VendorM3LogEntry[];
}

export interface VendorM4FlowSummary extends VendorM4FlowRow {
  recentLogs: VendorM4LogEntry[];
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

type FlowWithTracking = VendorProductionFlow & {
  m3Tracking?: { outwardTotal?: number };
  m4Tracking?: { outwardTotal?: number };
};

/**
 * Compute M3 snapshot from a vendor production flow document.
 * `onHand` sums SC + FC for outward ledger only — display per-floor values separately.
 * @param flow - Vendor production flow
 */
export function computeVendorM3Snapshot(flow: FlowWithTracking): VendorM3Snapshot {
  const fq = flow.floorQuantities ?? ({} as VendorProductionFlow["floorQuantities"]);
  const byFloor = {
    secondaryChecking: fq.secondaryChecking?.m3Quantity ?? 0,
    finalChecking: fq.finalChecking?.m3Quantity ?? 0,
  };
  const onHand = byFloor.secondaryChecking + byFloor.finalChecking;
  const outwardTotal = flow.m3Tracking?.outwardTotal ?? 0;
  return {
    byFloor,
    onHand,
    outwardTotal,
    availableForOutward: Math.max(0, onHand - outwardTotal),
  };
}

/**
 * Compute M4 snapshot from a vendor production flow document.
 * @param flow - Vendor production flow
 */
export function computeVendorM4Snapshot(flow: FlowWithTracking): VendorM4Snapshot {
  const fq = flow.floorQuantities ?? ({} as VendorProductionFlow["floorQuantities"]);
  const byFloor = {
    finalChecking: fq.finalChecking?.m4Quantity ?? 0,
  };
  const onHand = byFloor.finalChecking;
  const outwardTotal = flow.m4Tracking?.outwardTotal ?? 0;
  return {
    byFloor,
    onHand,
    outwardTotal,
    availableForOutward: Math.max(0, onHand - outwardTotal),
  };
}

/**
 * Resolve VPO number from a flow row or populated purchase order ref.
 * @param flow - Flow document or list row
 */
function resolveVpoNumberFromFlow(flow: VendorProductionFlow | VendorM3FlowRow): string {
  if ("vpoNumber" in flow && flow.vpoNumber) return flow.vpoNumber;
  const po = flow.vendorPurchaseOrder;
  if (po && typeof po === "object" && "vpoNumber" in po && po.vpoNumber) {
    return po.vpoNumber;
  }
  return "";
}

/**
 * Normalize a flow list row from the M3/M4 flows API.
 * @param row - Raw API row
 */
function normalizeFlowRow<T extends VendorM3FlowRow | VendorM4FlowRow>(row: T): T {
  const id = String(row._id ?? row.id ?? row.vendorProductionFlowId);
  return {
    ...row,
    id,
    _id: id,
    vendorProductionFlowId: row.vendorProductionFlowId ?? id,
  };
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  try {
    return Cookies.get("accessToken") ?? null;
  } catch {
    return null;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error((errorBody as { message?: string })?.message || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function appendQueryParams(base: string, filters: Record<string, unknown>): string {
  const queryParams = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, String(value));
    }
  });
  const qs = queryParams.toString();
  return qs ? `${base}?${qs}` : base;
}

const baseUrl = `${API_BASE_URL}/vendor-management`;

export const vendorM2M3M4ManagementService = {
  async getM2Entries(
    filters: {
      vendorProductionFlowId?: string;
      sourceFloor?: VendorM2SourceFloorKey;
      status?: VendorM2EntryStatus;
      includeResolved?: boolean;
      search?: string;
      vpoNumber?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<VendorM2EntriesResponse> {
    const payload = {
      ...filters,
      includeResolved: filters.includeResolved ? "true" : undefined,
    };
    return requestJson(appendQueryParams(`${baseUrl}/m2/entries`, payload));
  },

  async getM2Logs(
    filters: {
      vendorProductionFlowId?: string;
      entryId?: string;
      type?: VendorM2LogType;
      sourceFloor?: VendorM2SourceFloorKey;
      vpoNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<PaginatedResponse<VendorM2EntryRow>> {
    return requestJson(appendQueryParams(`${baseUrl}/m2/logs`, filters));
  },

  async getM2Statistics(): Promise<VendorM2Statistics> {
    return requestJson(`${baseUrl}/m2/statistics`);
  },

  async mergeM2ToM1(
    entryId: string,
    body: { quantity: number; remarks: string; transferItems?: TransferItem[] }
  ): Promise<unknown> {
    return requestJson(`${baseUrl}/m2/entries/${entryId}/merge-to-m1`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async transferM2ToM3(entryId: string, body: { quantity: number; remarks: string }): Promise<unknown> {
    return requestJson(`${baseUrl}/m2/entries/${entryId}/transfer-to-m3`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async transferM2ToM4(entryId: string, body: { quantity: number; remarks: string }): Promise<unknown> {
    return requestJson(`${baseUrl}/m2/entries/${entryId}/transfer-to-m4`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getM3Flows(
    filters: {
      vendor?: string;
      vendorPurchaseOrder?: string;
      search?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<VendorM3FlowsResponse> {
    const res = await requestJson<VendorM3FlowsResponse>(appendQueryParams(`${baseUrl}/m3/flows`, filters));
    return { ...res, results: (res.results ?? []).map((row) => normalizeFlowRow(row)) };
  },

  async getM3Logs(
    filters: {
      vendorProductionFlowId?: string;
      type?: VendorM3LogType;
      sourceFloor?: VendorM2SourceFloorKey;
      vpoNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<PaginatedResponse<VendorM3LogEntry>> {
    return requestJson(appendQueryParams(`${baseUrl}/m3/logs`, filters));
  },

  async getM3Statistics(): Promise<VendorM3Statistics> {
    return requestJson(`${baseUrl}/m3/statistics`);
  },

  /**
   * Build flow summary from production flow + recent M3 ledger logs.
   * @param flowId - Vendor production flow id
   * @param logLimit - Max recent logs to include
   */
  async getM3FlowSummary(flowId: string, logLimit = 20): Promise<VendorM3FlowSummary> {
    const [flow, logsRes] = await Promise.all([
      vendorProductionFlowService.getById(flowId),
      this.getM3Logs({ vendorProductionFlowId: flowId, limit: logLimit, sortBy: "timestamp:desc" }),
    ]);
    const vpoNumber = resolveVpoNumberFromFlow(flow);
    const m3Snapshot = computeVendorM3Snapshot(flow as FlowWithTracking);
    return {
      id: flowId,
      _id: flowId,
      vendorProductionFlowId: flowId,
      referenceCode: flow.referenceCode ?? "",
      vpoNumber,
      vendor: flow.vendor,
      vendorPurchaseOrder: flow.vendorPurchaseOrder,
      currentFloorKey: flow.currentFloorKey,
      m3Snapshot,
      recentLogs: logsRes.results ?? [],
    };
  },

  async markM3Outward(
    flowId: string,
    body: { quantity: number; remarks: string }
  ): Promise<{ flow: VendorM3FlowRow; log: VendorM3LogEntry }> {
    return requestJson(`${baseUrl}/m3/flows/${flowId}/outward`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getM4Flows(
    filters: {
      vendor?: string;
      vendorPurchaseOrder?: string;
      search?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<VendorM4FlowsResponse> {
    const res = await requestJson<VendorM4FlowsResponse>(appendQueryParams(`${baseUrl}/m4/flows`, filters));
    return { ...res, results: (res.results ?? []).map((row) => normalizeFlowRow(row)) };
  },

  async getM4Logs(
    filters: {
      vendorProductionFlowId?: string;
      type?: VendorM4LogType;
      sourceFloor?: "finalChecking";
      vpoNumber?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      limit?: number;
      page?: number;
      sortBy?: string;
    } = {}
  ): Promise<PaginatedResponse<VendorM4LogEntry>> {
    return requestJson(appendQueryParams(`${baseUrl}/m4/logs`, filters));
  },

  async getM4Statistics(): Promise<VendorM4Statistics> {
    return requestJson(`${baseUrl}/m4/statistics`);
  },

  /**
   * Build flow summary from production flow + recent M4 ledger logs.
   * @param flowId - Vendor production flow id
   * @param logLimit - Max recent logs to include
   */
  async getM4FlowSummary(flowId: string, logLimit = 20): Promise<VendorM4FlowSummary> {
    const [flow, logsRes] = await Promise.all([
      vendorProductionFlowService.getById(flowId),
      this.getM4Logs({ vendorProductionFlowId: flowId, limit: logLimit, sortBy: "timestamp:desc" }),
    ]);
    const vpoNumber = resolveVpoNumberFromFlow(flow);
    const m4Snapshot = computeVendorM4Snapshot(flow as FlowWithTracking);
    return {
      id: flowId,
      _id: flowId,
      vendorProductionFlowId: flowId,
      referenceCode: flow.referenceCode ?? "",
      vpoNumber,
      vendor: flow.vendor,
      vendorPurchaseOrder: flow.vendorPurchaseOrder,
      currentFloorKey: flow.currentFloorKey,
      m4Snapshot,
      recentLogs: logsRes.results ?? [],
    };
  },

  async markM4Outward(
    flowId: string,
    body: { quantity: number; remarks: string }
  ): Promise<{ flow: VendorM4FlowRow; log: VendorM4LogEntry }> {
    return requestJson(`${baseUrl}/m4/flows/${flowId}/outward`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};

export default vendorM2M3M4ManagementService;
