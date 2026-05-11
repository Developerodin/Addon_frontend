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

export type FloorIssueTransactionType = 'yarn_issued_linking' | 'yarn_issued_sampling';

/** Current tab only, or both linking + sampling transaction types. */
export type FloorIssueHistoryScope = 'tab' | 'all';

export interface FloorIssueConeRef {
  _id?: string;
  barcode?: string;
  boxId?: string;
  yarnName?: string;
}

export interface FloorIssueHistoryRow {
  _id: string;
  transactionType: string;
  transactionDate: string;
  yarnName: string;
  transactionNetWeight?: number;
  transactionTotalWeight?: number;
  transactionTearWeight?: number;
  transactionConeCount?: number;
  conesIdsArray?: Array<string | FloorIssueConeRef>;
  /** Set server-side on new floor issues; older rows may omit. */
  issuedByEmail?: string;
  createdAt?: string;
}

export interface FloorIssueHistoryPage {
  results: FloorIssueHistoryRow[];
  page: number;
  limit: number;
  totalResults: number;
  totalPages: number;
}

export interface FetchFloorIssueHistoryPagedParams {
  floor: 'linking' | 'sampling';
  scope: FloorIssueHistoryScope;
  yarnName?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Resolves comma-separated `transaction_type` for the list API from floor tab and scope.
 * @param floor - Active linking/sampling tab.
 * @param scope - Restrict to this tab's type or include both floor issue types.
 */
function transactionTypeParam(floor: 'linking' | 'sampling', scope: FloorIssueHistoryScope): string {
  if (scope === 'all') {
    return 'yarn_issued_linking,yarn_issued_sampling';
  }
  return floor === 'linking' ? 'yarn_issued_linking' : 'yarn_issued_sampling';
}

/**
 * Loads a paginated slice of yarn transactions for linking/sampling floor issues (newest first).
 */
export async function fetchFloorIssueHistoryPaged(
  params: FetchFloorIssueHistoryPagedParams
): Promise<FloorIssueHistoryPage> {
  const token = getToken();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const search = new URLSearchParams({
    paged: '1',
    light: '1',
    page: String(page),
    limit: String(limit),
    transaction_type: transactionTypeParam(params.floor, params.scope),
  });
  const yarn = params.yarnName?.trim();
  if (yarn) {
    search.set('yarn_name', yarn);
  }
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
        : 'Failed to load history';
    throw new Error(msg);
  }
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Array.isArray((data as FloorIssueHistoryPage).results)
  ) {
    throw new Error('Invalid history response');
  }
  const p = data as FloorIssueHistoryPage;
  return {
    results: p.results,
    page: p.page,
    limit: p.limit,
    totalResults: p.totalResults,
    totalPages: p.totalPages,
  };
}

/** Chunk size for export (API max 100). */
const EXPORT_PAGE_LIMIT = 100;

/** Hard cap so a runaway export does not hang the browser. */
const EXPORT_MAX_ROWS = 50_000;

export type FetchFloorIssueHistoryAllParams = Omit<FetchFloorIssueHistoryPagedParams, 'page' | 'limit'>;

/**
 * Loads all transactions matching the same filters as the UI, paging until complete.
 * @param params - Floor, scope, yarn name, and optional date range.
 * @returns Rows in API order (newest first per page).
 */
export async function fetchAllFloorIssueHistoryMatchingFilters(
  params: FetchFloorIssueHistoryAllParams
): Promise<FloorIssueHistoryRow[]> {
  const all: FloorIssueHistoryRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const chunk = await fetchFloorIssueHistoryPaged({
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
