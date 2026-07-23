import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export type VendorPoApiStatus =
  | "draft"
  | "submitted_to_vendor"
  | "in_transit"
  | "goods_partially_received"
  | "goods_received"
  | "qc_pending"
  | "po_rejected"
  | "po_accepted"
  | "po_accepted_partially";

export interface VendorPurchaseOrderItem {
  /** Line id from Mongo; JSON may expose `id` instead of `_id` (toJSON). */
  _id?: string;
  id?: string;
  productId: string | { id?: string; _id?: string; name?: string; factoryCode?: string; vendorCode?: string };
  productName?: string;
  /** Denormalized vendor article code when API stores it on the line; else use populated `productId.vendorCode`. */
  vendorCode?: string;
  quantity: number;
  /** Cumulative received qty for this line when returned by API. */
  receivedQuantity?: number;
  rate: number;
  gstRate?: number;
  estimatedDeliveryDate?: string;
  type?: string;
  color?: string;
  pattern?: string;
}

/** Matches vendor lot embeds (see vendorPurchaseOrder model / yarn-style receipt). */
export interface VendorReceivedLotPoItem {
  poItem: string;
  receivedQuantity: number;
  receivedBoxes?: number;
}

export type VendorLotStatus = "lot_pending" | "lot_qc_pending" | "lot_rejected" | "lot_accepted";

/** Embedded lot on VPO. PATCH payloads must not include yarn-only fields (`numberOfCones`) — backend rejects them. */
export interface VendorReceivedLotDetail {
  lotNumber: string;
  /** Yarn PO only; omit on vendor PATCH. */
  numberOfCones?: number;
  /** Total units (e.g. pcs) for this lot; aligns with `receivedLotSchema`. */
  totalUnits?: number;
  numberOfBoxes: number;
  poItems: VendorReceivedLotPoItem[];
  status?: VendorLotStatus;
}

/** Uploaded file metadata (same shape as yarn packlist). */
export interface VendorPackListFile {
  url: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
}

/** One packlist row when marking shipment in transit. */
export interface VendorPackListEntry {
  packingNumber?: string;
  courierName?: string;
  courierNumber?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  numberOfBoxes?: number;
  /** Total units for this shipment row; aligns with `packListSchema`. */
  totalUnits?: number;
  notes?: string;
  /** PO line item ids (_id) included in this shipment. */
  poItems?: string[];
  files?: VendorPackListFile[];
}

export interface VendorPurchaseOrder {
  id: string;
  vpoNumber: string;
  vendor: string | { id?: string; _id?: string; header?: { vendorName?: string; vendorCode?: string } };
  poItems: VendorPurchaseOrderItem[];
  subTotal: number;
  gst: number;
  total: number;
  notes?: string;
  goodsReceivedDate?: string;
  estimatedOrderDeliveryDate?: string;
  creditDays?: number;
  currentStatus: VendorPoApiStatus;
  packListDetails?: VendorPackListEntry[] | VendorPackListEntry;
  receivedLotDetails?: VendorReceivedLotDetail[];
  /** Optional audit trail from API (shape may vary). */
  statusLogs?: Array<Record<string, unknown>>;
  createdAt?: string;
  updatedAt?: string;
}

export interface VendorPoListResponse {
  results: VendorPurchaseOrder[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface VendorPoListParams {
  vendor?: string;
  vendorName?: string;
  vpoNumber?: string;
  currentStatus?: VendorPoApiStatus;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
  populate?: string;
}

export interface CreateVendorPoPayload {
  vendor: string;
  /** Required by backend model (denormalized snapshot). */
  vendorName: string;
  poItems: Array<{
    productId: string;
    productName?: string;
    quantity: number;
    rate: number;
    gstRate?: number;
    estimatedDeliveryDate?: string;
    type?: string;
    color?: string;
    pattern?: string;
  }>;
  subTotal: number;
  gst: number;
  total: number;
  notes?: string;
  estimatedOrderDeliveryDate?: string;
  creditDays?: number;
  currentStatus?: VendorPoApiStatus;
  year?: number;
}

export interface UpdateVendorPoPayload {
  vpoNumber?: string;
  vendor?: string;
  /** Send when creating/updating so backend validation passes if model requires it. */
  vendorName?: string;
  poItems?: Array<{
    _id?: string;
    productId: string;
    productName?: string;
    quantity: number;
    rate: number;
    gstRate?: number;
    estimatedDeliveryDate?: string;
    type?: string;
    color?: string;
    pattern?: string;
  }>;
  subTotal?: number;
  gst?: number;
  total?: number;
  notes?: string;
  goodsReceivedDate?: string;
  estimatedOrderDeliveryDate?: string;
  creditDays?: number;
  currentStatus?: VendorPoApiStatus;
  statusLogs?: Array<{
    statusCode?: VendorPoApiStatus;
    status?: VendorPoApiStatus;
    notes?: string;
    remarks?: string;
    updatedAt?: string;
    changedAt?: string;
    updatedBy?: { username?: string; user?: string };
    changedBy?: string;
  }>;
  packListDetails?: VendorPackListEntry[] | VendorPackListEntry;
  receivedLotDetails?: VendorReceivedLotDetail[];
}

function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const tokenFromJsCookie = Cookies.get("accessToken");
    if (tokenFromJsCookie) return tokenFromJsCookie;
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === "accessToken") return decodeURIComponent(value);
    }
    return null;
  } catch {
    return null;
  }
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("No access token found. Please login again.");
  }
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
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

