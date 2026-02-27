import type { CountingItem } from "./types";

const STORAGE_KEY = "vendor-po-counting-queue";

export function getCountingQueue(): CountingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCountingQueue(items: CountingItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add one item from Final Checking when "Final Checking Completed" is confirmed. */
export function addToCountingQueue(params: {
  grnNo: string;
  poNo: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  qty: number;
}): CountingItem {
  const id = `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem: CountingItem = {
    id,
    grnNo: params.grnNo,
    poNo: params.poNo,
    articleId: params.articleId,
    articleCode: params.articleCode,
    articleName: params.articleName,
    expectedQty: params.qty,
    countedQty: params.qty,
    status: "Pending Counting",
  };
  const queue = getCountingQueue();
  setCountingQueue([newItem, ...queue]);
  return newItem;
}

export function updateCountingItem(
  id: string,
  updates: Partial<Pick<CountingItem, "countedQty" | "boxes" | "remarks" | "status" | "discrepancyReason" | "dispatchedAt" | "dispatchedBy">>
): void {
  const queue = getCountingQueue();
  const next = queue.map((e) => (e.id === id ? { ...e, ...updates } : e));
  setCountingQueue(next);
}

/** Mark as dispatched. Optionally create warehouse inward entry (stub). */
export function dispatchToWarehouse(id: string, dispatchedBy?: string): CountingItem | null {
  const queue = getCountingQueue();
  const item = queue.find((e) => e.id === id);
  if (!item || item.status === "Dispatched") return null;
  const dispatchedAt = new Date().toISOString();
  updateCountingItem(id, { status: "Dispatched", dispatchedAt, dispatchedBy });
  return { ...item, status: "Dispatched" as const, dispatchedAt, dispatchedBy };
}
