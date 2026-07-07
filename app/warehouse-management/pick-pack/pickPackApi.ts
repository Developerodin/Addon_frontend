"use client";

/**
 * Pick list API — uses dedicated /v1/whms/pick-list endpoints.
 * (The legacy /v1/whms/pick-pack pack/scan demo endpoints were retired; packing
 * is now a flow stage on the warehouse order, and scanning has its own module.)
 */
import {
  whmsPickListApi,
  WhmsPickListEntry,
  WhmsPickListEntryPatchBody,
  WhmsPickListOrderGroup,
} from "@/shared/services/whmsService";
import type {
  PickList,
  PickItem,
  PickListOrderWiseResponse,
} from "./types";

// ─── Pick-list entry → PickItem mapping ────────────────────────────────────────

function resolveOrderId(orderId: WhmsPickListEntry["orderId"]): string {
  if (!orderId) return "";
  if (typeof orderId === "string") return orderId;
  return orderId.id ?? "";
}

function resolveOrderNumber(entry: WhmsPickListEntry): string {
  if (entry.orderNumber) return entry.orderNumber;
  if (entry.orderId && typeof entry.orderId === "object") return entry.orderId.orderNumber ?? "";
  return "";
}

function resolveOrderWiseClientName(group: WhmsPickListOrderGroup): string {
  const direct = group.clientName;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const o = group.order;
  if (o && typeof o === "object" && o !== null && "clientName" in o) {
    const c = (o as { clientName?: unknown }).clientName;
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return "—";
}

/**
 * Resolve client type for order-wise grouping.
 * Falls back to `group.order.clientType` when not present directly on the group.
 */
function resolveOrderWiseClientType(group: WhmsPickListOrderGroup): string | undefined {
  const direct = (group as unknown as { clientType?: unknown }).clientType;
  if (typeof direct === "string" && direct.trim()) return direct.trim();
  const o = group.order;
  if (o && typeof o === "object" && o !== null && "clientType" in o) {
    const ct = (o as { clientType?: unknown }).clientType;
    if (typeof ct === "string" && ct.trim()) return ct.trim();
  }
  return undefined;
}

function mapPickListEntry(entry: WhmsPickListEntry): PickItem {
  const raw = entry.status ?? "";
  const status = (["pending", "partial", "picked", "verified", "skipped"].includes(raw)
    ? raw
    : "pending") as PickItem["status"];

  const orderIdStr = resolveOrderId(entry.orderId);
  const orderNum = resolveOrderNumber(entry);

  return {
    id: entry.id ?? entry._id ?? "",
    sku: entry.skuCode ?? entry.styleCode ?? "",
    styleCode: entry.styleCode ?? entry.skuCode ?? "",
    name: entry.name ?? entry.skuCode ?? entry.styleCode ?? "",
    shade: entry.shade ?? "",
    orderNumber: orderNum || orderIdStr,
    pathIndex: entry.pathIndex ?? 0,
    requiredQty: entry.requiredQuantity ?? entry.quantity ?? 0,
    pickedQty: entry.pickupQuantity ?? 0,
    unit: entry.size ?? entry.unit ?? "pcs",
    status,
    linkedOrderIds: orderIdStr ? [orderNum || orderIdStr] : [],
    batchId: entry.batchId,
  };
}

// ─── Exported types ─────────────────────────────────────────────────────────

export interface PickListPagination {
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface PickListFilters {
  orderId?: string;
  orderNumber?: string;
  skuCode?: string;
  styleCode?: string;
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const pickPackApi = {
  // ── Pick List (uses /v1/whms/pick-list) ──────────────────────────────────

  async fetchPickList(
    filters?: PickListFilters,
  ): Promise<{ pickList: PickList; pagination: PickListPagination } | null> {
    try {
      const params: Record<string, string | number | undefined> = {
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 100,
        orderId: filters?.orderId || undefined,
        skuCode: filters?.skuCode || undefined,
        styleCode: filters?.styleCode || undefined,
        status: filters?.status || undefined,
        q: filters?.q || undefined,
      };
      const data = await whmsPickListApi.list(params);
      const items = (data.results ?? []).map(mapPickListEntry);
      const pickList: PickList = {
        id: "pick-list-live",
        pickBatchId: "live",
        createdAt: new Date().toISOString(),
        status: items.some((i) => i.status === "picked") ? "picking-in-progress" : "generated",
        items,
      };
      return {
        pickList,
        pagination: {
          page: data.page ?? 1,
          limit: data.limit ?? 100,
          totalPages: data.totalPages ?? 1,
          totalResults: data.totalResults ?? items.length,
        },
      };
    } catch {
      return null;
    }
  },

  async fetchPickListByOrder(orderId: string): Promise<PickItem[]> {
    try {
      const entries = await whmsPickListApi.getByOrder(orderId);
      return (Array.isArray(entries) ? entries : []).map(mapPickListEntry);
    } catch {
      return [];
    }
  },

  async updatePickEntry(
    pickListId: string,
    body: WhmsPickListEntryPatchBody,
  ): Promise<PickItem | null> {
    const entry = await whmsPickListApi.update(pickListId, body);
    return entry ? mapPickListEntry(entry) : null;
  },

  async deletePickEntry(pickListId: string): Promise<void> {
    await whmsPickListApi.delete(pickListId);
  },

  async deletePickOrderEntries(orderId: string): Promise<void> {
    await whmsPickListApi.deleteByOrder(orderId);
  },

  /**
   * Set picker name for an entire order's pick lines.
   */
  async setPickerNameForOrder(orderId: string, pickerName: string): Promise<void> {
    await whmsPickListApi.setPickerNameForOrder(orderId, { pickerName });
  },

  async fetchPickListOrderWise(
    filters?: PickListFilters,
  ): Promise<PickListOrderWiseResponse | null> {
    try {
      const params: Record<string, string | number | undefined> = {
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 10,
        orderId: filters?.orderId || undefined,
        orderNumber: filters?.orderNumber || undefined,
        skuCode: filters?.skuCode || undefined,
        styleCode: filters?.styleCode || undefined,
        status: filters?.status || undefined,
        q: filters?.q || undefined,
        sortBy: filters?.sortBy || undefined,
      };
      const data = await whmsPickListApi.orderWise(params);
      return {
        results: (data.results ?? []).map((group) => ({
          orderId: group.orderId,
          orderNumber: group.orderNumber,
          addonOrderId: (group.addonOrderId ?? "").trim() || undefined,
          clientName: resolveOrderWiseClientName(group),
          clientType: resolveOrderWiseClientType(group),
          pickerName: (group.pickerName ?? "").trim() || undefined,
          order: group.order,
          flowStatus: (group as { flowStatus?: string }).flowStatus,
          items: (group.items ?? []).map((item) => ({
            id: item.id,
            skuCode: item.skuCode,
            styleCode: item.styleCode,
            shade: item.shade ?? "",
            size: item.size ?? "",
            quantity: item.quantity ?? 0,
            pickupQuantity: item.pickupQuantity ?? 0,
            availableStock: (item as unknown as { availableStock?: unknown }).availableStock as number | undefined,
            status: (["pending", "partial", "picked"].includes(item.status) ? item.status : "pending") as "pending" | "partial" | "picked",
          })),
          totalQuantity: group.totalQuantity ?? 0,
          totalPickupQuantity: group.totalPickupQuantity ?? 0,
          totalItems: group.totalItems ?? 0,
          pendingCount: group.pendingCount ?? 0,
          partialCount: group.partialCount ?? 0,
          pickedCount: group.pickedCount ?? 0,
          overallStatus: (["pending", "partial", "picked"].includes(group.overallStatus) ? group.overallStatus : "pending") as "pending" | "partial" | "picked",
        })),
        summary: data.summary ?? { total: 0, pending: 0, partial: 0, picked: 0 },
        page: data.page ?? 1,
        limit: data.limit ?? 10,
        totalPages: data.totalPages ?? 1,
        totalResults: data.totalResults ?? 0,
      };
    } catch {
      return null;
    }
  },

};
