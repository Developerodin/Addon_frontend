"use client";

import React, { useCallback, useEffect, useState } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { toast, Toaster } from "react-hot-toast";
import PickListDashboard from "./components/PickListDashboard";
import type { PickListOrderWiseResponse } from "./types";
import { pickPackApi } from "./pickPackApi";
import type { PickListFilters, PickListPagination } from "./pickPackApi";
import { formatPickSaveErrorMessage } from "./pickSaveErrors";

const PickPackPage = () => {
  const [loading, setLoading] = useState(true);
  const [pickOrderWise, setPickOrderWise] = useState<PickListOrderWiseResponse | null>(null);
  const [pickPagination, setPickPagination] = useState<PickListPagination | null>(null);
  const [pickFilters, setPickFilters] = useState<PickListFilters>({});
  const [pickLoading, setPickLoading] = useState(false);
  const [pickItemErrors, setPickItemErrors] = useState<Record<string, string>>({});

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
      const owResult = await pickPackApi.fetchPickListOrderWise();
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
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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

      setPickItemErrors((prev) => {
        if (!prev[itemId]) return prev;
        const next = { ...prev };
        delete next[itemId];
        return next;
      });

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

      // Stock is updated on the backend; refetch so the "Stock" column shows latest values.
      await loadPickList(pickFilters);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to save pickup quantity";
      const message = formatPickSaveErrorMessage(raw, item.styleCode || item.skuCode);
      setPickItemErrors((prev) => ({ ...prev, [itemId]: message }));
      notify(message, "error");
      throw new Error(message);
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

  /**
   * Persist picker name for an order and reload the list.
   */
  const setPickerNameForOrder = useCallback(
    async (orderId: string, pickerName: string) => {
      const id = String(orderId || "").trim();
      const name = String(pickerName || "").trim();
      if (!id || !name) return;
      await pickPackApi.setPickerNameForOrder(id, name);
      notify(`Picker set: ${name}`, "success");
      await loadPickList(pickFilters);
    },
    [loadPickList, pickFilters],
  );

  return (
    <div className="main-content">
      <Toaster position="top-right" toastOptions={{ duration: 6000 }} />
      <Seo title="Pick&Pack" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Pick&Pack</h1>
            </div>
          </div>

          {/* Pick List */}
          <div className="box">
            <div className="box-body">
              {loading ? (
                <div className="py-12 text-center text-gray-500">
                  <i className="ri-loader-4-line animate-spin me-2"></i>
                  Loading pick & pack lists...
                </div>
              ) : null}

              {!loading && (
                <PickListDashboard
                  orderWiseData={pickOrderWise}
                  pickItemErrors={pickItemErrors}
                  onSavePickupQty={savePickupQty}
                  onSetPickerName={setPickerNameForOrder}
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickPackPage;
