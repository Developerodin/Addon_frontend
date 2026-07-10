/**
 * Website ↔ warehouse order sync API — `/v1/integrations/website-orders`.
 */
import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type { WarehouseOrder } from '@/shared/services/whmsWarehouseOrderService';

const INTEGRATIONS_BASE = `${API_BASE_URL}/integrations/website-orders`;

function getAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const t = Cookies.get('accessToken');
    if (t) return t;
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}

function getHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

/**
 * Authenticated request to website-order integration admin endpoints.
 * @param path
 * @param options
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error('No access token found. Please login again.');
  const res = await fetch(`${INTEGRATIONS_BASE}${path}`, {
    ...options,
    headers: getHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
        ? err.message
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

export type { WarehouseOrder };

export const whmsWebsiteOrderSync = {
  /**
   * Manually re-push the current warehouse order state to the website.
   * @param warehouseOrderId
   */
  retryPush: (warehouseOrderId: string) =>
    request<{ queued: boolean; processed?: number; sent?: number; failed?: number }>(
      `/${warehouseOrderId}/push`,
      { method: 'POST' },
    ),
};
