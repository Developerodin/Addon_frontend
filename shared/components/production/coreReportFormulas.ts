import type { ColumnFormula, ColumnFormulaIdentity } from "./formulaTypes";

export type CoreReportColumnKey =
  | "brand"
  | "vendorCode"
  | "factoryCode"
  | "color"
  | "type"
  | "design"
  | "sapStock"
  | "inwardPending"
  | "inTransit"
  | "wip"
  | "runningOnMachine"
  | "productionPlanning"
  | "totalInhand"
  | "vendorPending";

export interface CoreReportColumnFormula extends ColumnFormula {
  key: CoreReportColumnKey;
}

const EXAMPLE_GIVEN = [
  "Factory A4412 · brand LP · vendor LP422012",
  "Warehouse stock 216",
  "Vendor inward pending 551",
  "WIP 50",
  "In transit 0 · running on machine 260 · planned 1000",
];

/** Column formulas used by the Core Report. */
export const CORE_REPORT_COLUMN_FORMULAS: Record<CoreReportColumnKey, CoreReportColumnFormula> = {
  brand: {
    key: "brand",
    title: "Brand",
    formula: "UNIQUE(StyleCode.brand) JOINED by comma",
    meaning: "Every brand on this factory code’s style codes, in one cell. Stock and production numbers are factory-code totals, not split by brand.",
    fields: ["Product.styleCodes", "StyleCode.brand"],
    example: { given: ["Style codes on A4412 carry brand LP"], result: "LP" },
  },
  vendorCode: {
    key: "vendorCode",
    title: "Vendor Code / Internal Code",
    formula: "vendorCode OR internalCode",
    meaning: "Item master vendor code, falling back to internal code when vendor code is empty.",
    fields: ["Product.vendorCode", "Product.internalCode"],
    example: { given: ["vendorCode = LP422012"], result: "LP422012" },
  },
  factoryCode: {
    key: "factoryCode",
    title: "Factory Code",
    formula: "Product.factoryCode",
    meaning: "Join key for production articles (articleNumber) and warehouse inward.",
    fields: ["Product.factoryCode", "Article.articleNumber"],
    example: { given: EXAMPLE_GIVEN, result: "A4412" },
  },
  color: {
    key: "color",
    title: "Color",
    formula: "Product.attributes.Color",
    meaning: "Color from the item master attributes map.",
    fields: ["Product.attributes.Color", "Product.attributes.colour"],
    example: { given: ["attributes.Color = Cream"], result: "Cream" },
  },
  type: {
    key: "type",
    title: "Type",
    formula: "Product.attributes.Type",
    meaning: "Type from the item master attributes map (e.g. FL).",
    fields: ["Product.attributes.Type"],
    example: { given: ["attributes.Type = FL"], result: "FL" },
  },
  design: {
    key: "design",
    title: "Design",
    formula: "Product.name",
    meaning: "Item master name is used as Design.",
    fields: ["Product.name"],
    example: { given: ["name = PLAIN"], result: "PLAIN" },
  },
  sapStock: {
    key: "sapStock",
    title: "SAP Stock",
    formula: "SUM(WarehouseInventory.totalQuantity) for this product",
    meaning: "On-hand warehouse stock across every style code of this item.",
    fields: ["WarehouseInventory.totalQuantity", "WarehouseInventory.itemId", "Product.styleCodes"],
    example: { given: EXAMPLE_GIVEN, result: "216" },
  },
  inwardPending: {
    key: "inwardPending",
    title: "Inward Pending Quantity",
    formula: "SUM(max(0, QuantityFromFactory − receivedQuantity)) WHERE inwardSource = vendor AND status in (pending, onhold)",
    meaning: "Vendor inward lines not yet confirmed into warehouse stock.",
    fields: ["InwardReceive.QuantityFromFactory", "InwardReceive.receivedQuantity", "InwardReceive.inwardSource", "InwardReceive.status"],
    example: { given: EXAMPLE_GIVEN, result: "551" },
  },
  inTransit: {
    key: "inTransit",
    title: "In Transit Quantity",
    formula: "SUM(poItem.quantity − received) WHERE PO currentStatus = in_transit",
    meaning: "Vendor PO qty still not received, only on POs marked in transit.",
    fields: ["VendorPurchaseOrder.currentStatus", "poItems.quantity", "receivedLotDetails.receivedQuantity"],
    example: { given: EXAMPLE_GIVEN, result: "0" },
  },
  wip: {
    key: "wip",
    title: "WIP",
    formula: "plannedQty − knitPending − shortClose − closedOnMachine − onHold − dispatch.transferred",
    meaning: "Same residual as Production order summary WIP, rolled up to this factory code across orders.",
    fields: ["article.plannedQuantity", "knitPendingQty", "holdQty", "closedOnMachineQty", "onHoldQty", "dispatch.transferred"],
    example: { given: EXAMPLE_GIVEN, result: "50" },
  },
  runningOnMachine: {
    key: "runningOnMachine",
    title: "Running on Machine",
    formula: "SUM(knittingRemaining) WHERE queue status = In Progress",
    meaning: "Knitting remaining of the Advanced Planning running plan (active In Progress row), not the full on-machine queue.",
    fields: ["MachineOrderAssignment.productionOrderItems.status", "floorQuantities.knitting.remaining"],
    example: { given: EXAMPLE_GIVEN, result: "260" },
  },
  productionPlanning: {
    key: "productionPlanning",
    title: "Production Planning",
    formula: "SUM(article.plannedQuantity) for this factory code",
    meaning: "Total planned quantity of every production article with this factory code.",
    fields: ["Article.plannedQuantity", "Article.articleNumber"],
    example: { given: EXAMPLE_GIVEN, result: "1000" },
  },
  totalInhand: {
    key: "totalInhand",
    title: "Total Inhand Stock",
    formula: "SAP Stock + Inward Pending + WIP",
    meaning: "Pipeline already in warehouse, waiting at vendor inward, or counted as factory WIP. Does not add in-transit, on-machine, or planning.",
    fields: ["sapStock", "inwardPending", "wip"],
    example: { given: EXAMPLE_GIVEN, result: "216 + 551 + 50 = 817" },
  },
  vendorPending: {
    key: "vendorPending",
    title: "Vendorwise PO Pending Quantity",
    formula: "SUM(ordered − received) per vendor, excluding draft / goods_received / po_rejected",
    meaning: "Dynamic columns: one per vendor that still has open PO qty for items in this filter.",
    fields: ["VendorPurchaseOrder.vendorName", "poItems.quantity", "receivedLotDetails.receivedQuantity", "currentStatus"],
    example: { given: ["Vendor A pending 500", "Vendor B pending 2000"], result: "A = 500, B = 2000" },
  },
};

/** Sheet identity: total inhand is SAP + inward pending + WIP. */
export const CORE_REPORT_IDENTITY: ColumnFormulaIdentity = {
  formula: "Total Inhand = SAP Stock + Inward Pending + WIP",
  example: "216 + 551 + 50 = 817",
};
