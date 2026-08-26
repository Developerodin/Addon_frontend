"use client";

import NeedleWiseProductionTab from "@/app/production/floor-supervisor/knitting/components/NeedleWiseProductionTab";
import ReportPageShell from "../components/ReportPageShell";

/**
 * Standalone needle-wise production planning report.
 */
export default function NeedleWisePlanningPage() {
  return (
    <ReportPageShell title="Needle Wise Planning">
      <NeedleWiseProductionTab />
    </ReportPageShell>
  );
}
