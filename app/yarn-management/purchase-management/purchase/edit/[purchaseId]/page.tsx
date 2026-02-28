"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import PurchaseForm, { PurchaseOrderData, PurchaseOrderStatus } from "../../components/PurchaseForm";
import yarnPurchaseOrderService, {
  PurchaseOrderItemPayload,
  UpdatePurchaseOrderPayload,
} from "@/shared/services/yarnPurchaseOrderService";
import yarnCatalogService, { YarnCatalogQueryParams } from "@/shared/services/yarnCatalogService";

const statusFromAPI = (statusCode: string): PurchaseOrderStatus => {
  const map: Record<string, PurchaseOrderStatus> = {
    submitted_to_supplier: "submitted to supplier",
    in_transit: "in transit",
    delivered: "delivered",
    rejected: "rejected",
    qc_pending: "QC pending",
    partially_delivered: "partially delivered",
    stocked: "stocked",
    goods_received: "goods received",
    goods_partially_received: "goods partially received",
    po_accepted: "PO accepted",
    po_accepted_partially: "PO accepted partially",
  };
  return map[statusCode] || "submitted to supplier";
};

const statusToAPI = (status: PurchaseOrderStatus): string => {
  const map: Record<PurchaseOrderStatus, string> = {
    "submitted to supplier": "submitted_to_supplier",
    "in transit": "in_transit",
    delivered: "delivered",
    rejected: "rejected",
    "QC pending": "qc_pending",
    "partially delivered": "partially_delivered",
    stocked: "stocked",
    "goods received": "goods_received",
    "goods partially received": "goods_partially_received",
    "PO accepted": "po_accepted",
    "PO accepted partially": "po_accepted_partially",
    "po_accepted": "po_accepted",
  };
  return map[status] || "submitted_to_supplier";
};

const toDateInputValue = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().split("T")[0];
};

const mapApiOrderToFormData = (apiOrder: any): { formData: PurchaseOrderData; orderId: string; poNumber: string } => {
  if (!apiOrder) {
    return {
      formData: {
        purchaseDate: new Date().toISOString().split("T")[0],
        supplierId: "",
        supplierName: "",
        items: [],
        subTotal: 0,
        totalGst: 0,
        total: 0,
        status: "submitted to supplier",
        notes: "",
      },
      orderId: "",
      poNumber: "",
    };
  }

  const supplier = apiOrder.supplier || {};
  const supplierId =
    supplier._id ||
    supplier.id ||
    apiOrder.supplierId ||
    apiOrder.supplier_id ||
    apiOrder.supplier?._id ||
    apiOrder.supplier?.id ||
    "";
  const supplierName =
    apiOrder.supplierName ||
    supplier.brandName ||
    supplier.name ||
    apiOrder.supplier ||
    "";

  const poItems = Array.isArray(apiOrder.poItems)
    ? apiOrder.poItems
    : Array.isArray(apiOrder.items)
    ? apiOrder.items
    : [];

  const items =
    poItems?.map((item: any, index: number) => {
      const yarn = item?.yarn || {};
      const yarnType = yarn?.yarnType || item?.yarnType;
      const yarnSubtype = yarn?.yarnSubtype || item?.yarnSubtype || (yarn as any)?.yarnsubtype;
      const yarnIdRaw = yarn?.id || yarn?._id || item?.yarnId || item?.yarn_id || "";
      const yarnId = yarnIdRaw ? String(yarnIdRaw) : "";
      const sizeCountRaw = item?.sizeCount || item?.size_count || item?.countSize || "";
      const sizeCount =
        typeof sizeCountRaw === "object" && sizeCountRaw !== null
          ? String(sizeCountRaw.id || sizeCountRaw._id || sizeCountRaw.name || "")
          : String(sizeCountRaw ?? "");
      const sizeCountName =
        typeof sizeCountRaw === "object" && sizeCountRaw !== null
          ? String(sizeCountRaw.name || sizeCountRaw.label || sizeCountRaw.value || "")
          : String(sizeCountRaw ?? "");
      const rate = Number(item?.rate ?? item?.unitPrice ?? 0);
      const quantity = Number(item?.quantity ?? item?.qty ?? 0);
      const gstRate = Number(item?.gstRate ?? item?.gst ?? item?.gst_rate ?? 0);
      const estimatedDelivery =
        item?.estimatedDeliveryDate || item?.estimated_delivery_date || item?.expectedDelivery;

      return {
        id: String(item?._id || item?.id || yarn?.id || yarn?._id || `${apiOrder?.id || "item"}-${index}`),
        yarnName: item?.yarnName || yarn?.yarnName || yarn?.name || "",
        yarnId,
        yarnTypeId: yarnType?.id || yarnType?._id ? String(yarnType?.id || yarnType?._id) : undefined,
        yarnSubtypeId: (() => {
          if (!yarnSubtype) return undefined;
          const subtypeId = yarnSubtype?.id || yarnSubtype?._id;
          return subtypeId ? String(subtypeId) : undefined;
        })(),
        sizeCount,
        sizeCountName,
        shadeCode: item?.shadeCode || item?.shade_code || yarn?.shadeCode || "",
        rate,
        qty: quantity,
        estimatedDeliveryDate: toDateInputValue(estimatedDelivery),
        gst: gstRate,
        subTotal: Number(item?.subTotal ?? item?.sub_total ?? rate * quantity),
      };
    }) || [];

  return {
    formData: {
      purchaseDate:
        toDateInputValue(apiOrder.createDate || apiOrder.orderDate || apiOrder.order_date || apiOrder.createdAt) ||
        new Date().toISOString().split("T")[0],
      supplierId: supplierId ? String(supplierId) : "",
      supplierName,
      items,
      subTotal: Number(apiOrder.subTotal || apiOrder.sub_total || apiOrder.subtotal || 0),
      totalGst: Number(apiOrder.gst || apiOrder.totalGst || apiOrder.total_gst || 0),
      total: Number(apiOrder.total || apiOrder.totalAmount || apiOrder.total_amount || apiOrder.grandTotal || 0),
      status: statusFromAPI(apiOrder.currentStatus || apiOrder.status || apiOrder.status_code || "submitted_to_supplier"),
      notes: apiOrder.notes || apiOrder.remarks || "",
    },
    orderId: String(apiOrder._id || apiOrder.id || apiOrder.orderId || apiOrder.order_id || ""),
    poNumber: String(apiOrder.poNumber || apiOrder.orderNumber || apiOrder.order_number || apiOrder.po_number || ""),
  };
};

