"use client";

import VendorInvoiceReportTab from "@/app/vendor-po/vendor-list/components/VendorInvoiceReportTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone vendor invoice / lot reconciliation report.
 */
export default function InvoiceReportPage() {
  return (
    <ReportPageShell title="Invoice Report">
      <VendorInvoiceReportTab />
    </ReportPageShell>
  );
}
