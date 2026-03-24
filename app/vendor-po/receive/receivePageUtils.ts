import type { VendorPO } from "../raise/types";

/** Client-side filter: PO created / order date within [startDate, endDate] (inclusive). */
export function vendorPoMatchesDateRange(order: VendorPO, startDate: string, endDate: string): boolean {
  const ref = order.createdAt || order.poDate;
  if (!ref) return true;
  const t = new Date(ref).getTime();
  if (Number.isNaN(t)) return true;
  const start = startDate ? new Date(`${startDate}T00:00:00`).getTime() : -Infinity;
  const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
  return t >= start && t <= end;
}

/** Money + ordered / received / pending units for table Summary column (yarn PO Received parity). */
export function vendorReceiveRowSummary(order: VendorPO): {
  total: number;
  ordered: number;
  received: number;
  pending: number;
} {
  const raw = order.rawPurchaseOrder;
  const total = Number(raw?.total ?? 0);
  const ordered = order.totalQty;
  const received = order.receivedQty ?? 0;
  const pending = Math.max(0, ordered - received);
  return { total, ordered, received, pending };
}
