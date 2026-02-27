"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { toast } from "react-hot-toast";
import VendorPOForm from "../components/VendorPOForm";
import { VendorPOFormData, VendorPO, VendorPOStatus } from "../types";
import { getVendors, getStoredOrders, setStoredOrders, MOCK_VENDOR_POS, MOCK_ARTICLES } from "../data";

function buildPOFromForm(
  form: VendorPOFormData,
  options: { id: string; poNo: string; status: VendorPOStatus }
): VendorPO {
  const vendor = getVendors().find((v) => v.id === form.vendorId);
  const totalQty = form.lineItems.reduce((s, li) => s + li.orderedQty, 0);
  const articleSummary = form.lineItems.map((li) => li.articleName).join(", ");
  const now = new Date().toISOString();
  return {
    id: options.id,
    poNo: options.poNo,
    poDate: new Date().toISOString().split("T")[0],
    vendorId: form.vendorId,
    vendorName: vendor?.vendorName ?? "",
    priority: form.priority,
    totalQty,
    receivedQty: 0,
    status: options.status,
    articleSummary,
    remarks: form.remarks || undefined,
    lineItems: form.lineItems,
    createdAt: now,
    updatedAt: now,
  };
}

function nextPoNo(existing: VendorPO[]): string {
  const year = new Date().getFullYear();
  const prefix = `VPO-${year}-`;
  const nums = existing
    .map((o) => {
      const m = o.poNo.match(new RegExp(`^${prefix}(\\d+)$`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => n > 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

const VendorPOCreatePage = () => {
  const router = useRouter();
  const [vendors, setVendors] = useState<{ id: string; vendorCode: string; vendorName: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setVendors(
      getVendors().map((v) => ({
        id: v.id,
        vendorCode: v.vendorCode,
        vendorName: v.vendorName,
      }))
    );
  }, []);

  const handleSaveDraft = (data: VendorPOFormData) => {
    setIsSubmitting(true);
    try {
      const existing = getStoredOrders() ?? MOCK_VENDOR_POS;
      const id = `vpo-${Date.now()}`;
      const poNo = nextPoNo(existing);
      const po = buildPOFromForm(data, { id, poNo, status: "Draft" });
      setStoredOrders([...existing, po]);
      toast.success("PO saved as draft.");
      router.push("/vendor-po/raise");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save draft");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = (data: VendorPOFormData) => {
    setIsSubmitting(true);
    try {
      const existing = getStoredOrders() ?? MOCK_VENDOR_POS;
      const id = `vpo-${Date.now()}`;
      const poNo = nextPoNo(existing);
      const po = buildPOFromForm(data, { id, poNo, status: "Approved" });
      setStoredOrders([...existing, po]);
      toast.success("PO approved and released.");
      router.push("/vendor-po/raise");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to release PO");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <Seo title="Create Vendor PO" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Create Vendor PO</h1>
                <p className="text-gray-600 mt-1">Create a new vendor purchase order</p>
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
            initialData={null}
            vendors={vendors}
            articles={MOCK_ARTICLES}
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

export default VendorPOCreatePage;
