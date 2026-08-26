import { API_BASE_URL } from '../data/utilities/api';

export interface ProductionOrder {
  id: string;
  _id?: string;
  orderNumber: string;
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  currentFloor: 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Final Checking' | 'Branding' | 'Warehouse';
  articles: Article[];
  orderNote?: string;
  customerId?: string;
  customerName?: string;
  customerOrderNumber?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  forwardedToBranding?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  lastModifiedBy?: string;
}

export interface Article {
  id: string;
  _id?: string;
  orderId?: string;
  articleNumber: string;
  plannedQuantity: number;
  completedQuantity: number;
  linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
  progress: number;
  currentFloor: string;
  machineId?: string | any; // Can be string or populated object
  remarks?: string;
  brandingType?: 'Heat Transfer' | 'Embroidery';
  knittingCode?: string;
  quantityFromPreviousFloor?: number;
  m1Quantity: number;
  m2Quantity: number;
  m3Quantity: number;
  m4Quantity: number;
  repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  qualityConfirmed?: boolean;
  finalQualityConfirmed?: boolean;
  finalQualityConfirmedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Product process route — populated via GET /articles/:id/processes when needed */
  processes?: ArticleProcess[];
  floorQuantities?: {
    knitting: { received: number; completed: number; remaining: number; transferred: number; m4Quantity?: number; weight?: number; repairReceived?: number; repairFromFloor?: string };
    linking: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    checking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string };
    secondaryChecking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string };
    washing: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    boarding: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    finalChecking: { received: number; completed: number; remaining: number; transferred: number; m1Quantity?: number; m2Quantity?: number; m3Quantity?: number; m4Quantity?: number; m2Transferred?: number; m2Remaining?: number; repairReceived?: number; repairFromFloor?: string; transferredData?: TransferItem[]; receivedData?: Array<TransferItem & { receivedStatusFromPreviousFloor?: string; receivedInContainerId?: string; receivedTimestamp?: string }> };
    /** Dispatch: no M1–M4; transfer is style/brand lines + container to next floor (e.g. Warehouse). */
    dispatch: {
      received: number;
      completed?: number;
      remaining?: number;
      transferred?: number;
      repairReceived?: number;
      repairFromFloor?: string;
      transferredData?: TransferItem[];
      receivedData?: DispatchReceivedDataEntry[];
    };
    branding: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string; transferredData?: TransferItem[]; receivedData?: Array<TransferItem & { receivedStatusFromPreviousFloor?: string; receivedInContainerId?: string; receivedTimestamp?: string }> };
    reBoarding: { received: number; completed: number; remaining: number; transferred: number; repairReceived?: number; repairFromFloor?: string };
    /** Warehouse: receive from Dispatch (or prior floor) with line-level receivedData; optional outbound transferredData. */
    warehouse: {
      received: number;
      completed?: number;
      remaining?: number;
      transferred?: number;
      repairReceived?: number;
      repairFromFloor?: string;
      transferredData?: TransferItem[];
      receivedData?: DispatchReceivedDataEntry[];
    };
  };
}

/** Populated order ref from GET /production/articles/:articleId */
export interface ArticleOrderRef {
  orderNumber?: string;
  priority?: string;
  status?: string;
  _id?: string;
}

/** Populated machine ref from GET /production/articles/:articleId */
export interface ArticleMachineRef {
  machineCode?: string;
  machineNumber?: string;
  model?: string;
  floor?: string;
  status?: string;
  _id?: string;
}

/** Full article from GET /production/articles/:articleId (orderId & machineId populated) */
export interface ProductionArticleDetail extends Article {
  orderId?: string | ArticleOrderRef;
  machineId?: string | ArticleMachineRef;
}

/** Process from GET /production/articles/:articleId/processes */
export interface ArticleProcess {
  _id: string;
  name: string;
  type?: string;
  description?: string;
  sortOrder: number;
  status?: string;
  steps?: unknown[];
}

/** Response from GET /production/articles/:articleId/processes */
export interface ArticleProcessesResponse {
  articleNumber: string;
  processes: ArticleProcess[];
}

export interface CreateOrderRequest {
  priority: 'Urgent' | 'High' | 'Medium' | 'Low';
  articles: {
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    machineId?: string;
    remarks?: string;
    knittingCode?: string;
  }[];
  orderNote?: string;
  customerId?: string;
  customerName?: string;
  customerOrderNumber?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
}

export interface UpdateOrderRequest {
  priority?: 'Urgent' | 'High' | 'Medium' | 'Low';
  orderNote?: string;
  plannedEndDate?: string;
  articles?: {
    _id?: string;
    articleNumber: string;
    plannedQuantity: number;
    linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking';
    priority: 'Urgent' | 'High' | 'Medium' | 'Low';
    machineId?: string;
    remarks?: string;
  }[];
}

/** Transfer item breakdown by styleCode/brand (Branding, Final Checking) */
export interface TransferItem {
  transferred: number;
  styleCode?: string;
  brand?: string;
}

/** Dispatch floor: lines received from previous floor (container scan), optional qty/style/brand per row. */
export interface DispatchReceivedDataEntry {
  receivedStatusFromPreviousFloor?: string;
  receivedInContainerId?: string | null;
  receivedTimestamp?: string | null;
  transferred?: number;
  styleCode?: string;
  brand?: string;
}

