"use client";

import MachineArticleAdvancedPlanningTab from "@/app/production/floor-supervisor/knitting/components/MachineArticleAdvancedPlanningTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone knitting advanced planning report.
 */
export default function AdvancedPlanningPage() {
  return (
    <ReportPageShell title="Advanced Planning">
      <MachineArticleAdvancedPlanningTab />
    </ReportPageShell>
  );
}
