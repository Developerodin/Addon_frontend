import type { CheckingQueueEntry } from "./types";

const STORAGE_KEY = "vendor-po-checking-queue";

export function getCheckingQueue(): CheckingQueueEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
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
