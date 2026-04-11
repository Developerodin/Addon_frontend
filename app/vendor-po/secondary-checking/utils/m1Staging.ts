import type { VendorProductionFlow } from "@/shared/services/vendorProductionFlowService";
import type { ContainerMaster } from "@/shared/services/containersMasterService";

/**
 * M1 units still available to stage to Branding.
 * - If `m1Quantity > 0`, uses `m1Quantity − m1Transferred` (authoritative for split batches).
 * - Else uses API `m1Remaining` when present.
 * - Else uses floor `remaining` (received − transferred at SC) when M1 totals are not set yet.
 */
export function m1RemainingForTransfer(
  sc: VendorProductionFlow["floorQuantities"]["secondaryChecking"],
): number {
  const m1 = Number(sc.m1Quantity ?? 0);
  const tr = Number(sc.m1Transferred ?? 0);
  const calc = Math.max(0, Math.floor(m1 - tr));
  if (m1 > 0) {
    return calc;
  }
  const fromApi = Number(sc.m1Remaining);
  if (Number.isFinite(fromApi) && fromApi >= 0) {
    return Math.floor(fromApi);
  }
  const rem = Number(sc.remaining);
  if (Number.isFinite(rem) && rem >= 0) {
    return Math.floor(rem);
  }
  return 0;
}

export function containerRef(c: ContainerMaster): string {
  const b = c.barcode?.trim();
  if (b) return b;
  return String(c._id ?? "").trim();
}
