import type { FinalCheckingFloorQuantity } from "@/shared/services/vendorProductionFlowService";

/**
 * Unclassified qty still on Final QC: received minus all M1/M2/M3/M4 buckets.
 * Aligns with secondary checking and backend `computeRemainingForFloor`.
 * @param fc - Final checking floor snapshot from API
 */
export function getVendorFinalCheckingRemaining(
  fc?: FinalCheckingFloorQuantity | null,
): number {
  if (!fc) return 0;
  const received = Math.max(0, Number(fc.received) || 0);
  const m1 = Math.max(0, Number(fc.m1Quantity) || 0);
  const m2 = Math.max(0, Number(fc.m2Quantity) || 0);
  const m3 = Math.max(0, Number(fc.m3Quantity) || 0);
  const m4 = Math.max(0, Number(fc.m4Quantity) || 0);
  return Math.max(0, received - m1 - m2 - m3 - m4);
}