export interface UpdateArticleProgressRequest {
  completedQuantity?: number;
  /** Transfer breakdown by styleCode/brand (Branding → Final Checking, Final Checking → Warehouse) */
  transferredData?: TransferItem[];
  /** Required for transfer: current user object id */
  userId?: string;
  /** Required for transfer: floor supervisor object id */
  floorSupervisorId?: string;
  remarks?: string;
  brandingType?: 'Heat Transfer' | 'Embroidery';
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
  weight?: number;
  repairStatus?: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
  repairRemarks?: string;
  machineId?: string;
  shiftId?: string;
}

export interface RevertFloorTransferRequest {
  floor: string;
  transferItems: TransferItem[];
  m1Quantity?: number;
  m2Quantity?: number;
  m3Quantity?: number;
  m4Quantity?: number;
}

export interface TransferArticleRequest {
  orderId: string;
  articleId: string;
  /** Legacy: single quantity when transferItems not provided */
  quantity?: number;
  /** Breakdown by styleCode/brand for Branding/Final Checking */
  transferItems?: TransferItem[];
  userId?: string;
  floorSupervisorId?: string;
  remarks?: string;
  batchNumber?: string;
}

/** M4 snapshot per article */
export interface M4Snapshot {
  byFloor: {
    knitting: number;
    checking: number;
    secondaryChecking: number;
    finalChecking: number;
  };
  onHand: number;
  outwardTotal: number;
  availableForOutward: number;
}

/** M4 Management article row */
export interface M4ArticleRow {
  id: string;
  _id?: string;
  articleNumber: string;
  orderId: string;
  orderNumber: string;
  orderNote?: string;
  priority?: string;
  status?: string;
  linkingType?: string;
  m4Snapshot: M4Snapshot;
}

