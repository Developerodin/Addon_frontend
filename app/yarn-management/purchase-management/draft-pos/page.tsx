"use client";

import Link from "next/link";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";

/**
 * Hub for yarn POs in draft state. Listing is wired once the API supports a draft status;
 * access is gated by the same permission as raising purchase orders.
 */
export default function DraftPOsPage() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission(
    "/yarn-management/purchase-management",
    "Draft POs"
  );

  if (isLoading) {
    return (
      <div className="main-content flex justify-center items-center py-16">
        <div
          className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="main-content">
        <Seo title="Draft POs" />
        <div className="box border border-gray-100">
          <div className="box-body text-center py-12">
            <p className="text-sm text-gray-600">
              You don&apos;t have permission to access Draft POs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Draft POs" />
      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h1 className="text-sm font-bold text-gray-900">Draft POs</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Purchase orders saved before submission to the supplier.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/yarn-management/purchase-management/purchase/add"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
            >
              <i className="ri-add-line text-xs" aria-hidden />
              New purchase order
            </Link>
            <Link
              href="/yarn-management/purchase-management/purchase"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 bg-white text-gray-800 text-[11px] font-bold rounded hover:bg-gray-50"
            >
              <i className="ri-list-check text-xs" aria-hidden />
              All POs
            </Link>
          </div>
        </div>
        <div className="box-body py-10 text-center">
          <div
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 text-2xl mb-4"
            aria-hidden
          >
            <i className="ri-draft-line" />
          </div>
          <p className="text-sm font-semibold text-gray-800">
            No draft purchase orders
          </p>
          <p className="text-[12px] text-gray-500 mt-2 max-w-md mx-auto">
            When draft saving is enabled on purchase orders, they will appear here. Until then,
            create a PO from{" "}
            <span className="font-medium text-gray-700">New purchase order</span> or review the
            full list under <span className="font-medium text-gray-700">All POs</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
