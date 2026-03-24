import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export type VendorFloorKey =
  | "secondaryChecking"
  | "washing"
  | "boarding"
  | "branding"
  | "finalChecking"
  | "dispatch";

export type RepairStatus = "NOT_REQUIRED" | "REQUIRED" | "IN_PROGRESS" | "REPAIRED";

export interface ReceivedDataRow {
  receivedStatusFromPreviousFloor?: string;
  receivedInContainerId?: string;
  receivedTimestamp?: string;
  transferred?: number;
  styleCode?: string;
  brand?: string;
}

export interface TransferredDataRow {
  transferred: number;
  styleCode?: string;
  brand?: string;
}

export interface BaseFloorQuantity {
  received: number;
  completed: number;
  remaining: number;
  transferred: number;
  repairReceived?: number;
  receivedData?: ReceivedDataRow[];
}

/** Standard floors (e.g. boarding): full counters — no M1/M2/M4 */
export type StandardFloorPatchPayload = Pick<BaseFloorQuantity, "received" | "completed" | "transferred">;

/** Washing floor from vendor UI: PATCH only `completed` (received/transferred not sent from this screen) */
export type WashingFloorPatchPayload = { completed: number };

/** Boarding floor from vendor UI: PATCH only `completed` (received/transferred not sent from this screen) */
export type BoardingFloorPatchPayload = { completed: number };

/** Branding floor from vendor UI: PATCH only `completed` (transferred/style rows not sent from this screen) */
export type BrandingFloorPatchPayload = { completed: number };

export interface QualityFloorQuantity extends BaseFloorQuantity {
  m1Quantity: number;
  m2Quantity: number;
  m4Quantity: number;
  m1Transferred: number;
  m1Remaining: number;
  m2Transferred?: number;
  m2Remaining?: number;
  repairStatus: RepairStatus;
  repairRemarks?: string;
}

export interface BrandingFloorQuantity extends BaseFloorQuantity {
  transferredData?: TransferredDataRow[];
}

export interface FinalCheckingFloorQuantity extends QualityFloorQuantity {
  transferredData?: TransferredDataRow[];
}

export interface VendorProductionFlow {
  id: string;
  vendor: string | { id: string; _id?: string; header?: { vendorName?: string; vendorCode?: string } };
  vendorPurchaseOrder?: string | { id: string; _id?: string; vpoNumber?: string };
  product?: string | { id: string; _id?: string; name?: string; code?: string };
  referenceCode?: string;
  plannedQuantity: number;
  remarks?: string;
  currentFloorKey: VendorFloorKey;
  finalQualityConfirmed: boolean;
  startedAt?: string;
  completedAt?: string;
  floorQuantities: {
    secondaryChecking: QualityFloorQuantity;
    washing: BaseFloorQuantity;
    boarding: BaseFloorQuantity;
    branding: BrandingFloorQuantity;
    finalChecking: FinalCheckingFloorQuantity;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductionFlowPayload {
  vendor: string;
  vendorPurchaseOrder?: string;
  product?: string;
  plannedQuantity?: number;
  referenceCode?: string;
  remarks?: string;
}

export interface UpdateFloorPayload {
  [key: string]: any;
}

/** Destinations allowed by PATCH .../transfer when moving out of a checking floor */
export type VendorTransferToFloorKey = "washing" | "boarding" | "branding" | "finalChecking";

export interface TransferProductionFlowPayload {
  fromFloorKey: "secondaryChecking" | "finalChecking";
  toFloorKey: VendorTransferToFloorKey;
  quantity: number;
}

export type FinalCheckingM2TransferToFloorKey = "washing" | "boarding" | "branding";

export interface FinalCheckingM2TransferPayload {
  toFloorKey: FinalCheckingM2TransferToFloorKey;
  quantity: number;
}

export interface ConfirmFinalQualityPayload {
  remarks?: string;
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const token = Cookies.get("accessToken");
    if (token) return token;
    return null;
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

const baseUrl = `${API_BASE_URL}/vendor-management/production-flow`;

export const vendorProductionFlowService = {
  list: async (params: { vendor?: string; page?: number; limit?: number } = {}): Promise<{ results: VendorProductionFlow[]; totalResults: number }> => {
    const sp = new URLSearchParams();
    if (params.vendor) sp.set("vendor", params.vendor);
    if (params.page) sp.set("page", String(params.page));
    if (params.limit) sp.set("limit", String(params.limit));
    return requestJson(`${baseUrl}?${sp.toString()}`, { method: "GET" });
  },

  getById: async (id: string): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${id}`, { method: "GET" });
  },

  create: async (payload: CreateProductionFlowPayload): Promise<VendorProductionFlow> => {
    return requestJson(baseUrl, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateFloor: async (flowId: string, floorKey: VendorFloorKey, payload: UpdateFloorPayload): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${flowId}/floors/${floorKey}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Move quantity from a checking floor’s M1 pool (m1Quantity − m1Transferred) to the next floor.
   * Updates transferred / m1Transferred / remaining on source and received / remaining on destination; sets currentFloorKey.
   */
  transfer: async (flowId: string, payload: TransferProductionFlowPayload): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${flowId}/transfer`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Transfer M2 from final checking to a rework floor.
   * Backend updates finalChecking.m2Transferred/m2Remaining and target.repairReceived/remaining.
   */
  transferFinalCheckingM2: async (flowId: string, payload: FinalCheckingM2TransferPayload): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${flowId}/final-checking/m2-transfer`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  confirmFinalQuality: async (id: string, payload: ConfirmFinalQualityPayload = {}): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export default vendorProductionFlowService;
