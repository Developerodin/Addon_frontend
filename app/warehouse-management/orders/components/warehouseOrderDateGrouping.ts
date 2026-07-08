import type { WarehouseOrder } from "@/shared/services/whmsWarehouseOrderService";

export type WarehouseOrderDateGroup = {
  dateKey: string;
  label: string;
  orders: WarehouseOrder[];
};

/**
 * Normalize a timestamp to YYYY-MM-DD (local calendar date) for stable grouping keys.
 */
export function orderDateKey(date?: string): string {
  if (!date) return "unknown";
  try {
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "unknown";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  } catch {
    return "unknown";
  }
}

/**
 * Human-readable label for a date group key.
 */
export function orderDateLabel(key: string): string {
  if (key === "unknown") return "No date";
  try {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return key;
  }
}

/**
 * Resolve the timestamp used for date grouping (creation time, never order `date` field).
 */
export function resolveOrderGroupTimestamp(order: WarehouseOrder): string | undefined {
  if (order.createdAt) return order.createdAt;

  const history = order.flowHistory;
  if (Array.isArray(history) && history.length > 0) {
    const createdEntry = history.find((entry) => entry.from === "order-created");
    if (createdEntry?.at) return createdEntry.at;
    if (history[0]?.at) return history[0].at;
  }

  if (order.updatedAt) return order.updatedAt;
  return undefined;
}

/**
 * Calendar date key for grouping — uses when the order was created, not the order `date` field.
 */
export function orderGroupDateKey(order: WarehouseOrder): string {
  return orderDateKey(resolveOrderGroupTimestamp(order));
}

/**
 * Group warehouse orders by creation date, newest dates first.
 */
export function groupWarehouseOrdersByDate(rows: WarehouseOrder[]): WarehouseOrderDateGroup[] {
  const map = new Map<string, WarehouseOrder[]>();

  for (const order of rows) {
    const key = orderGroupDateKey(order);
    const list = map.get(key) ?? [];
    list.push(order);
    map.set(key, list);
  }

  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });

  return keys.map((dateKey) => ({
    dateKey,
    label: orderDateLabel(dateKey),
    orders: map.get(dateKey) ?? [],
  }));
}
