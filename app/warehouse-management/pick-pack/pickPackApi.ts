"use client";

/**
 * Pick & Pack API — uses existing WHMS Node.js endpoints.
 * Maps WHMS response shapes to UI types (PickList, PackList, etc.).
 */
import {
  whmsPickPack,
  WhmsPickList,
  WhmsPickItem,
  WhmsPackBatch,
  WhmsPackOrder,
  WhmsPackItem,
  WhmsPackCarton,
  WhmsRackLocation,
} from "@/shared/services/whmsService";
import type {
  PickList,
  PickItem,
  PackList,
  PackBatch,
  PackOrder,
  PackItem,
  PackCarton,
  RackLocation,
  BarcodeGenerateRequest,
} from "./types";

function mapRackLocation(r: WhmsRackLocation): RackLocation {
  return {
    zone: r.zone ?? "",
    row: r.row ?? "",
    column: r.column ?? "",
    bin: r.bin ?? "",
  };
}

function mapPickItem(i: WhmsPickItem): PickItem {
  const status = (i.status === "picked" || i.status === "partial" || i.status === "skipped" || i.status === "pending"
    ? i.status
    : "pending") as PickItem["status"];
  return {
    id: i.id,
    sku: i.sku,
    name: i.name ?? i.sku,
    imageUrl: i.imageUrl,
    pathIndex: i.pathIndex ?? 0,
    rackLocation: mapRackLocation(i.rackLocation ?? { zone: "", row: "", column: "", bin: "" }),
    requiredQty: i.requiredQty ?? 0,
    pickedQty: i.pickedQty ?? 0,
    unit: i.unit ?? "pcs",
    status,
    linkedOrderIds: i.linkedOrderIds ?? [],
    batchId: i.batchId,
  };
}

function mapPickList(w: WhmsPickList): PickList {
  const status = (w.status === "picking-done" || w.status === "picking-in-progress" || w.status === "generated"
    ? w.status
    : "generated") as PickList["status"];
  return {
    id: w.id,
    pickBatchId: w.pickBatchId ?? w.id,
    createdAt: w.createdAt ?? new Date().toISOString(),
    status,
    items: (w.items ?? []).map(mapPickItem),
    assignedTo: w.assignedTo,
    startedAt: w.startedAt,
    completedAt: w.completedAt,
  };
}

function mapPackItem(i: WhmsPackItem): PackItem {
  const status = (i.status === "packed" || i.status === "partial" || i.status === "pending" || i.status === "verified" || i.status === "damaged" || i.status === "missing"
    ? i.status
    : "pending") as PackItem["status"];
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
  const status = (o.status === "packed" || o.status === "packing" || o.status === "dispatch-ready" || o.status === "ready"
    ? o.status
    : "ready") as PackOrder["status"];
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
  return {
    id: c.id,
    cartonBarcode: c.cartonBarcode,
    createdAt: c.createdAt ?? new Date().toISOString(),
  };
}

function mapPackBatch(b: WhmsPackBatch): PackBatch {
  const status = (b.status === "packed" || b.status === "packing" || b.status === "dispatch-ready" || b.status === "ready"
    ? b.status
    : "ready") as PackBatch["status"];
  return {
    id: b.id,
    orderIds: b.orderIds ?? [],
    status,
    orders: (b.orders ?? []).map(mapPackOrder),
    cartons: (b.cartons ?? []).map(mapPackCarton),
    createdAt: b.createdAt ?? new Date().toISOString(),
  };
}

function normalizePackListResponse(
  data: { batches?: WhmsPackBatch[] } | WhmsPackBatch
): PackList {
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

export const pickPackApi = {
  async fetchPickList(): Promise<PickList | null> {
    try {
      const data = await whmsPickPack.pickList.get();
      return data ? mapPickList(data) : null;
    } catch {
      return null;
    }
  },

  async fetchPackList(): Promise<PackList> {
    try {
      const data = await whmsPickPack.packList.get();
      return normalizePackListResponse(data ?? { batches: [] });
    } catch {
      return { id: "pack-list-1", createdAt: new Date().toISOString(), status: "generated", batches: [] };
    }
  },

  async confirmPick(args: { itemId: string; pickedQty: number }): Promise<void> {
    await whmsPickPack.pickList.confirmPick({
      itemId: args.itemId,
      pickedQty: args.pickedQty,
    });
  },

  async skipPick(itemId: string): Promise<void> {
    await whmsPickPack.pickList.skip({ itemId });
  },

  async setPackedQty(args: {
    batchId: string;
    orderId: string;
    itemId: string;
    packedQty: number;
  }): Promise<void> {
    await whmsPickPack.packList.updatePackedQty(
      args.batchId,
      args.orderId,
      args.itemId,
      { packedQty: args.packedQty }
    );
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
