import { API_BASE_URL } from '@/shared/data/utilities/api';
import type { FloorOrderFilters } from '@/shared/services/productionService';
import Cookies from 'js-cookie';

const getToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
};

/** Single line on a persisted or preview transfer note. */
export interface DispatchTransferNoteLine {
  articleNumber: string;
  sapArticleNo: string;
  articleName: string;
  brand?: string;
  qtyInPairs: number;
  containerBarcodes?: string[];
}

/** Persisted dispatch stock transfer note. */
export interface DispatchTransferNote {
  id?: string;
  _id?: string;
  stnSerial: string;
  stnDate: string;
  categoryLabel: string;
  fromUnit: string;
  toUnit: string;
  totalQty: number;
  totalBoxes: number;
  status: string;
  lines: DispatchTransferNoteLine[];
  createdBy?: { name?: string; email?: string } | string;
  createdAt?: string;
}

export interface DispatchTransferNotePreview {
  lines: DispatchTransferNoteLine[];
  totalQty: number;
}

export interface DispatchTransferNoteListPage {
  results: DispatchTransferNote[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface DispatchTransferNoteReportRow {
  stnSerial: string;
  stnDate: string;
  categoryLabel: string;
  totalQty: number;
  totalBoxes: number;
  articleNumber: string;
  sapArticleNo: string;
  articleName: string;
  brand: string;
  qtyInPairs: number;
  containerBarcodes: string;
  createdByName: string;
}

export interface TransferNoteHistoryFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Builds query string from floor order filters (pending print scope).
 * @param filters - Dispatch floor catalog filters
 */
function buildFloorFilterQuery(filters: FloorOrderFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Loads preview lines for the print modal without creating an STN.
 * @param filters - Optional dispatch floor filters
 */
export async function previewDispatchTransferNote(
  filters: FloorOrderFilters = {}
): Promise<DispatchTransferNotePreview> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/production/floors/Dispatch/transfer-notes/preview${buildFloorFilterQuery(filters)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to load transfer note preview');
  }
  return res.json();
}

/**
 * Creates a transfer note from current print-eligible pending qty.
 * @param categoryLabel - Label shown on the printed note
 * @param filters - Optional dispatch floor filters
 */
export async function createDispatchTransferNote(
  categoryLabel: string,
  filters: FloorOrderFilters = {}
): Promise<DispatchTransferNote> {
  const token = getToken();
  const qs = buildFloorFilterQuery(filters);
  const res = await fetch(`${API_BASE_URL}/production/floors/Dispatch/transfer-notes${qs}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ categoryLabel }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to create transfer note');
  }
  return res.json();
}

/**
 * Paginated transfer note history.
 * @param filters - Date range, search, pagination
 */
export async function fetchDispatchTransferNotes(
  filters: TransferNoteHistoryFilters = {}
): Promise<DispatchTransferNoteListPage> {
  const token = getToken();
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));

  const res = await fetch(
    `${API_BASE_URL}/production/floors/Dispatch/transfer-notes?${params.toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to load transfer notes');
  }
  return res.json();
}

/**
 * Fetches one transfer note by id for re-print.
 * @param transferNoteId - Mongo id
 */
export async function fetchDispatchTransferNoteById(
  transferNoteId: string
): Promise<DispatchTransferNote> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/production/floors/Dispatch/transfer-notes/${encodeURIComponent(transferNoteId)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to load transfer note');
  }
  return res.json();
}

/**
 * Flat report rows for Excel export.
 * @param filters - Date range and search
 */
export async function fetchDispatchTransferNoteReportRows(
  filters: Pick<TransferNoteHistoryFilters, 'startDate' | 'endDate' | 'search'> = {}
): Promise<DispatchTransferNoteReportRow[]> {
  const token = getToken();
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);

  const qs = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/production/floors/Dispatch/transfer-notes/report${qs ? `?${qs}` : ''}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to load transfer note report');
  }
  const data = await res.json();
  return data.results ?? [];
}
