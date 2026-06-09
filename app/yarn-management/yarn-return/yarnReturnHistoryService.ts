import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

/** History drawer: API max page size for `GET …/yarn-transactions`. */
export const YARN_RETURN_HISTORY_API_LIMIT = 100;

const EXPORT_PAGE_LIMIT = YARN_RETURN_HISTORY_API_LIMIT;
const EXPORT_MAX_ROWS = 50_000;

/** ISO date string `YYYY-MM-DD` for date inputs. */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Default return-history start date: 30 days before today (inclusive range).
 */
export function getDefaultReturnHistoryStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateInputValue(d);
}

/**
 * Default return-history end date: today.
 */
export function getDefaultReturnHistoryEndDate(): string {
  return toDateInputValue(new Date());
}

/**
 * Resolves the auth token from cookies or localStorage.
 */
function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

export interface YarnReturnHistoryRow {
  _id: string;
  orderno?: string;
  orderId?: string;
  yarnName: string;
  transactionType: string;
  transactionDate: string;
  transactionNetWeight: number;
  transactionTotalWeight: number;
  transactionTearWeight: number;
  transactionConeCount: number;
  createdAt: string;
  updatedAt: string;
  yarn?: {
    _id: string;
    yarnName: string;
    yarnType?: {
      name: string;
    };
  };
}

