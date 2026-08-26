"use client";

import ProductionOrderSummaryTab from "@/shared/components/production/ProductionOrderSummaryTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone production order summary report.
 */
export default function ProductionOrderSummaryPage() {
  return (
    <ReportPageShell title="Production order summary">
      <ProductionOrderSummaryTab />
    </ReportPageShell>
  );
}
