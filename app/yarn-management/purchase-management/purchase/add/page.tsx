"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PurchaseForm, { PurchaseOrderData, YarnPurchaseItem } from "../components/PurchaseForm";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import yarnPurchaseOrderService, {
  CreatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
} from "@/shared/services/yarnPurchaseOrderService";
import {
  yarnInventoryService,
  requisitionMongoId,
  requisitionYarnId,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";

/**
 * Loads optional draft-queue yarns for `?fromDraftQueue=1` (from Draft POs).
 */
function AddPurchasePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromDraftQueue = searchParams.get("fromDraftQueue") === "1";
  const { hasSubPermission, isLoading } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftReady, setDraftReady] = useState(!fromDraftQueue);
  const [draftInitialItems, setDraftInitialItems] = useState<YarnPurchaseItem[]>([]);

  /** Stable key fragment for remount once draft yarns are loaded */
  const draftKeySuffix = useMemo(
    () => draftInitialItems.map((i) => i.sourceRequisitionId ?? i.id).join("-"),
    [draftInitialItems]
  );

  const purchaseInitialData = useMemo((): Partial<PurchaseOrderData> => {
    if (!fromDraftQueue) return {};
    return { items: draftInitialItems };
  }, [fromDraftQueue, draftInitialItems]);

  const hasPermission = hasSubPermission(
    "/yarn-management/purchase-management",
    "Purchase Order"
  );

  useEffect(() => {
    if (!fromDraftQueue) {
      setDraftReady(true);
      setDraftInitialItems([]);
      return;
    }

    let cancelled = false;
    setDraftReady(false);

    (async () => {
      try {
        const rows = await yarnInventoryService.getAllDraftQueueRequisitions();
        if (cancelled) return;

        const items: YarnPurchaseItem[] = rows.map((req) => {
          const yarnId = requisitionYarnId(req) || "";
          const docId = requisitionMongoId(req) ?? "";
          const shortage = Math.max(0, (req.minQty ?? 0) - (req.availableQty ?? 0));
          const qty = shortage > 0 ? shortage : 1;
          const id =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `draft-${docId || "row"}-${Math.random().toString(36).slice(2, 11)}`;
          return {
            id,
            yarnName: req.yarnName,
            yarnId,
            sourceRequisitionId: docId,
            sizeCount: "",
            shadeCode: "",
            rate: 0,
            qty,
            estimatedDeliveryDate: "",
            gst: 0,
            subTotal: 0,
            displayQty: String(qty),
            displayRate: "",
            displayGst: "",
          };
        });

        setDraftInitialItems(items);
        if (items.length === 0) {
          toast(
            "No yarns in draft queue yet. Stage them from the requisition list (Mark PO Sent) or add lines manually."
          );
        }
      } catch (error) {
        console.error("[AddPurchasePage] Failed to load draft queue", error);
        toast.error("Failed to load yarns from the draft queue.");
        setDraftInitialItems([]);
      } finally {
        if (!cancelled) setDraftReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fromDraftQueue]);

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to add purchase orders.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: PurchaseOrderData) => {
    setIsSubmitting(true);
    try {
      console.log('[AddPurchasePage] handleSubmit called with data', data);
      const generatePoNumber = () => {
        const year = new Date().getFullYear();
        const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        return `PO-${year}-${randomPart}`;
      };

      const extractYarnId = (detail: PurchaseOrderData["items"][number]["selectedYarnDetail"]) => {
        if (!detail) return undefined;

        const valueToId = (value: unknown): string | undefined => {
          if (!value) return undefined;
          if (typeof value === "string") return value;
          if (typeof value === "number") return String(value);
          if (typeof value === "object") {
            const obj = value as Record<string, unknown>;
            if (typeof obj._id === "string") return obj._id;
            if (typeof obj.id === "string") return obj.id;
            if (typeof obj._id === "number") return String(obj._id);
            if (typeof obj.id === "number") return String(obj.id);
          }
          return undefined;
        };

        const priorityKeys = [
          "yarnId",
          "yarnCatalogId",
          "catalogId",
          "yarn",
          "yarnCatalog",
          "catalog",
          "yarncatalog",
          "yarn_catalog",
          "yarn_catalog_id",
          "yarncatalogid",
          "catalogYarn",
          "catalogYarnId",
          "id",
          "_id",
        ];

        const visited = new Set<unknown>();

        const traverse = (value: unknown, depth = 0): string | undefined => {
          if (!value || depth > 4 || visited.has(value)) {
            return undefined;
          }

          visited.add(value);

          const direct = valueToId(value);
          if (direct) return direct;

          if (Array.isArray(value)) {
            for (const item of value) {
              const result = traverse(item, depth + 1);
              if (result) return result;
            }
            return undefined;
          }

          if (typeof value === "object") {
            const obj = value as Record<string, unknown>;

            for (const key of priorityKeys) {
              if (key in obj) {
                const result = valueToId(obj[key]);
                if (result) return result;

                const nested = traverse(obj[key], depth + 1);
                if (nested) return nested;
              }
            }

            for (const [key, nestedValue] of Object.entries(obj)) {
              if (typeof nestedValue === "object") {
                if (/(yarn|catalog|id)$/i.test(key)) {
                  const nestedId = valueToId(nestedValue);
                  if (nestedId) return nestedId;
                }
                const result = traverse(nestedValue, depth + 1);
                if (result) return result;
              } else if (typeof nestedValue === "string" && /(yarn|catalog|id)$/i.test(key)) {
                return nestedValue;
              } else if (typeof nestedValue === "number" && /(yarn|catalog|id)$/i.test(key)) {
                return String(nestedValue);
              }
            }
          }

          return undefined;
        };

        return traverse(detail);
      };

      const resolveYarnCatalogId = async (item: PurchaseOrderData["items"][number]) => {
        if (item.yarnId) {
          return item.yarnId;
        }

        // Use yarnCatalogId from supplier yarn detail
        if (item.selectedYarnDetail?.yarnCatalogId) {
          return item.selectedYarnDetail.yarnCatalogId;
        }

        // Try to extract from yarnCatalog object reference
        const detailId = extractYarnId(item.selectedYarnDetail);
        if (detailId) {
          return detailId;
        }

        // If no catalog ID is available, return undefined
        // The user must select a yarn from supplier's yarn details
        return undefined;
      };

      const itemsWithResolvedIds = await Promise.all(
        data.items.map(async (item) => {
          if (item.yarnId) {
            return item;
          }

          const resolvedId = await resolveYarnCatalogId(item);
          console.log("[AddPurchasePage] Resolved yarnId for item", {
            itemId: item.id,
            resolvedId,
          });

          return {
            ...item,
            yarnId: resolvedId ? String(resolvedId) : "",
          };
        })
      );

      const missingYarnIndex = itemsWithResolvedIds.findIndex((item) => !item.yarnId);

      if (missingYarnIndex !== -1) {
        console.warn('[AddPurchasePage] Missing yarnId for item', missingYarnIndex + 1, itemsWithResolvedIds[missingYarnIndex]);
        toast.error(`Please select a yarn from the supplier's yarn details for item ${missingYarnIndex + 1}`);
        setIsSubmitting(false);
        return;
      }

      const poItems: CreatePurchaseOrderPayload["poItems"] = itemsWithResolvedIds.map((item) => {
        const selectedDetail = item.selectedYarnDetail;
        const yarnId = item.yarnId as string;
        console.log('[AddPurchasePage] Preparing PO item', {
          index: item.id,
          yarnId,
          sizeCount: item.sizeCount,
          sizeCountName: item.sizeCountName,
        });

        const resolveSizeCount = () => {
          // Prioritize catalog countSize if available (from matched catalog)
          if (item.selectedCatalog?.countSize) {
            const catalogCountSize = item.selectedCatalog.countSize as any;
            const catalogCountSizeName = catalogCountSize?.name || catalogCountSize?.label;
            if (catalogCountSizeName) {
              return catalogCountSizeName;
            }
          }

          if (!selectedDetail) {
            return item.sizeCountName || item.sizeCount;
          }

          const rawCountSize =
            (selectedDetail as any)?.countSize ||
            (typeof selectedDetail.yarnsubtype === "object"
              ? (selectedDetail.yarnsubtype as any)?.countSize
              : undefined);

          const countSizeArray = Array.isArray(rawCountSize)
            ? rawCountSize
            : [];

          const matched = countSizeArray.find((cs: any) => {
            const csId = cs?._id || cs?.id || cs;
            return csId && String(csId) === String(item.sizeCount);
          });

          if (matched) {
            return matched?.name || matched?.label || item.sizeCount;
          }

          return item.sizeCountName || item.sizeCount;
        };

        const poItem: PurchaseOrderItemPayload = {
          yarn: yarnId,
          yarnName: item.yarnName,
          sizeCount: String(resolveSizeCount()),
          shadeCode: item.shadeCode || undefined,
          rate: item.rate,
          quantity: item.qty,
          estimatedDeliveryDate: item.estimatedDeliveryDate,
          gstRate: item.gst,
        };

        return poItem;
      });

      const payload: CreatePurchaseOrderPayload = {
        poNumber: generatePoNumber(),
        supplierName: data.supplierName,
        supplier: data.supplierId,
        creditDays: data.creditDays,
        estimatedOrderDeliveryDate: data.estimatedOrderDeliveryDate,
        poItems,
        notes: data.notes,
        subTotal: data.subTotal,
        gst: data.totalGst,
        total: data.total,
        currentStatus: data.status.replace(/\s+/g, "_").toLowerCase(),
      };
      console.log('[AddPurchasePage] Final payload', payload);

      await yarnPurchaseOrderService.createPurchaseOrder(payload);
      console.log('[AddPurchasePage] Purchase order creation request sent successfully');

      const requisitionIds = itemsWithResolvedIds
        .map((item) => item.sourceRequisitionId)
        .filter((id): id is string => Boolean(id));

      if (requisitionIds.length > 0) {
        try {
          await yarnInventoryService.clearRequisitionDraftFlags(requisitionIds);
        } catch (clearErr) {
          console.error("[AddPurchasePage] clearRequisitionDraftFlags failed", clearErr);
          toast.error(
            "PO created, but clearing the draft queue failed. Rows may still show under Draft POs."
          );
        }
      }

      toast.success("Purchase order created successfully");
      router.push("/yarn-management/purchase-management/purchase");
    } catch (error: any) {
      console.error("Failed to create purchase order:", error);
      const message = error?.message || "Failed to create purchase order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      console.log('[AddPurchasePage] Submission state reset');
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  if (fromDraftQueue && !draftReady) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Add Purchase Order" />
        <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 p-10 flex flex-col items-center justify-center gap-3">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
            role="status"
            aria-label="Loading draft yarns"
          />
          <p className="text-xs text-gray-500 font-medium">Loading draft queue yarns…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Add Purchase Order" />
      
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">New Purchase Order</h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/yarn-management/purchase-management/purchase"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-arrow-left-line text-xs"></i>
                Back
              </Link>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-[10px] pb-[10px]">
          <PurchaseForm
            key={
              !fromDraftQueue ? "new-purchase" : `draft-queue-${draftKeySuffix || "empty"}`
            }
            initialData={purchaseInitialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitButtonText="Submit to Supplier"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapped for `useSearchParams` — required Suspense boundary in the App Router.
 */
export default function AddPurchasePage() {
  return (
    <Suspense
      fallback={
        <div className="main-content !p-[10px] flex justify-center py-16">
          <div
            className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
            role="status"
            aria-label="Loading page"
          />
        </div>
      }
    >
      <AddPurchasePageInner />
    </Suspense>
  );
}
