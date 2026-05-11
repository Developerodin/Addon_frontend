"use client";

import Link from "next/link";
import React from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { PoReturnWizard } from "./PoReturnWizard";

/**
 * PO Return — vendor return workflow with preview, confirmations, and history.
 */
export default function PoReturnPage() {
  const { hasSubPermission, isLoading } = useNavigation();
  const canAccess = hasSubPermission(
    "/yarn-management/purchase-management",
    "PO Return"
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
        <Seo title="PO Return" />
        <div className="box border border-gray-100">
          <div className="box-body text-center py-12">
            <p className="text-sm text-gray-600">
              You don&apos;t have permission to access PO Return.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="PO Return" />

      <nav className="text-[11px] text-gray-500 mb-3" aria-label="Breadcrumb">
        <ol className="flex flex-wrap gap-1 items-center">
          <li>
            <Link href="/yarn-management" className="hover:text-purple-600">
              Yarn Management
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/yarn-management/purchase-management"
              className="hover:text-purple-600"
            >
              Purchase Management
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-800 font-medium">PO Return</li>
        </ol>
      </nav>

      <div className="box border border-gray-100 shadow-sm">
        <div className="box-header flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-gray-50/60 px-4 py-3">
          <div className="min-w-[240px]">
            <h1 className="text-sm font-bold text-gray-900">PO Return (vendor)</h1>
            <p className="text-[11px] text-gray-500 mt-1 max-w-2xl">
              Return yarn to supplier: select PO, optional lots, load preview (ST / LT / unallocated),
              confirm, then finalize. ERP cancellation is tracked separately.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/yarn-management/purchase-management/purchase"
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-700 text-[11px] font-semibold rounded hover:bg-gray-50"
            >
              All POs
            </Link>
            <Link
              href="/yarn-management/purchase-management/purchase-order-received"
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-700 text-[11px] font-semibold rounded hover:bg-gray-50"
            >
              PO Received
            </Link>
          </div>
        </div>

        <div className="box-body px-4 py-4">
          <PoReturnWizard />
        </div>
      </div>
    </div>
  );
}
