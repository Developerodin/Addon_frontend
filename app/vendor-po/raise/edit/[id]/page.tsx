"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import VendorPOForm from "../../components/VendorPOForm";
import { VendorPOFormData, VendorPO, VendorPOStatus } from "../../types";
import { getVendors, getStoredOrders, setStoredOrders, MOCK_VENDOR_POS, MOCK_ARTICLES } from "../../data";

function poToFormData(po: VendorPO): VendorPOFormData {
  return {
    vendorId: po.vendorId,
    priority: po.priority,
    remarks: po.remarks ?? "",
    lineItems: (po.lineItems ?? []).length
      ? po.lineItems.map((li) => ({
          ...li,
          id: li.id || `li-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }))
      : [{ id: `li-${Date.now()}`, articleId: "", articleCode: "", articleName: "", orderedQty: 0, lineRemarks: "" }],
  };
}

function buildPOFromForm(
  existing: VendorPO,
  form: VendorPOFormData,
  status: VendorPOStatus
): VendorPO {
  const vendor = getVendors().find((v) => v.id === form.vendorId);
  const totalQty = form.lineItems.reduce((s, li) => s + li.orderedQty, 0);
  const articleSummary = form.lineItems.map((li) => li.articleName).join(", ");
  const now = new Date().toISOString();
  return {
    ...existing,
    vendorId: form.vendorId,
    vendorName: vendor?.vendorName ?? existing.vendorName,
    priority: form.priority,
    totalQty,
    articleSummary,
    remarks: form.remarks || undefined,
    lineItems: form.lineItems,
    status,
    updatedAt: now,
  };
}

const VendorPOEditPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [po, setPo] = useState<VendorPO | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [vendors, setVendors] = useState<{ id: string; vendorCode: string; vendorName: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const list = getStoredOrders() ?? MOCK_VENDOR_POS;
    const found = list.find((o) => o.id === id) ?? null;
    setPo(found);
    setNotFound(!found);
    setVendors(
      getVendors().map((v) => ({
        id: v.id,
        vendorCode: v.vendorCode,
        vendorName: v.vendorName,
      }))
    );
  }, [id]);

  const handleSaveDraft = (data: VendorPOFormData) => {
    if (!po) return;
    setIsSubmitting(true);
    try {
      const list = getStoredOrders() ?? MOCK_VENDOR_POS;
      const updated = buildPOFromForm(po, data, "Draft");
      const next = list.map((o) => (o.id === id ? updated : o));
      setStoredOrders(next);
      toast.success("PO saved as draft.");
      router.push("/vendor-po/raise");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = (data: VendorPOFormData) => {
    if (!po) return;
    setIsSubmitting(true);
    try {
      const list = getStoredOrders() ?? MOCK_VENDOR_POS;
      const updated = buildPOFromForm(po, data, "Approved");
      const next = list.map((o) => (o.id === id ? updated : o));
      setStoredOrders(next);
      toast.success("PO approved and released.");
      router.push("/vendor-po/raise");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to release PO");
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const isApproved = po.status !== "Draft";

  return (
    <div className="main-content">
      <Seo title={`Edit ${po.poNo}`} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">
                  Edit Vendor PO {po.poNo}
                  {isApproved && <span className="ml-2 text-sm font-normal text-gray-500">(Approved – view only)</span>}
                </h1>
                <p className="text-gray-600 mt-1">Edit vendor purchase order details</p>
              </div>
              <div className="box-tools">
                <Link
                  href="/vendor-po/raise"
                  className="ti-btn ti-btn-secondary inline-flex items-center gap-2 py-2 px-4 whitespace-nowrap"
                  title="Back to Vendor POs"
                >
                  <i className="ri-arrow-left-line me-2"></i>
                  Back
                </Link>
              </div>
            </div>
          </div>
          <VendorPOForm
            initialData={initialData}
            vendors={vendors}
            articles={MOCK_ARTICLES}
            isApproved={isApproved}
            onSaveDraft={handleSaveDraft}
            onApprove={handleApprove}
            onCancel={() => router.push("/vendor-po/raise")}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default VendorPOEditPage;
