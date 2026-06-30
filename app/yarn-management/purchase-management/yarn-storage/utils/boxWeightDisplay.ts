import { BoxInSlot, ConeInSlot } from "@/shared/services/storageSlotService";

/**
 * Resolves box net weight (kg). `boxWeight` is net in the canonical schema;
 * falls back to boxWeight − tearweight when legacy rows stored gross in boxWeight.
 * @param box - Box in a storage slot
 * @returns Net kg or null when no weight data
 */
export function resolveBoxNetWeightKg(box: Pick<BoxInSlot, "boxWeight" | "tearweight" | "grossWeight">): number | null {
  const bw = box.boxWeight;
  if (typeof bw !== "number" || !Number.isFinite(bw)) {
    return null;
  }
  const gw = box.grossWeight;
  const tw = Number(box.tearweight ?? 0);
  if (typeof gw === "number" && Number.isFinite(gw) && gw > 0 && bw <= gw + 0.0001) {
    return bw;
  }
  return Math.max(0, bw - tw);
}

/**
 * Resolves box gross weight (kg) from grossWeight or boxWeight + tearweight.
 * @param box - Box in a storage slot
 * @returns Gross kg or null when unavailable
 */
export function resolveBoxGrossWeightKg(box: Pick<BoxInSlot, "boxWeight" | "tearweight" | "grossWeight">): number | null {
  const gw = box.grossWeight;
  if (typeof gw === "number" && Number.isFinite(gw) && gw > 0) {
    return gw;
  }
  const net = resolveBoxNetWeightKg(box);
  const tw = Number(box.tearweight ?? 0);
  if (net != null && net + tw > 0) {
    return net + tw;
  }
  const bw = box.boxWeight;
  if (typeof bw === "number" && Number.isFinite(bw) && bw > 0) {
    return bw;
  }
  return null;
}

/**
 * Resolves cone net weight (kg) = coneWeight − tearWeight.
 * @param cone - Cone in a storage slot
 * @returns Net kg or null
 */
export function resolveConeNetWeightKg(cone: Pick<ConeInSlot, "coneWeight" | "tearWeight">): number | null {
  const gross = cone.coneWeight;
  if (typeof gross !== "number" || !Number.isFinite(gross)) {
    return null;
  }
  const tear = Number(cone.tearWeight ?? 0);
  return Math.max(0, gross - tear);
}

/**
 * Formats kg for tables; shows "-" when value is missing.
 * @param value - Weight in kg
 * @param decimals - Decimal places
 */
export function formatWeightKgCell(value: number | null | undefined, decimals = 4): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "-";
  }
  return value.toFixed(decimals);
}
