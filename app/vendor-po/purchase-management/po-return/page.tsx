import React, { Suspense } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { VendorPoReturnClient } from "./VendorPoReturnClient";

/**
 * Vendor PO Return — scan boxes / M4, issue VPRC challan, view history.
 */
export default function VendorPoReturnPage() {
  return (
    <div className="main-content">
      <Seo title="Vendor PO Return" />
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" role="status" aria-label="Loading" />
          </div>
        }
      >
        <VendorPoReturnClient />
      </Suspense>
    </div>
  );
}
