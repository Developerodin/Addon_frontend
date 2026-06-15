import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type VendorPoReturnStatus = 'pending_session' | 'completed' | 'cancelled';
export type VendorPoReturnCancellationIntent = 'partial' | 'full_vpo';

export interface VendorPoReturnBoxPreview {
  barcode: string;
  boxId: string;
  lotNumber: string;
  productName: string;
  vendorCode?: string;
  numberOfUnits: number;
}

export interface VendorPoReturnPendingM4Line {
  vendorProductionFlowId: string;
  lotNumber: string;
  m4Quantity: number;
}

export interface VendorPoReturnPendingArticleQtyLine {
  vendorProductionFlowId: string;
  lotNumber: string;
  quantity: number;
  productName?: string;
  vendorCode?: string;
  referenceCode?: string;
  verifiedAvailable?: number;
  breakdown?: { m1: number; m2: number; m3: number; m4: number };
}

export interface VendorPoReturnSession {
  id?: string;
  _id?: string;
  vpoNumber: string;
  vendorPurchaseOrder: string;
  status: VendorPoReturnStatus;
  remark?: string;
  cancellationIntent: VendorPoReturnCancellationIntent;
  pendingBarcodes?: string[];
  pendingM4Lines?: VendorPoReturnPendingM4Line[];
  pendingArticleQtyLines?: VendorPoReturnPendingArticleQtyLine[];
  completedAt?: string;
}

/** @deprecated Legacy M4-only candidate shape */
export interface VendorPoReturnM4Candidate {
  flowId: string;
  referenceCode: string;
  productName: string;
  vendorCode: string;
  m4Available: number;
}

export interface VendorPoReturnArticleCandidate {
  flowId: string;
  referenceCode: string;
  productName: string;
  vendorCode: string;
  productId?: string;
  verifiedAvailable: number;
  breakdown: { m1: number; m2: number; m3: number; m4: number };
}

export interface VendorPoReturnFinalizeResult {
  vendorReturn: VendorPoReturnSession;
  challan?: { id?: string; challanNumber?: string };
  idempotent?: boolean;
}

const getAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return (
      Cookies.get('accessToken') ||
      Cookies.get('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('token')
    );
  } catch {
    return null;
  }
};

/**
 * Authenticated request to vendor PO return session API.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('No access token found. Please login again.');

  const response = await fetch(`${API_BASE_URL}/vendor-management/vendor-returns${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error('Authentication failed. Please login again.');
    throw new Error((data as { message?: string })?.message || `Vendor return API error: ${response.status}`);
  }

  if (response.status === 204) return {} as T;
  return (await response.json()) as T;
}

class VendorPoReturnService {
  /**
   * Start a new vendor PO return scan session.
   */
  async createSession(payload: {
    vpoNumber: string;
    remark?: string;
    cancellationIntent?: VendorPoReturnCancellationIntent;
  }): Promise<VendorPoReturnSession> {
    return request<VendorPoReturnSession>('/sessions', {
      method: 'POST',
      body: JSON.stringify({
        vpoNumber: payload.vpoNumber,
        remark: payload.remark ?? '',
        cancellationIntent: payload.cancellationIntent ?? 'partial',
      }),
    });
  }

  /**
   * Load session with pending box previews and article qty lines.
   */
  async getSession(sessionId: string): Promise<{
    session: VendorPoReturnSession;
    pendingRows: VendorPoReturnBoxPreview[];
    pendingM4Lines: VendorPoReturnPendingM4Line[];
    pendingArticleQtyLines: VendorPoReturnPendingArticleQtyLine[];
  }> {
    return request(`/sessions/${encodeURIComponent(sessionId)}`);
  }

  /**
   * Scan a box barcode into the session.
   */
  async scanBarcode(
    sessionId: string,
    barcode: string
  ): Promise<{ session: VendorPoReturnSession; boxPreview: VendorPoReturnBoxPreview }> {
    return request(`/sessions/${encodeURIComponent(sessionId)}/scan`, {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    });
  }

  /**
   * Remove a pending barcode from the session.
   */
  async removeBarcode(sessionId: string, barcode: string): Promise<VendorPoReturnSession> {
    const q = new URLSearchParams({ barcode });
    return request(`/sessions/${encodeURIComponent(sessionId)}/scan?${q.toString()}`, {
      method: 'DELETE',
    });
  }

  /**
   * Stage or update verified article return quantity for a production flow.
   */
  async addArticleQtyLine(
    sessionId: string,
    payload: { vendorProductionFlowId: string; quantity: number; lotNumber?: string }
  ): Promise<VendorPoReturnSession> {
    return request(`/sessions/${encodeURIComponent(sessionId)}/article-qty-lines`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Remove a staged article qty line from the session.
   */
  async removeArticleQtyLine(
    sessionId: string,
    vendorProductionFlowId: string
  ): Promise<VendorPoReturnSession> {
    const q = new URLSearchParams({ vendorProductionFlowId });
    return request(`/sessions/${encodeURIComponent(sessionId)}/article-qty-lines?${q.toString()}`, {
      method: 'DELETE',
    });
  }

  /**
   * Stage or update M4 return quantity for a production flow (legacy).
   */
  async addM4Line(
    sessionId: string,
    payload: { vendorProductionFlowId: string; m4Quantity: number; lotNumber?: string }
  ): Promise<VendorPoReturnSession> {
    return request(`/sessions/${encodeURIComponent(sessionId)}/m4-lines`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Remove a staged M4 line from the session.
   */
  async removeM4Line(sessionId: string, vendorProductionFlowId: string): Promise<VendorPoReturnSession> {
    const q = new URLSearchParams({ vendorProductionFlowId });
    return request(`/sessions/${encodeURIComponent(sessionId)}/m4-lines?${q.toString()}`, {
      method: 'DELETE',
    });
  }

  /**
   * Finalize session, mark boxes returned, issue challan.
   */
  async finalizeSession(sessionId: string, idempotencyKey?: string): Promise<VendorPoReturnFinalizeResult> {
    return request(`/sessions/${encodeURIComponent(sessionId)}/finalize`, {
      method: 'POST',
      body: JSON.stringify(idempotencyKey ? { idempotencyKey } : {}),
    });
  }

  /**
   * List completed return sessions.
   */
  async listHistory(params: { vpoNumber?: string; limit?: number } = {}): Promise<{
    results: VendorPoReturnSession[];
  }> {
    const search = new URLSearchParams();
    if (params.vpoNumber) search.set('vpoNumber', params.vpoNumber);
    if (params.limit != null) search.set('limit', String(params.limit));
    const q = search.toString();
    return request(q ? `/history?${q}` : '/history');
  }

  /**
   * Production flows with verified SC qty available for article return on a VPO.
   */
  async getArticleCandidates(vpoNumber: string): Promise<{ results: VendorPoReturnArticleCandidate[] }> {
    const q = new URLSearchParams({ vpoNumber });
    return request(`/article-candidates?${q.toString()}`);
  }

  /**
   * Production flows with M4 qty available for return on a VPO (legacy).
   */
  async getM4Candidates(vpoNumber: string): Promise<{ results: VendorPoReturnM4Candidate[] }> {
    const q = new URLSearchParams({ vpoNumber });
    return request(`/m4-candidates?${q.toString()}`);
  }
}

const vendorPoReturnService = new VendorPoReturnService();
export default vendorPoReturnService;