export interface M4ArticlesResponse {
  results: M4ArticleRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** M4 ledger log entry */
export interface M4LogEntry {
  id: string;
  type: 'ENTRY' | 'OUTWARD';
  articleId: string;
  orderId: string;
  orderNumber: string;
  articleNumber: string;
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
  machineId?: string;
  machineCode?: string;
  machineName?: string;
  timestamp: string;
}

export interface M4Statistics {
  articleCount: number;
  totalOnHand: number;
  totalOutwarded: number;
  totalAvailable: number;
}

export interface M4ArticleSummary extends M4ArticleRow {
  recentLogs: M4LogEntry[];
}

/** M3 snapshot per article (checking floors only) */
export interface M3Snapshot {
  byFloor: {
    checking: number;
    secondaryChecking: number;
    finalChecking: number;
  };
  onHand: number;
  outwardTotal: number;
  availableForOutward: number;
}

export interface M3ArticleRow {
  id: string;
  _id?: string;
  articleNumber: string;
  orderId: string;
  orderNumber: string;
  orderNote?: string;
  priority?: string;
  status?: string;
  linkingType?: string;
  m3Snapshot: M3Snapshot;
}

export interface M3ArticlesResponse {
  results: M3ArticleRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface M3LogEntry {
  id: string;
  type: 'ENTRY' | 'OUTWARD';
  articleId: string;
  orderId: string;
  orderNumber: string;
  articleNumber: string;
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

export interface M3Statistics {
  articleCount: number;
  totalOnHand: number;
  totalOutwarded: number;
  totalAvailable: number;
}

export interface M3ArticleSummary extends M3ArticleRow {
  recentLogs: M3LogEntry[];
}

/** M2 Management — open repair entries from QC floors */
export type M2EntryStatus = 'OPEN' | 'PARTIAL' | 'RESOLVED';
export type M2LogType = 'ENTRY' | 'MERGE_TO_M1' | 'TRANSFER_TO_M3' | 'TRANSFER_TO_M4';

export interface M2EntryRow {
  id: string;
  entryId: string;
  type: M2LogType;
  status?: M2EntryStatus | null;
  originalQuantity?: number;
  remainingQuantity?: number;
  articleId: string;
  orderId: string;
  orderNumber: string;
  articleNumber: string;
  sourceFloor?: string | null;
  quantity: number;
  cascadeFloors?: string[];
  remarks?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  floorSupervisorId?: string;
  timestamp: string;
  /** True when the article is present on Dispatch floor */
  canMergeToM1?: boolean;
  /** Set when canMergeToM1 is false */
  mergeBlockedReason?: string | null;
}

export interface M2EntriesResponse {
  results: M2EntryRow[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface M2Statistics {
  openEntryCount: number;
  partialEntryCount: number;
  resolvedEntryCount: number;
  totalOpenQuantity: number;
}

export interface M2ArticleSummary {
  id: string;
  _id?: string;
  articleNumber: string;
  orderId: string;
  orderNumber: string;
  openM2Quantity: number;
  entries: M2EntryRow[];
  recentLogs: M2EntryRow[];
}

/** Body for PATCH /articles/:articleId/floor-received-data – append one receivedData entry. */
export type ProductionFloorName =
  | 'Knitting' | 'Linking' | 'Checking' | 'Washing' | 'Boarding' | 'Silicon'
  | 'Secondary Checking' | 'Branding' | 'Re-Boarding' | 'Final Checking' | 'Warehouse' | 'Dispatch';

export interface FloorReceivedDataBody {
  floor: ProductionFloorName;
  /** Legacy: single quantity when receivedTransferItems not provided */
  quantity?: number;
  /** Breakdown by styleCode/brand when receiving (omit quantity when using this) */
  receivedTransferItems?: TransferItem[];
  receivedData: {
    receivedStatusFromPreviousFloor?: string;
    receivedInContainerId?: string | null;
    receivedTimestamp?: string | null;
  };
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  currentFloor?: string;
  customerId?: string;
  search?: string;
  sortBy?: string;
  populate?: string;
}

export interface FloorOrderFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  machineId?: string;
  sortBy?: string;
  populate?: string;
  /** Compact payload: skip nested machines, history arrays, and countDocuments. */
  articleView?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** Single order row in article-wise report */
export interface ArticleWiseReportOrder {
  articleId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  orderPriority: string;
  orderCurrentFloor: string;
  orderNote?: string;
  orderCreatedAt?: string;
  plannedQuantity: number;
  status: string;
  progress: number;
  linkingType: string;
  priority: string;
  remarks?: string;
  machineId?: string;
  machine?: { machineCode?: string; machineNumber?: string; model?: string; floor?: string };
  floorQuantities?: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  logs?: Array<{
    id: string;
    action: string;
    quantity?: number;
    fromFloor?: string;
    toFloor?: string;
    remarks?: string;
    timestamp?: string;
    date?: string;
    userId?: string;
    previousValue?: unknown;
    newValue?: unknown;
    qualityStatus?: string | null;
  }>;
}

/** Single article in article-wise report */
export interface ArticleWiseReportArticle {
  factoryCode: string;
  articleNumber: string;
  orders: ArticleWiseReportOrder[];
}

export interface ArticleWiseReportResponse {
  results: ArticleWiseReportArticle[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

/** Qty rollups for one production order (or a totals row). */
export interface OrderSummaryMetrics {
  articleCount: number;
  totalQty: number;
  /** Short-close leftover. Named holdQty for API compatibility. */
  holdQty: number;
  knitPendingWithHold: number;
  /**
   * Legacy pending figure (everything except short close). Kept so the UI can
   * show the pre-bucket number next to the new one during rollout.
   * @deprecated Use knitPendingQty.
   */
  knitPendingWithoutHold: number;
  /** Reportable pending: knitPendingOnMachine + knitPendingUnplanned. */
  knitPendingQty: number;
  /** Pending on a live machine queue. Reconciles with the Needle Wise table. */
  knitPendingOnMachine: number;
  /** Pending with no machine assigned yet. Needs planning. */
  knitPendingUnplanned: number;
  /** Balance left when the machine closed the row Completed / Cancelled. */
  closedOnMachineQty: number;
  /** Balance on rows paused as On Hold. */
  onHoldQty: number;
  transferQty: number;
  wipQty: number;
}

/** One production-order row in the order-summary report. */
export interface OrderSummaryRow extends OrderSummaryMetrics {
  orderId: string;
  orderNumber: string;
  orderNote?: string;
  priority: string;
  status: string;
  createdAt?: string;
}

export interface OrderSummaryReportResponse {
  results: OrderSummaryRow[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  totals: OrderSummaryMetrics;
  pageTotals: OrderSummaryMetrics;
}

/** Numeric columns on a Core Report row (or totals footer). */
export interface CoreReportMetrics {
  sapStock: number;
  inwardPending: number;
  inTransit: number;
  wip: number;
  runningOnMachine: number;
  productionPlanning: number;
  totalInhand: number;
  /** Pending PO qty keyed by vendor name (dynamic columns). */
  vendorPending: Record<string, number>;
}

/** One factory-code row in the Core Report. */
export interface CoreReportRow extends CoreReportMetrics {
  productId: string;
  brand: string;
  vendorCode: string;
  factoryCode: string;
  color: string;
  type: string;
  design: string;
}

export interface CoreReportResponse {
  results: CoreReportRow[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
  /** Active catalog items with a factory code, ignoring the current search. */
  catalogTotal: number;
  vendorColumns: string[];
  totals: CoreReportMetrics;
  pageTotals: CoreReportMetrics;
}

/** Where the factory's remaining knitting sits. Only the first two are pending. */
export interface KnitPendingBucketTotals {
  onMachine: number;
  unplanned: number;
  shortClosed: number;
  closedOnMachine: number;
  onHold: number;
}

/** An article with knitting left but no machine assigned. */
export interface UnplannedKnitArticle {
  articleId: string;
  articleNumber: string;
  orderId: string;
  orderNumber: string;
  orderNote: string;
  qty: number;
}

/**
 * Factory-wide knitting pending, bucketed, with the on-machine part split by
 * needle. Single source of truth shared by the Order Summary and Needle Wise.
 */
export interface KnittingPendingBucketsResponse {
  generatedAt: string;
  buckets: KnitPendingBucketTotals;
  articleCountByBucket: KnitPendingBucketTotals;
  /** onMachine + unplanned. */
  pendingQty: number;
  /** Needle size -> on-machine pending qty. */
  onMachineByNeedle: Record<string, number>;
  unplannedArticles: UnplannedKnitArticle[];
  /** Qty on articles whose production order no longer exists. Excluded from pending. */
  orphanPendingQty: number;
  orphanArticleCount: number;
  /** Qty on articles whose orderId still points at an order they were dropped from. */
  droppedFromOrderPendingQty: number;
  droppedFromOrderArticleCount: number;
}

/** Floor column in the date × pending-qty backlog matrix. */
export interface BacklogReportFloorColumn {
  key: string;
  label: string;
}

/** One calendar day in the backlog matrix. */
export interface BacklogReportDateRow {
  date: string;
  isToday: boolean;
  isFuture: boolean;
  floors: Record<string, number | null>;
  total: number | null;
}

/** GET /production/reports/backlog — DATE rows × floor pending qty. */
export interface BacklogReportResponse {
  year: number;
  month: number;
  timezone: string;
  dates: string[];
  todayKey: string;
  floors: BacklogReportFloorColumn[];
  rows: BacklogReportDateRow[];
  asOf: {
    date: string;
    floors: Record<string, number | null>;
    total: number;
  };
}

/**
 * Row kind in the daily production summary:
 * - `floor`  — qty transferred off a non-QC floor that day
 * - `m1`     — M1 (good quality) booked on a QC floor that day
 * - `defect` — qty booked into the M2/M3/M4 ledger from a floor that day
 */
export type DailyProductionSummaryRowKind = "floor" | "m1" | "defect";

/** One Details row of the daily production summary, with a qty per IST calendar date. */
export interface DailyProductionSummaryRow {
  key: string;
  label: string;
  kind: DailyProductionSummaryRowKind;
  /** Source floor for `floor` rows, else null. */
  floor: string | null;
  /** Defect bucket (M2/M3/M4) for `defect` rows, else null. */
  category: string | null;
  /** Floor the qty was booked on for `m1` and `defect` rows, else null. */
  sourceFloor: string | null;
  /** Qty keyed by YYYY-MM-DD; null for future dates. */
  values: Record<string, number | null>;
  total: number;
}

/** GET /production/reports/daily-production-summary — Details rows × date columns. */
export interface DailyProductionSummaryResponse {
  year: number;
  month: number;
  timezone: string;
  dates: string[];
  todayKey: string;
  includeExtraRows: boolean;
  rows: DailyProductionSummaryRow[];
  columnTotals: Record<string, number | null>;
  grandTotal: number;
  warnings: string[];
}

class ProductionService {
  private baseUrl = `${API_BASE_URL}/production`;

  // Utility function to get floor order based on linking type
  getFloorOrderByLinkingType(linkingType: 'Auto Linking' | 'Rosso Linking' | 'Hand Linking'): string[] {
    if (linkingType === 'Auto Linking') {
      return ['Knitting', 'Checking', 'Washing', 'Boarding', 'Silicon', 'Secondary Checking', 'Branding', 'Re-Boarding', 'Final Checking', 'Dispatch', 'Warehouse'];
    } else {
      return ['Knitting', 'Linking', 'Checking', 'Washing', 'Boarding', 'Silicon', 'Secondary Checking', 'Branding', 'Re-Boarding', 'Final Checking', 'Dispatch', 'Warehouse'];
    }
  }

  // Transform API response to match our interfaces
  private transformOrder(order: any): ProductionOrder {
    const transformed = {
      id: order.id || order._id,
      _id: order._id || order.id,
      orderNumber: order.orderNumber,
      priority: order.priority,
      status: order.status,
      currentFloor: order.currentFloor,
      articles: order.articles ? order.articles.map((article: any) => this.transformArticle(article, order.id)) : [],
      orderNote: order.orderNote,
      customerId: order.customerId,
      customerName: order.customerName,
      customerOrderNumber: order.customerOrderNumber,
      plannedStartDate: order.plannedStartDate,
      plannedEndDate: order.plannedEndDate,
      actualStartDate: order.actualStartDate,
      actualEndDate: order.actualEndDate,
      forwardedToBranding: order.forwardedToBranding,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      createdBy: order.createdBy,
      lastModifiedBy: order.lastModifiedBy
    };
    return transformed;
  }

  private transformArticle(article: any, orderId: string): Article {
    const transformed = {
      id: article.id || article._id,
      _id: article._id || article.id,
      orderId: orderId,
      articleNumber: article.articleNumber,
      plannedQuantity: article.plannedQuantity,
      completedQuantity: article.completedQuantity,
      linkingType: article.linkingType,
      priority: article.priority,
      status: article.status,
      progress: article.progress,
      currentFloor: article.currentFloor,
      machineId: article.machineId,
      remarks: article.remarks,
      brandingType: article.brandingType,
      knittingCode: article.knittingCode,
      quantityFromPreviousFloor: article.quantityFromPreviousFloor,
      m1Quantity: article.m1Quantity,
      m2Quantity: article.m2Quantity,
      m3Quantity: article.m3Quantity,
      m4Quantity: article.m4Quantity,
      repairStatus: article.repairStatus,
      repairRemarks: article.repairRemarks,
      qualityConfirmed: article.qualityConfirmed || article.finalQualityConfirmed,
      finalQualityConfirmed: article.finalQualityConfirmed,
      finalQualityConfirmedAt: article.finalQualityConfirmedAt,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      floorQuantities: article.floorQuantities,
      ...(Array.isArray(article.processes) ? { processes: article.processes } : {}),
    };
    return transformed;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = localStorage.getItem('token');
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, config);
      
      // Try to parse JSON, but handle cases where response might not be JSON
      let data: any;
      const contentType = response.headers.get('content-type');
      const isJson = contentType && contentType.includes('application/json');
      
      try {
        const text = await response.text();
        data = text ? (isJson ? JSON.parse(text) : { message: text }) : {};
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        data = { message: `Failed to parse response: ${response.statusText}` };
      }

      if (!response.ok) {
        // Return error in ApiResponse format instead of throwing
        const errorMessage = 
          data.message || 
          data.error?.message || 
          data.error || 
          `Request failed with status ${response.status}`;
        
        console.error('API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          endpoint: `${this.baseUrl}${endpoint}`
        });
        
        return {
          success: false,
          data: {} as T,
          error: {
            code: data.code || String(response.status),
            message: errorMessage,
            details: data.error?.details || data.details || []
          }
        };
      }

      // Handle both wrapped and direct response formats
      if (data.success !== undefined) {
        // Response is already wrapped in success format
        return data;
      } else {
        // Response is direct data, wrap it
        return {
          success: true,
          data: data
        };
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      console.error('API Error:', error);
      // Handle network errors or JSON parsing errors
      const errorMessage = error instanceof Error ? error.message : 'Network error occurred';
      return {
        success: false,
        data: {} as T,
        error: {
          code: 'NETWORK_ERROR',
          message: errorMessage,
          details: []
        }
      };
    }
  }

  // Order Management APIs
  async createOrder(orderData: CreateOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return this.request<ProductionOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrders(filters: OrderFilters = {}): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';
    
    try {
      const response = await this.request<any>(endpoint);
      
      // Handle both wrapped and direct response formats
      const responseData = response.success ? response.data : response;
      
      // Transform the results
      const transformedData: PaginatedResponse<ProductionOrder> = {
        ...responseData,
        results: responseData.results.map((order: any) => this.transformOrder(order))
      };
      
      return {
        success: true,
        data: transformedData
      };
    } catch (error) {
      console.error('Error in getOrders:', error);
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0
        },
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch orders'
        }
      };
    }
  }

  async getOrder(orderId: string): Promise<ApiResponse<ProductionOrder>> {
    const response = await this.request<any>(`/orders/${orderId}`);

    if (response.success) {
      return {
        success: true,
        data: this.transformOrder(response.data)
      };
    }

    return response as ApiResponse<ProductionOrder>;
  }

  /** GET /production/articles/:articleId/processes – article processes (floors) from Product */
  async getArticleProcesses(articleId: string): Promise<ApiResponse<ArticleProcessesResponse>> {
    if (!articleId) throw new Error('articleId is required');
    return this.request<ArticleProcessesResponse>(`/articles/${articleId}/processes`);
  }

  /** GET /production/articles/:articleId – full article with orderId & machineId populated */
  async getArticle(articleId: string): Promise<ApiResponse<ProductionArticleDetail>> {
    if (!articleId) throw new Error('articleId is required');
    const raw = await this.request<any>(`/articles/${articleId}`);
    if (!raw.success || !raw.data) return raw as ApiResponse<ProductionArticleDetail>;
    const a = raw.data;
    const data: ProductionArticleDetail = {
      ...this.transformArticle(a, typeof a.orderId === 'object' && a.orderId?.orderNumber != null ? (a.orderId as any)._id : a.orderId),
      orderId: a.orderId,
      machineId: a.machineId
    };
    return { success: true, data };
  }

  async updateOrder(orderId: string, updateData: UpdateOrderRequest): Promise<ApiResponse<ProductionOrder>> {
    return this.request<ProductionOrder>(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async deleteOrder(orderId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/orders/${orderId}`, {
      method: 'DELETE',
    });
  }

  async bulkCreateOrders(orders: CreateOrderRequest[], batchSize: number = 50): Promise<ApiResponse<{ message: string; results: { successful: number; failed: number; errors: any[] } }>> {
    return this.request('/orders/bulk-create', {
      method: 'POST',
      body: JSON.stringify({ orders, batchSize }),
    });
  }

  // Floor Operations APIs
  async getFloorOrders(
    floor: string,
    filters: FloorOrderFilters = {},
    options?: { cache?: RequestCache; signal?: AbortSignal }
  ): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/floors/${floor}/orders?${queryString}` : `/floors/${floor}/orders`;

    const response = await this.request<any>(endpoint, {
      cache: options?.cache ?? "default",
      ...(options?.signal ? { signal: options.signal } : {}),
    });

    if (!response.success) {
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0,
        },
        error: response.error ?? {
          code: "FETCH_ERROR",
          message: "Failed to fetch floor orders",
        },
      };
    }

    const responseData = response.data ?? {};
    const rawResults = Array.isArray(responseData.results) ? responseData.results : [];

    const transformedData: PaginatedResponse<ProductionOrder> = {
      page: responseData.page ?? 1,
      limit: responseData.limit ?? rawResults.length,
      totalPages: responseData.totalPages ?? 1,
      totalResults: responseData.totalResults ?? rawResults.length,
      results: rawResults.map((order: unknown) => this.transformOrder(order)),
    };

    return {
      success: true,
      data: transformedData,
    };
  }

  /**
   * GET /production/floors/Dispatch/orders/pending-warehouse-print
   * Same filters as getFloorOrders; response has dispatch.transferredData as pending-only lines
   * (not yet inwarded at warehouse) and omits articles/orders with no pending qty.
   */
  async getDispatchPendingWarehousePrintOrders(
    filters: FloorOrderFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<ProductionOrder>>> {
    const queryParams = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/floors/Dispatch/orders/pending-warehouse-print?${queryString}`
      : `/floors/Dispatch/orders/pending-warehouse-print`;

    try {
      const response = await this.request<any>(endpoint);

      const responseData = response.success ? response.data : response;

      const transformedData: PaginatedResponse<ProductionOrder> = {
        ...responseData,
        results: (responseData.results ?? []).map((order: any) => this.transformOrder(order)),
      };

      return {
        success: true,
        data: transformedData,
      };
    } catch (error) {
      console.error('Error in getDispatchPendingWarehousePrintOrders:', error);
      return {
        success: false,
        data: {
          results: [],
          page: 1,
          limit: 10,
          totalPages: 0,
          totalResults: 0,
        },
        error: {
          code: 'FETCH_ERROR',
          message:
            error instanceof Error ? error.message : 'Failed to fetch pending warehouse print orders',
        },
      };
    }
  }

  async updateArticleProgress(
    floor: string,
    orderId: string,
    articleId: string,
    progressData: UpdateArticleProgressRequest
  ): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/floors/${floor}/orders/${orderId}/articles/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(progressData),
    });
  }

  /** POST /articles/:articleId/revert-floor-transfer – undo transfer when container staging fails. */
  async revertFloorTransfer(
    articleId: string,
    payload: RevertFloorTransferRequest
  ): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${articleId}/revert-floor-transfer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * PATCH /articles/:articleId/branding-type – save branding type immediately on select.
   */
  async updateArticleBrandingType(
    articleId: string,
    brandingType: 'Heat Transfer' | 'Embroidery'
  ): Promise<ApiResponse<Article>> {
    const response = await this.request<any>(`/articles/${articleId}/branding-type`, {
      method: 'PATCH',
      body: JSON.stringify({ brandingType }),
    });
    if (!response.success || !response.data) {
      return response as ApiResponse<Article>;
    }
    const orderId =
      typeof response.data.orderId === 'object'
        ? response.data.orderId?._id ?? response.data.orderId?.id
        : response.data.orderId;
    return {
      success: true,
      data: this.transformArticle(response.data, orderId ?? ''),
    };
  }

  /** PATCH /articles/:articleId/floor-received-data – append one receivedData entry for the floor. */
  async updateArticleFloorReceivedData(articleId: string, body: FloorReceivedDataBody): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${articleId}/floor-received-data`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async transferArticle(floor: string, transferData: TransferArticleRequest): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  /** Transfer with breakdown (Branding/Final Checking): POST /floors/:floor/transfer/:orderId/:articleId */
  async transferFloorArticle(
    floor: string,
    orderId: string,
    articleId: string,
    body: {
      transferItems?: TransferItem[];
      quantity?: number;
      userId?: string;
      floorSupervisorId?: string;
      remarks?: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/transfer/${orderId}/${articleId}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async transferToNextFloor(articleId: string, transferData: {
    quantity: number;
    remarks?: string;
    batchNumber?: string;
  }): Promise<ApiResponse<any>> {
    return this.request(`/articles/${articleId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(transferData),
    });
  }

  async getFloorStatistics(floor: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/floors/${floor}/statistics?${queryString}` : `/floors/${floor}/statistics`;
    
    return this.request(endpoint);
  }

  // Quality Control APIs
  async updateQualityInspection(articleId: string, qualityData: {
    inspectedQuantity: number;
    m1Quantity: number;
    m2Quantity: number;
    m3Quantity: number;
    m4Quantity: number;
    remarks?: string;
    machineId?: string;
    shiftId?: string;
    floor?: string;
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/articles/${articleId}/quality-inspection`, {
      method: 'POST',
      body: JSON.stringify(qualityData),
    });
  }

  async updateQualityCategories(articleId: string, qualityData: {
    m1Quantity: number;
    m2Quantity: number;
    m3Quantity: number;
    m4Quantity: number;
    repairStatus: 'Not Required' | 'In Review' | 'Repaired' | 'Rejected';
    repairRemarks?: string;
  }): Promise<ApiResponse<Article>> {
    return this.request<Article>(`/floors/final-checking/quality/${articleId}`, {
      method: 'PATCH',
      body: JSON.stringify(qualityData),
    });
  }

  async shiftM2Items(shiftData: {
    articleId: string;
    fromM2: number;
    toM1: number;
    toM3: number;
    toM4: number;
    remarks?: string;
  }): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/shift-m2', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
  }

  async confirmFinalQuality(articleId: string, confirmed: boolean, remarks?: string): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/confirm-quality', {
      method: 'POST',
      body: JSON.stringify({ articleId, confirmed, remarks }),
    });
  }

  async forwardToWarehouse(orderId: string, remarks?: string): Promise<ApiResponse<any>> {
    return this.request('/floors/final-checking/forward-to-warehouse', {
      method: 'POST',
      body: JSON.stringify({ orderId, remarks }),
    });
  }

  // M2 Repair Transfer API
  async transferM2ForRepair(
    floor: string,
    orderId: string,
    articleId: string,
    repairData: {
      quantity?: number;
      remarks?: string;
      targetFloor?: string; // Optional: allows user to select destination floor (defaults to immediate previous floor)
    }
  ): Promise<ApiResponse<any>> {
    return this.request(`/floors/${floor}/repair/${orderId}/articles/${articleId}`, {
      method: 'POST',
      body: JSON.stringify(repairData),
    });
  }

  // Reports & Analytics APIs
  async getProductionDashboard(dateFrom?: string, dateTo?: string, floor?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);
    if (floor) queryParams.append('floor', floor);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/dashboard?${queryString}` : '/dashboard';
    
    return this.request(endpoint);
  }

  async getEfficiencyReport(floor?: string, dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (floor) queryParams.append('floor', floor);
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/efficiency?${queryString}` : '/reports/efficiency';
    
    return this.request(endpoint);
  }

  async getQualityReport(dateFrom?: string, dateTo?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/quality?${queryString}` : '/reports/quality';
    
    return this.request(endpoint);
  }

  async getOrderTrackingReport(orderId: string): Promise<ApiResponse<any>> {
    return this.request(`/reports/order-tracking/${orderId}`);
  }

  /** Article-wise production report. Use `search` for partial match on article number / knitting code; `articleNumber` for exact match. */
  async getArticleWiseReport(filters: {
    articleNumber?: string;
    search?: string;
    limit?: number;
    page?: number;
    logsPerArticle?: number;
  } = {}): Promise<ApiResponse<ArticleWiseReportResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/article-wise?${queryString}` : '/reports/article-wise';
    return this.request<ArticleWiseReportResponse>(endpoint);
  }

  /** Order-level production summary: planned, hold, knitting pending, WIP, dispatch transfer. */
  async getOrderSummaryReport(filters: {
    search?: string;
    status?: string;
    priority?: string;
    /** When true, include orders whose knit pending is 0. Default omits them. */
    includeZeroPending?: boolean;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<OrderSummaryReportResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/order-summary?${queryString}` : '/reports/order-summary';
    return this.request<OrderSummaryReportResponse>(endpoint);
  }

  /**
   * Core Report: warehouse stock, vendor inward/PO pending, and production qty
   * per factory code.
   */
  async getCoreReport(filters: {
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<CoreReportResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/core-report?${queryString}` : '/reports/core-report';
    return this.request<CoreReportResponse>(endpoint);
  }

  /**
   * Factory-wide knitting pending split into buckets, with the on-machine part
   * broken down by needle. Lets Needle Wise show unplanned work and reconcile
   * against the Order Summary.
   */
  async getKnittingPendingBuckets(): Promise<ApiResponse<KnittingPendingBucketsResponse>> {
    return this.request<KnittingPendingBucketsResponse>('/reports/knitting-pending-buckets');
  }

  /** Daily floor backlog matrix: pending qty by Details row and calendar date (IST). */
  async getBacklogReport(filters: {
    year?: number;
    month?: number;
  } = {}): Promise<ApiResponse<BacklogReportResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/reports/backlog?${queryString}` : "/reports/backlog";
    return this.request<BacklogReportResponse>(endpoint);
  }

  /** Daily production summary: qty transferred off each floor per IST calendar date. */
  async getDailyProductionSummary(filters: {
    year?: number;
    month?: number;
    includeExtraRows?: boolean;
  } = {}): Promise<ApiResponse<DailyProductionSummaryResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, String(value));
      }
    });
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/reports/daily-production-summary?${queryString}`
      : "/reports/daily-production-summary";
    return this.request<DailyProductionSummaryResponse>(endpoint);
  }

  // Logging & Audit APIs
  async getOrderLogs(orderId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    floor?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/order/${orderId}?${queryString}` : `/logs/order/${orderId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getArticleLogs(articleId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    floor?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/article/${articleId}?${queryString}` : `/logs/article/${articleId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getFloorLogs(floor: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/floor/${floor}?${queryString}` : `/logs/floor/${floor}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getUserLogs(userId: string, filters: {
    action?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/user/${userId}?${queryString}` : `/logs/user/${userId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  async getLogStatistics(filters: {
    dateFrom?: string;
    dateTo?: string;
    groupBy?: string;
    floor?: string;
    action?: string;
  } = {}): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/statistics?${queryString}` : '/logs/statistics';
    
    return this.request(endpoint);
  }

  async getAuditTrail(orderId: string, filters: {
    includeSystemLogs?: boolean;
    includeUserActions?: boolean;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/logs/audit-trail/${orderId}?${queryString}` : `/logs/audit-trail/${orderId}`;
    
    return this.request<PaginatedResponse<any>>(endpoint);
  }

  // M4 Management APIs
  async getM4Articles(filters: {
    orderId?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<M4ArticlesResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, String(value));
    });
    const qs = queryParams.toString();
    return this.request<M4ArticlesResponse>(qs ? `/m4/articles?${qs}` : '/m4/articles');
  }

  async getM4Logs(filters: {
    articleId?: string;
    orderId?: string;
    type?: 'ENTRY' | 'OUTWARD';
    sourceFloor?: string;
    machineId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<M4LogEntry>>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, String(value));
    });
    const qs = queryParams.toString();
    return this.request<PaginatedResponse<M4LogEntry>>(qs ? `/m4/logs?${qs}` : '/m4/logs');
  }

  async getM4Statistics(): Promise<ApiResponse<M4Statistics>> {
    return this.request<M4Statistics>('/m4/statistics');
  }

  async getM4ArticleSummary(articleId: string, logLimit = 20): Promise<ApiResponse<M4ArticleSummary>> {
    return this.request<M4ArticleSummary>(`/m4/articles/${articleId}/summary?logLimit=${logLimit}`);
  }

  async markM4Outward(articleId: string, body: { quantity: number; remarks: string }): Promise<ApiResponse<{ article: M4ArticleRow; log: M4LogEntry }>> {
    return this.request(`/m4/articles/${articleId}/outward`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // M2 Management APIs
  async getM2Entries(filters: {
    orderId?: string;
    articleId?: string;
    sourceFloor?: string;
    status?: M2EntryStatus;
    includeResolved?: boolean;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<M2EntriesResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, key === 'includeResolved' ? String(value) : String(value));
      }
    });
    const qs = queryParams.toString();
    return this.request<M2EntriesResponse>(qs ? `/m2/entries?${qs}` : '/m2/entries');
  }

  async getM2Logs(filters: {
    articleId?: string;
    orderId?: string;
    entryId?: string;
    type?: M2LogType;
    sourceFloor?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<M2EntryRow>>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, String(value));
    });
    const qs = queryParams.toString();
    return this.request<PaginatedResponse<M2EntryRow>>(qs ? `/m2/logs?${qs}` : '/m2/logs');
  }

  async getM2Statistics(): Promise<ApiResponse<M2Statistics>> {
    return this.request<M2Statistics>('/m2/statistics');
  }

  async getM2ArticleSummary(articleId: string, logLimit = 30): Promise<ApiResponse<M2ArticleSummary>> {
    return this.request<M2ArticleSummary>(`/m2/articles/${articleId}/summary?logLimit=${logLimit}`);
  }

  async mergeM2ToM1(
    entryId: string,
    body: { quantity: number; remarks: string; transferItems?: TransferItem[] }
  ): Promise<ApiResponse<unknown>> {
    return this.request(`/m2/entries/${entryId}/merge-to-m1`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async transferM2ToM3(entryId: string, body: { quantity: number; remarks: string }): Promise<ApiResponse<unknown>> {
    return this.request(`/m2/entries/${entryId}/transfer-to-m3`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async transferM2ToM4(entryId: string, body: { quantity: number; remarks: string }): Promise<ApiResponse<unknown>> {
    return this.request(`/m2/entries/${entryId}/transfer-to-m4`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // M3 Management APIs (checking floors only)
  async getM3Articles(filters: {
    orderId?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<M3ArticlesResponse>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, String(value));
    });
    const qs = queryParams.toString();
    return this.request<M3ArticlesResponse>(qs ? `/m3/articles?${qs}` : '/m3/articles');
  }

  async getM3Logs(filters: {
    articleId?: string;
    orderId?: string;
    type?: 'ENTRY' | 'OUTWARD';
    sourceFloor?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<M3LogEntry>>> {
    const queryParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') queryParams.append(key, String(value));
    });
    const qs = queryParams.toString();
    return this.request<PaginatedResponse<M3LogEntry>>(qs ? `/m3/logs?${qs}` : '/m3/logs');
  }

  async getM3Statistics(): Promise<ApiResponse<M3Statistics>> {
    return this.request<M3Statistics>('/m3/statistics');
  }

  async getM3ArticleSummary(articleId: string, logLimit = 20): Promise<ApiResponse<M3ArticleSummary>> {
    return this.request<M3ArticleSummary>(`/m3/articles/${articleId}/summary?logLimit=${logLimit}`);
  }

  async markM3Outward(articleId: string, body: { quantity: number; remarks: string }): Promise<ApiResponse<{ article: M3ArticleRow; log: M3LogEntry }>> {
    return this.request(`/m3/articles/${articleId}/outward`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Bulk Operations APIs
  async bulkUpdateArticles(updates: {
    articleId: string;
    completedQuantity?: number;
    remarks?: string;
  }[], batchSize: number = 50): Promise<ApiResponse<any>> {
    return this.request('/bulk/update-articles', {
      method: 'POST',
      body: JSON.stringify({ updates, batchSize }),
    });
  }
}

export const productionService = new ProductionService();
