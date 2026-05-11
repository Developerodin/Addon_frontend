"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import PurchaseForm, { PurchaseOrderData, YarnPurchaseItem } from "../components/PurchaseForm";
import { DraftQueueSupplierGate } from "./components/DraftQueueSupplierGate";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import supplierService, { type Supplier } from "@/shared/services/supplierService";
import yarnPurchaseOrderService, {
  CreatePurchaseOrderPayload,
  PurchaseOrderItemPayload,
} from "@/shared/services/yarnPurchaseOrderService";
import {
  yarnInventoryService,
  requisitionMongoId,
  requisitionYarnCatalogId,
} from "@/app/yarn-management/dashboard/services/yarnInventoryService";

/**
 * Resolves count/size label for a PO line (aligns with PurchaseForm submit mapping).
 * @param item - Form line item
 */
function resolvePurchaseLineSizeCount(item: YarnPurchaseItem): string {
  const selectedDetail = item.selectedYarnDetail;
  if (item.selectedCatalog?.countSize) {
    const catalogCountSize = item.selectedCatalog.countSize as { name?: string; label?: string };
    const catalogCountSizeName = catalogCountSize?.name || catalogCountSize?.label;
    if (catalogCountSizeName) {
      return catalogCountSizeName;
    }
  }
  if (!selectedDetail) {
    return String(item.sizeCountName || item.sizeCount || "-");
  }
  const rawCountSize =
    (selectedDetail as { countSize?: unknown }).countSize ||
    (typeof selectedDetail.yarnsubtype === "object" && selectedDetail.yarnsubtype !== null
      ? (selectedDetail.yarnsubtype as { countSize?: unknown }).countSize
      : undefined);
  const countSizeArray = Array.isArray(rawCountSize) ? rawCountSize : [];
  const matched = countSizeArray.find((cs: { _id?: string; id?: string }) => {
    const c = cs as { _id?: string; id?: string };
    const csId = c?._id || c?.id;
    return csId && String(csId) === String(item.sizeCount);
  });
  if (matched) {
    const m = matched as { name?: string; label?: string };
    return String(m?.name || m?.label || item.sizeCount || "-");
  }
  return String(item.sizeCountName || item.sizeCount || "-");
}

/**
 * Loads optional draft-queue yarns for `?fromDraftQueue=1` (from Draft POs).
 */
function AddPurchasePageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromDraftQueue = searchParams.get("fromDraftQueue") === "1";
  const supplierDraftId = searchParams.get("supplierId")?.trim() || "";
  const poListBackHref = fromDraftQueue
    ? "/yarn-management/purchase-management/draft-pos"
    : "/yarn-management/purchase-management/purchase";
  const editFromDraftSuffix = fromDraftQueue ? "?fromDraftQueue=1" : "";
  const { hasSubPermission, isLoading } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftReady, setDraftReady] = useState(!fromDraftQueue);
  const [draftInitialItems, setDraftInitialItems] = useState<YarnPurchaseItem[]>([]);
  const [gateSupplierSelection, setGateSupplierSelection] = useState("");
  const [stagingSuppliers, setStagingSuppliers] = useState<Supplier[]>([]);
  const [stagingSuppliersLoading, setStagingSuppliersLoading] = useState(false);
  const [stagingSupplierName, setStagingSupplierName] = useState("");

  /** Stable key fragment for remount once draft yarns are loaded */
  const draftKeySuffix = useMemo(
    () => draftInitialItems.map((i) => i.sourceRequisitionId ?? i.id).join("-"),
    [draftInitialItems]
  );

  const purchaseInitialData = useMemo((): Partial<PurchaseOrderData> => {
    if (!fromDraftQueue) return {};
    if (!supplierDraftId) {
      return { items: [] };
    }
    return {
      supplierId: supplierDraftId,
      supplierName: stagingSupplierName || "",
      items: draftInitialItems,
    };
  }, [
    fromDraftQueue,
    supplierDraftId,
    stagingSupplierName,
    draftInitialItems,
  ]);

  const hasPermission = hasSubPermission(
    "/yarn-management/purchase-management",
    "Purchase Order"
  );

  useEffect(() => {
    if (!fromDraftQueue || !hasPermission || isLoading) {
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      setStagingSuppliersLoading(true);
      try {
        const res = await supplierService.getSuppliers({ limit: 250, page: 1 });
        if (!cancelled) {
          setStagingSuppliers(res.results ?? []);
        }
      } catch (error) {
        console.error("[AddPurchasePage] supplier options", error);
        if (!cancelled) toast.error("Unable to load suppliers for the draft queue gate.");
      } finally {
        if (!cancelled) setStagingSuppliersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [fromDraftQueue, hasPermission, isLoading]);

  useEffect(() => {
    if (!supplierDraftId) {
      setStagingSupplierName("");
      return undefined;
    }
    let cancelled = false;
    supplierService
      .getSupplierById(supplierDraftId)
      .then((supplier) => {
        if (!cancelled) {
          setStagingSupplierName(supplier.brandName || "");
        }
      })
      .catch((error) => {
        console.error("[AddPurchasePage] supplier lookup", error);
        if (!cancelled) {
          setStagingSupplierName("");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [supplierDraftId]);

  useEffect(() => {
    if (!fromDraftQueue) {
      setDraftReady(true);
      setDraftInitialItems([]);
      return undefined;
    }

    if (!supplierDraftId) {
      setDraftReady(true);
      setDraftInitialItems([]);
      return undefined;
    }

    let cancelled = false;
    setDraftReady(false);

    (async () => {
      try {
        const rows = await yarnInventoryService.getAllDraftQueueRequisitions({
          preferredSupplierId: supplierDraftId,
        });
        if (cancelled) return;

        const items: YarnPurchaseItem[] = rows.map((req) => {
          const yarnId = requisitionYarnCatalogId(req) || "";
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
          toast(`No yarns currently queued for this supplier.`, { icon: "ℹ️" });
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
  }, [fromDraftQueue, supplierDraftId]);

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
          <Link href={poListBackHref} className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase
          </Link>
        </div>
      </div>
    );
  }

  if (fromDraftQueue && !supplierDraftId) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Draft queue supplier" />
        <DraftQueueSupplierGate
          suppliers={stagingSuppliers}
          suppliersLoading={stagingSuppliersLoading}
          selectedSupplierId={gateSupplierSelection}
          queueHydrating={false}
          onSelectedSupplierChange={(id) => setGateSupplierSelection(id)}
          onContinue={() => {
            if (!gateSupplierSelection) {
              toast.error("Pick a yarn supplier before loading staged lines.");
              return;
            }
            router.replace(`${pathname}?fromDraftQueue=1&supplierId=${gateSupplierSelection}`);
          }}
        />
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
        const yarnId = item.yarnId as string;
        console.log('[AddPurchasePage] Preparing PO item', {
          index: item.id,
          yarnId,
          sizeCount: item.sizeCount,
          sizeCountName: item.sizeCountName,
        });

        const poItem: PurchaseOrderItemPayload = {
          yarn: yarnId,
          yarnName: item.yarnName,
          sizeCount: resolvePurchaseLineSizeCount(item),
          shadeCode: item.shadeCode || undefined,
          rate: item.rate,
          quantity: item.qty,
          estimatedDeliveryDate: item.estimatedDeliveryDate,
          gstRate: item.gst,
        };
        if (item.sourceRequisitionId) {
          poItem.sourceRequisitionId = item.sourceRequisitionId;
        }

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
        currentStatus: "submitted_to_supplier",
      };
      console.log('[AddPurchasePage] Final payload', payload);

      const createdPo = await yarnPurchaseOrderService.createPurchaseOrder(payload);
      const createdId =
        (createdPo as unknown as { id?: string; _id?: string }).id ??
        (createdPo as unknown as { _id?: string })._id;
      const poId = createdId ? String(createdId) : undefined;

      const requisitionIds = itemsWithResolvedIds
        .map((item) => item.sourceRequisitionId)
        .filter((id): id is string => Boolean(id));

      if (requisitionIds.length > 0) {
        try {
          await yarnInventoryService.clearRequisitionDraftFlags(
            requisitionIds,
            poId
          );
        } catch (clearErr) {
          console.error("[AddPurchasePage] clearRequisitionDraftFlags failed", clearErr);
          toast.error(
            "PO created, but clearing the draft queue failed. Rows may still show under Draft POs."
          );
        }
      }

      toast.success("Purchase order created successfully");
      router.push(poListBackHref);
    } catch (error: any) {
      console.error("Failed to create purchase order:", error);
      const message = error?.message || "Failed to create purchase order";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
      console.log('[AddPurchasePage] Submission state reset');
    }
  };

  /**
   * Creates a yarn PO in `draft` state so the user can finish it later from the PO list.
   * @param data - Latest form values from PurchaseForm
   */
  const handleSaveDraft = async (data: PurchaseOrderData) => {
    setIsSavingDraft(true);
    try {
      const generatePoNumber = () => {
        const year = new Date().getFullYear();
        const randomPart = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
        return `PO-${year}-${randomPart}`;
      };

      const subTotal = Number.isFinite(data.subTotal) ? data.subTotal : 0;
      const gst = Number.isFinite(data.totalGst) ? data.totalGst : 0;
      const total = Number.isFinite(data.total) ? data.total : 0;

      const poItems: PurchaseOrderItemPayload[] = data.items.map((item) => {
        const yarnId = item.yarnId?.trim();
        const poItem: PurchaseOrderItemPayload = {
          yarnName: item.yarnName?.trim() || "Pending",
          sizeCount: resolvePurchaseLineSizeCount(item),
          shadeCode: item.shadeCode || undefined,
          rate: Math.max(0, Number(item.rate) || 0),
          quantity: Math.max(0, Number(item.qty) || 0),
          estimatedDeliveryDate: item.estimatedDeliveryDate?.trim()
            ? item.estimatedDeliveryDate
            : null,
          gstRate: item.gst ?? 0,
        };
        if (yarnId) {
          poItem.yarn = yarnId;
        }
        if (item.sourceRequisitionId) {
          poItem.sourceRequisitionId = item.sourceRequisitionId;
        }
        return poItem;
      });

      const payload: CreatePurchaseOrderPayload = {
        poNumber: generatePoNumber(),
        supplierName: data.supplierName?.trim() || "Draft",
        supplier: data.supplierId?.trim() || null,
        creditDays: data.creditDays ?? 0,
        estimatedOrderDeliveryDate: data.estimatedOrderDeliveryDate?.trim()
          ? data.estimatedOrderDeliveryDate
          : null,
        poItems,
        notes: data.notes,
        subTotal,
        gst,
        total,
        currentStatus: "draft",
      };

      const created = await yarnPurchaseOrderService.createPurchaseOrder(payload);
      const newId =
        (created as unknown as { id?: string; _id?: string }).id ??
        (created as unknown as { _id?: string })._id;

      const requisitionIds = data.items
        .map((item) => item.sourceRequisitionId)
        .filter((id): id is string => Boolean(id));
      if (requisitionIds.length > 0) {
        try {
          await yarnInventoryService.clearRequisitionDraftFlags(requisitionIds);
        } catch (clearErr) {
          console.error("[AddPurchasePage] clear draft flags after save draft", clearErr);
          toast.error("Draft saved, but clearing queue flags failed—rows may look still staged.");
        }
      }

      toast.success("Draft saved. You can submit it to the supplier anytime from Edit PO.");
      if (newId) {
        router.push(`/yarn-management/purchase-management/purchase/edit/${newId}${editFromDraftSuffix}`);
      } else {
        router.push(poListBackHref);
      }
    } catch (error: unknown) {
      console.error("Failed to save draft purchase order:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save draft purchase order";
      toast.error(message);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleCancel = () => {
    router.push(poListBackHref);
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
                href={poListBackHref}
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
              !fromDraftQueue
                ? "new-purchase"
                : `draft-queue-${supplierDraftId || "none"}-${draftKeySuffix || "empty"}`
            }
            initialData={purchaseInitialData}
            onSubmit={handleSubmit}
            onSaveDraft={handleSaveDraft}
            isSavingDraft={isSavingDraft}
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
