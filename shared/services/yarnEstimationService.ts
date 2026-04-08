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

export interface EstimationArticle {
  articleId?: string;
  articleNumber: string;
  plannedQuantity: number;
  yarns: YarnDetail[];
  totals: YarnTotals;
}

export interface OrderEstimation {
  orderId: string;
  orderNumber: string;
  status: string;
  articles: EstimationArticle[];
  orderTotals: YarnTotals;
}

export interface SummaryOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  priority: string;
  articleCount: number;
  issued: YarnIssuedReturned;
  returned: YarnIssuedReturned;
  consumption: YarnConsumption;
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
    return this.makeRequest<OrderEstimation>(`/order/${encodeURIComponent(orderId)}${q}`);
  }

  async getByArticle(articleId: string, includeTransactions = false): Promise<ArticleEstimation> {
    const q = includeTransactions ? '?include_transactions=true' : '';
    return this.makeRequest<ArticleEstimation>(`/article/${encodeURIComponent(articleId)}${q}`);
  }
}

const yarnEstimationService = new YarnEstimationService();
export default yarnEstimationService;
