import type { FloorProgress } from "@/shared/services/yarnEstimationService";

/** Batch / transfer weight from knitting (`knitToLinking.batchWeightFromKnitting` or `knitting.weight`). */
export function batchWeightFromKnitting(fp: FloorProgress | null | undefined): number | undefined {
  if (!fp) return undefined;
  const w = fp.knitToLinking?.batchWeightFromKnitting ?? fp.knitting?.weight;
  return w != null ? w : undefined;
}

/** `knitting.completed` (fallback: `knitToLinking.knittingCompleted`, same value when API is consistent). */
export function knittingCompletedForDisplay(fp: FloorProgress | null | undefined): number | undefined {
  if (!fp) return undefined;
  const k = fp.knitting?.completed;
  if (k != null) return k;
  return fp.knitToLinking?.knittingCompleted;
}

/** Knitting-floor M4 quantity (`floorProgress.knitting.m4Quantity`). */
export function knittingM4QuantityForDisplay(fp: FloorProgress | null | undefined): number | undefined {
  if (!fp?.knitting) return undefined;
  const m = fp.knitting.m4Quantity;
  return typeof m === "number" && Number.isFinite(m) ? m : undefined;
}

export function linkingFloorActive(fp: FloorProgress | null | undefined): boolean {
  if (!fp) return true;
  return fp.linkingFloorInFlow !== false;
}

export function plannedQtyForDisplay(fp: FloorProgress | null | undefined, fallbackPlanned: number): number {
  if (fp && typeof fp.plannedQuantity === "number") return fp.plannedQuantity;
  return fallbackPlanned;
}
