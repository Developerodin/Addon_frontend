import type { CheckingQueueEntry } from "./types";
import { MOCK_VENDOR_POS } from "../raise/data";
import { addToBrandingQueueFromGRN } from "../branding/data";
import type { FinalCheckingItem } from "../final-checking/types";
import { setFinalCheckingQueue } from "../final-checking/data";
import type { CountingItem } from "../counting/types";
import { setCountingQueue } from "../counting/data";

const STORAGE_KEY = "vendor-po-checking-queue";

export function getCheckingQueue(): CheckingQueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed one completed entry from Vendor PO mock data so that
      // Checking and GRN screens have at least one example row.
      const baseOrder = MOCK_VENDOR_POS[1] ?? MOCK_VENDOR_POS[0];
      if (!baseOrder) return [];

      const articles = (baseOrder.lineItems ?? []).map((li) => ({
        articleId: li.articleId,
        articleCode: li.articleCode,
        articleName: li.articleName,
        receivedQty: li.receivedQty ?? li.orderedQty,
      }));

      const totalReceivedQty = articles.reduce(
        (sum, a) => sum + (a.receivedQty || 0),
        0
      );

      const now = new Date().toISOString();
      const year = new Date().getFullYear();
      const seedEntry: CheckingQueueEntry = {
        id: "chk-mock-1",
        poId: baseOrder.id,
        poNo: baseOrder.poNo,
        vendorName: baseOrder.vendorName,
        priority: baseOrder.priority,
        receiveId: "RCV-MOCK-1",
        receiveDate: now,
        status: "Completed",
        articles,
        totalReceivedQty,
        grnNumber: `GRN-${year}-0001`,
        completedAt: now,
        totals: {
          totalM1: totalReceivedQty,
          totalM2: 0,
          totalM3: 0,
          totalM4: 0,
        },
        articleClassifications: Object.fromEntries(
          articles.map((a) => [
            a.articleId,
            {
              fresh: a.receivedQty,
              m4Return: 0,
              m4Inhouse: 0,
              m2: 0,
              m3: 0,
            },
          ])
        ),
      };

      // Seed corresponding Branding queue items (fresh qty from GRN)
      addToBrandingQueueFromGRN({
        grnNo: seedEntry.grnNumber!,
        poNo: baseOrder.poNo,
        vendorName: baseOrder.vendorName,
        priority: baseOrder.priority,
        receivedDate: seedEntry.receiveDate,
        articles: articles.map((a) => ({
          articleId: a.articleId,
          articleCode: a.articleCode,
          articleName: a.articleName,
          fresh: a.receivedQty || 0,
        })),
      });

      // Seed Final Checking queue with first branding item
      const firstArticle = articles[0];
      if (firstArticle) {
        const finalItem: FinalCheckingItem = {
          id: "fc-mock-1",
          grnNo: seedEntry.grnNumber!,
          poNo: baseOrder.poNo,
          articleId: firstArticle.articleId,
          articleCode: firstArticle.articleCode,
          articleName: firstArticle.articleName,
          qty: firstArticle.receivedQty || 0,
          brandingCompletedAt: now,
          status: "Pending",
        };
        setFinalCheckingQueue([finalItem]);

        const countingItem: CountingItem = {
          id: "cnt-mock-1",
          grnNo: seedEntry.grnNumber!,
          poNo: baseOrder.poNo,
          articleId: firstArticle.articleId,
          articleCode: firstArticle.articleCode,
          articleName: firstArticle.articleName,
          expectedQty: firstArticle.receivedQty || 0,
          countedQty: firstArticle.receivedQty || 0,
          status: "Pending Counting",
        };
        setCountingQueue([countingItem]);
      }

      setCheckingQueue([seedEntry]);
      return [seedEntry];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function setCheckingQueue(entries: CheckingQueueEntry[]): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addToCheckingQueue(entry: Omit<CheckingQueueEntry, "id" | "receiveId" | "status">): CheckingQueueEntry {
  const id = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const receiveId = `RCV-${Date.now()}`;
  const newEntry: CheckingQueueEntry = {
    ...entry,
    id,
    receiveId,
    status: "Pending",
  };
  const queue = getCheckingQueue();
  setCheckingQueue([newEntry, ...queue]);
  return newEntry;
}

export function updateCheckingEntry(
  entryId: string,
  updates: Partial<Pick<CheckingQueueEntry, "status" | "grnNumber" | "completedAt" | "totals" | "articleClassifications">>
): void {
  const queue = getCheckingQueue();
  const next = queue.map((e) => (e.id === entryId ? { ...e, ...updates } : e));
  setCheckingQueue(next);
}

export function getNextGRN(): string {
  const queue = getCheckingQueue();
  const year = new Date().getFullYear();
  const prefix = `GRN-${year}-`;
  const nums = queue
    .map((e) => {
      const n = e.grnNumber?.match(new RegExp(`^${prefix}(\\d+)$`));
      return n ? parseInt(n[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}