function buildQuery(params: VendorPoListParams): string {
  const sp = new URLSearchParams();
  if (params.vendor) sp.set("vendor", params.vendor);
  if (params.vendorName) sp.set("vendorName", params.vendorName);
  if (params.vpoNumber) sp.set("vpoNumber", params.vpoNumber);
  if (params.currentStatus) sp.set("currentStatus", params.currentStatus);
  if (params.search) sp.set("search", params.search);
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.populate) sp.set("populate", params.populate);
  const query = sp.toString();
  return query ? `?${query}` : "";
}

const baseUrl = `${API_BASE_URL}/vendor-management/purchase-orders`;

export async function listVendorPurchaseOrders(params: VendorPoListParams = {}): Promise<VendorPoListResponse> {
  return requestJson<VendorPoListResponse>(`${baseUrl}${buildQuery(params)}`, { method: "GET" });
}

export async function getVendorPurchaseOrderById(
  vendorPurchaseOrderId: string,
  params?: { populate?: string }
): Promise<VendorPurchaseOrder> {
  const q = params?.populate ? `?populate=${encodeURIComponent(params.populate)}` : "";
  return requestJson<VendorPurchaseOrder>(`${baseUrl}/${encodeURIComponent(vendorPurchaseOrderId)}${q}`, {
    method: "GET",
  });
}

export async function getVendorPurchaseOrderByNumber(vpoNumber: string): Promise<VendorPurchaseOrder> {
  return requestJson<VendorPurchaseOrder>(`${baseUrl}/by-number/${encodeURIComponent(vpoNumber)}`, { method: "GET" });
}

export async function createVendorPurchaseOrder(payload: CreateVendorPoPayload): Promise<VendorPurchaseOrder> {
  return requestJson<VendorPurchaseOrder>(baseUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** PATCH schema allows only vendor lot fields — strips yarn-only keys (`numberOfCones`, etc.). */
function sanitizeReceivedLotDetailsForPatch(lots: VendorReceivedLotDetail[]): VendorReceivedLotDetail[] {
  return lots.map((lot) => ({
    lotNumber: lot.lotNumber,
    numberOfBoxes: lot.numberOfBoxes,
    poItems: (lot.poItems || []).map((p) => ({
      poItem: p.poItem,
      receivedQuantity: p.receivedQuantity,
      receivedBoxes: Math.max(0, Number(p.receivedBoxes || 0)),
    })),
    ...(lot.totalUnits != null && !Number.isNaN(Number(lot.totalUnits)) ? { totalUnits: Number(lot.totalUnits) } : {}),
    ...(lot.status != null ? { status: lot.status } : {}),
  }));
}

export async function updateVendorPurchaseOrder(
  vendorPurchaseOrderId: string,
  payload: UpdateVendorPoPayload
): Promise<VendorPurchaseOrder> {
  const body: UpdateVendorPoPayload = { ...payload };
  if (body.receivedLotDetails != null && body.receivedLotDetails.length > 0) {
    body.receivedLotDetails = sanitizeReceivedLotDetailsForPatch(body.receivedLotDetails);
  }
  return requestJson<VendorPurchaseOrder>(`${baseUrl}/${encodeURIComponent(vendorPurchaseOrderId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function deleteVendorPurchaseOrder(vendorPurchaseOrderId: string): Promise<void> {
  await requestJson<void>(`${baseUrl}/${encodeURIComponent(vendorPurchaseOrderId)}`, { method: "DELETE" });
}

const vendorPurchaseOrderService = {
  list: listVendorPurchaseOrders,
  getById: getVendorPurchaseOrderById,
  getByNumber: getVendorPurchaseOrderByNumber,
  create: createVendorPurchaseOrder,
  update: updateVendorPurchaseOrder,
  delete: deleteVendorPurchaseOrder,
};

export default vendorPurchaseOrderService;
