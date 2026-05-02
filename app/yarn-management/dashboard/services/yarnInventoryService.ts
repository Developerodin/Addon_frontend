import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;

  try {
    const tokenFromCookie = Cookies.get('accessToken');
    if (tokenFromCookie) {
      return tokenFromCookie;
    }

    const tokenFromStorage = localStorage.getItem('token');
    if (tokenFromStorage) {
      return tokenFromStorage;
    }

    return null;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

// API Response Types
export interface YarnCatalogInfo {
  _id: string;
  yarnName: string;
  yarnType: string;
  status: string;
}

export interface StorageInfo {
  totalWeight: number;
  netWeight: number;
  numberOfCones: number;
}

export interface UnallocatedStorageInfo {
  totalWeight: number;
  netWeight: number;
}

export interface YarnInventoryResponse {
  _id?: string;
  /** Present when API embeds catalog; list endpoints may omit. */
  yarn?: YarnCatalogInfo;
  yarnId: string;
  yarnName: string;
  longTermStorage: StorageInfo;
  shortTermStorage: StorageInfo;
  unallocatedStorage?: UnallocatedStorageInfo;
  blockedQty?: number;
  inventoryStatus: 'in_stock' | 'low_stock' | 'soon_to_be_low';
  overbooked: boolean;
}

export interface InventorySummaryResponse {
  totalLongTermKg: number;
  totalShortTermKg: number;
  totalKg: number;
  yarnWise: Array<{
    yarnName: string;
    yarnId: string;
    longTermKg: number;
    shortTermKg: number;
    totalKg: number;
    longTermCones: number;
    shortTermCones: number;
    inventoryStatus: string;
  }>;
}

export interface YarnInventoryListResponse {
  results: YarnInventoryResponse[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  summary?: InventorySummaryResponse;
}

export interface YarnInventoryQueryParams {
  yarn_id?: string;
  yarn_name?: string;
  inventory_status?: 'in_stock' | 'low_stock' | 'soon_to_be_low';
  overbooked?: boolean;
  sortBy?: string;
  limit?: number;
  page?: number;
}

/** Filters for GET /yarn-inventories/summary (no pagination). */
export type YarnInventorySummaryQueryParams = Pick<
  YarnInventoryQueryParams,
  'yarn_id' | 'yarn_name' | 'inventory_status' | 'overbooked'
>;

/** Response from GET /yarn-inventories/summary — all SKUs, no paging. */
export interface YarnInventoryGlobalSummaryResponse {
  skuCount: number;
  totals: {
    longTermKg: number;
    shortTermKg: number;
    ltPlusShortKg: number;
    unallocatedKg: number;
    blockedKg: number;
    grandNetKgAllBuckets: number;
  };
  cones: {
    shortTerm: number;
    blocked: number;
  };
}

export interface YarnRequisitionResponse {
  _id: string;
  yarnName: string;
  /** Embedded catalog when populated; otherwise use top-level yarnId. */
  yarn?: YarnCatalogInfo | string;
  yarnId?: string;
  minQty: number;
  availableQty: number;
  blockedQty: number;
  alertStatus: 'below_minimum' | 'overbooked' | null;
  poSent: boolean;
  created: string;
  lastUpdated: string;
}

export interface RequisitionAlertSummary {
  total: number;
  pendingDeliveries: number;
  alertCount: number;
  belowMinimumCount: number;
  overbookedCount: number;
}

export interface YarnRequisitionListResponse {
  results: YarnRequisitionResponse[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
  alertSummary: RequisitionAlertSummary;
}

export interface UpdateRequisitionStatusRequest {
  poSent: boolean;
}

function normalizePossibleId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const nested =
      obj._id ??
      obj.id ??
      obj.$oid ??
      obj.value ??
      obj.yarnId;
    return normalizePossibleId(nested);
  }
  return undefined;
}

/** Resolve yarn id whether API returns embedded `yarn`, a string id, or top-level `yarnId`. */
export function requisitionYarnId(req: YarnRequisitionResponse): string | undefined {
  const byYarn = normalizePossibleId(req.yarn);
  if (byYarn) return byYarn;
  return normalizePossibleId(req.yarnId);
}

/** Resolve inventory yarn id whether API returns top-level yarnId or embedded yarn object. */
export function inventoryYarnId(inv: YarnInventoryResponse): string | undefined {
  const byYarnId = normalizePossibleId(inv.yarnId);
  if (byYarnId) return byYarnId;
  return normalizePossibleId(inv.yarn);
}

/** Compares two yarn ids safely after normalizing API id shapes. */
export function sameYarnId(a?: string, b?: string): boolean {
  const left = normalizePossibleId(a);
  const right = normalizePossibleId(b);
  return !!left && !!right && left === right;
}

/** Yarn report row from GET /yarn-management/yarn-report */
export interface YarnReportRow {
  store: string;
  hsnCode: string;
  yarnName: string;
  brand: string;
  shadeNumber: string;
  yarnType: string;
  yarnSubtype: string;
  count: string;
  colorFamily: string;
  pantoneColorName: string;
  opening: number;
  pur: number;
  purRet: number;
  yarnIssueToKnitting: number;
  yarnReturnedFromKnitting: number;
  balance: number;
  rate: number;
  unit: string;
  gstPercent: number;
  amount: number;
}

/** Snapshot-level totals vs naive row-sum (opening/balance repeat per yarn when multiple shades/suppliers). */
export interface YarnReportMetaSummary {
  uniqueYarnOpeningKgSum: number;
  uniqueYarnClosingKgSum: number;
  snapshotOpeningYarnCatalogCount: number;
  snapshotClosingYarnCatalogCount: number;
  reportRowCount: number;
  sumDisplayedOpeningAcrossRowsKg: number;
  sumDisplayedBalanceAcrossRowsKg: number;
}

export interface YarnReportMeta {
  openingSnapshotDate: string;
  closingSnapshotDate: string;
  summary?: YarnReportMetaSummary;
  closingVariances?: {
    yarnName: string;
    snapshotClosingKg: number;
    formulaClosingKg: number;
    varianceKg: number;
  }[];
}

export interface YarnReportResponse {
  results: YarnReportRow[];
  startDate: string;
  endDate: string;
  meta?: YarnReportMeta;
}

/** GET /yarn-management/yarn-report/snapshot-bounds */
export interface YarnReportSnapshotBoundsResponse {
  earliestSnapshotDate: string | null;
  latestSnapshotDate: string | null;
  distinctSnapshotDates: number;
  totalSnapshotRows: number;
  widestValidReportRange: { start_date: string; end_date: string } | null;
  datePicker: {
    startMin: string | null;
    startMax: string | null;
    endMin: string | null;
    endMax: string | null;
  };
  yarnReportHelp: string;
}

class YarnInventoryService {
  private baseURL = `${API_BASE_URL}/yarn-management`;

  private buildHeaders(additional?: HeadersInit): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...additional,
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();

    if (!token) {
      throw new Error('No access token found. Please login again.');
    }

    const config: RequestInit = {
      ...options,
      headers: this.buildHeaders(options.headers),
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }

        throw new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error('Yarn Inventory API Error:', error);
      throw error;
    }
  }

  // Yarn Inventory APIs
  async getYarnInventories(
    params: YarnInventoryQueryParams = {}
  ): Promise<YarnInventoryListResponse> {
    const queryParams = new URLSearchParams();

    if (params.yarn_id) queryParams.append('yarn_id', params.yarn_id);
    if (params.yarn_name) queryParams.append('yarn_name', params.yarn_name);
    if (params.inventory_status)
      queryParams.append('inventory_status', params.inventory_status);
    if (params.overbooked !== undefined)
      queryParams.append('overbooked', params.overbooked.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.page) queryParams.append('page', params.page.toString());

    const queryString = queryParams.toString();
    const endpoint = `/yarn-inventories${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<YarnInventoryListResponse>(endpoint);
  }

  /** Global totals (same live aggregation as list; skips pagination use-cases like dashboards). */
  async getYarnInventoriesSummary(
    params: YarnInventorySummaryQueryParams = {}
  ): Promise<YarnInventoryGlobalSummaryResponse> {
    const queryParams = new URLSearchParams();
    if (params.yarn_id) queryParams.append('yarn_id', params.yarn_id);
    if (params.yarn_name) queryParams.append('yarn_name', params.yarn_name);
    if (params.inventory_status)
      queryParams.append('inventory_status', params.inventory_status);
    if (params.overbooked !== undefined)
      queryParams.append('overbooked', params.overbooked.toString());

    const q = queryParams.toString();
    return this.makeRequest<YarnInventoryGlobalSummaryResponse>(
      `/yarn-inventories/summary${q ? `?${q}` : ''}`
    );
  }

  /**
   * Fetches every inventory row. The API caps `limit` per request (e.g. 100), so we page until a short page.
   */
  async getAllYarnInventories(
    params: Omit<YarnInventoryQueryParams, 'limit' | 'page'> = {}
  ): Promise<YarnInventoryResponse[]> {
    const pageSize = 100;
    const maxPages = 1000;
    const aggregated: YarnInventoryResponse[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const res = await this.getYarnInventories({
        ...params,
        limit: pageSize,
        page,
      });
      aggregated.push(...res.results);
      if (res.results.length < pageSize) break;
    }

    return aggregated;
  }

  async getYarnInventoryById(
    inventoryId: string
  ): Promise<YarnInventoryResponse> {
    return this.makeRequest<YarnInventoryResponse>(
      `/yarn-inventories/${inventoryId}`
    );
  }

  async getYarnInventoryByYarnId(
    yarnId: string
  ): Promise<YarnInventoryResponse> {
    return this.makeRequest<YarnInventoryResponse>(
      `/yarn-inventories/yarn/${yarnId}`
    );
  }

  /**
   * Fetch paginated yarn requisitions with alert summary.
   * @param params - query filters including optional pagination
   */
  async getYarnRequisitions(params: {
    startDate: string;
    endDate: string;
    poSent?: boolean;
    alertStatus?: 'below_minimum' | 'overbooked' | 'has_alert';
    page?: number;
    limit?: number;
    skipRecalculation?: boolean;
  }): Promise<YarnRequisitionListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.poSent !== undefined)
      queryParams.append('poSent', params.poSent.toString());
    if (params.alertStatus)
      queryParams.append('alertStatus', params.alertStatus);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skipRecalculation)
      queryParams.append('skipRecalculation', 'true');

    return this.makeRequest<YarnRequisitionListResponse>(
      `/yarn-requisitions?${queryParams.toString()}`
    );
  }

  /**
   * Fetch ALL requisitions across all pages (for full-inventory view).
   */
  async getAllYarnRequisitions(params: {
    startDate: string;
    endDate: string;
    poSent?: boolean;
  }): Promise<{ results: YarnRequisitionResponse[]; alertSummary: RequisitionAlertSummary }> {
    const pageSize = 100;
    const allResults: YarnRequisitionResponse[] = [];
    let alertSummary: RequisitionAlertSummary = { total: 0, pendingDeliveries: 0, alertCount: 0, belowMinimumCount: 0, overbookedCount: 0 };

    for (let page = 1; page <= 100; page++) {
      const res = await this.getYarnRequisitions({ ...params, page, limit: pageSize });
      allResults.push(...res.results);
      alertSummary = res.alertSummary;
      if (res.results.length < pageSize || page >= res.totalPages) break;
    }

    return { results: allResults, alertSummary };
  }

  async updateRequisitionStatus(
    requisitionId: string,
    data: UpdateRequisitionStatusRequest
  ): Promise<YarnRequisitionResponse> {
    return this.makeRequest<YarnRequisitionResponse>(
      `/yarn-requisitions/${requisitionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
      }
    );
  }

  /** Yarn report for date range (YYYY-MM-DD) */
  async getYarnReport(params: {
    start_date: string;
    end_date: string;
  }): Promise<YarnReportResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', params.start_date);
    queryParams.append('end_date', params.end_date);
    return this.makeRequest<YarnReportResponse>(
      `/yarn-report?${queryParams.toString()}`
    );
  }

  /**
   * Snapshot coverage for Yarn Report (earliest/latest closing snapshot keys, picker bounds).
   */
  async getYarnReportSnapshotBounds(): Promise<YarnReportSnapshotBoundsResponse> {
    return this.makeRequest<YarnReportSnapshotBoundsResponse>(
      '/yarn-report/snapshot-bounds'
    );
  }
}

export const yarnInventoryService = new YarnInventoryService();

