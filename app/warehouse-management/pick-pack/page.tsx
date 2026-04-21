"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast } from "react-hot-toast";
import PickListDashboard from "./components/PickListDashboard";
import PackListDashboard from "./components/PackListDashboard";
import type { PackBatch, PickItem, PackItem, PackOrder, PackOrderStatus, PackList, PickListOrderWiseResponse } from "./types";
import { pickPackApi } from "./pickPackApi";
import type { PickListFilters, PickListPagination } from "./pickPackApi";

const PickPackPage = () => {
  const [activeTab, setActiveTab] = useState<"pick" | "pack">("pick");
  const [loading, setLoading] = useState(true);
  const [pickOrderWise, setPickOrderWise] = useState<PickListOrderWiseResponse | null>(null);
  const [packList, setPackList] = useState<PackList | null>(null);
  const [pickPagination, setPickPagination] = useState<PickListPagination | null>(null);
  const [pickFilters, setPickFilters] = useState<PickListFilters>({});
  const [pickLoading, setPickLoading] = useState(false);

  const notify = (message: string, kind: "success" | "error" | "warning" | "info" = "info") => {
    try {
      if (kind === "success") toast.success(message);
      else if (kind === "error") toast.error(message);
      else toast(message);
    } catch {
      window.alert(message);
    }
  };

  const loadPickList = useCallback(async (filters?: PickListFilters) => {
    setPickLoading(true);
    const owResult = await pickPackApi.fetchPickListOrderWise(filters);
    if (owResult) {
      setPickOrderWise(owResult);
      setPickPagination({
        page: owResult.page,
        limit: owResult.limit,
        totalPages: owResult.totalPages,
        totalResults: owResult.totalResults,
      });
    } else {
      setPickOrderWise(null);
      setPickPagination(null);
    }
    setPickLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [owResult, pkl] = await Promise.all([
        pickPackApi.fetchPickListOrderWise(),
        pickPackApi.fetchPackList(),
      ]);
      if (!mounted) return;
      if (owResult) {
        setPickOrderWise(owResult);
        setPickPagination({
          page: owResult.page,
          limit: owResult.limit,
          totalPages: owResult.totalPages,
          totalResults: owResult.totalResults,
        });
      }
      setPackList(pkl);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const packBatches = packList?.batches ?? [];

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

  const computePackItemStatus = (pickedQty: number, packedQty: number): PackItem["status"] => {
    if (packedQty <= 0) return "pending";
    if (packedQty < pickedQty) return "partial";
    return "packed";
  };

  const computeOrderStatus = (items: PackItem[]): PackOrderStatus => {
    const allPacked = items.every((i) => i.pickedQty > 0 && i.packedQty >= i.pickedQty);
    const anyPacked = items.some((i) => i.packedQty > 0);
    return allPacked ? "packed" : anyPacked ? "packing" : "ready";
  };

  const computeBatchStatus = (orders: PackOrder[]): PackBatch["status"] => {
    const allPacked = orders.every((o) => o.status === "packed" || o.status === "dispatch-ready");
    const anyPacking = orders.some((o) => o.status === "packing");
    const anyReady = orders.some((o) => o.status === "ready");
    if (allPacked) return "packed";
    if (anyPacking) return "packing";
    if (anyReady) return "ready";
    return "ready";
  };

  const ensureAutoPackBatch = (current: PackBatch[]): { batches: PackBatch[]; autoIdx: number } => {
    const idx = current.findIndex((b) => b.id === "PACK-BATCH-AUTO-001");
    if (idx >= 0) return { batches: current, autoIdx: idx };
    const now = new Date().toISOString();
    const auto: PackBatch = {
      id: "PACK-BATCH-AUTO-001",
      orderIds: [],
      status: "ready",
      orders: [],
      cartons: [{ id: "CTN-AUTO-01", cartonBarcode: undefined, createdAt: now }],
      createdAt: now,
    };
    return { batches: [auto, ...current], autoIdx: 0 };
  };

  const movePickedItemToPackQueue = (pickedItem: PickItem) => {
    setPackList((prev) => {
      if (!prev) return prev;
      let batches = prev.batches.slice();
      const ensured = ensureAutoPackBatch(batches);
      batches = ensured.batches.slice();
      const b = { ...batches[ensured.autoIdx] };

      const nextOrders = b.orders.slice();
      const nextOrderIds = new Set(b.orderIds);

      pickedItem.linkedOrderIds.forEach((orderId) => {
        nextOrderIds.add(orderId);
        const orderIdx = nextOrders.findIndex((o) => o.orderId === orderId);
        if (orderIdx === -1) {
          const newOrder: PackOrder = {
            orderId,
            orderNumber: orderId,
            customerName: "—",
            priority: "medium",
            status: "ready",
            items: [
              {
                id: `auto-${orderId}-${pickedItem.sku}`,
                sku: pickedItem.sku,
                name: pickedItem.name,
                pickedQty: 1,
                packedQty: 0,
                status: "pending",
                itemBarcode: undefined,
              },
            ],
          };
          nextOrders.push(newOrder);
        } else {
          const ord = nextOrders[orderIdx];
          const items = ord.items.slice();
          const itemIdx = items.findIndex((i) => i.sku === pickedItem.sku);
          if (itemIdx === -1) {
            items.push({
              id: `auto-${orderId}-${pickedItem.sku}`,
              sku: pickedItem.sku,
              name: pickedItem.name,
              pickedQty: 1,
              packedQty: 0,
              status: "pending",
              itemBarcode: undefined,
            });
          } else {
            const it = items[itemIdx];
            items[itemIdx] = {
              ...it,
              pickedQty: it.pickedQty + 1,
              status: computePackItemStatus(it.pickedQty + 1, it.packedQty),
            };
          }
          const updatedOrder: PackOrder = { ...ord, items };
          updatedOrder.status = computeOrderStatus(updatedOrder.items);
          nextOrders[orderIdx] = updatedOrder;
        }
      });

      const normalizedOrders = nextOrders.map((o) => ({ ...o, status: computeOrderStatus(o.items) }));
      const updatedBatch: PackBatch = {
        ...b,
        orderIds: Array.from(nextOrderIds),
        orders: normalizedOrders,
        status: computeBatchStatus(normalizedOrders),
      };

      const nextBatches = batches.slice();
      nextBatches[ensured.autoIdx] = updatedBatch;

      return { ...prev, batches: nextBatches };
    });
  };

  // ── Pick action: save pickup quantity (PATCH /v1/whms/pick-list/:id) ──

  const findOrderWiseItem = (itemId: string) => {
    if (!pickOrderWise) return null;
    for (const group of pickOrderWise.results) {
      const found = group.items.find((i) => i.id === itemId);
      if (found) return { group, item: found };
    }
    return null;
  };

  const computeOrderWiseItemStatus = (qty: number, requiredQty: number): "pending" | "partial" | "picked" => {
    if (qty <= 0) return "pending";
    if (qty < requiredQty) return "partial";
    return "picked";
  };

  const computeOverallStatus = (items: { status: string }[]): "pending" | "partial" | "picked" => {
    const allPicked = items.every((i) => i.status === "picked");
    const anyPartialOrPicked = items.some((i) => i.status === "partial" || i.status === "picked");
    if (allPicked) return "picked";
    if (anyPartialOrPicked) return "partial";
    return "pending";
  };

  const savePickupQty = async (itemId: string, pickupQty: number) => {
    const match = findOrderWiseItem(itemId);
    if (!match) return;
    const { item } = match;
    const nextQty = clamp(pickupQty, 0, item.quantity);

    try {
      await pickPackApi.updatePickEntry(itemId, { pickupQuantity: nextQty });

      setPickOrderWise((prev) => {
        if (!prev) return prev;
        const results = prev.results.map((group) => {
          const hasItem = group.items.some((i) => i.id === itemId);
          if (!hasItem) return group;
          const updatedItems = group.items.map((i) => {
            if (i.id !== itemId) return i;
            return { ...i, pickupQuantity: nextQty, status: computeOrderWiseItemStatus(nextQty, i.quantity) };
          });
          const totalPickupQuantity = updatedItems.reduce((sum, i) => sum + i.pickupQuantity, 0);
          const pendingCount = updatedItems.filter((i) => i.status === "pending").length;
          const partialCount = updatedItems.filter((i) => i.status === "partial").length;
          const pickedCount = updatedItems.filter((i) => i.status === "picked").length;
          return {
            ...group,
            items: updatedItems,
            totalPickupQuantity,
            pendingCount,
            partialCount,
            pickedCount,
            overallStatus: computeOverallStatus(updatedItems),
          };
        });
        return { ...prev, results };
      });

      if (nextQty >= item.quantity) {
        notify(`Pickup saved: ${item.skuCode} (${nextQty}/${item.quantity})`, "success");
      } else if (nextQty > 0) {
        notify(`Partial pickup saved: ${item.skuCode} (${nextQty}/${item.quantity})`, "warning");
      } else {
        notify(`Pickup quantity reset: ${item.skuCode}`, "info");
      }
    } catch {
      notify("Failed to save pickup quantity", "error");
    }
  };

  const deletePickItem = useCallback(
    async (itemId: string) => {
      try {
        await pickPackApi.deletePickEntry(itemId);
        notify("Pick line removed", "success");
        await loadPickList(pickFilters);
      } catch {
        notify("Failed to delete pick line", "error");
      }
    },
    [pickFilters, loadPickList],
  );

  const deletePickOrder = useCallback(
    async (orderId: string, orderNumber: string) => {
      try {
        await pickPackApi.deletePickOrderEntries(orderId);
        notify(`All pick lines removed for order ${orderNumber}`, "success");
        await loadPickList(pickFilters);
      } catch {
        notify("Failed to delete pick lines for order", "error");
      }
    },
    [pickFilters, loadPickList],
  );

  // ── Pick filter / pagination handlers ──────────────────────────────────

  const handlePickFilterChange = useCallback(
    async (filters: PickListFilters) => {
      const merged = { ...filters, page: 1 };
      setPickFilters(merged);
      await loadPickList(merged);
    },
    [loadPickList],
  );

  const handlePickPageChange = useCallback(
    async (page: number) => {
      const merged = { ...pickFilters, page };
      setPickFilters(merged);
      await loadPickList(merged);
    },
    [pickFilters, loadPickList],
  );

  const handleRefreshPickList = useCallback(async () => {
    await loadPickList(pickFilters);
  }, [pickFilters, loadPickList]);

  // ── Pack actions (unchanged) ───────────────────────────────────────────

  const setPackedQty = async (batchId: string, orderId: string, itemId: string, packedQty: number) => {
    setPackList((prev) => {
      if (!prev) return prev;
      const batches = prev.batches.map((b) => {
        if (b.id !== batchId) return b;
        const orders = b.orders.map((o) => {
          if (o.orderId !== orderId) return o;
          const items = o.items.map((it) => {
            if (it.id !== itemId) return it;
            const nextPacked = clamp(packedQty, 0, it.pickedQty);
            return { ...it, packedQty: nextPacked, status: computePackItemStatus(it.pickedQty, nextPacked) };
          });
          const status = computeOrderStatus(items);
          return { ...o, items, status };
        });
        const status = computeBatchStatus(orders);
        return { ...b, orders, status };
      });
      return { ...prev, batches };
    });

    await pickPackApi.setPackedQty({ batchId, orderId, itemId, packedQty });
  };

  const generateCarton = async (batchId: string) => {
    const updatedBatch = await pickPackApi.generateCarton(batchId);
    if (updatedBatch) {
      setPackList((prev) => {
        if (!prev) return prev;
        const batches = prev.batches.map((b) => (b.id === batchId ? updatedBatch : b));
        return { ...prev, batches };
      });
      notify("Carton added", "success");
    } else {
      const now = new Date().toISOString();
      setPackList((prev) => {
        if (!prev) return prev;
        const batches = prev.batches.map((b) => {
          if (b.id !== batchId) return b;
          const nextId = `CTN-${batchId.split("-").pop() || "X"}-${String((b.cartons?.length || 0) + 1).padStart(2, "0")}`;
          return { ...b, cartons: [...(b.cartons || []), { id: nextId, cartonBarcode: undefined, createdAt: now }] };
        });
        return { ...prev, batches };
      });
      notify("Carton added", "success");
    }
  };

  const completePacking = async (batchId: string) => {
    await pickPackApi.completeBatch(batchId);
    setPackList((prev) => {
      if (!prev) return prev;
      const batches = prev.batches.map((b) => {
        if (b.id !== batchId) return b;
        const orders = b.orders.map((o) => {
          const items = o.items.map((it) => ({
            ...it,
            packedQty: it.pickedQty,
            status: "packed" as const,
          }));
          return { ...o, items, status: "packed" as const };
        });
        return { ...b, orders, status: "packed" as const };
      });
      return { ...prev, batches };
    });
    notify("Packing completed", "success");
  };

  const generateBarcodesForOrder = async (args: {
    batchId: string;
    orderId: string;
    itemIds: string[];
    request: { types: Array<"item" | "carton" | "order">; quantity: number };
  }) => {
    const res = await pickPackApi.generateBarcodes({
      batchId: args.batchId,
      orderId: args.orderId,
      itemIds: args.itemIds,
      request: args.request,
    });

    const itemBarcodes = (res.generated ?? []).filter((g) => g.type === "item");
    if (itemBarcodes.length > 0) {
      setPackList((prev) => {
        if (!prev) return prev;
        const batches = prev.batches.map((b) => {
          if (b.id !== args.batchId) return b;
          const orders = b.orders.map((o) => {
            if (o.orderId !== args.orderId) return o;
            const items = o.items.map((it) => {
              const found = itemBarcodes.find((x) => x.id === it.id);
              if (found) return { ...it, itemBarcode: found.barcode };
              if (args.request.types.includes("item") && !it.itemBarcode && args.itemIds.includes(it.id)) {
                return { ...it, itemBarcode: `ITM-${o.orderNumber}-${it.sku}` };
              }
              return it;
            });
            return { ...o, items };
          });
          return { ...b, orders };
        });
        return { ...prev, batches };
      });
    } else {
      setPackList((prev) => {
        if (!prev) return prev;
        const batches = prev.batches.map((b) => {
          if (b.id !== args.batchId) return b;
          const orders = b.orders.map((o) => {
            if (o.orderId !== args.orderId) return o;
            const items = o.items.map((it) => {
              if (!args.itemIds.includes(it.id)) return it;
              if (args.request.types.includes("item") && !it.itemBarcode) {
                return { ...it, itemBarcode: `ITM-${o.orderNumber}-${it.sku}` };
              }
              return it;
            });
            return { ...o, items };
          });
          return { ...b, orders };
        });
        return { ...prev, batches };
      });
    }
    notify("Barcodes generated", "success");
  };

  return (
    <div className="main-content">
      <Seo title="Pick List & Pack List Automation" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Pick List & Pack List Automation</h1>
              <p className="text-gray-600 mt-2">
                Automate picking and packing flow efficiently with optimized paths and QR scanning.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="box">
            <div className="box-body">
              <div className="flex border-b border-gray-100 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab("pick")}
                  className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${
                    activeTab === "pick" ? "text-purple-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <i className="ri-route-line me-1.5 text-xs"></i>
                  Pick List
                  {activeTab === "pick" ? (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("pack")}
                  className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${
                    activeTab === "pack" ? "text-purple-600" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <i className="ri-box-3-line me-1.5 text-xs"></i>
                  Pack List
                  {activeTab === "pack" ? (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
                  ) : null}
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  <i className="ri-loader-4-line animate-spin me-2"></i>
                  Loading pick & pack lists...
                </div>
              ) : null}

              {/* Tab Content */}
              {!loading && activeTab === "pick" && (
                <PickListDashboard
                  orderWiseData={pickOrderWise}
                  onSavePickupQty={savePickupQty}
                  onDeletePickItem={deletePickItem}
                  onDeletePickOrder={deletePickOrder}
                  onAlert={(msg) => notify(msg, "error")}
                  onFilterChange={handlePickFilterChange}
                  onPageChange={handlePickPageChange}
                  onRefresh={handleRefreshPickList}
                  pagination={pickPagination}
                  isLoading={pickLoading}
                />
              )}

              {!loading && activeTab === "pack" && packList ? (
                <PackListDashboard
                  batches={packBatches}
                  onSetPackedQty={setPackedQty}
                  onGenerateCarton={generateCarton}
                  onCompletePacking={completePacking}
                  onGenerateBarcodesForOrder={generateBarcodesForOrder}
                  onAlert={(msg) => notify(msg, "error")}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickPackPage;
