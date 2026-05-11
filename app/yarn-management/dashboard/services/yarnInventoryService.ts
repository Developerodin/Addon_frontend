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
  _id?: string;
  /** Present when API uses toJSON transform (replaces _id). */
  id?: string;
  yarnName: string;
  yarnCatalogId?: YarnCatalogInfo | string;
  /** Embedded catalog when populated; otherwise use top-level yarnId. */
  yarn?: YarnCatalogInfo | string;
  yarnId?: string;
  minQty: number;
  availableQty: number;
  blockedQty: number;
  alertStatus: 'below_minimum' | 'overbooked' | null;
  poSent: boolean;
  draftForPo?: boolean;
  /** Manual supplier choice for drafts / merge semantics. */
  preferredSupplierId?: YarnCatalogInfo | string | null;
  preferredSupplierName?: string;
  dismissed?: boolean;
  dismissedAt?: string;
  linkedPurchaseOrderId?: string | YarnCatalogInfo;
  attachedDraftPoId?: string | YarnCatalogInfo;
  created: string;
  lastUpdated: string;
}

/** Client-visible workflow buckets aligned with procurement spec. */
export type RequisitionWorkflowStageUi =
  | 'in_requisition'
  | 'sent_to_draft'
  | 'order_placed'
  | 'dismissed';

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
  poSent?: boolean;
  draftForPo?: boolean;
  preferredSupplierId?: string | null;
  preferredSupplierName?: string;
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

/** Resolve yarn catalog id when populated on `yarnCatalogId`. */
export function requisitionYarnCatalogId(req: YarnRequisitionResponse): string | undefined {
  const cid = normalizePossibleId(req.yarnCatalogId);
  if (cid) return cid;
  return requisitionYarnId(req);
}

/** Resolve yarn id whether API returns embedded `yarn`, a string id, or top-level `yarnId`. */
export function requisitionYarnId(req: YarnRequisitionResponse): string | undefined {
  const byYarn = normalizePossibleId(req.yarn);
  if (byYarn) return byYarn;
  const byCatalog = normalizePossibleId(req.yarnCatalogId);
  if (byCatalog) return byCatalog;
  return normalizePossibleId(req.yarnId);
}

/** Requisition document Mongo id (`_id`, or API `id` after toJSON). */
export function requisitionMongoId(
  req: Pick<YarnRequisitionResponse, 'id' | '_id'>
): string | undefined {
  return normalizePossibleId(req._id) ?? normalizePossibleId(req.id);
}

