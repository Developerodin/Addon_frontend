/**
 * Formats QC status for display.
 */
export function formatQcStatus(status: string): string {
  if (status === "qc_approved") return "QC Accepted";
  if (status === "qc_rejected") return "QC Rejected";
  return status.replace(/_/g, " ");
}

/**
 * Formats lot status for display.
 */
export function formatLotStatus(status: string): string {
  const map: Record<string, string> = {
    lot_accepted: "Accepted",
    lot_rejected: "Rejected",
    lot_returned_to_vendor: "Returned to vendor",
    lot_qc_pending: "QC Pending",
    lot_pending: "Pending",
  };
  return map[status] ?? status.replace(/_/g, " ");
}

/**
 * Tailwind badge classes for lot status.
 */
export function lotStatusColor(status: string): string {
  if (status === "lot_accepted") return "bg-green-100 text-green-800";
  if (status === "lot_rejected") return "bg-red-100 text-red-800";
  if (status === "lot_returned_to_vendor") return "bg-orange-100 text-orange-800";
  return "bg-gray-100 text-gray-700";
}

/**
 * Tailwind badge classes for box QC status.
 */
export function qcStatusColor(status: string): string {
  if (status === "qc_approved") return "bg-green-100 text-green-800";
  if (status === "qc_rejected") return "bg-red-100 text-red-800";
  return "bg-gray-100 text-gray-700";
}
