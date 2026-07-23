import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

const getToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
};

/** Single line on a vendor dispatch transfer note. */
export interface VendorDispatchTransferNoteLine {
  articleNumber: string;
  sapArticleNo: string;
  articleName: string;
  brand?: string;
  qtyInPairs: number;
  containerBarcodes?: string[];
  vpoNumber?: string;
  vendorName?: string;
  invoiceNumber?: string;
}

/** Persisted vendor dispatch stock transfer note. */
export interface VendorDispatchTransferNote {
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
  lines: VendorDispatchTransferNoteLine[];
  createdBy?: { name?: string; email?: string } | string;
  createdAt?: string;
}

export interface VendorDispatchTransferNotePreview {
  lines: VendorDispatchTransferNoteLine[];
  totalQty: number;
}

export interface VendorDispatchTransferNoteListPage {
  results: VendorDispatchTransferNote[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface VendorDispatchTransferNoteReportRow {
  stnSerial: string;
  stnDate: string;
  categoryLabel: string;
  totalQty: number;
  totalBoxes: number;
  vpoNumber: string;
  vendorName: string;
  invoiceNumber: string;
  articleNumber: string;
  sapArticleNo: string;
  articleName: string;
  brand: string;
  qtyInPairs: number;
  containerBarcodes: string;
  createdByName: string;
}

export interface VendorTransferNoteHistoryFilters {
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface VendorTransferNotePrintFilters {
  search?: string;
}

/**
 * Builds query string for vendor transfer note print scope.
 * @param filters - Optional search filter
 */
function buildFilterQuery(filters: VendorTransferNotePrintFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/**
 * Loads preview lines for the vendor print modal without creating an STN.
 * @param filters - Optional search filter
 */
export async function previewVendorDispatchTransferNote(
  filters: VendorTransferNotePrintFilters = {}
): Promise<VendorDispatchTransferNotePreview> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/vendor-management/dispatch/transfer-notes/preview${buildFilterQuery(filters)}`,
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
 * Creates a vendor dispatch transfer note from print-eligible pending qty.
 * @param categoryLabel - Label shown on the printed note
 * @param filters - Optional search filter
 */
export async function createVendorDispatchTransferNote(
  categoryLabel: string,
  filters: VendorTransferNotePrintFilters = {}
): Promise<VendorDispatchTransferNote> {
  const token = getToken();
  const qs = buildFilterQuery(filters);
  const res = await fetch(`${API_BASE_URL}/vendor-management/dispatch/transfer-notes${qs}`, {
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
 * Paginated vendor transfer note history.
 * @param filters - Date range, search, pagination
 */
export async function fetchVendorDispatchTransferNotes(
  filters: VendorTransferNoteHistoryFilters = {}
): Promise<VendorDispatchTransferNoteListPage> {
  const token = getToken();
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 20));

  const res = await fetch(
    `${API_BASE_URL}/vendor-management/dispatch/transfer-notes?${params.toString()}`,
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
 * Fetches one vendor transfer note by id for re-print.
 * @param transferNoteId - Mongo id
 */
export async function fetchVendorDispatchTransferNoteById(
  transferNoteId: string
): Promise<VendorDispatchTransferNote> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/vendor-management/dispatch/transfer-notes/${encodeURIComponent(transferNoteId)}`,
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
export async function fetchVendorDispatchTransferNoteReportRows(
  filters: Pick<VendorTransferNoteHistoryFilters, 'startDate' | 'endDate' | 'search'> = {}
): Promise<VendorDispatchTransferNoteReportRow[]> {
  const token = getToken();
  const params = new URLSearchParams();
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.search) params.set('search', filters.search);

  const qs = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/vendor-management/dispatch/transfer-notes/report${qs ? `?${qs}` : ''}`,
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
