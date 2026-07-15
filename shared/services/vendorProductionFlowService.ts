import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export type VendorFloorKey =
  | "secondaryChecking"
  | "branding"
  | "reBoarding"
  | "finalChecking"
  | "dispatch";

export type VendorBrandingType = "Heat Transfer" | "Embroidery";

export type RepairStatus = "NOT_REQUIRED" | "REQUIRED" | "IN_PROGRESS" | "REPAIRED";

export interface ReceivedDataRow {
  receivedStatusFromPreviousFloor?: string;
  receivedInContainerId?: string;
  receivedTimestamp?: string;
  transferred?: number;
  styleCode?: string;
  brand?: string;
  /** Heat Transfer (branding → FC) vs Embroidery (re-boarding → FC). */
  brandingType?: VendorBrandingType;
}

export interface TransferredDataRow {
  transferred: number;
  styleCode?: string;
  brand?: string;
  /** Per-line branding method on Branding floor — drives routing to Re-Boarding vs Final Checking. */
  brandingType?: VendorBrandingType;
}

export interface BaseFloorQuantity {
  received: number;
  completed: number;
  remaining: number;
  transferred: number;
  repairReceived?: number;
  receivedData?: ReceivedDataRow[];
}

/**
 * Branding floor: send `transferredData` as **delta** lines only (qty &gt; 0). Server merges
 * by trimmed styleCode + brand, recalculates completed/transferred/remaining; do not send
 * completed / transferred / remaining (or *Delta) when patching lines.
 * Optional `mode: "replace"` only if the backend still supports full-array replace.
 */
export type BrandingFloorPatchPayload =
  | {
      completed?: number;
      mode?: "replace";
      transferredData?: TransferredDataRow[];
      receivedData?: ReceivedDataRow[];
      /** Same PATCH as `autoTransferToNextFloor` when staging branding → final checking. */
      existingContainerBarcode?: string;
      autoTransferToNextFloor?: boolean;
    }
  | { mode: "increment"; completedDelta: number; autoTransferToNextFloor?: boolean };

export interface SecondaryCheckingFloorQuantity extends BaseFloorQuantity {
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  /** Vendor return / warranty qty — feeds PO Return, not M4 Management. */
  vm4Quantity: number;
  m1Transferred: number;
  m1Remaining: number;
  m2Transferred?: number;
  m2Remaining?: number;
  /** Quantity from boxes not yet scanned/accepted on this floor. */
  pendingFromBoxes?: number;
  repairStatus: RepairStatus;
  repairRemarks?: string;
}

/** @deprecated Use SecondaryCheckingFloorQuantity — kept for drawer compat */
export type QualityFloorQuantity = SecondaryCheckingFloorQuantity;

export interface FinalCheckingFloorQuantity extends BaseFloorQuantity {
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  m1Transferred: number;
  m1Remaining: number;
  m2Transferred?: number;
  m2Remaining?: number;
  repairStatus: RepairStatus;
  repairRemarks?: string;
  transferredData?: TransferredDataRow[];
}

export interface BrandingFloorQuantity extends BaseFloorQuantity {
  transferredData?: TransferredDataRow[];
}

export interface DispatchFloorQuantity extends BaseFloorQuantity {
  transferredData?: TransferredDataRow[];
}

