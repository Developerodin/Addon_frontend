"use client";

import ComingSoonDashboard from "@/shared/components/ComingSoonDashboard";

/**
 * Yarn dashboard stub under the Dashboard submenu (live inventory stays at /yarn-management/dashboard).
 */
export default function YarnDashboardPage() {
  return (
    <ComingSoonDashboard
      title="Yarn Dashboard"
      description="Yarn command metrics for this hub will live here. Live inventory remains under Yarn Management."
      iconClass="ri-dashboard-line"
    />
  );
}
