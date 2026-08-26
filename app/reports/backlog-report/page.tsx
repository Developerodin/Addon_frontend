"use client";

import BacklogReportTab from "@/shared/components/production/BacklogReportTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone production backlog report.
 */
export default function BacklogReportPage() {
  return (
    <ReportPageShell title="Backlog report">
      <BacklogReportTab />
    </ReportPageShell>
  );
}
