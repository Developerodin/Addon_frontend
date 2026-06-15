import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

/** Vendor box document (vendor-management API). */
export interface VendorBox {
  id?: string;
  _id?: string;
  vpoNumber?: string;
  vendorPurchaseOrderId?:
    | string
    | { vpoNumber?: string; vendorName?: string; currentStatus?: string };
  boxId?: string;
  barcode?: string;
  lotNumber?: string;
  productId?: string | { name?: string; softwareCode?: string; internalCode?: string; vendorCode?: string };
  productName?: string;
  vendorPoItemId?: string;
  boxWeight?: number;
  grossWeight?: number;
  numberOfUnits?: number;
  orderQty?: number;
  receivedDate?: string;
  orderDate?: string;
  createdAt?: string;
  updatedAt?: string;
  secondaryCheckingAccepted?: boolean;
  secondaryCheckingAcceptedAt?: string;
  vendor?: string | { header?: { vendorName?: string; vendorCode?: string } };
}

export interface VendorBoxListResponse {
  results: VendorBox[];
  page?: number;
  limit?: number;
  totalPages?: number;
  totalResults?: number;
}

export interface VendorBoxListParams {
  vpoNumber?: string;
  vendorPurchaseOrderId?: string;
  vendor?: string;
  lotNumber?: string;
  storedStatus?: boolean | string;
  secondaryCheckingAccepted?: boolean | string;
  numberOfUnitsMin?: number;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  populate?: string;
}

export interface VendorBulkLotDetail {
  lotNumber: string;
  numberOfBoxes: number;
  productId?: string;
  vendorPoItemId?: string;
}

export interface VendorBulkCreateBoxesPayload {
  vpoNumber: string;
  lotDetails: VendorBulkLotDetail[];
}

export interface VendorBulkCreateBoxesResponse {
  createdCount?: number;
  boxes?: VendorBox[];
  skippedLots?: string[];
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const fromCookie = Cookies.get("accessToken");
    if (fromCookie) return fromCookie;
    for (const cookie of document.cookie.split(";")) {
      const [name, value] = cookie.trim().split("=");
      if (name === "accessToken") return decodeURIComponent(value);
    }
    return null;
  } catch {
    return null;
  }
}

function buildQuery(params: VendorBoxListParams): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("No access token found. Please login again.");
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

const baseUrl = `${API_BASE_URL}/vendor-management/boxes`;

export async function listVendorBoxes(params: VendorBoxListParams = {}): Promise<VendorBoxListResponse | VendorBox[]> {
  return requestJson<VendorBoxListResponse | VendorBox[]>(`${baseUrl}${buildQuery(params)}`, { method: "GET" });
}

export async function bulkCreateVendorBoxes(
  payload: VendorBulkCreateBoxesPayload
): Promise<VendorBulkCreateBoxesResponse> {
  return requestJson<VendorBulkCreateBoxesResponse>(`${baseUrl}/bulk`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type VendorBoxUpdatePayload = Partial<
  Pick<
    VendorBox,
    | "productName"
    | "lotNumber"
    | "barcode"
    | "grossWeight"
    | "boxWeight"
    | "numberOfUnits"
    | "vendorPoItemId"
    | "productId"
  >
>;

export async function updateVendorBox(
  vendorBoxId: string,
  payload: VendorBoxUpdatePayload
): Promise<VendorBox> {
  return requestJson<VendorBox>(`${baseUrl}/${encodeURIComponent(vendorBoxId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export interface ScanAcceptResponse {
  box: VendorBox;
  flow: Record<string, unknown> | null;
  acceptedUnits: number;
  vpoNumber?: string;
  productName?: string;
  isNewOrder?: boolean;
  isNewArticle?: boolean;
}

export interface BoxLookupResponse {
  box: VendorBox;
  alreadyAccepted: boolean;
  canAccept: boolean;
}

/**
 * Look up a vendor box by barcode (preview only — does not accept).
 * @param barcode - The box barcode or boxId
 */
export async function lookupVendorBoxForSecondaryChecking(
  barcode: string
): Promise<BoxLookupResponse> {
  const sp = new URLSearchParams({ barcode: barcode.trim() });
  return requestJson<BoxLookupResponse>(`${baseUrl}/lookup?${sp.toString()}`, {
    method: "GET",
  });
}

/**
 * Scan-accept a vendor box on the secondary checking floor.
 * @param barcode - The box barcode or boxId
 */
export async function scanAcceptVendorBox(
  barcode: string
): Promise<ScanAcceptResponse> {
  return requestJson<ScanAcceptResponse>(`${baseUrl}/scan-accept`, {
    method: "POST",
    body: JSON.stringify({ barcode }),
  });
}

const vendorBoxService = {
  list: listVendorBoxes,
  bulkCreate: bulkCreateVendorBoxes,
  update: updateVendorBox,
  lookupForSecondaryChecking: lookupVendorBoxForSecondaryChecking,
  scanAccept: scanAcceptVendorBox,
};

export default vendorBoxService;
