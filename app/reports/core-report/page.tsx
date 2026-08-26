"use client";

import CoreReportTab from "@/shared/components/production/CoreReportTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone production core report.
 */
export default function CoreReportPage() {
  return (
    <ReportPageShell title="Core Report">
      <CoreReportTab />
    </ReportPageShell>
  );
}
