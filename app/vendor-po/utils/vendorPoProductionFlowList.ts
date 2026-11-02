import vendorProductionFlowService, {
  type VendorFloorKey,
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";

/** Page size for floor production-flow lists. Do not raise this into the thousands. */
const FLOOR_LIST_PAGE_SIZE = 100;

/** Stop if the API ignores `page` and keeps returning the same rows. */
const FLOOR_LIST_MAX_PAGES = 50;

/**
 * Follow-up pages after page 1. Four in flight matches a full extra wave at 500 rows
 * (pages 2–5) without opening one request per row.
 */
const FLOOR_LIST_PAGE_CONCURRENCY = 4;

/**
 * List payload. `totalPages` is set by the paginate plugin but omitted from the service's
 * declared return type, so callers narrow at the boundary.
 */
interface FloorProductionFlowPage {
  results?: VendorProductionFlow[];
  totalResults?: number;
  totalPages?: number;
}

/**
 * Per `vendor-production-flow-frontend-api.md` §1 — each floor screen should load flows
 * filtered by `currentFloorKey` so operators only see work at that stage.
 * @param floor - Floor key sent as `currentFloorKey`
 */
export function productionFlowListParams(floor: VendorFloorKey): {
  currentFloorKey: VendorFloorKey;
  limit: number;
} {
  return { currentFloorKey: floor, limit: FLOOR_LIST_PAGE_SIZE };
}

/**
 * Document id from a list row (`id` or Mongo `_id`).
 * @param flow - Production flow row from the list API
 */
function flowListId(flow: VendorProductionFlow): string {
  const raw = flow as VendorProductionFlow & { _id?: string };
  return raw.id || raw._id || "";
}

/**
 * Appends rows not already collected. Rows with an empty id cannot be deduped and are kept.
 * @param collected - Rows accumulated in page order
 * @param seen - Ids already appended
 * @param batch - One API page
 * @returns How many rows were appended
 */
function appendUnseenFlows(
  collected: VendorProductionFlow[],
  seen: Set<string>,
  batch: readonly VendorProductionFlow[],
): number {
  let added = 0;
  for (const flow of batch) {
    const id = flowListId(flow);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    collected.push(flow);
    added += 1;
  }
  return added;
}

/**
 * `totalPages` from paginate. Missing, non-finite, or &lt; 1 means the client must walk pages itself.
 * @param page - First list response
 */
function readTotalPages(page: FloorProductionFlowPage): number | undefined {
  const value = page.totalPages;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) return undefined;
  return Math.floor(value);
}

/**
 * Non-negative `totalResults`, when the payload includes it.
 * @param page - List response
 */
