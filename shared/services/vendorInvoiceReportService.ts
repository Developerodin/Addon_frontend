import { API_BASE_URL } from "@/shared/data/utilities/api";
import Cookies from "js-cookie";

export interface VendorInvoiceReportRow {
  vendorName: string;
  poNumber: string;
  poDate: string | null;
  invoiceNo: string;
  invDate: string | null;
  recdDt: string | null;
  invoiceValue: number;
  noOfBox: number | null;
  invoiceQty: number;
  stnQty: number;
  m1: number;
  m2: number;
  m3: number;
  vm4: number;
  m4: number;
  shortExc: number | null;
  pendingInward: number;
}

export interface VendorInvoiceReportParams {
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface VendorInvoiceReportResponse {
  results: VendorInvoiceReportRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/**
 * Read JWT from cookies for vendor-management API calls.
 * @returns Access token or null when missing.
 */
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
  } catch (error) {
    console.error("Error reading access token from cookies:", error);
    return null;
  }
}

/**
 * Fetch JSON with Bearer auth; throws on non-OK responses.
 * @param url Absolute API URL
 * @param options Fetch init
 */
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

/**
 * Build query string for the invoice report endpoint.
 * @param params List filters and pagination
 */
function buildQuery(params: VendorInvoiceReportParams): string {
  const sp = new URLSearchParams();
  if (params.search) sp.set("search", params.search);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  if (params.sortBy) sp.set("sortBy", params.sortBy);
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  const query = sp.toString();
  return query ? `?${query}` : "";
}

/**
 * GET /vendor-management/vendor-invoice-report — paginated lot/invoice rows.
 * @param params Search, PO date range, pagination
 */
export async function listVendorInvoiceReport(
  params: VendorInvoiceReportParams = {}
): Promise<VendorInvoiceReportResponse> {
  const url = `${API_BASE_URL}/vendor-management/vendor-invoice-report${buildQuery(params)}`;
  return requestJson<VendorInvoiceReportResponse>(url, { method: "GET" });
}
