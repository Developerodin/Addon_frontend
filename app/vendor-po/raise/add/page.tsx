"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import VendorPOForm from "../components/VendorPOForm";
import { VendorPOFormData } from "../types";
import { getVendor } from "@/shared/services/vendorManagementService";
import vendorPurchaseOrderService from "@/shared/services/vendorPurchaseOrderService";
import { listProducts, getProductById } from "@/shared/services/productService";
import { productRecordToVendorPOArticle } from "../components/vendorPoArticleMapping";
import {
  canAccessVendorPoRaiseAdd,
  getVendorPoRaiseFormMode,
  hasFullVendorPoRaiseAccess,
} from "../components/vendorPoRaiseAccess";
import type { VendorPoFormSubmitAction } from "../components/VendorPOForm";
import type { VendorOption } from "../components/VendorPOFormHeaderSection";
import { buildVendorPoApiPayload } from "../components/vendorPoFormPayload";

const VendorPOCreatePage = () => {
  const router = useRouter();
  const authUser = useSelector((state: { auth?: { user?: { role?: string } } }) => state.auth?.user);
  const formMode = getVendorPoRaiseFormMode(authUser?.role);
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Raise") || hasFullVendorPoRaiseAccess(authUser?.role);
  const canAdd = canAccess && canAccessVendorPoRaiseAdd(authUser?.role);

  const [allCatalogArticles, setAllCatalogArticles] = useState<
    { id: string; code: string; name: string; internalCode?: string }[]
  >([]);
  const [articles, setArticles] = useState<{ id: string; code: string; name: string; internalCode?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listProducts({ page: 1, limit: 500 });
        if (!cancelled) {
          const mapped = (res.results || [])
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
  }, []);

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

  const handleCreate = async (
    data: VendorPOFormData,
    action: VendorPoFormSubmitAction,
    selectedVendor: VendorOption | null
  ) => {
    setIsSubmitting(true);
    try {
      const payload = buildVendorPoApiPayload(data, selectedVendor, action);
      if (!payload.vendorName) {
        toast.error("Could not resolve vendor name. Reload the page and try again.");
        return;
      }
      await vendorPurchaseOrderService.create(payload);
      toast.success(action === "submit" ? "PO submitted to supplier." : "Draft PO saved.");
      router.push("/vendor-po/raise");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to create PO");
    } finally {
      setIsSubmitting(false);
    }
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

  if (!canAccess || !canAdd) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Create Vendor PO" />
        <div className="text-center py-12">
          <i className="ri-lock-line text-6xl text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">
            {formMode === "accounts_draft"
              ? "Accounts users cannot create new POs. Open a draft PO from the list to enter rate & GST."
              : "You don't have permission to create vendor POs."}
          </p>
          <Link href="/vendor-po/raise" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2" />
            Back to Purchase Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content !p-[10px]">
      <Seo title="Add Purchase Order" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">Vendor Purchase Order</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/vendor-po/raise"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <i className="ri-arrow-left-line text-xs" />
                Back
              </Link>
            </div>
          </div>
        </div>
        <div className="px-[10px] pb-[10px]">
          <VendorPOForm
            initialData={null}
            articles={articles}
            onVendorChange={handleVendorChange}
            formMode={formMode}
            onSubmit={handleCreate}
            onCancel={() => router.push("/vendor-po/raise")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorPOCreatePage;
