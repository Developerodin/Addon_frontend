import * as XLSX from "xlsx";
import type { VendorJobPreviewBox, VendorShipment } from "@/shared/services/yarnVendorJobService";

/**
 * Neutralizes Excel formula injection for exported cells.
 * @param value Raw cell
 * @returns Safe string/number
 */
export function sanitizeExcelCell(value: unknown): string | number {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    return `'${text}`;
  }
  return text;
}

/**
 * @param name Suggested download name
 */
const writeRows = (rows: Record<string, unknown>[], sheetName: string, name: string): void => {
  const safeRows = rows.map((row) => {
    const next: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, val]) => {
      next[key] = sanitizeExcelCell(val);
    });
    return next;
  });
  const ws = XLSX.utils.json_to_sheet(safeRows.length ? safeRows : [{ Message: "No rows" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const safe = name.replace(/[/\\?*:[\]]/g, "_");
  XLSX.writeFile(wb, `${safe}.xlsx`);
};

/**
 * Currently-at-vendor report.
 * @param boxes At-vendor rows
 */
export function exportAtVendorExcel(boxes: VendorJobPreviewBox[]): void {
  const rows = boxes.map((b) => ({
    "Box ID": b.boxId,
    Barcode: b.barcode,
    PO: b.poNumber,
    Lot: b.lotNumber,
    Yarn: b.yarnName,
    Shade: b.shadeCode,
    "Net kg": b.netWeight,
    Cones: b.numberOfCones,
    Vendor: b.vendorName || "",
    "Shipment #": b.shipmentNumber || "",
    "Days out": b.daysOut ?? "",
    Sent: b.sentAt ? new Date(b.sentAt).toLocaleString() : "",
    Note: b.sendingNote || "",
  }));
  writeRows(rows, "At vendor", `yarn_to_vendor_at_vendor_${new Date().toISOString().slice(0, 10)}`);
}

/**
 * Sending note Excel.
 * @param shipment Send challan
 */
export function exportSendNoteExcel(shipment: VendorShipment): void {
  const rows = (shipment.boxLines || []).map((l) => ({
    "Shipment #": shipment.shipmentNumber,
    Vendor: shipment.supplierSnapshot?.brandName || "",
    Status: shipment.status,
    Sent: shipment.sentAt ? new Date(shipment.sentAt).toLocaleString() : "",
    "Sent by": shipment.sentBy?.username || "",
    Note: shipment.sendingNote || "",
    "Box ID": l.boxId,
    Barcode: l.barcode,
    PO: l.poNumber || "",
    Lot: l.lotNumber || "",
    Yarn: l.yarnName || "",
    Shade: l.shadeCode || "",
    "Net kg": l.netWeight ?? l.boxWeight,
    Cones: l.numberOfCones ?? 0,
    "From rack": l.storageLocationBefore || "Unallocated",
    Received: l.receivedAt ? new Date(l.receivedAt).toLocaleString() : "",
    "Receive #": l.receiveNumber || "",
  }));
  writeRows(rows, "Send note", `yarn_to_vendor_send_${shipment.shipmentNumber}`);
}

/**
 * Receiving note Excel for one receive on a shipment (or merged receives).
 * @param shipment Parent send
 * @param receiveNumber Optional filter
 */
export function exportReceiveNoteExcel(shipment: VendorShipment, receiveNumber?: string): void {
  const receives = (shipment.receives || []).filter((r) =>
    receiveNumber ? r.receiveNumber === receiveNumber : true
  );
  const rows: Record<string, unknown>[] = [];
  for (const rec of receives) {
    const ids = new Set(rec.boxIds || []);
    const lines = (shipment.boxLines || []).filter((l) =>
      ids.size ? ids.has(l.boxId) : l.receiveNumber === rec.receiveNumber
    );
    for (const l of lines) {
      rows.push({
        "Receive #": rec.receiveNumber,
        "Shipment #": shipment.shipmentNumber,
        Vendor: shipment.supplierSnapshot?.brandName || "",
        Received: rec.receivedAt ? new Date(rec.receivedAt).toLocaleString() : "",
        "Received by": rec.receivedBy?.username || "",
        Note: rec.receivingNote || "",
        "To rack": rec.toStorageLocation,
        "Box ID": l.boxId,
        Barcode: l.barcode,
        Yarn: l.yarnName || "",
        Shade: l.shadeCode || "",
        "Net kg": l.netWeight ?? l.boxWeight,
      });
    }
  }
  const suffix = receiveNumber || shipment.shipmentNumber;
  writeRows(rows, "Receive note", `yarn_to_vendor_receive_${suffix}`);
}
