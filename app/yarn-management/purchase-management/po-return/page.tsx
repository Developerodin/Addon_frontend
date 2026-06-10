"use client";

import React, { Suspense } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import { PoReturnClient } from "./PoReturnClient";

/**
 * PO Return page — scan-based vendor return workflow.
 */
export default function PoReturnPage() {
  return (
    <div className="main-content">
      <Seo title="PO Return" />
      <Suspense
        fallback={
          <div className="flex justify-center items-center py-16" role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        }
      >
        <PoReturnClient />
      </Suspense>
    </div>
  );
}
