import { BoxInSlot, ConeInSlot } from "@/shared/services/storageSlotService";
import {
  resolveBoxGrossWeightKg,
  resolveBoxNetWeightKg,
  resolveConeNetWeightKg,
} from "./boxWeightDisplay";

/** Excel column key for box gross weight in zone reports. */
export const BOX_GROSS_WEIGHT_COL = "Gross Weight (kg)";

/** Excel column key for box net weight in zone reports. */
export const BOX_NET_WEIGHT_COL = "Net Weight (kg)";

/** Excel column key for cone gross weight in zone reports. */
export const CONE_GROSS_WEIGHT_COL = "Gross Weight (kg)";

/** Excel column key for cone net weight in zone reports. */
export const CONE_NET_WEIGHT_COL = "Net Weight (kg)";

/**
 * Rounds kg for Excel export (avoids float noise).
 * @param value - Weight in kg
 * @returns Rounded number or empty string when missing
 */
function excelKg(value: number | null | undefined): number | "" {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }
  return Math.round(value * 10000) / 10000;
}

/**
 * Builds one zone-report Excel row for a box (LT rack).
 * @param box - Box with optional rack metadata
 * @returns Plain row object for xlsx
 */
export function buildZoneReportBoxExcelRow(
  box: BoxInSlot & { rackCode?: string; rackBarcode?: string }
): Record<string, string | number> {
  return {
    "Box ID": box.boxId,
    Barcode: box.barcode,
    "PO Number": box.poNumber ?? "-",
    "Yarn Name": box.yarnName ?? "-",
    "Lot Number": box.lotNumber ?? "-",
    "Shade Code": box.shadeCode ?? "-",
    [BOX_GROSS_WEIGHT_COL]: excelKg(resolveBoxGrossWeightKg(box)),
    [BOX_NET_WEIGHT_COL]: excelKg(resolveBoxNetWeightKg(box)),
    "Tear Weight (kg)": excelKg(Number(box.tearweight ?? 0)),
    "Number of Cones": box.numberOfCones ?? 0,
    "Rack Code": box.rackCode ?? box.storageLocation ?? "-",
    "Rack Barcode": box.rackBarcode ?? "-",
    "Received Date": box.receivedDate
      ? new Date(box.receivedDate).toLocaleDateString()
      : "-",
  };
}

/**
 * Builds one zone-report Excel row for a cone (ST rack).
 * @param cone - Cone with optional rack metadata
 * @returns Plain row object for xlsx
 */
export function buildZoneReportConeExcelRow(
  cone: ConeInSlot & { rackCode?: string; rackBarcode?: string }
): Record<string, string | number> {
  const gross = cone.coneWeight ?? null;
  const tear = Number(cone.tearWeight ?? 0);
  return {
    "Cone Barcode": cone.barcode,
    "Box ID": cone.boxId,
    "PO Number": cone.poNumber ?? "-",
    "Yarn Name": cone.yarnName ?? "-",
    "Shade Code": cone.shadeCode ?? "-",
    "Issue Status": cone.issueStatus ?? "-",
    "Return Status": cone.returnStatus ?? "-",
    [CONE_GROSS_WEIGHT_COL]: excelKg(gross),
    "Tear Weight (kg)": excelKg(tear),
    [CONE_NET_WEIGHT_COL]: excelKg(resolveConeNetWeightKg(cone)),
    "Rack Code": cone.rackCode ?? cone.coneStorageId ?? "-",
    "Rack Barcode": cone.rackBarcode ?? "-",
  };
}
