"use client";

import Seo from "@/shared/layout-components/seo/seo";
import { PoReturnClient } from "./PoReturnClient";

/**
 * PO Return page — scan-based vendor return workflow.
 */
export default function PoReturnPage() {
  return (
    <div className="main-content">
      <Seo title="PO Return" />
      <PoReturnClient />
    </div>
  );
}
