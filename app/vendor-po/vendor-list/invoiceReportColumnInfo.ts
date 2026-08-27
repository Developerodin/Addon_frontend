export type InvoiceReportColumnId =
  | "vendorName"
  | "poNumber"
  | "poDate"
  | "invoiceNo"
  | "invDate"
  | "recdDt"
  | "invoiceValue"
  | "noOfBox"
  | "invoiceQty"
  | "stnQty"
  | "m1"
  | "m2"
  | "m3"
  | "m4"
  | "vm4"
  | "shortExc"
  | "pendingInward";

export type InvoiceReportColumnInfo = {
  id: InvoiceReportColumnId;
  title: string;
  summary: string;
  source: string;
  sourcePath: string;
  formula: string;
  example: string;
};

/**
 * Help copy for each invoice-report column: source screen, formula, worked example.
 */
export const INVOICE_REPORT_COLUMN_INFO: Record<InvoiceReportColumnId, InvoiceReportColumnInfo> = {
  vendorName: {
    id: "vendorName",
    title: "Vendor Name",
    summary: "Vendor on the purchase order for this invoice/lot row.",
    source: "Vendor Purchase Order header (`vendorName`).",
    sourcePath: "/vendor-po/vendor-list (PO / receive)",
    formula: "Copied as-is from the VPO. Not calculated.",
    example: "VPO-2026-0001 → New Horizon Knits Pvt.Ltd.",
  },
  poNumber: {
    id: "poNumber",
    title: "PO Number",
    summary: "Vendor PO number (VPO) this invoice belongs to.",
    source: "Vendor Purchase Order (`vpoNumber`).",
    sourcePath: "/vendor-po/vendor-list (PO / receive)",
    formula: "Copied as-is from the VPO. Not calculated.",
    example: "VPO-2026-0001",
  },
  poDate: {
    id: "poDate",
    title: "PO Date",
    summary: "Date the vendor PO was created.",
    source: "Vendor Purchase Order (`createDate`).",
    sourcePath: "/vendor-po/vendor-list (PO / receive)",
    formula: "Copied as-is. Shown as M/D/YYYY.",
    example: "Create date 21 Aug 2026 → 8/21/2026",
  },
  invoiceNo: {
    id: "invoiceNo",
    title: "Invoice No",
    summary: "Received lot / invoice number on the PO.",
    source: "PO received lot (`receivedLotDetails.lotNumber`). Same value as production-flow `referenceCode`.",
    sourcePath: "/vendor-po — Vendor PO Receive (lot / invoice)",
    formula: "One report row per received lot. Not calculated.",
    example: "Lot NH/26-27/0229",
  },
  invDate: {
    id: "invDate",
    title: "Inv Date",
    summary: "Invoice date used on the report.",
    source: "PO `goodsReceivedDate`, or first pack-list `dispatchDate` if receive date is empty.",
    sourcePath: "/vendor-po — Vendor PO Receive / pack list",
    formula: "goodsReceivedDate || first pack-list dispatchDate",
    example: "If goods received 21 Aug 2026 → 8/21/2026",
  },
  recdDt: {
    id: "recdDt",
    title: "Recd Dt",
    summary: "Date goods were received against the PO.",
    source: "PO `goodsReceivedDate` only.",
    sourcePath: "/vendor-po — Vendor PO Receive",
    formula: "Copied as-is. Empty when the PO has not been received.",
    example: "Goods received 21 Aug 2026 → 8/21/2026",
  },
  invoiceValue: {
    id: "invoiceValue",
    title: "Invoice Value",
    summary: "PO total value (rounded integer, spreadsheet style).",
    source: "Vendor Purchase Order (`total`).",
    sourcePath: "/vendor-po — Vendor PO Raise / Receive",
    formula: "PO total, rounded to a whole number.",
    example: "PO total 312845.4 → 312845",
  },
  noOfBox: {
    id: "noOfBox",
    title: "No of Box",
    summary: "Box count on the received lot.",
    source: "Received lot (`receivedLotDetails.numberOfBoxes`).",
    sourcePath: "/vendor-po — Vendor PO Receive",
    formula: "Copied from the lot. Empty if not set.",
    example: "Lot recorded 17 boxes → 17",
  },
  invoiceQty: {
    id: "invoiceQty",
    title: "Invoice Qty",
    summary: "Pairs billed / received on this invoice (lot).",
    source: "Received lot `totalUnits`. If that is empty, sum of lot line `receivedQuantity`.",
    sourcePath: "/vendor-po — Vendor PO Receive",
    formula: "lot.totalUnits  (else Σ poItems.receivedQuantity)",
    example: "Lot NH/26-27/0229 totalUnits 4274 → Invoice Qty 4274",
  },
  stnQty: {
    id: "stnQty",
    title: "WH Transfer Qty / STN Qty",
    summary: "Pairs already transferred to warehouse on an active stock transfer note for this VPO + invoice.",
    source: "Active Vendor Dispatch STN lines (`qtyInPairs`) matched on `vpoNumber` + `invoiceNumber` (lot number).",
    sourcePath: "/vendor-po/dispatch (STN / warehouse transfer)",
    formula: "Σ STN line qtyInPairs  where vpoNumber + invoiceNumber match this row",
    example: "No active STN for NH/26-27/0229 → STN Qty 0",
  },
  m1: {
    id: "m1",
    title: "M1",
    summary: "Good-quality qty booked on Secondary Checking for this invoice.",
    source: "Production flow `floorQuantities.secondaryChecking.m1Quantity`, summed across all flows on this lot.",
    sourcePath: "/vendor-po/secondary-checking — Quality counts (M1)",
    formula: "Σ secondaryChecking.m1Quantity  (this lot)",
    example: "SC article row M1 4,225 → report M1 4225",
  },
  m2: {
    id: "m2",
    title: "M2",
    summary: "Repairable qty booked on Secondary Checking for this invoice.",
    source: "Production flow `floorQuantities.secondaryChecking.m2Quantity`, summed for the lot.",
    sourcePath: "/vendor-po/secondary-checking — Quality counts (M2)",
    formula: "Σ secondaryChecking.m2Quantity  (this lot)",
    example: "SC article row M2 0 → report M2 0",
  },
  m3: {
    id: "m3",
    title: "M3",
    summary: "M3 qty booked on Secondary Checking for this invoice.",
    source: "Production flow `floorQuantities.secondaryChecking.m3Quantity`, summed for the lot.",
    sourcePath: "/vendor-po/secondary-checking — Quality counts (M3)",
    formula: "Σ secondaryChecking.m3Quantity  (this lot)",
    example: "SC article row M3 0 → report M3 0",
  },
  m4: {
    id: "m4",
    title: "M4",
    summary: "Final Checking M4 on-hand — same number as Vendor M4 Management.",
    source: "Production flow Final Checking `m4Quantity` (`computeM4Snapshot.onHand`), summed for the lot.",
    sourcePath: "/vendor-po/m4-management — On Hand (FC M4)",
    formula: "Σ finalChecking.m4Quantity  (this lot)",
    example: "M4 Management on-hand 1 for this lot → report M4 1",
  },
  vm4: {
    id: "vm4",
    title: "VM4/PR",
    summary: "Vendor return / warranty qty from Secondary Checking. Same figure used for purchase return.",
    source: "SC `vm4Quantity` (legacy fallback: SC `m4Quantity`), summed for the lot.",
    sourcePath: "/vendor-po/secondary-checking — Quality counts (VM4)",
    formula: "Σ (vm4Quantity ?? m4Quantity) on secondaryChecking  (this lot)",
    example: "SC article row VM4 49 → report VM4/PR 49",
  },
  shortExc: {
    id: "shortExc",
    title: "SHORT/EXC",
    summary: "Shortage or excess vs warehouse transfer. Blank when zero.",
    source: "This report: Invoice Qty and WH Transfer / STN Qty (not a separate screen).",
    sourcePath: "Calculated on this report",
    formula: "Invoice Qty − STN Qty   (hidden when the result is 0)",
    example: "4274 − 0 = 4274 (shown). If both were 4274, the cell is blank.",
  },
  pendingInward: {
    id: "pendingInward",
    title: "PENDING INWARD",
    summary: "Qty still not accounted for by warehouse transfer, FC M4, or VM4/PR.",
    source: "This report: Invoice Qty, STN Qty, M4, and VM4/PR.",
    sourcePath: "Calculated on this report",
    formula: "Invoice Qty − (STN Qty + M4 + VM4/PR)",
    example: "4274 − (0 + 1 + 49) = 4224",
  },
};

/**
 * Look up help copy for a column id.
 * @param id Column id
 */
export function getInvoiceReportColumnInfo(id: InvoiceReportColumnId): InvoiceReportColumnInfo {
  return INVOICE_REPORT_COLUMN_INFO[id];
}
