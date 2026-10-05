import {
  whmsWarehouseOrders,
  type WarehouseOrder,
} from "@/shared/services/whmsWarehouseOrderService";
import { whmsScanning, type ScanSession } from "@/shared/services/whmsFulfilmentService";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/**
 * Walk every page of a paginated list.
 * @param fetchPage - Loads one page
 */
export async function fetchEveryPage<T>(
  fetchPage: (page: number) => Promise<{ results?: T[]; totalPages?: number }>,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages && page <= MAX_PAGES) {
    const res = await fetchPage(page);
    all.push(...(res.results || []));
    totalPages = res.totalPages || 1;
    page += 1;
  }
  return all;
}

/**
 * Order id on a scan session, whether the API returned a string or a populated ref.
 * @param session - Scan session row
 */
export function sessionOrderId(session: ScanSession): string {
  if (typeof session.orderId === "string") return session.orderId;
  if (session.orderId && typeof session.orderId === "object" && session.orderId.id) {
    return session.orderId.id;
  }
  return "";
}

/**
 * Every order currently in the scanning queue, honoring the search box.
 * @param q - Current search text
 */
export function fetchAllActiveScanOrders(q?: string): Promise<WarehouseOrder[]> {
  return fetchEveryPage((page) =>
    whmsWarehouseOrders.list({
      flowStatusIn: "sent-to-scanning,scanning-in-progress",
      sortBy: "createdAt:desc",
      page,
      limit: PAGE_SIZE,
      ...(q?.trim() ? { q: q.trim() } : {}),
    }),
  );
}

/**
 * Use a cached order from the table when we have it. Otherwise load it.
 * @param entries - Selected id plus optional already-loaded order
 */
export async function resolveOrders(
  entries: Array<readonly [string, WarehouseOrder | null]>,
): Promise<WarehouseOrder[]> {
  const out: WarehouseOrder[] = [];
  for (let index = 0; index < entries.length; index += 6) {
    const chunk = entries.slice(index, index + 6);
    const rows = await Promise.all(chunk.map(async ([id, order]) => order || whmsWarehouseOrders.get(id)));
    out.push(...rows);
  }
  return out;
}

/**
 * Orders behind every completed scan session matching the search.
 * @param q - Current search text
 */
export async function fetchAllHistoryScanOrders(q?: string): Promise<WarehouseOrder[]> {
  const sessions = await fetchEveryPage((page) =>
    whmsScanning.list({
      status: "completed",
      sortBy: "createdAt:desc",
      page,
      limit: PAGE_SIZE,
      ...(q?.trim() ? { q: q.trim() } : {}),
    }),
  );
  const ids = [...new Set(sessions.map(sessionOrderId).filter(Boolean))];
  return resolveOrders(ids.map((id) => [id, null] as const));
}
