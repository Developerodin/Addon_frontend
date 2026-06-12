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

/** ISO date string `YYYY-MM-DD` for date inputs. */
function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Default activity-log start date: 30 days before today (inclusive range).
 */
export function getDefaultActivityLogStartDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return toDateInputValue(d);
}

/**
 * Default activity-log end date: today.
 */
export function getDefaultActivityLogEndDate(): string {
  return toDateInputValue(new Date());
}

export interface YarnIssueActivityLogConeRef {
  _id: string;
  barcode?: string;
  boxId?: string;
  yarnName?: string;
}

export interface YarnIssueActivityLogRow {
  _id: string;
  yarn?: {
    _id: string;
    status?: string;
    yarnType?: {
      status?: string;
      _id: string;
      name: string;
    };
    yarnName?: string;
  };
  yarnCatalogId?: {
    _id: string;
    status?: string;
    yarnType?: {
      status?: string;
      _id: string;
      name: string;
    };
    yarnName?: string;
  };
  yarnName: string;
  transactionType: string;
  transactionDate: string;
  transactionNetWeight: number;
  transactionTotalWeight: number;
  transactionTearWeight: number;
  transactionConeCount: number;
  conesIdsArray?: Array<string | YarnIssueActivityLogConeRef>;
  orderId?: string;
  orderno: string;
  articleId?: string;
  articleNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface YarnIssueActivityLogPage {
  results: YarnIssueActivityLogRow[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface FetchYarnIssueActivityLogPagedParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Loads a paginated slice of `yarn_issued` transactions (newest first).
 */
export async function fetchYarnIssueActivityLogPaged(
  params: FetchYarnIssueActivityLogPagedParams
): Promise<YarnIssueActivityLogPage> {
  const token = getToken();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const search = new URLSearchParams({
    paged: '1',
    page: String(page),
    limit: String(limit),
    transaction_type: 'yarn_issued',
  });
  if (params.startDate?.trim()) {
    search.set('start_date', params.startDate.trim());
  }
  if (params.endDate?.trim()) {
    search.set('end_date', params.endDate.trim());
  }

  const res = await fetch(`${API_BASE_URL}/yarn-management/yarn-transactions?${search}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : 'Failed to load activity log';
    throw new Error(msg);
  }
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Array.isArray((data as YarnIssueActivityLogPage).results)
  ) {
    throw new Error('Invalid activity log response');
  }
  const p = data as YarnIssueActivityLogPage;
  return {
    results: p.results,
    page: p.page,
    limit: p.limit,
    totalResults: p.totalResults,
    totalPages: p.totalPages,
  };
}

const EXPORT_PAGE_LIMIT = 100;
const EXPORT_MAX_ROWS = 50_000;

export type FetchYarnIssueActivityLogAllParams = Omit<
  FetchYarnIssueActivityLogPagedParams,
  'page' | 'limit'
>;

/**
 * Loads all `yarn_issued` rows matching filters by paging until complete (for Excel export).
 */
export async function fetchAllYarnIssueActivityLogMatchingFilters(
  params: FetchYarnIssueActivityLogAllParams
): Promise<YarnIssueActivityLogRow[]> {
  const all: YarnIssueActivityLogRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const chunk = await fetchYarnIssueActivityLogPaged({
      ...params,
      page,
      limit: EXPORT_PAGE_LIMIT,
    });
    all.push(...chunk.results);
    totalPages = chunk.totalPages;
    page += 1;
    if (all.length >= EXPORT_MAX_ROWS) {
      break;
    }
  } while (page <= totalPages);

  return all;
}