export interface VendorProductionFlow {
  id: string;
  vendor: string | { id: string; _id?: string; header?: { vendorName?: string; vendorCode?: string } };
  vendorPurchaseOrder?: string | { id: string; _id?: string; vpoNumber?: string };
  product?: string | { id: string; _id?: string; name?: string; code?: string; vendorCode?: string };
  referenceCode?: string;
  plannedQuantity: number;
  remarks?: string;
  currentFloorKey: VendorFloorKey;
  /** Branding method; drives routing: Embroidery → branding → reBoarding → finalChecking, Heat Transfer → branding → finalChecking. */
  brandingType?: VendorBrandingType;
  finalQualityConfirmed: boolean;
  startedAt?: string;
  completedAt?: string;
  floorQuantities: {
    secondaryChecking: QualityFloorQuantity;
    branding: BrandingFloorQuantity;
    /** Re-Boarding floor (used by Embroidery articles); same shape as branding, always present on the doc. */
    reBoarding: BrandingFloorQuantity;
    finalChecking: FinalCheckingFloorQuantity;
    /** Present when API returns dispatch floor; increments on container accept at Dispatch. */
    dispatch?: DispatchFloorQuantity;
  };
  /** Populated on some `PATCH …/transfer` responses (e.g. dispatch → warehouse). */
  vendorTransferContainer?: { barcode?: string; _id?: string; id?: string };
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

export type VendorTransferFromFloorKey =
  | "secondaryChecking"
  | "branding"
  | "finalChecking"
  | "dispatch";
export type VendorTransferToFloorKey =
  | "branding"
  | "finalChecking"
  | "dispatch"
  | "warehouse";

export type VendorTransferItem = {
  transferred: number;
  styleCode?: string;
  brand?: string;
};

/**
 * PATCH `${baseUrl}/:vendorProductionFlowId/transfer`
 *
 * Doc contract:
 * - required: fromFloorKey, toFloorKey, quantity
 * - secondary → branding & branding → finalChecking: send `existingContainerBarcode` (barcode or 24-char id)
 * - branding → finalChecking additionally requires `transferItems` (style-wise breakdown) whose sum = quantity
 * - finalChecking → dispatch: use `PATCH …/floors/finalChecking` with `transferredData` + `existingContainerBarcode`, then `POST …/containers-masters/barcode/:barcode/accept` — **do not** use this `transfer` call for that leg.
 * - dispatch → warehouse: `fromFloorKey` `dispatch`, `toFloorKey` `warehouse`, `existingContainerBarcode` required (Active container), optional `transferItems` (non-empty ⇒ sum of `transferred` must equal `quantity`).
 * - response may include `vendorTransferContainer` for scanning on destination
 */
export interface TransferProductionFlowPayload {
  fromFloorKey: VendorTransferFromFloorKey;
  toFloorKey: VendorTransferToFloorKey;
  quantity: number;
  /** Reuse an existing `containers_masters` row (barcode or Mongo `_id`). Required for secondary→branding / branding→finalChecking / dispatch→warehouse. */
  existingContainerBarcode?: string;
  transferItems?: VendorTransferItem[];
}

export type FinalCheckingM2TransferToFloorKey = "branding";

export interface FinalCheckingM2TransferPayload {
  toFloorKey: FinalCheckingM2TransferToFloorKey;
  quantity: number;
  remarks?: string;
}

export interface ConfirmFinalQualityPayload {
  remarks?: string;
}

/**
 * Floor PATCH responses often return `vendor` / `vendorPurchaseOrder` / `product` as IDs only.
 * Merge with the previous in-memory flow so list UIs keep populated names until the next full list fetch.
 */
export function mergeProductionFlowPreservePopulatedRefs(
  prev: VendorProductionFlow,
  next: VendorProductionFlow
): VendorProductionFlow {
  return {
    ...next,
    vendor:
      typeof next.vendor === "string" && typeof prev.vendor === "object" && prev.vendor !== null
        ? prev.vendor
        : next.vendor,
    vendorPurchaseOrder:
      typeof next.vendorPurchaseOrder === "string" &&
      typeof prev.vendorPurchaseOrder === "object" &&
      prev.vendorPurchaseOrder !== null
        ? prev.vendorPurchaseOrder
        : next.vendorPurchaseOrder,
    product:
      typeof next.product === "string" && typeof prev.product === "object" && prev.product !== null
        ? prev.product
        : next.product,
  };
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
  list: async (
    params: {
      vendor?: string;
      vendorPurchaseOrder?: string;
      product?: string;
      currentFloorKey?: VendorFloorKey;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ results: VendorProductionFlow[]; totalResults: number }> => {
    const sp = new URLSearchParams();
    if (params.vendor) sp.set("vendor", params.vendor);
    if (params.vendorPurchaseOrder) sp.set("vendorPurchaseOrder", params.vendorPurchaseOrder);
    if (params.product) sp.set("product", params.product);
    if (params.currentFloorKey) sp.set("currentFloorKey", params.currentFloorKey);
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
   * Set the branding method (chosen on the Branding floor). Drives routing:
   * Embroidery → branding → reBoarding → finalChecking; Heat Transfer → branding → finalChecking.
   */
  updateBrandingType: async (
    flowId: string,
    brandingType: VendorBrandingType,
  ): Promise<VendorProductionFlow> => {
    return requestJson(`${baseUrl}/${flowId}/branding-type`, {
      method: "PATCH",
      body: JSON.stringify({ brandingType }),
    });
  },

  /**
   * Transfer quantity forward in the vendor pipeline.
   *
   * NOTE (container legs):
   * - Secondary → branding and branding → finalChecking stage a container.
   * - Dispatch → warehouse: stages into an existing Active container; warehouse completes with `POST …/containers-masters/barcode/:barcode/accept` (empty body).
   * - Destination `received` updates only after barcode accept on destination floor (where applicable).
   * - `currentFloorKey` stays on the sending floor until the container is accepted (where applicable).
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
