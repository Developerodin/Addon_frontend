import vendorProductionFlowService, {
  type VendorFloorKey,
  type VendorProductionFlow,
} from "@/shared/services/vendorProductionFlowService";

/** Page size for floor production-flow lists. */
const FLOOR_LIST_PAGE_SIZE = 100;

/** Stop if the API ignores `page` and keeps returning the same rows. */
const FLOOR_LIST_MAX_PAGES = 50;

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
 * Loads every production-flow page for a floor.
 * The list API returns the oldest 100 rows first. Newer accepted batches sit past that
 * page, so article search never sees them unless we follow `totalResults`.
 * @param floor - Floor key sent as `currentFloorKey`
 */
export async function listAllProductionFlowsForFloor(
  floor: VendorFloorKey,
): Promise<VendorProductionFlow[]> {
  const collected: VendorProductionFlow[] = [];
  const seen = new Set<string>();
  let totalResults = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= FLOOR_LIST_MAX_PAGES; page += 1) {
    if (collected.length >= totalResults) break;

    const data = await vendorProductionFlowService.list({
      currentFloorKey: floor,
      limit: FLOOR_LIST_PAGE_SIZE,
      page,
    });
    const batch = data.results ?? [];
    if (typeof data.totalResults === "number" && data.totalResults >= 0) {
      totalResults = data.totalResults;
    }

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

    if (batch.length === 0 || added === 0 || batch.length < FLOOR_LIST_PAGE_SIZE) {
      break;
    }
  }

  return collected;
}