/** Derives procurement workflow label from persisted YarnRequisition fields. */
export function deriveRequisitionWorkflowStage(
  row: YarnRequisitionResponse
): RequisitionWorkflowStageUi {
  if (row.dismissed) return 'dismissed';
  const linked = normalizePossibleId(row.linkedPurchaseOrderId as unknown);
  if (linked) return 'order_placed';
  if (row.draftForPo) return 'sent_to_draft';
  const attachedDraft = normalizePossibleId(row.attachedDraftPoId as unknown);
  if (attachedDraft) return 'sent_to_draft';
  return 'in_requisition';
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

/** GET /yarn-management/yarn-report/po-analytics */
export interface PoAnalyticsCards {
  poCount: number;
  draftCount: number;
  qcPendingPoCount: number;
  orderedKg: number;
  receivedAcceptedKg: number;
  outstandingKg: number;
  rejectedKg: number;
}

export interface PoAnalyticsBySupplier {
  supplierId: string | null;
  supplierName: string;
  poCount: number;
  orderedKg: number;
  receivedAcceptedKg: number;
  outstandingKg: number;
}

export interface PoAnalyticsByStatus {
  status: string;
  count: number;
}

export interface PoAnalyticsByYarn {
  yarnCatalogId: string;
  yarnName: string;
  orderedKg: number;
}

export interface PoAnalyticsLotsSummary {
  totalLots: number;
  lot_pending: number;
  lot_qc_pending: number;
  lot_rejected: number;
  lot_accepted: number;
}

export interface PoAnalyticsResponse {
  startDate: string;
  endDate: string;
  dateMode: 'created' | 'received';
  cards: PoAnalyticsCards;
  bySupplier: PoAnalyticsBySupplier[];
  byStatus: PoAnalyticsByStatus[];
  byYarn: PoAnalyticsByYarn[];
  lotsSummary: PoAnalyticsLotsSummary;
}

export interface PoAnalyticsLineRow {
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string;
  supplierId: string | null;
  currentStatus: string;
  createDate: string;
  goodsReceivedDate: string | null;
  lastUpdateDate: string | null;
  orderedKg: number;
  receivedAcceptedKg: number;
  outstandingKg: number;
  lotCount: number;
}

export interface PoAnalyticsLinesResponse {
  results: PoAnalyticsLineRow[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface YarnClosingTrendResponse {
  yarnCatalogId: string;
  startDate: string;
  endDate: string;
  series: { date: string; closingKg: number }[];
}

export interface YarnTransactionAnalyticsResponse {
  startDate: string;
  endDate: string;
  byType: { transactionType: string; kg: number; count: number }[];
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
    draftForPo?: boolean;
    alertStatus?: 'below_minimum' | 'overbooked' | 'has_alert';
    page?: number;
    limit?: number;
    skipRecalculation?: boolean;
    yarnName?: string;
    lastUpdatedFrom?: string;
    lastUpdatedTo?: string;
    workflowStage?:
      | 'in_requisition'
      | 'sent_to_draft'
      | 'order_placed'
      | 'dismissed';
    includeDismissed?: boolean;
    preferredSupplierId?: string;
    supplierName?: string;
    sortBy?:
      | 'yarnName'
      | 'created'
      | 'lastUpdated'
      | 'minQty'
      | 'availableQty'
      | 'blockedQty';
    sortOrder?: 'asc' | 'desc';
  }): Promise<YarnRequisitionListResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('startDate', params.startDate);
    queryParams.append('endDate', params.endDate);
    if (params.poSent !== undefined)
      queryParams.append('poSent', params.poSent.toString());
    if (params.draftForPo !== undefined)
      queryParams.append('draftForPo', params.draftForPo.toString());
    if (params.alertStatus)
      queryParams.append('alertStatus', params.alertStatus);
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skipRecalculation)
      queryParams.append('skipRecalculation', 'true');
    if (params.yarnName?.trim())
      queryParams.append('yarnName', params.yarnName.trim());
    if (params.lastUpdatedFrom)
      queryParams.append('lastUpdatedFrom', params.lastUpdatedFrom);
    if (params.lastUpdatedTo)
      queryParams.append('lastUpdatedTo', params.lastUpdatedTo);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params.workflowStage)
      queryParams.append('workflowStage', params.workflowStage);
    if (params.includeDismissed !== undefined) {
      queryParams.append('includeDismissed', String(params.includeDismissed));
    }
    if (params.preferredSupplierId?.trim()) {
      queryParams.append(
        'preferredSupplierId',
        params.preferredSupplierId.trim()
      );
    }
    if (params.supplierName?.trim()) {
      queryParams.append('supplierName', params.supplierName.trim());
    }

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
    draftForPo?: boolean;
    skipRecalculation?: boolean;
    workflowStage?:
      | 'in_requisition'
      | 'sent_to_draft'
      | 'order_placed'
      | 'dismissed';
    includeDismissed?: boolean;
    preferredSupplierId?: string;
    supplierName?: string;
  }): Promise<{ results: YarnRequisitionResponse[]; alertSummary: RequisitionAlertSummary }> {
    const pageSize = 100;
    const allResults: YarnRequisitionResponse[] = [];
    let alertSummary: RequisitionAlertSummary = { total: 0, pendingDeliveries: 0, alertCount: 0, belowMinimumCount: 0, overbookedCount: 0 };

    for (let page = 1; page <= 100; page++) {
      const res = await this.getYarnRequisitions({
        ...params,
        page,
        limit: pageSize,
      });
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

  /**
   * Clears draft-queue flags after yarns are converted into a PO (or removed from staging).
   * @param requisitionIds - Mongo ids of YarnRequisition documents
   */
  async clearRequisitionDraftFlags(
    requisitionIds: string[],
    linkedPurchaseOrderId?: string
  ): Promise<{ cleared: number }> {
    return this.makeRequest<{ cleared: number }>('/yarn-requisitions/clear-draft', {
      method: 'PATCH',
      body: JSON.stringify({
        requisitionIds,
        ...(linkedPurchaseOrderId?.trim()
          ? { linkedPurchaseOrderId: linkedPurchaseOrderId.trim() }
          : {}),
      }),
    });
  }

  /**
   * Soft-dismiss a requisition so it disappears from procurement lists unless filtered explicitly.
   */
  async dismissYarnRequisition(requisitionId: string): Promise<YarnRequisitionResponse> {
    return this.makeRequest<YarnRequisitionResponse>(
      `/yarn-requisitions/${requisitionId}/dismiss`,
      { method: 'PATCH', body: JSON.stringify({}) }
    );
  }

  /**
   * All yarns still in the staging queue (`draftForPo`).
   * @param preferredSupplierId - When set only rows assigned to this supplier merge into their draft flow.
   */
  async getAllDraftQueueRequisitions(options?: {
    preferredSupplierId?: string;
  }): Promise<YarnRequisitionResponse[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 10);
    const { results } = await this.getAllYarnRequisitions({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      draftForPo: true,
      skipRecalculation: true,
      preferredSupplierId: options?.preferredSupplierId?.trim() || undefined,
    });
    /** Server already applies `draftForPo: true`; keep rows if flag is truthy only (handles string/omit). */
    return results.filter((r) => Boolean((r as { draftForPo?: unknown }).draftForPo));
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

  /**
   * Aggregated PO metrics for yarn analytics dashboard.
   * @param params - date_mode: created = PO createDate in range; received = receipt/rejection activity in range.
   */
  async getPoAnalytics(params: {
    start_date: string;
    end_date: string;
    date_mode: 'created' | 'received';
    supplier_id?: string;
    yarn_catalog_id?: string;
    status?: string;
    include_draft?: boolean;
  }): Promise<PoAnalyticsResponse> {
    const q = new URLSearchParams();
    q.append('start_date', params.start_date);
    q.append('end_date', params.end_date);
    q.append('date_mode', params.date_mode);
    if (params.supplier_id) q.append('supplier_id', params.supplier_id);
    if (params.yarn_catalog_id) q.append('yarn_catalog_id', params.yarn_catalog_id);
    if (params.status) q.append('status', params.status);
    if (params.include_draft) q.append('include_draft', 'true');
    return this.makeRequest<PoAnalyticsResponse>(
      `/yarn-report/po-analytics?${q.toString()}`
    );
  }

  /**
   * Paginated PO rows for analytics drill-down.
   */
  async getPoAnalyticsLines(params: {
    start_date: string;
    end_date: string;
    date_mode: 'created' | 'received';
    supplier_id?: string;
    yarn_catalog_id?: string;
    status?: string;
    include_draft?: boolean;
    group_by?: 'supplier' | 'status' | 'yarn';
    group_id?: string;
    page?: number;
    limit?: number;
  }): Promise<PoAnalyticsLinesResponse> {
    const q = new URLSearchParams();
    q.append('start_date', params.start_date);
    q.append('end_date', params.end_date);
    q.append('date_mode', params.date_mode);
    if (params.supplier_id) q.append('supplier_id', params.supplier_id);
    if (params.yarn_catalog_id) q.append('yarn_catalog_id', params.yarn_catalog_id);
    if (params.status) q.append('status', params.status);
    if (params.include_draft) q.append('include_draft', 'true');
    if (params.group_by) q.append('group_by', params.group_by);
    if (params.group_id) q.append('group_id', params.group_id);
    if (params.page != null) q.append('page', String(params.page));
    if (params.limit != null) q.append('limit', String(params.limit));
    return this.makeRequest<PoAnalyticsLinesResponse>(
      `/yarn-report/po-analytics/lines?${q.toString()}`
    );
  }

  /**
   * Daily closing kg from snapshots for one yarn (YYYY-MM-DD keys).
   */
  async getYarnClosingTrend(params: {
    yarn_catalog_id: string;
    start_date: string;
    end_date: string;
  }): Promise<YarnClosingTrendResponse> {
    const q = new URLSearchParams({
      yarn_catalog_id: params.yarn_catalog_id,
      start_date: params.start_date,
      end_date: params.end_date,
    });
    return this.makeRequest<YarnClosingTrendResponse>(
      `/yarn-report/yarn-closing-trend?${q.toString()}`
    );
  }

  /**
   * Yarn movement totals by transaction type for a date range.
   */
  async getYarnTransactionAnalytics(params: {
    start_date: string;
    end_date: string;
    yarn_catalog_id?: string;
  }): Promise<YarnTransactionAnalyticsResponse> {
    const q = new URLSearchParams();
    q.append('start_date', params.start_date);
    q.append('end_date', params.end_date);
    if (params.yarn_catalog_id) q.append('yarn_catalog_id', params.yarn_catalog_id);
    return this.makeRequest<YarnTransactionAnalyticsResponse>(
      `/yarn-report/transaction-analytics?${q.toString()}`
    );
  }
}

export const yarnInventoryService = new YarnInventoryService();

