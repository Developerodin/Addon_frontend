import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import { printCones, connectQZ, getDefaultPrinter, isQZLoaded } from "@/shared/utils/qzTray";
import type { VendorPurchaseOrder } from "@/shared/services/vendorPurchaseOrderService";
import type { VendorBox } from "@/shared/services/vendorBoxService";
import { defaultVendorLabelPrintSettings, getVendorBoxId } from "./vendorReceiveProcessHelpers";

export type VendorBoxFormRow = {
  productName: string;
  articleCode: string;
  lotNumber: string;
  grossWeight: string;
  boxWeight: string;
  numberOfUnits: string;
};

function readVendorName(v: VendorPurchaseOrder["vendor"]): string {
  if (!v || typeof v === "string") return typeof v === "string" ? v : "";
  return v.header?.vendorName || "";
}

export async function printAllVendorBoxLabels(
  apiPo: VendorPurchaseOrder,
  boxes: VendorBox[],
  boxData: Record<string, VendorBoxFormRow>
): Promise<void> {
  if (!boxes.length) {
    toast.error("No boxes to print");
    return;
  }
  if (!isQZLoaded()) {
    toast.error("QZ Tray script not loaded yet");
    return;
  }
  const active =
    typeof window !== "undefined" &&
    window.qz?.websocket &&
    window.qz.websocket.isActive?.() === true;
  if (!active) {
    const c = await connectQZ();
    if (!c.isConnected) {
      toast.error(c.error || "Connect QZ Tray");
      return;
    }
  }
  const printer = await getDefaultPrinter();
  if (!printer) {
    toast.error("No default printer");
    return;
  }
  const vendorShort = readVendorName(apiPo.vendor).split(" ").slice(0, 2).join(" ");
  const conesToPrint = boxes
    .filter((b) => b.barcode)
    .map((b) => {
      const id = getVendorBoxId(b);
      const d = boxData[id];
      const w = d?.boxWeight ? parseFloat(d.boxWeight) : b.boxWeight;
      return {
        barcode: String(b.barcode),
        boxId: b.boxId || id,
        yarnName: d?.productName || b.productName || "",
        shadeCode: d?.articleCode || "",
        weight: w != null && !Number.isNaN(Number(w)) ? Number(w) : undefined,
        lotNumber: d?.lotNumber || b.lotNumber || "",
        supplierName: vendorShort,
        poNumber: apiPo.vpoNumber || "",
      };
    });
  if (conesToPrint.length === 0) {
    toast.error("No barcodes on boxes");
    return;
  }
  const result = await printCones(conesToPrint, { customSettings: defaultVendorLabelPrintSettings() });
  if (result.success) toast.success(`Printed ${result.printed} label(s)`);
  else toast.error(result.error || "Print failed");
}

export function exportVendorBoxesExcel(apiPo: VendorPurchaseOrder, boxes: VendorBox[], boxData: Record<string, VendorBoxFormRow>) {
  const rows = boxes.map((b) => {
    const id = getVendorBoxId(b);
    const d = boxData[id];
    return {
      VPO: apiPo.vpoNumber,
      "Box ID": b.boxId || "",
      Barcode: b.barcode || "",
      Lot: d?.lotNumber || b.lotNumber || "",
      Product: d?.productName || b.productName || "",
      Code: d?.articleCode || "",
      "Gross (kg)": d?.grossWeight || "",
      "Net (kg)": d?.boxWeight ?? b.boxWeight ?? "",
      Units: d?.numberOfUnits ?? b.numberOfUnits ?? "",
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Boxes");
  XLSX.writeFile(wb, `VPO-${apiPo.vpoNumber}-boxes.xlsx`);
  toast.success("Exported");
}
