"use client";

import DailyProductionSummaryTab from "@/shared/components/production/DailyProductionSummaryTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone daily production summary report.
 */
export default function DailyProductionSummaryPage() {
  return (
    <ReportPageShell title="Daily production summary">
      <DailyProductionSummaryTab />
    </ReportPageShell>
  );
}
