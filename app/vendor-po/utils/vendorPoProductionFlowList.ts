import type { VendorFloorKey } from "@/shared/services/vendorProductionFlowService";

/**
 * Per `vendor-production-flow-frontend-api.md` §1 — each floor screen should load flows
 * filtered by `currentFloorKey` so operators only see work at that stage.
 */
export function productionFlowListParams(floor: VendorFloorKey): {
  currentFloorKey: VendorFloorKey;
  limit: number;
} {
  return { currentFloorKey: floor, limit: 100 };
}
