import type { FinalCheckingItem } from "./types";

const STORAGE_KEY = "vendor-po-final-checking-queue";

export function getFinalCheckingQueue(): FinalCheckingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setFinalCheckingQueue(items: FinalCheckingItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add one item from Branding when "Mark Branding Completed" is confirmed. */
export function addToFinalCheckingQueue(params: {
  grnNo: string;
  poNo: string;
  articleId: string;
  articleCode: string;
  articleName: string;
  qty: number;
  brandingCompletedAt: string;
  completedBy?: string;
}): FinalCheckingItem {
  const id = `fc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem: FinalCheckingItem = {
    id,
    grnNo: params.grnNo,
    poNo: params.poNo,
    articleId: params.articleId,
    articleCode: params.articleCode,
    articleName: params.articleName,
    qty: params.qty,
    brandingCompletedAt: params.brandingCompletedAt,
    status: "Pending",
  };
  const queue = getFinalCheckingQueue();
  setFinalCheckingQueue([newItem, ...queue]);
  return newItem;
}

export function updateFinalCheckingItem(
  id: string,
  updates: Partial<Pick<FinalCheckingItem, "status" | "finalCheckingCompletedAt" | "completedBy">>
): void {
  const queue = getFinalCheckingQueue();
  const next = queue.map((e) => (e.id === id ? { ...e, ...updates } : e));
  setFinalCheckingQueue(next);
}

/** Mark as completed and return item for pushing to Counting. */
export function markFinalCheckingCompleted(id: string, completedBy?: string): FinalCheckingItem | null {
  const queue = getFinalCheckingQueue();
  const item = queue.find((e) => e.id === id);
  if (!item || item.status === "Completed") return null;
  const finalCheckingCompletedAt = new Date().toISOString();
  updateFinalCheckingItem(id, { status: "Completed", finalCheckingCompletedAt, completedBy });
  return { ...item, status: "Completed" as const, finalCheckingCompletedAt, completedBy };
}
