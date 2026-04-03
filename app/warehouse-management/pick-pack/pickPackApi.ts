"use client";

/**
 * Pick & Pack API — pick-list methods use dedicated /v1/whms/pick-list endpoints;
 * pack-list methods continue using /v1/whms/pick-pack.
 */
import {
  whmsPickListApi,
  WhmsPickListEntry,
  WhmsPickListEntryPatchBody,
  whmsPickPack,
  WhmsPackBatch,
  WhmsPackOrder,
  WhmsPackItem,
  WhmsPackCarton,
} from "@/shared/services/whmsService";
import type {
  PickList,
  PickItem,
  PackList,
  PackBatch,
  PackOrder,
  PackItem,
  PackCarton,
  BarcodeGenerateRequest,
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

// ─── Pack mapping (unchanged — still uses /pick-pack endpoints) ─────────────

function mapPackItem(i: WhmsPackItem): PackItem {
  const status = (
    i.status === "packed" || i.status === "partial" || i.status === "pending" ||
    i.status === "verified" || i.status === "damaged" || i.status === "missing"
      ? i.status
      : "pending"
  ) as PackItem["status"];
  return {
    id: i.id,
    sku: i.sku,
    name: i.name ?? i.sku,
    pickedQty: i.pickedQty ?? 0,
    packedQty: i.packedQty ?? 0,
    status,
    itemBarcode: i.itemBarcode,
  };
}

function mapPackOrder(o: WhmsPackOrder): PackOrder {
  const status = (
    o.status === "packed" || o.status === "packing" || o.status === "dispatch-ready" || o.status === "ready"
      ? o.status
      : "ready"
  ) as PackOrder["status"];
  return {
    orderId: o.orderId,
    orderNumber: o.orderNumber ?? o.orderId,
    customerName: o.customerName ?? "—",
    status,
    priority: (o.priority === "low" || o.priority === "medium" || o.priority === "high" ? o.priority : "medium") as PackOrder["priority"],
    items: (o.items ?? []).map(mapPackItem),
  };
}

function mapPackCarton(c: WhmsPackCarton): PackCarton {
  return { id: c.id, cartonBarcode: c.cartonBarcode, createdAt: c.createdAt ?? new Date().toISOString() };
}

function mapPackBatch(b: WhmsPackBatch): PackBatch {
  const status = (
    b.status === "packed" || b.status === "packing" || b.status === "dispatch-ready" || b.status === "ready"
      ? b.status
      : "ready"
  ) as PackBatch["status"];
  return {
    id: b.id,
    orderIds: b.orderIds ?? [],
    status,
    orders: (b.orders ?? []).map(mapPackOrder),
    cartons: (b.cartons ?? []).map(mapPackCarton),
    createdAt: b.createdAt ?? new Date().toISOString(),
  };
}

function normalizePackListResponse(data: { batches?: WhmsPackBatch[] } | WhmsPackBatch): PackList {
  const batches: WhmsPackBatch[] = Array.isArray((data as { batches?: WhmsPackBatch[] }).batches)
    ? (data as { batches: WhmsPackBatch[] }).batches
    : [data as WhmsPackBatch];
  return {
    id: "pack-list-1",
    createdAt: batches[0]?.createdAt ?? new Date().toISOString(),
    status: "generated",
    batches: batches.map(mapPackBatch),
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
    try {
      const entry = await whmsPickListApi.update(pickListId, body);
      return entry ? mapPickListEntry(entry) : null;
    } catch {
      return null;
    }
  },

  async deletePickEntry(pickListId: string): Promise<void> {
    await whmsPickListApi.delete(pickListId);
  },

  async deletePickOrderEntries(orderId: string): Promise<void> {
    await whmsPickListApi.deleteByOrder(orderId);
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
          order: group.order,
          items: (group.items ?? []).map((item) => ({
            id: item.id,
            skuCode: item.skuCode,
            styleCode: item.styleCode,
            shade: item.shade ?? "",
            size: item.size ?? "",
            quantity: item.quantity ?? 0,
            pickupQuantity: item.pickupQuantity ?? 0,
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

  // ── Pack List (uses /v1/whms/pick-pack — unchanged) ──────────────────────

  async fetchPackList(): Promise<PackList> {
    try {
      const data = await whmsPickPack.packList.get();
      return normalizePackListResponse(data ?? { batches: [] });
    } catch {
      return { id: "pack-list-1", createdAt: new Date().toISOString(), status: "generated", batches: [] };
    }
  },

  async setPackedQty(args: {
    batchId: string;
    orderId: string;
    itemId: string;
    packedQty: number;
  }): Promise<void> {
    await whmsPickPack.packList.updatePackedQty(args.batchId, args.orderId, args.itemId, {
      packedQty: args.packedQty,
    });
  },

  async generateCarton(batchId: string): Promise<PackBatch | null> {
    try {
      const batch = await whmsPickPack.packList.addCarton(batchId);
      return batch ? mapPackBatch(batch) : null;
    } catch {
      return null;
    }
  },

  async completeBatch(batchId: string): Promise<void> {
    await whmsPickPack.packList.completeBatch(batchId);
  },

  async generateBarcodes(args: {
    batchId: string;
    orderId?: string;
    itemIds?: string[];
    request: BarcodeGenerateRequest;
  }): Promise<{ generated: Array<{ type: string; id: string; barcode: string }> }> {
    const res = await whmsPickPack.barcode.generate({
      batchId: args.batchId,
      orderId: args.orderId,
      itemIds: args.itemIds,
      types: args.request.types,
      quantity: args.request.quantity,
    });
    return res ?? { generated: [] };
  },
};