function readTotalResults(page: FloorProductionFlowPage): number | undefined {
  const value = page.totalResults;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/**
 * One floor list page. Errors propagate with the server message from `requestJson`.
 * @param floor - Floor key sent as `currentFloorKey`
 * @param page - 1-based page
 */
async function fetchFloorProductionFlowPage(
  floor: VendorFloorKey,
  page: number,
): Promise<FloorProductionFlowPage> {
  const data = await vendorProductionFlowService.list({
    currentFloorKey: floor,
    limit: FLOOR_LIST_PAGE_SIZE,
    page,
  });
  return data as FloorProductionFlowPage;
}

/**
 * Sequential walk used when the API omits `totalPages`. Stops on an empty page, a page that
 * adds no new ids, a short page, `totalResults`, or {@link FLOOR_LIST_MAX_PAGES}.
 * @param floor - Floor key sent as `currentFloorKey`
 * @param collected - Rows already kept from earlier pages
 * @param seen - Ids already appended
 * @param totalResults - Known total, or `Infinity` when the API did not send one
 * @param startPage - First page still to request
 */
async function collectFloorPagesSequentially(
  floor: VendorFloorKey,
  collected: VendorProductionFlow[],
  seen: Set<string>,
  totalResults: number,
  startPage: number,
): Promise<void> {
  let knownTotal = totalResults;
  for (let page = startPage; page <= FLOOR_LIST_MAX_PAGES; page += 1) {
    if (collected.length >= knownTotal) break;

    const data = await fetchFloorProductionFlowPage(floor, page);
    const nextTotal = readTotalResults(data);
    if (nextTotal != null) knownTotal = nextTotal;

    const batch = data.results ?? [];
    const added = appendUnseenFlows(collected, seen, batch);
    if (batch.length === 0 || added === 0 || batch.length < FLOOR_LIST_PAGE_SIZE) {
      break;
    }
  }
}

/**
 * Loads pages 2..N in chunks of {@link FLOOR_LIST_PAGE_CONCURRENCY}.
 * `Promise.all` rejects with the failed page's error, so a later-page failure throws
 * the server message instead of returning a partial floor list.
 * @param floor - Floor key sent as `currentFloorKey`
 * @param pageNumbers - Ascending page indexes; result order matches this array
 */
async function fetchRemainingFloorPages(
  floor: VendorFloorKey,
  pageNumbers: readonly number[],
): Promise<FloorProductionFlowPage[]> {
  const ordered: FloorProductionFlowPage[] = [];
  for (let offset = 0; offset < pageNumbers.length; offset += FLOOR_LIST_PAGE_CONCURRENCY) {
    const chunk = pageNumbers.slice(offset, offset + FLOOR_LIST_PAGE_CONCURRENCY);
    const pages = await Promise.all(
      chunk.map((page) => fetchFloorProductionFlowPage(floor, page)),
    );
    ordered.push(...pages);
  }
  return ordered;
}

/**
 * Last page to request. Uses the greater of `totalPages` and `ceil(totalResults / 100)`.
 * When `totalResults` is still larger than the first page, the last page is at least 2
 * so a short or under-reported page 1 does not drop the rest of the floor.
 * @param reportedPages - `totalPages` from page 1 (at least 1)
 * @param totalResults - `totalResults` from page 1, if present
 * @param firstBatchLength - Rows returned on page 1
 */
function resolveLastPage(
  reportedPages: number,
  totalResults: number | undefined,
  firstBatchLength: number,
): number {
  const pagesFromCount =
    totalResults == null ? 0 : Math.ceil(totalResults / FLOOR_LIST_PAGE_SIZE);
  let lastPage = Math.max(reportedPages, pagesFromCount);
  if (totalResults != null && totalResults > firstBatchLength) {
    lastPage = Math.max(lastPage, 2);
  }
  return Math.min(FLOOR_LIST_MAX_PAGES, lastPage);
}

/**
 * Loads every production-flow page for a floor.
 *
 * The list API sorts `createdAt` ascending and returns 100 rows per page. Newer accepted
 * batches sit past page 1 (example: invoice rank 121 of 140), so page 1 alone drops them.
 *
 * Expected HTTP requests when `totalPages` is present: `1 + ceil((n - 100) / 100)`.
 * Page 1 is awaited so the totals are known; remaining pages run together, concurrency 4.
 * 140 flows → 2 requests. 500 flows → 5 requests (pages 2–5 in one wave).
 * If `totalPages` is missing, pages are walked one-by-one with the previous stop rules.
 *
 * @param floor - Floor key sent as `currentFloorKey`
 */
export async function listAllProductionFlowsForFloor(
  floor: VendorFloorKey,
): Promise<VendorProductionFlow[]> {
  const collected: VendorProductionFlow[] = [];
  const seen = new Set<string>();

  const first = await fetchFloorProductionFlowPage(floor, 1);
  const firstBatch = first.results ?? [];
  appendUnseenFlows(collected, seen, firstBatch);

  const totalResults = readTotalResults(first);
  const reportedPages = readTotalPages(first);

  if (reportedPages == null) {
    const pageFilled = firstBatch.length >= FLOOR_LIST_PAGE_SIZE;
    const knownTotal = totalResults ?? Number.POSITIVE_INFINITY;
    if (pageFilled && collected.length < knownTotal) {
      await collectFloorPagesSequentially(floor, collected, seen, knownTotal, 2);
    }
    return collected;
  }

  const morePages =
    reportedPages > 1 || (totalResults != null && totalResults > firstBatch.length);
  if (!morePages) return collected;

  const lastPage = resolveLastPage(reportedPages, totalResults, firstBatch.length);
  if (lastPage <= 1) return collected;

  const pageNumbers: number[] = [];
  for (let page = 2; page <= lastPage; page += 1) pageNumbers.push(page);

  const rest = await fetchRemainingFloorPages(floor, pageNumbers);
  for (const page of rest) {
    appendUnseenFlows(collected, seen, page.results ?? []);
  }
  return collected;
}
