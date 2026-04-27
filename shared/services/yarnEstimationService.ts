import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface YarnIssuedReturned {
  totalWeight: number;
  netWeight: number;
  tearWeight: number;
  cones: number;
  count: number;
}

export interface YarnConsumption {
  totalWeight: number;
  netWeight: number;
  tearWeight: number;
  cones: number;
}

export interface YarnTotals {
  issued: YarnIssuedReturned;
  returned: YarnIssuedReturned;
  consumption: YarnConsumption;
}

export interface YarnDetail {
  yarnCatalogId?: string;
  yarnName: string;
  bomQuantity: number;
  issued: YarnIssuedReturned;
  returned: YarnIssuedReturned;
  consumption: YarnConsumption;
  transactions?: any[];
}

export interface FloorProgressKnitting {
  received: number;
  completed: number;
  transferred: number;
  remaining: number;
  weight: number;
  m4Quantity: number;
}

export interface FloorProgressKnitToLinking {
  /** Same as `knitting.completed` (pair with batch weight for knit → linking handoff). */
  knittingCompleted: number;
  batchWeightFromKnitting: number;
}

export interface FloorProgress {
  linkingType: string | null;
  currentFloor: string | null;
  linkingFloorInFlow: boolean;
  plannedQuantity: number;
  knitting: FloorProgressKnitting;
  knitToLinking: FloorProgressKnitToLinking;
}

export interface OrderFloorProgress {
  plannedQuantityTotal: number;
  /** Sum of `floorProgress.knitting.completed` across articles. */
  knittingCompletedTotal: number;
  knittingBatchWeightTotal: number;
}

export interface EstimationArticle {
  articleId?: string;
  articleNumber: string;
  plannedQuantity: number;
  yarns: YarnDetail[];
  totals: YarnTotals;
  floorProgress?: FloorProgress | null;
}

export interface OrderEstimation {
  orderId: string;
  orderNumber: string;
  status: string;
  articles: EstimationArticle[];
  orderTotals: YarnTotals;
  orderFloorProgress?: OrderFloorProgress | null;
}

export interface SummaryOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  priority: string;
  articleCount: number;
  /**
   * Summary-only floor totals. Backend may send these at the root of each result, or nested in `orderFloorProgress`.
   */
  orderFloorProgress?: OrderFloorProgress | null;
  plannedQuantityTotal?: number;
  knittingCompletedTotal?: number;
  knittingBatchWeightTotal?: number;
  issued: YarnIssuedReturned;
  returned: YarnIssuedReturned;
  consumption: YarnConsumption;
}

/** Summary row floor metrics: nested `orderFloorProgress` overrides root-level fields when present. */
export function summaryOrderFloorTotals(row: SummaryOrder): {
  plannedQuantityTotal?: number;
  knittingCompletedTotal?: number;
  knittingBatchWeightTotal?: number;
} {
  const n = row.orderFloorProgress;
  const pick = (nested: number | undefined, flat: number | undefined): number | undefined => {
    if (typeof nested === "number" && Number.isFinite(nested)) return nested;
    if (typeof flat === "number" && Number.isFinite(flat)) return flat;
    return undefined;
  };
  return {
    plannedQuantityTotal: pick(n?.plannedQuantityTotal, row.plannedQuantityTotal),
    knittingCompletedTotal: pick(n?.knittingCompletedTotal, row.knittingCompletedTotal),
    knittingBatchWeightTotal: pick(n?.knittingBatchWeightTotal, row.knittingBatchWeightTotal),
  };
}

export interface EstimationSummaryResponse {
  results: SummaryOrder[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ArticleEstimation {
  articleId: string;
  articleNumber: string;
  plannedQuantity: number;
  yarns: YarnDetail[];
  totals: YarnTotals;
  floorProgress?: FloorProgress | null;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const tokenFromCookie = Cookies.get('accessToken');
    if (tokenFromCookie) return tokenFromCookie;
    const tokenFromStorage = localStorage.getItem('token');
    if (tokenFromStorage) return tokenFromStorage;
    return null;
  } catch {
    return null;
  }
};

class YarnEstimationService {
  private baseURL = `${API_BASE_URL}/yarn-management/yarn-estimation`;

  private buildHeaders(): HeadersInit {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /** Maps legacy `linkingWeightTotal` to `knittingBatchWeightTotal` when needed. */
  private normalizeOrderPayload(raw: OrderEstimation): OrderEstimation {
    const ofp = raw.orderFloorProgress as
      | (OrderFloorProgress & { linkingWeightTotal?: number })
      | null
      | undefined;
    if (!ofp) return raw;
    const knittingBatchWeightTotal =
      typeof ofp.knittingBatchWeightTotal === "number"
        ? ofp.knittingBatchWeightTotal
        : typeof ofp.linkingWeightTotal === "number"
          ? ofp.linkingWeightTotal
          : 0;
    const plannedQuantityTotal =
      typeof ofp.plannedQuantityTotal === "number" ? ofp.plannedQuantityTotal : 0;
    const knittingCompletedTotal =
      typeof ofp.knittingCompletedTotal === "number" ? ofp.knittingCompletedTotal : 0;
    return {
      ...raw,
      orderFloorProgress: {
        plannedQuantityTotal,
        knittingCompletedTotal,
        knittingBatchWeightTotal,
      },
    };
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(url, { headers: this.buildHeaders() });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) throw new Error('Authentication failed. Please login again.');
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return (await response.json()) as T;
  }

  async getSummary(params: { page?: number; limit?: number } = {}): Promise<EstimationSummaryResponse> {
    const sp = new URLSearchParams();
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));
    const q = sp.toString();
    return this.makeRequest<EstimationSummaryResponse>(`/summary${q ? `?${q}` : ''}`);
  }

  async getByOrder(orderId: string, includeTransactions = false): Promise<OrderEstimation> {
    const q = includeTransactions ? '?include_transactions=true' : '';
    const raw = await this.makeRequest<OrderEstimation>(`/order/${encodeURIComponent(orderId)}${q}`);
    return this.normalizeOrderPayload(raw);
  }

  async getByArticle(articleId: string, includeTransactions = false): Promise<ArticleEstimation> {
    const q = includeTransactions ? '?include_transactions=true' : '';
    return this.makeRequest<ArticleEstimation>(`/article/${encodeURIComponent(articleId)}${q}`);
  }
}

const yarnEstimationService = new YarnEstimationService();
export default yarnEstimationService;