const EditPurchasePage = () => {
  const router = useRouter();
  const params = useParams();
  const purchaseId = params?.purchaseId as string;
  const { hasSubPermission, isLoading: isLoadingPermissions } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseData, setPurchaseData] = useState<PurchaseOrderData | null>(null);
  const [orderMetadata, setOrderMetadata] = useState<{ orderId: string; poNumber: string } | null>(null);

  // Check permission
  const hasPermission = hasSubPermission('/yarn-management/purchase-management', 'Purchase Order');

  useEffect(() => {
    const fetchPurchaseData = async () => {
      if (!purchaseId) return;
      
      setIsLoading(true);
      try {
        const response = await yarnPurchaseOrderService.getPurchaseOrderById(purchaseId);
        const mapped = mapApiOrderToFormData(response);

        if (!mapped.orderId) {
          throw new Error('Purchase order ID missing in response');
        }

        if (!mapped.formData.supplierId) {
          console.warn('[EditPurchasePage] Supplier ID missing in fetched order', response);
        }

        setPurchaseData(mapped.formData);
        setOrderMetadata({ orderId: mapped.orderId, poNumber: mapped.poNumber });
      } catch (error) {
        console.error('Failed to fetch purchase data:', error);
        toast.error('Failed to load purchase data');
      } finally {
        setIsLoading(false);
      }
    };

    if (purchaseId) {
      fetchPurchaseData();
    }
  }, [purchaseId]);

  if (isLoadingPermissions) {
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
          <p className="text-gray-500 mb-4">You don't have permission to edit purchase orders.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-loader-4-line animate-spin text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
          <p className="text-gray-500">Please wait while we load the purchase order data.</p>
        </div>
      </div>
    );
  }

  if (!purchaseData) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-error-warning-line text-4xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Order Not Found</h3>
          <p className="text-gray-500 mb-4">The requested purchase order could not be found.</p>
          <Link href="/yarn-management/purchase-management/purchase" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Orders
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (data: PurchaseOrderData) => {
    if (!orderMetadata?.orderId) {
      toast.error('Unable to determine purchase order ID');
      return;
    }

    setIsSubmitting(true);
    try {
      const extractYarnId = (
        detail: PurchaseOrderData["items"][number]["selectedYarnDetail"]
      ): string | undefined => {
        if (!detail) return undefined;

        const valueToId = (value: unknown): string | undefined => {
          if (!value) return undefined;
          if (typeof value === "string" || typeof value === "number") {
            return String(value);
          }
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

        if (item.selectedCatalog?.id) {
          return item.selectedCatalog.id;
        }

        // Prefer catalog id from the user's selected supplier yarn detail (keeps shade/catalog correct when multiple options share same name)
        const detail = item.selectedYarnDetail as Record<string, unknown> | undefined;
        const raw =
          detail?.yarnCatalogId ?? detail?.yarnCatalog ?? detail?.catalogId ?? detail?.catalog;
        if (raw != null) {
          const id = typeof raw === "string" || typeof raw === "number"
            ? String(raw)
            : (raw as { id?: string; _id?: string })?.id ?? (raw as { id?: string; _id?: string })?._id;
          if (id) return id;
        }
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
          const catalogResponse = await yarnCatalogService.getYarnCatalogs(query);

          const byExactName = catalogResponse.results.find(
            (catalog) => catalog.yarnName?.toLowerCase() === item.yarnName?.toLowerCase()
          );
          if (byExactName) {
            return byExactName.id;
          }

          const byCountSize = catalogResponse.results.find((catalog) => {
            const catalogCountId = (catalog.countSize as any)?.id || (catalog.countSize as any)?._id;
            return catalogCountId && String(catalogCountId) === String(item.sizeCount);
          });
          if (byCountSize) {
            return byCountSize.id;
          }

          const fallbackCatalog = catalogResponse.results[0];
          return fallbackCatalog?.id;
        } catch (error) {
          console.error("[EditPurchasePage] Failed to fetch yarn catalog", error);
          return undefined;
        }
      };

      const itemsWithResolvedIds = await Promise.all(
        data.items.map(async (item) => {
          if (item.yarnId) {
            return item;
          }

          const resolvedId = await resolveYarnCatalogId(item);
          return {
            ...item,
            yarnId: resolvedId ? String(resolvedId) : "",
          };
        })
      );

      const missingYarnIndex = itemsWithResolvedIds.findIndex((item) => !item.yarnId);

      if (missingYarnIndex !== -1) {
        toast.error(`Please select a yarn from the supplier catalog for item ${missingYarnIndex + 1}`);
        setIsSubmitting(false);
        return;
      }

      const poItems: PurchaseOrderItemPayload[] = itemsWithResolvedIds.map((item) => {
        const resolveSizeCount = () => {
          if (item.selectedCatalog?.countSize) {
            const catalogCountSize = item.selectedCatalog.countSize as any;
            return (
              catalogCountSize?.name ||
              catalogCountSize?.label ||
              catalogCountSize?.id ||
              item.sizeCountName ||
              item.sizeCount
            );
          }

          if (!item.selectedYarnDetail) {
            return item.sizeCountName || item.sizeCount;
          }

          const rawCountSize =
            (item.selectedYarnDetail as any)?.countSize ||
            (typeof item.selectedYarnDetail.yarnsubtype === "object"
              ? (item.selectedYarnDetail.yarnsubtype as any)?.countSize
              : undefined);

          const countSizeArray = Array.isArray(rawCountSize) ? rawCountSize : [];

          const matched = countSizeArray.find((cs: any) => {
            const csId = cs?._id || cs?.id || cs;
            return csId && String(csId) === String(item.sizeCount);
          });

          if (matched) {
            return matched?.name || matched?.label || item.sizeCount;
          }

          return item.sizeCountName || item.sizeCount;
        };

        return {
          ...(item.id && { _id: String(item.id) }),
          yarn: String(item.yarnId),
          yarnName: item.yarnName,
          sizeCount: String(resolveSizeCount()),
          shadeCode: item.shadeCode || undefined,
          rate: item.rate,
          quantity: item.qty,
          estimatedDeliveryDate: item.estimatedDeliveryDate,
          gstRate: item.gst,
        };
      });

      const existingPoNumber =
        orderMetadata.poNumber || `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

      const payload: UpdatePurchaseOrderPayload = {
        poNumber: existingPoNumber,
        supplierName: data.supplierName,
        supplier: data.supplierId,
        poItems,
        notes: data.notes,
        subTotal: data.subTotal,
        gst: data.totalGst,
        total: data.total,
        currentStatus: statusToAPI(data.status),
      };

      await yarnPurchaseOrderService.updatePurchaseOrder(orderMetadata.orderId, payload);

      toast.success('Purchase order updated successfully');
      router.push('/yarn-management/purchase-management/purchase');
    } catch (error) {
      console.error('Failed to update purchase order:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/yarn-management/purchase-management/purchase');
  };

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Edit Purchase Order" />
      
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">
                Edit Purchase Order
                {orderMetadata?.poNumber && (
                  <span className="text-gray-500 font-normal ml-2">({orderMetadata.poNumber})</span>
                )}
              </h1>
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
            initialData={purchaseData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            submitButtonText="Update Purchase Order"
          />
        </div>
      </div>
    </div>
  );
};

export default EditPurchasePage;
