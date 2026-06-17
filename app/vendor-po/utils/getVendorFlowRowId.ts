import type { VendorM3FlowRow, VendorM4FlowRow } from "@/shared/services/vendorM2M3M4ManagementService";

/**
 * Resolve stable flow id from a vendor M3/M4 list row.
 * @param row - Flow list row
 */
export function getVendorFlowRowId(row: VendorM3FlowRow | VendorM4FlowRow): string {
  return String(row.vendorProductionFlowId ?? row._id ?? row.id);
}
