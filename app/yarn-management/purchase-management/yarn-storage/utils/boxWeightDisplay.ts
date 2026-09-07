/** Weight fields shared by YarnBox, BoxInSlot, and transfer-modal payloads. */
export type BoxWeightSource = {
  boxWeight?: number | null;
  tearweight?: number | null;
  grossWeight?: number | null;
};

/** Cone weight fields shared by ConeInSlot and ST cone summaries. */
export type ConeWeightSource = {
  coneWeight?: number | null;
  tearWeight?: number | null;
};

/**
 * Resolves box net weight (kg). `boxWeight` is net in the canonical schema;
 * falls back to boxWeight − tearweight when legacy rows stored gross in boxWeight.
 * @param box - Box with optional weight fields
 * @returns Net kg or null when no weight data
 */
export function resolveBoxNetWeightKg(box: BoxWeightSource): number | null {
  const bw = box.boxWeight;
  if (typeof bw !== "number" || !Number.isFinite(bw)) {
    return null;
  }
  const gw = box.grossWeight;
  const tw = Number(box.tearweight ?? 0);
  if (typeof gw === "number" && Number.isFinite(gw) && gw > 0) {
    // boxWeight stored as gross (legacy bad sync): net = gross − tear
    if (Math.abs(bw - gw) <= 0.0001) {
      return Math.max(0, gw - tw);
    }
    // Canonical: boxWeight is net when it is less than gross
    if (bw <= gw + 0.0001) {
      return bw;
    }
  }
  return Math.max(0, bw - tw);
}

/**
 * Resolves box gross weight (kg) from grossWeight or boxWeight + tearweight.
 * @param box - Box with optional weight fields
 * @returns Gross kg or null when unavailable
 */
export function resolveBoxGrossWeightKg(box: BoxWeightSource): number | null {
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
 * Resolves box tear/tare weight (kg) from stored tearweight, or gross − net.
 * @param box - Box with optional weight fields
 * @returns Tear kg or null when unavailable
 */
export function resolveBoxTearWeightKg(box: BoxWeightSource): number | null {
  const stored = Number(box.tearweight ?? 0);
  if (Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  const gross = resolveBoxGrossWeightKg(box);
  const net = resolveBoxNetWeightKg(box);
  if (gross != null && net != null && gross >= net) {
    const derived = gross - net;
    if (derived > 0.0001) {
      return derived;
    }
  }
  if (Number.isFinite(stored) && stored === 0) {
    return 0;
  }
  return null;
}

/**
 * Resolves cone net weight (kg) = coneWeight − tearWeight.
 * @param cone - Cone with optional weight fields
 * @returns Net kg or null
 */
export function resolveConeNetWeightKg(cone: ConeWeightSource): number | null {
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
