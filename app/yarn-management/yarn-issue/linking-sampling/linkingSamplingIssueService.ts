import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type LinkingSamplingFloor = 'linking' | 'sampling';

export interface IssueConeForFloorPayload {
  barcode: string;
  floor: LinkingSamplingFloor;
  /** From POST /yarn-cones/floor-issue-batch */
  issueBatchId: string;
  totalWeight: number;
  totalTearWeight: number;
}

export interface FloorIssueBatchCreated {
  issueBatchId: string;
  floor: LinkingSamplingFloor;
  createdAt: string;
  issuedByEmail: string;
}

/**
 * Normalizes backend / proxy error JSON into a single user-facing string.
 * @param body - Parsed JSON or empty object
 * @param status - HTTP status when body has no message
 */
export function issueConeErrorMessageFromBody(body: unknown, status: number): string {
  if (!body || typeof body !== 'object') {
    return `Issue failed (${status})`;
  }
  const o = body as Record<string, unknown>;
  const msg = o.message;
  if (typeof msg === 'string' && msg.trim()) return msg.trim();
  if (Array.isArray(msg) && msg.length) {
    const parts = msg.filter((x): x is string => typeof x === 'string');
    if (parts.length) return parts.join('. ');
  }
  const err = o.error;
  if (typeof err === 'string' && err.trim()) return err.trim();
  return `Issue failed (${status})`;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
};

/**
 * Creates a floor-issue batch; returned id must be sent with each issue-for-floor call.
 */
export async function createFloorIssueBatch(floor: LinkingSamplingFloor): Promise<FloorIssueBatchCreated> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/yarn-management/yarn-cones/floor-issue-batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify({ floor }),
  });
  let data: unknown = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new Error(issueConeErrorMessageFromBody(data, res.status));
  }
  if (!data || typeof data !== 'object' || typeof (data as FloorIssueBatchCreated).issueBatchId !== 'string') {
    throw new Error('Invalid batch response');
  }
  return data as FloorIssueBatchCreated;
}

/**
 * Issues a scanned cone for linking or sampling (atomic transaction + cone update on server).
 */
export async function issueConeForFloor(payload: IssueConeForFloorPayload): Promise<unknown> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE_URL}/yarn-management/yarn-cones/issue-for-floor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  let data: unknown = {};
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = { message: text };
    }
  }
  if (!res.ok) {
    throw new Error(issueConeErrorMessageFromBody(data, res.status));
  }
  return data;
}
