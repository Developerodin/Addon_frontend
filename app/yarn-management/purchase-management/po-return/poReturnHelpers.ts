/**
 * Ensures toast / inline banners show `{ message }` from API errors thrown as `Error`.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
}

export type PoOption = {
  id: string;
  poNumber: string;
  supplierLabel: string;
  currentStatus: string;
  hasReceivedLots: boolean;
  /** At least one lot marked `lot_returned_to_vendor` from QC. */
  hasQcReturnedLot: boolean;
};

export type PendingRow = {
  barcode: string;
  yarnName: string;
  lotNumber: string;
  boxId: string;
  coneWeight: number;
  tearWeight: number;
};

export type HistoryRow = Record<string, unknown>;

/**
 * Maps raw PO list API documents to dropdown options (POs with received lots only).
 */
export function mapToPoOptions(raw: unknown[]): PoOption[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => r as Record<string, unknown>)
    .map((o) => {
      const id = String(o._id ?? "");
      const poNumber = String(o.poNumber ?? "");
      const lots = o.receivedLotDetails as unknown[] | undefined;
      const supplier =
        String(
          o.supplierName ?? (o.supplier as { brandName?: string } | undefined)?.brandName ?? ""
        ) || "—";
      const hasQcReturnedLot =
        Array.isArray(lots) &&
        lots.some((lot) => String((lot as { status?: string }).status ?? "") === "lot_returned_to_vendor");
      return {
        id,
        poNumber,
        supplierLabel: supplier,
        currentStatus: String(o.currentStatus ?? ""),
        hasReceivedLots: Array.isArray(lots) && lots.length > 0,
        hasQcReturnedLot,
      };
    })
    .filter((p) => p.id && p.poNumber && p.hasReceivedLots);
}

/**
 * Builds a wide date window for loading POs (purchase order list API).
 */
export function getPoQueryDateBounds(): { start_date: string; end_date: string } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setFullYear(start.getFullYear() - 3);
  start.setHours(0, 0, 0, 0);
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

/**
 * Sums net weight (gross − tear) for pending scan rows.
 */
export function sumPendingNetKg(rows: PendingRow[]): number {
  return rows.reduce((s, r) => {
    const gross = Number(r.coneWeight) || 0;
    const tear = Number(r.tearWeight) || 0;
    return s + Math.max(0, gross - tear);
  }, 0);
}
