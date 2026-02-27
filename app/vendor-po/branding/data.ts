import type { BrandingQueueItem } from "./types";

const STORAGE_KEY = "vendor-po-branding-queue";

export function getBrandingQueue(): BrandingQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setBrandingQueue(items: BrandingQueueItem[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add branding rows when a GRN is completed (one per article with fresh > 0). Called from checking process. */
export function addToBrandingQueueFromGRN(params: {
  grnNo: string;
  poNo: string;
  vendorName: string;
  priority: string;
  receivedDate: string;
  articles: { articleId: string; articleCode: string; articleName: string; fresh: number }[];
}): void {
  const queue = getBrandingQueue();
  const now = Date.now();
  const newItems: BrandingQueueItem[] = params.articles
    .filter((a) => a.fresh > 0)
    .map((a, i) => ({
      id: `br-${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      grnNo: params.grnNo,
      poNo: params.poNo,
      vendorName: params.vendorName,
      articleId: a.articleId,
      articleCode: a.articleCode,
      articleName: a.articleName,
      freshQty: a.fresh,
      priority: params.priority,
      receivedDate: params.receivedDate,
      status: "Pending" as const,
    }));
  setBrandingQueue([...newItems, ...queue]);
}

export function updateBrandingItem(
  id: string,
  updates: Partial<Pick<BrandingQueueItem, "status" | "brandingCompletedAt" | "remarks" | "completedBy">>
): void {
  const queue = getBrandingQueue();
  const next = queue.map((e) => (e.id === id ? { ...e, ...updates } : e));
  setBrandingQueue(next);
}

/** Mark item as branding completed and return it for pushing to Final Checking. */
export function markBrandingCompleted(id: string, completedBy?: string): BrandingQueueItem | null {
  const queue = getBrandingQueue();
  const item = queue.find((e) => e.id === id);
  if (!item || item.status === "Completed") return null;
  const completedAt = new Date().toISOString();
  updateBrandingItem(id, { status: "Completed", brandingCompletedAt: completedAt, completedBy });
  return { ...item, status: "Completed" as const, brandingCompletedAt: completedAt, completedBy };
}
