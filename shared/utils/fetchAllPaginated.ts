type PaginatedPayload<T> = { results?: T[]; totalPages?: number };

type PaginatedApiResponse<T> =
  | PaginatedPayload<T>
  | { success?: boolean; data?: PaginatedPayload<T> };

/**
 * Normalize production (`{ success, data }`) and vendor (`{ results }`) paginated responses.
 * @param res - Raw paginated API response
 */
function unwrapPaginatedPayload<T>(res: PaginatedApiResponse<T>): PaginatedPayload<T> | null {
  if ("data" in res && res.data) return res.data;
  if ("results" in res || "totalPages" in res) return res;
  if ("success" in res && res.success === false) return null;
  return null;
}

/**
 * Fetch all pages from a paginated API (used for Excel exports).
 * @param fetchPage - Function that loads one page of results
 * @param pageSize - Page size per request (default 1000, backend max for M2/M3/M4)
 */
export async function fetchAllPaginatedResults<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedApiResponse<T>>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const res = await fetchPage(page, pageSize);
    const payload = unwrapPaginatedPayload(res);
    if (!payload) break;
    all.push(...(payload.results ?? []));
    totalPages = payload.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return all;
}
