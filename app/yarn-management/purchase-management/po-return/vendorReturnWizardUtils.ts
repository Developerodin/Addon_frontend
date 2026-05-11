/**
 * ISO date bounds for yarn PO list queries (multi-year window).
 */
export function getPoQueryDateBounds(): { start_date: string; end_date: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);
  start.setHours(0, 0, 0, 0);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

/**
 * Resolves supplier label from a lean yarn PO document.
 */
export function supplierLabelFromPo(apiOrder: Record<string, unknown>): string {
  return (
    String(
      apiOrder.supplierName ??
        (apiOrder.supplier as { brandName?: string } | undefined)?.brandName ??
        ""
    ) || "—"
  );
}

/**
 * Distinct lot numbers from `receivedLotDetails`.
 */
export function lotsFromPo(apiOrder: Record<string, unknown>): string[] {
  const rd = apiOrder.receivedLotDetails;
  if (!Array.isArray(rd)) return [];
  return [
    ...new Set(
      rd
        .map((x) => String((x as { lotNumber?: string }).lotNumber ?? "").trim())
        .filter(Boolean)
    ),
  ];
}

export type VendorReturnSummary = {
  shortTerm?: {
    eligibleConeCount?: number;
    issuedConeCount?: number;
    coneNetWeight?: number;
    boxCount?: number;
    boxNetWeightSum?: number;
  };
  longTerm?: { boxCount?: number; boxGrossWeightSum?: number };
  unallocated?: { boxCount?: number; boxGrossWeightSum?: number };
};
