"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import VendorPOForm from "../components/VendorPOForm";
import { VendorPOFormData } from "../types";
import { listVendors, getVendor } from "@/shared/services/vendorManagementService";
import { mapVendorDocToVendor } from "../../vendor-list/vendorMappers";
import vendorPurchaseOrderService from "@/shared/services/vendorPurchaseOrderService";
import { listProducts, getProductById } from "@/shared/services/productService";

/**
 * Create vendor PO — shell matches yarn `purchase-management/purchase/add` (main-content, white card, compact header).
 */
const VendorPOCreatePage = () => {
  const router = useRouter();
  const { hasSubPermission, isLoading: permLoading } = useNavigation();
  const canAccess = hasSubPermission("/vendor-po", "Vendor PO Raise");

  const [vendors, setVendors] = useState<{ id: string; vendorCode: string; vendorName: string }[]>([]);
  const [allCatalogArticles, setAllCatalogArticles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [articles, setArticles] = useState<{ id: string; code: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listProducts({ page: 1, limit: 500 });
        if (!cancelled) {
          const mapped = (res.results || []).map((p) => ({
            id: p.id,
            code: p.factoryCode || "",
            name: p.name,
          }));
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
            return {
              id: product,
              code: (full?.factoryCode as string | undefined) || "",
              name: (full?.name as string | undefined) || "",
            };
          }
          const productObj = product as Record<string, unknown>;
          return {
            id: String(productObj.id || productObj._id || ""),
            code: String(productObj.factoryCode || ""),
            name: String(productObj.name || ""),
          };
        })
      );
      setArticles(mapped.filter((p) => p.id && p.name));
    } catch {
      setArticles([]);
    }
  };

  const handleCreate = async (data: VendorPOFormData) => {
    setIsSubmitting(true);
    try {
      const subTotal = data.lineItems.reduce(
        (sum, item) => sum + Number(item.orderedQty || 0) * Number(item.rate || 0),
        0
      );
      const gst = data.lineItems.reduce(
        (sum, item) =>
          sum +
          (Number(item.orderedQty || 0) * Number(item.rate || 0) * Number(item.gstRate || 0)) / 100,
        0
      );
      const total = subTotal + gst;
      const vendorRow = vendors.find((v) => v.id === data.vendorId);
      const vendorName = vendorRow?.vendorName?.trim() ?? "";
      if (!vendorName) {
        toast.error("Could not resolve vendor name. Reload the page and try again.");
        return;
      }
      await vendorPurchaseOrderService.create({
        vendor: data.vendorId,
        vendorName,
        poItems: data.lineItems.map((item) => ({
          productId: item.articleId,
          productName: item.articleName,
          quantity: Number(item.orderedQty || 0),
          rate: Number(item.rate || 0),
          gstRate: Number(item.gstRate || 0),
          estimatedDeliveryDate: item.estimatedDeliveryDate || undefined,
        })),
        subTotal,
        gst,
        total,
        creditDays: Number(data.creditDays || 0),
        estimatedOrderDeliveryDate: data.estimatedOrderDeliveryDate
          ? new Date(data.estimatedOrderDeliveryDate).toISOString()
          : undefined,
        notes: data.remarks || undefined,
      });
      toast.success("PO created.");
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

  if (!canAccess) {
    return (
      <div className="main-content !p-[10px]">
        <Seo title="Create Vendor PO" />
        <div className="text-center py-12">
          <i className="ri-lock-line text-6xl text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don&apos;t have permission to create vendor POs.</p>
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
      <Seo title="Create Vendor PO" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
              <h1 className="text-sm font-bold text-gray-800">New Vendor Purchase Order</h1>
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
          <p className="text-[11px] text-[#7987A1] -mt-4 mb-4">
            Select vendor → catalog shows only products linked to that vendor → enter qty, rate, GST% → totals auto-calculate (same flow as Yarn Purchase Order).
          </p>
          <VendorPOForm
            initialData={null}
            vendors={vendors}
            articles={articles}
            onVendorChange={handleVendorChange}
            onSubmit={handleCreate}
            submitButtonText="Submit PO"
            onCancel={() => router.push("/vendor-po/raise")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorPOCreatePage;
