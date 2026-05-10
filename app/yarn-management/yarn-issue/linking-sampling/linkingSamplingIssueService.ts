import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export type LinkingSamplingFloor = 'linking' | 'sampling';

export interface IssueConeForFloorPayload {
  barcode: string;
  floor: LinkingSamplingFloor;
  totalWeight: number;
  totalTearWeight: number;
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
  const data = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    throw new Error(data.message || `Issue failed (${res.status})`);
  }
  return data;
}
