/**
 * Warehouse Management → Inward: production receiving + WHMS inward-receive list + upcoming containers.
 *
 * Query (optional): `tab=vendor-receive|inward-received|production|upcoming`, `inwardSource=vendor|production`,
 * `vendorProductionFlowId=<id>` — prefills inward list search when linked from other screens.
 */
import InwardPageClient from "./InwardPageClient";

export default function WarehouseManagementInwardPage() {
  return <InwardPageClient />;
}