export interface YarnReturnHistoryPage {
  rows: YarnReturnHistoryRow[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface FetchYarnReturnHistoryPagedParams {
  page?: number;
  limit?: number;
  yarnName?: string;
  startDate?: string;
  endDate?: string;
}

export type FetchYarnReturnHistoryAllParams = Omit<
  FetchYarnReturnHistoryPagedParams,
  'page' | 'limit'
>;

/**
 * Resolves production order number from a return transaction row.
 */
export function ordernoFromReturnRow(row: YarnReturnHistoryRow): string {
  if (row.orderno?.trim()) return row.orderno.trim();
  const o = row.orderId;
  if (typeof o === 'string' && o.trim()) return o.trim();
  return '';
}

function historyTransactionTypeOf(t: {
  transactionType?: string;
  transaction_type?: string;
}): string {
  return String(t?.transactionType ?? t?.transaction_type ?? '').toLowerCase();
}

/**
 * Maps list API payloads into history rows for yarn_returned transactions.
 */
function normalizeReturnTransactionForHistory(
  raw: Record<string, unknown>
): YarnReturnHistoryRow {
  const yarnRaw = raw.yarn;
  const yarn =
    yarnRaw && typeof yarnRaw === 'object'
      ? (yarnRaw as YarnReturnHistoryRow['yarn'])
      : undefined;
  const yarnName =
    typeof raw.yarnName === 'string' && raw.yarnName.trim()
      ? raw.yarnName.trim()
      : yarn?.yarnName || 'Unknown';
  const id = String(raw._id ?? raw.id ?? '').trim();
  const txnType = String(raw.transactionType ?? raw.transaction_type ?? 'yarn_returned');
  const net = Number(raw.transactionNetWeight ?? raw.totalNetWeight ?? raw.netWeight ?? 0);
  const total = Number(raw.transactionTotalWeight ?? raw.totalWeight ?? 0);
  const tear = Number(raw.transactionTearWeight ?? raw.totalTearWeight ?? 0);
  const coneCt =
    Number(raw.transactionConeCount ?? raw.numberOfCones ?? raw.conesCount ?? 1) || 1;
  const dateRaw = raw.transactionDate ?? raw.createdAt ?? raw.updatedAt;
  const transactionDate =
    typeof dateRaw === 'string' || typeof dateRaw === 'number'
      ? new Date(dateRaw).toISOString()
      : new Date().toISOString();
  const createdAt =
    typeof raw.createdAt === 'string' ? raw.createdAt : transactionDate;
  const updatedAt =
    typeof raw.updatedAt === 'string' ? raw.updatedAt : transactionDate;

  const oidRaw = raw.orderId;
  let orderIdStr: string | undefined;
  if (typeof oidRaw === 'string') orderIdStr = oidRaw;
  else if (oidRaw && typeof oidRaw === 'object') {
    const o = oidRaw as { _id?: unknown; id?: unknown };
    orderIdStr =
      typeof o._id === 'string' ? o._id : typeof o.id === 'string' ? o.id : undefined;
  }

  return {
    _id: id || `tx-${transactionDate}-${Math.random().toString(36).slice(2)}`,
    orderno:
      typeof raw.orderno === 'string'
        ? raw.orderno
        : typeof (raw as { orderNo?: string }).orderNo === 'string'
          ? (raw as { orderNo: string }).orderNo
          : undefined,
    orderId: orderIdStr,
    yarnName,
    transactionType: txnType,
    transactionDate,
    transactionNetWeight: Number.isFinite(net) ? net : 0,
    transactionTotalWeight: Number.isFinite(total) ? total : 0,
    transactionTearWeight: Number.isFinite(tear) ? tear : 0,
    transactionConeCount: coneCt,
    createdAt,
    updatedAt,
    yarn,
  };
}

/**
 * Parses paged `GET …/yarn-transactions` envelope into return history rows.
 */
function normalizeYarnReturnedHistoryPage(
  data: unknown,
  requestedPage: number,
  limit: number
): YarnReturnHistoryPage {
  const empty: YarnReturnHistoryPage = {
    rows: [],
    page: Math.max(1, requestedPage),
    limit,
    totalResults: 0,
    totalPages: 0,
  };
  if (data == null) return empty;

  let page = Math.max(1, requestedPage);
  let totalResults = 0;
  let totalPages = 0;
  let rawList: unknown[] = [];

  if (typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;
    const p = o.page;
    if (typeof p === 'number' && Number.isFinite(p)) page = Math.max(1, p);
    else if (typeof p === 'string') {
      const n = Number(p);
      if (Number.isFinite(n)) page = Math.max(1, n);
    }
    const tr = o.totalResults ?? o.total;
    if (typeof tr === 'number' && Number.isFinite(tr)) totalResults = tr;
    else if (typeof tr === 'string') {
      const n = Number(tr);
      if (Number.isFinite(n)) totalResults = n;
    }
    const tp = o.totalPages;
    if (typeof tp === 'number' && Number.isFinite(tp)) totalPages = Math.max(0, tp);
    else if (typeof tp === 'string') {
      const n = Number(tp);
      if (Number.isFinite(n)) totalPages = Math.max(0, n);
    }
    if (Array.isArray(o.results)) rawList = o.results;
  }

  const typeOf = historyTransactionTypeOf;
  const items = rawList.filter(
    (t) =>
      t &&
      typeof t === 'object' &&
      typeOf(t as { transactionType?: string; transaction_type?: string }) === 'yarn_returned'
  );

  const seen = new Set<string>();
  const rows: YarnReturnHistoryRow[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const row = normalizeReturnTransactionForHistory(item as Record<string, unknown>);
    if (!row._id || seen.has(row._id)) continue;
    seen.add(row._id);
    rows.push(row);
  }

  const effLimit = Math.min(Math.max(limit, 1), YARN_RETURN_HISTORY_API_LIMIT);
  let effTotal = totalResults > 0 ? totalResults : rows.length;
  let effPages = totalPages > 0 ? totalPages : effTotal > 0 ? Math.ceil(effTotal / effLimit) : 0;
  if (effPages === 0 && rows.length > 0) effPages = 1;
  if (effTotal === 0 && rows.length > 0) effTotal = rows.length;

  return {
    rows,
    page,
    limit: effLimit,
    totalResults: effTotal,
    totalPages: effPages,
  };
}

/**
 * Loads a paginated slice of `yarn_returned` transactions (newest first).
 */
export async function fetchYarnReturnHistoryPaged(
  params: FetchYarnReturnHistoryPagedParams
): Promise<YarnReturnHistoryPage> {
  const token = getToken();
  const pageNum = Math.max(1, Math.floor(params.page ?? 1) || 1);
  const limit = Math.min(
    Math.max(params.limit ?? YARN_RETURN_HISTORY_API_LIMIT, 1),
    YARN_RETURN_HISTORY_API_LIMIT
  );

  const buildSearch = (includeOptionFilters: boolean) => {
    const search = new URLSearchParams({
      paged: '1',
      page: String(pageNum),
      limit: String(limit),
      transaction_type: 'yarn_returned',
    });
    if (includeOptionFilters) {
      const y = params.yarnName?.trim();
      if (y) search.set('yarn_name', y);
      const sd = params.startDate?.trim();
      const ed = params.endDate?.trim();
      if (sd) search.set('start_date', sd);
      if (ed) search.set('end_date', ed);
    }
    return search;
  };

  let res = await fetch(
    `${API_BASE_URL}/yarn-management/yarn-transactions?${buildSearch(true).toString()}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    res = await fetch(
      `${API_BASE_URL}/yarn-management/yarn-transactions?${buildSearch(false).toString()}`,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as unknown;
    const msg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : 'Failed to load return history';
    throw new Error(msg);
  }

  const data = await res.json();
  return normalizeYarnReturnedHistoryPage(data, pageNum, limit);
}

/**
 * Loads all `yarn_returned` rows matching filters by paging until complete (for CSV export).
 */
export async function fetchAllYarnReturnHistoryMatchingFilters(
  params: FetchYarnReturnHistoryAllParams
): Promise<YarnReturnHistoryRow[]> {
  const all: YarnReturnHistoryRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const chunk = await fetchYarnReturnHistoryPaged({
      ...params,
      page,
      limit: EXPORT_PAGE_LIMIT,
    });
    all.push(...chunk.rows);
    totalPages = chunk.totalPages;
    page += 1;
    if (all.length >= EXPORT_MAX_ROWS) {
      break;
    }
  } while (page <= totalPages);

  return all;
}
