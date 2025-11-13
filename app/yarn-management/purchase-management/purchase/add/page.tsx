"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm, { PurchaseOrderData } from "../components/PurchaseForm";
import yarnPurchaseOrderService, { CreatePurchaseOrderPayload, PurchaseOrderItemPayload } from "@/shared/services/yarnPurchaseOrderService";
import yarnCatalogService, { YarnCatalogQueryParams } from "@/shared/services/yarnCatalogService";

const AddPurchasePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

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
        const detailId = extractYarnId(item.selectedYarnDetail);
        if (detailId) {
          return detailId;
        }

        const query: YarnCatalogQueryParams = {
          limit: 20,
          page: 1,
        };

        if (item.sizeCount) {
          query.countSize = String(item.sizeCount);
        }
        if (item.yarnSubtypeId) {
          query.yarnSubtype = String(item.yarnSubtypeId);
        }
        if (item.yarnTypeId) {
          query.yarnType = String(item.yarnTypeId);
        }
        if (item.yarnName) {
          query.yarnName = item.yarnName;
        }

        try {
          console.log("[AddPurchasePage] Fetching yarn catalog for item", { item, query });
          const catalogResponse = await yarnCatalogService.getYarnCatalogs(query);
          console.log("[AddPurchasePage] Yarn catalog response", catalogResponse);

          const byExactName = catalogResponse.results.find(
            (catalog) => catalog.yarnName?.toLowerCase() === item.yarnName?.toLowerCase()
          );
          if (byExactName) {
            return byExactName.id;
          }

          const byCountSize = catalogResponse.results.find((catalog) => {
            const catalogCountId = catalog.countSize?.id || (catalog.countSize as any)?._id;
            return catalogCountId && String(catalogCountId) === String(item.sizeCount);
          });
          if (byCountSize) {
            return byCountSize.id;
          }

          const fallbackCatalog = catalogResponse.results[0];
          return fallbackCatalog?.id;
        } catch (error) {
          console.error("[AddPurchasePage] Failed to fetch yarn catalog", error);
          return undefined;
        }
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
        toast.error(`Please select a yarn from the supplier catalog for item ${missingYarnIndex + 1}`);
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

  return (
    <div className="main-content">
      <Seo title="Add Purchase Order" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Add Purchase Order</h1>
                <p className="text-gray-600 mt-1">Create a new yarn purchase order</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/purchase-management/purchase" 
                  className="ti-btn ti-btn-secondary"
                  title="Back to Purchase Orders"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back
                </Link>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Purchase Order Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                Fill in the details below to create a new purchase order. You can add multiple yarn items in one purchase order.
                Fields marked with * are required. The order will be saved as "submitted to supplier" by default.
              </p>
            </div>
            <div className="box-body">
              <PurchaseForm
                onSubmit={handleSubmit}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
                submitButtonText="Submit to Supplier"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPurchasePage;
