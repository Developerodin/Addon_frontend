import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { printCones, connectQZ, getDefaultPrinter, isQZLoaded } from "@/shared/utils/qzTray";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import { defaultVendorLabelPrintSettings, getVendorBoxId, groupVendorBoxesByLot, resolveVendorBoxArticleFromPo } from "./vendorReceiveProcessHelpers";

export type VendorBoxFormRow = {
  productName: string;
  articleCode: string;
  type: string;
  color: string;
  pattern: string;
  lotNumber: string;
  numberOfUnits: string;
};

/** Empty box form row defaults. */
export function emptyVendorBoxFormRow(): VendorBoxFormRow {
  return {
    productName: "",
    articleCode: "",
    type: "",
    color: "",
    pattern: "",
    lotNumber: "",
    numberOfUnits: "",
  };
}

function readVendorName(v: VendorPurchaseOrder["vendor"]): string {
  if (!v || typeof v === "string") return typeof v === "string" ? v : "";
  return v.header?.vendorName || "";
}

/** Connect to QZ Tray (if needed) and confirm a default printer exists. Returns false (with a toast) on failure. */
async function ensureQzReady(): Promise<boolean> {
  if (!isQZLoaded()) {
    toast.error("QZ Tray script not loaded yet");
    return false;
  }
  const active =
    typeof window !== "undefined" &&
    window.qz?.websocket &&
    window.qz.websocket.isActive?.() === true;
  if (!active) {
    const c = await connectQZ();
    if (!c.isConnected) {
      toast.error(c.error || "Connect QZ Tray");
      return false;
    }
  }
  const printer = await getDefaultPrinter();
  if (!printer) {
    toast.error("No default printer");
    return false;
  }
  return true;
}

/** Map vendor boxes (with edited form data) to the cone/label payload printCones expects. */
function vendorBoxesToCones(
  apiPo: VendorPurchaseOrder,
  boxes: VendorBox[],
  boxData: Record<string, VendorBoxFormRow>
) {
  const vendorShort = readVendorName(apiPo.vendor).split(" ").slice(0, 2).join(" ");
  return boxes
    .filter((b) => b.barcode)
    .map((b) => {
      const id = getVendorBoxId(b);
      const d = boxData[id];
      const lotNumber = d?.lotNumber?.trim() || b.lotNumber?.trim() || "";
      const unitsRaw = d?.numberOfUnits ?? b.numberOfUnits;
      const quantity =
        unitsRaw !== undefined && unitsRaw !== null && String(unitsRaw).trim() !== ""
          ? Number(unitsRaw)
          : undefined;
      const vendorCode =
        d?.articleCode?.trim() ||
        resolveVendorBoxArticleFromPo(apiPo, b).code?.trim() ||
        "";
      return {
        barcode: String(b.barcode),
        boxId: b.boxId || id,
        yarnName: d?.productName?.trim() || b.productName?.trim() || "",
        shadeCode: vendorCode,
        weight: undefined,
        lotNumber,
        supplierName: vendorShort,
        poNumber: apiPo.vpoNumber || "",
        productLabel: "Product",
        quantity: Number.isFinite(quantity) ? quantity : undefined,
      };
    });
}

/** Print barcode labels for a specific set of boxes (used by both "print all" and per-invoice print). */
export async function printVendorBoxLabels(
  apiPo: VendorPurchaseOrder,
  boxesToPrint: VendorBox[],
  boxData: Record<string, VendorBoxFormRow>,
  opts?: { scopeLabel?: string }
): Promise<void> {
  if (!boxesToPrint.length) {
    toast.error("No boxes to print");
    return;
  }
  if (!(await ensureQzReady())) return;
  const conesToPrint = vendorBoxesToCones(apiPo, boxesToPrint, boxData);
  if (conesToPrint.length === 0) {
    toast.error("No barcodes on boxes");
    return;
  }
  const result = await printCones(conesToPrint, { customSettings: defaultVendorLabelPrintSettings() });
  const scope = opts?.scopeLabel ? ` for ${opts.scopeLabel}` : "";
  if (result.success) toast.success(`Printed ${result.printed} label(s)${scope}`);
  else toast.error(result.error || "Print failed");
}

export async function printAllVendorBoxLabels(
  apiPo: VendorPurchaseOrder,
  boxes: VendorBox[],
  boxData: Record<string, VendorBoxFormRow>
): Promise<void> {
  // Print invoice-by-invoice (sorted lots first, unassigned last) so labels come out grouped.
  const { grouped, sortedLots, unassigned } = groupVendorBoxesByLot(boxes, boxData);
  const ordered: VendorBox[] = [];
  for (const lot of sortedLots) ordered.push(...(grouped[lot] || []));
  ordered.push(...unassigned);
  await printVendorBoxLabels(apiPo, ordered.length ? ordered : boxes, boxData);
}

export function exportVendorBoxesExcel(apiPo: VendorPurchaseOrder, boxes: VendorBox[], boxData: Record<string, VendorBoxFormRow>) {
  const rows = boxes.map((b) => {
    const id = getVendorBoxId(b);
    const d = boxData[id];
    return {
      VPO: apiPo.vpoNumber,
      "Box ID": b.boxId || "",
      Barcode: b.barcode || "",
      Invoice: d?.lotNumber || b.lotNumber || "",
      Product: d?.productName || b.productName || "",
      Code: d?.articleCode || "",
      Type: d?.type || "",
      Color: d?.color || "",
      Pattern: d?.pattern || "",
      Units: d?.numberOfUnits ?? b.numberOfUnits ?? "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Boxes");
  XLSX.writeFile(wb, `VPO-${apiPo.vpoNumber}-boxes.xlsx`);
  toast.success("Exported");
}
