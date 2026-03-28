"use client";

/**
 * Warehouse Management → Inward: production floor receiving (container accept, receivedData / transferredData).
 * Same UI as Production → Warehouse Floor Supervisor; GRN inward stays under Orders → Inward.
 */
import WarehouseFloorSupervisorDashboard from "@/shared/components/production/warehouse-floor/WarehouseFloorSupervisorDashboard";

export default function WarehouseManagementInwardPage() {
  return (
    <WarehouseFloorSupervisorDashboard
      seoTitle="Warehouse Inward — Production"
      pageHeading="Warehouse Inward"
      helpTitle="Warehouse Inward — Production receiving"
    />
  );
}
