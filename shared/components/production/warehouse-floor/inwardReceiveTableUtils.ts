import { InwardReceiveStatus, type WhmsInwardReceiveRow } from "@/shared/services/whmsService";

export function statusBadgeClass(status: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "accepted") return "bg-emerald-100 text-emerald-800 border border-emerald-200";
  if (s === "rejected") return "bg-red-100 text-red-800 border border-red-200";
  if (s === "onhold") return "bg-amber-100 text-amber-900 border border-amber-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export function factoryQty(r: WhmsInwardReceiveRow): number {
  return Math.floor(Number(r.QuantityFromFactory ?? 0));
}

export function receivedQtyFloor(n: number | undefined): number {
  return Math.floor(Number(n ?? 0));
}

/** True when received qty equals factory line qty (integers). */
export function quantitiesMatch(factory: number, received: number): boolean {
  return factory === received;
}

export function isOnHoldStatus(s: string): boolean {
  return String(s ?? "").toLowerCase() === InwardReceiveStatus.ON_HOLD;
}

export function parseEditQty(editQty: string, fallback: number): number | null {
  const n = Number(editQty.trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/** Save rule: equal qty → accepted, unequal → on hold (no manual status on save). */
export function autoStatusFromQuantities(factory: number, received: number) {
  return quantitiesMatch(factory, received) ? InwardReceiveStatus.ACCEPTED : InwardReceiveStatus.ON_HOLD;
}
