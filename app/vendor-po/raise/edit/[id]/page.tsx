"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import VendorPOForm from "../../components/VendorPOForm";
import { VendorPOFormData, VendorPO } from "../../types";
import { listVendors, getVendor } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "../../../vendor-list/vendorMappers";
import vendorPurchaseOrderService from "@/shared/services/vendorPurchaseOrderService";
import { mapVendorPurchaseOrderToUi } from "../../../utils/vendorPoFlow";
import { listProducts, getProductById } from "@/shared/services/productService";
import { productRecordToVendorPOArticle } from "../../components/vendorPoArticleMapping";
import {
  canAccessVendorPoRaiseEdit,
  getVendorPoRaiseFormMode,
  hasFullVendorPoRaiseAccess,
} from "../../components/vendorPoRaiseAccess";
import { buildVendorPoUpdatePayload } from "../../components/vendorPoFormPayload";
import type { VendorPoFormSubmitAction } from "../../components/VendorPOForm";

function poToFormData(po: VendorPO): VendorPOFormData {
  return {
    vendorId: po.vendorId,
    creditDays: po.creditDays ?? 0,
    estimatedOrderDeliveryDate: po.estimatedOrderDeliveryDate ?? "",
    remarks: po.remarks ?? "",
    lineItems: (po.lineItems ?? []).length
      ? (po.lineItems ?? []).map((li) => ({
          ...li,
          id: li.id || `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }))
      : [
          {
            id: `li-${Date.now()}`,
            articleId: "",
            articleCode: "",
            articleName: "",
            type: "",
            color: "",
            pattern: "",
            orderedQty: 0,
            rate: 0,
            gstRate: 0,
            lineRemarks: "",
          },
        ],
  };
}

const VendorPOEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const authUser = useSelector((state: { auth?: { user?: { role?: string } } }) => state.auth?.user);
  const formMode = getVendorPoRaiseFormMode(authUser?.role);
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Raise") || hasFullVendorPoRaiseAccess(authUser?.role);
  const id = params?.id as string;
  const [po, setPo] = useState<VendorPO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; vendorCode: string; vendorName: string }[]>([]);
  const [allCatalogArticles, setAllCatalogArticles] = useState<
    { id: string; code: string; name: string; internalCode?: string }[]
  >([]);
  const [articles, setArticles] = useState<{ id: string; code: string; name: string; internalCode?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const poRes = await vendorPurchaseOrderService.getById(id);
        if (!cancelled) {
          const mappedPo = mapVendorPurchaseOrderToUi(poRes);
          const hydratedLineItems = await Promise.all(
            (mappedPo.lineItems || []).map(async (line) => {
              const hasCode = !!line.articleCode?.trim();
              const hasName = !!line.articleName?.trim();
              const hasType = !!line.type?.trim();
              const hasColor = !!line.color?.trim();
              const hasPattern = !!line.pattern?.trim();
              if (!line.articleId || (hasCode && hasName && hasType && hasColor && hasPattern)) {
                return line;
              }
              try {
                const product = await getProductById(line.articleId);
                const productMapped = productRecordToVendorPOArticle(
                  product as Record<string, unknown> | null | undefined,
                  line.articleId
                );
                if (!productMapped) return line;
                return {
                  ...line,
                  articleCode: line.articleCode?.trim() || productMapped.vendorCode?.trim() || productMapped.code || "",
                  articleName: line.articleName?.trim() || productMapped.name || "",
                  type: line.type?.trim() || productMapped.type || "",
                  color: line.color?.trim() || productMapped.color || "",
                  pattern: line.pattern?.trim() || productMapped.pattern || "",
                };
              } catch {
                return line;
              }
            })
          );
          setPo({
            ...mappedPo,
            lineItems: hydratedLineItems,
          });
          setNotFound(false);
        }
      } catch {
        if (!cancelled) {
          setPo(null);
          setNotFound(true);
        }
      }
      try {
        const res = await listVendors({ page: 1, limit: 500, sortBy: "createdAt:desc", populate: "products" });
        if (!cancelled) {
          setVendors(
            res.results.map(mapVendorDocToVendor).map((v) => ({
              id: v.id,
              vendorCode: v.vendorCode,
              vendorName: v.vendorName,
            }))
          );
        }
      } catch {
        if (!cancelled) setVendors([]);
      }
      try {
        const products = await listProducts({ page: 1, limit: 500 });
        if (!cancelled) {
          const mapped = (products.results || [])
            .map((p) => productRecordToVendorPOArticle(p as unknown as Record<string, unknown>, p.id))
            .filter((a): a is NonNullable<typeof a> => a != null);
          setAllCatalogArticles(mapped);
          setArticles(mapped);
        }
      } catch {
        if (!cancelled) setArticles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!po?.vendorId) return;
    void (async () => {
      try {
        const vendor = await getVendor(po.vendorId, { populate: "products" });
        const vendorProducts = vendor?.products || [];
        if (!vendorProducts.length) {
          setArticles([]);
          return;
        }
        const mapped = await Promise.all(
          vendorProducts.map(async (product) => {
            if (typeof product === "string") {
              const full = await getProductById(product);
              return productRecordToVendorPOArticle(full as Record<string, unknown> | null | undefined, product);
            }
            return productRecordToVendorPOArticle(product as Record<string, unknown>);
          })
        );
        setArticles(mapped.filter((p): p is NonNullable<typeof p> => p != null && !!p.id && !!p.name));
      } catch {
        setArticles([]);
      }
    })();
  }, [po?.vendorId]);

  const handleVendorChange = async (vendorId: string) => {
    if (!vendorId) {
      setArticles(allCatalogArticles);
      return;
    }
    try {
      const vendor = await getVendor(vendorId, { populate: "products" });
      const vendorProducts = vendor?.products || [];
      if (!vendorProducts.length) {
        setArticles([]);
        return;
      }
      const mapped = await Promise.all(
        vendorProducts.map(async (product) => {
          if (typeof product === "string") {
            const full = await getProductById(product);
            return productRecordToVendorPOArticle(full as Record<string, unknown> | null | undefined, product);
          }
          return productRecordToVendorPOArticle(product as Record<string, unknown>);
        })
      );
      setArticles(mapped.filter((p): p is NonNullable<typeof p> => p != null && !!p.id && !!p.name));
    } catch {
      setArticles([]);
    }
  };

  const workflowLocked = useMemo(() => {
    if (!po?.apiStatus) return false;
    if (formMode === "full") {
      return po.apiStatus !== "draft" && po.apiStatus !== "submitted_to_vendor";
    }
    return po.apiStatus !== "draft";
  }, [po?.apiStatus, formMode]);

  const roleCanEdit = useMemo(() => {
    if (!po) return true;
    return canAccessVendorPoRaiseEdit(authUser?.role, po.apiStatus);
  }, [po, authUser?.role]);

  const handleSave = (data: VendorPOFormData, action: VendorPoFormSubmitAction) => {
    if (!po) return;
    setIsSubmitting(true);
    void (async () => {
      try {
        const payload = buildVendorPoUpdatePayload(data, vendors, action);
        const vendorName = payload.vendorName?.trim() || po.vendorName?.trim() || "";
        if (!vendorName) {
          toast.error("Could not resolve vendor name. Reload the page and try again.");
          return;
        }
        await vendorPurchaseOrderService.update(id, { ...payload, vendorName });
        toast.success(
          action === "submit" ? "PO submitted to supplier." : "Draft PO updated."
        );
        router.push("/vendor-po/raise");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Failed to update PO");
      } finally {
        setIsSubmitting(false);
      }
    })();
  };

  if (permLoading) {
    return (
      <div className="main-content !p-[10px]">
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Vendor PO" />
        <div className="text-center py-12">
          <i className="ri-lock-line text-6xl text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don&apos;t have permission to edit vendor POs.</p>
          <Link href="/vendor-po/raise" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2" />
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="main-content">
        <Seo title="Vendor PO not found" />
        <div className="box">
          <div className="box-body text-center py-12">
            <p className="text-gray-600 mb-4">Vendor PO not found.</p>
            <Link href="/vendor-po/raise" className="ti-btn ti-btn-light inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap">
              <i className="ri-arrow-left-line me-2"></i>
              Back to list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="main-content">
        <Seo title="Edit Vendor PO" />
        <div className="box">
          <div className="box-body text-center py-12 text-gray-500">Loading…</div>
        </div>
      </div>
    );
  }

  const initialData = poToFormData(po);

  if (!roleCanEdit) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Edit Vendor PO" />
        <div className="text-center py-12">
          <i className="ri-lock-line text-6xl text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Draft only</h3>
          <p className="text-gray-500 mb-4">
            {formMode === "accounts_draft"
              ? "Accounts can only edit draft POs to enter rate & GST before submit."
              : "User role can only edit draft POs. This PO has already moved forward."}
          </p>
          <Link href="/vendor-po/raise" className="ti-btn ti-btn-primary">
            Back to list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title={`Edit ${po.poNo}`} />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Edit Vendor PO — {po.poNo}</h1>
            </div>
            <Link
              href="/vendor-po/raise"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              title="Back to list"
            >
              <i className="ri-arrow-left-line text-xs" />
              Back
            </Link>
          </div>
        </div>
        <div className="px-[10px] pb-[10px]">
          <VendorPOForm
            initialData={initialData}
            vendors={vendors}
            articles={articles}
            onVendorChange={handleVendorChange}
            formMode={formMode}
            apiStatus={po.apiStatus}
            workflowLocked={workflowLocked}
            onSubmit={handleSave}
            onCancel={() => router.push("/vendor-po/raise")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorPOEditPage;
