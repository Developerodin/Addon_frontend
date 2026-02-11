"use client";
import React, { useState, useRef, useEffect } from "react";
import { toast } from "react-hot-toast";
import * as XLSX from "xlsx";
import yarnPurchaseOrderService from "@/shared/services/yarnPurchaseOrderService";
import yarnReceivingService from "@/shared/services/yarnReceivingService";
import type { YarnReceivingProcessPayload } from "@/shared/services/yarnReceivingService";

interface ExcelRow {
  lot?: string;
  shadeNo?: string;
  netWeight?: number;
  noOfCones?: number;
  countSize?: string;
  colour?: string;
  brand?: string;
  recvdDate?: string;
  yarnType?: string;
}

interface ExcelProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** PO options: { orderNumber, id } - from parent's orders list */
  poOptions: Array<{ orderNumber: string; id: string }>;
}

const normalizeHeader = (h: string): string => {
  return (h || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
};

const HEADER_MAP: Record<string, string> = {
  lot: "lot",
  lotno: "lot",
  lotnumber: "lot",
  shadeno: "shadeNo",
  shade: "shadeNo",
  netweight: "netWeight",
  netwt: "netWeight",
  noofcones: "noOfCones",
  nofconesroundup: "noOfCones",
  countsize: "countSize",
  count: "countSize",
  size: "countSize",
  colour: "colour",
  color: "colour",
  brand: "brand",
  recvddate: "recvdDate",
  receiveddate: "recvdDate",
  yarntype: "yarnType",
};

function parseExcelToRows(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log("[ExcelProcess] FileReader onload - parsing Excel");
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rawRows.length < 2) {
          reject(new Error("Excel has no data rows."));
          return;
        }
        const headerKeywords = ["lot", "shade", "net", "weight", "cones", "count", "colour", "color", "brand", "recvd", "yarn"];
        const looksLikeHeader = (row: any[]): boolean => {
          if (!row || row.length === 0) return false;
          const rowStr = row.map((c) => String(c ?? "").toLowerCase()).join(" ");
          return headerKeywords.some((kw) => rowStr.includes(kw));
        };
        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(10, rawRows.length); r++) {
          const row = rawRows[r] as any[];
          if (looksLikeHeader(row)) {
            headerRowIndex = r;
            break;
          }
        }
        if (headerRowIndex < 0) headerRowIndex = 0;
        const headerRow = (rawRows[headerRowIndex] as any[]).map((h: any) => (h != null ? String(h).trim() : ""));
        console.log("[ExcelProcess] Detected header row", { headerRowIndex, headerRow });
        const colMap: Record<string, number> = {};
        headerRow.forEach((h: string, idx: number) => {
          const key = HEADER_MAP[normalizeHeader(h)];
          if (key && colMap[key] === undefined) colMap[key] = idx;
        });
        const rows: ExcelRow[] = [];
        const dataStartIndex = headerRowIndex + 1;
        for (let i = dataStartIndex; i < rawRows.length; i++) {
          const row = rawRows[i] as any[];
          if (!row || row.length === 0) continue;
          const r: ExcelRow = {};
          if (colMap.lot !== undefined) r.lot = String(row[colMap.lot] ?? "").trim();
          if (colMap.shadeNo !== undefined) r.shadeNo = String(row[colMap.shadeNo] ?? "").trim();
          if (colMap.netWeight !== undefined) {
            const v = row[colMap.netWeight];
            r.netWeight = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, "")) || 0;
          }
          if (colMap.noOfCones !== undefined) {
            const v = row[colMap.noOfCones];
            r.noOfCones = typeof v === "number" ? Math.round(v) : Math.round(parseFloat(String(v).replace(/[^\d.-]/g, "")) || 0);
          }
          if (colMap.countSize !== undefined) r.countSize = String(row[colMap.countSize] ?? "").trim();
          if (colMap.colour !== undefined) r.colour = String(row[colMap.colour] ?? "").trim();
          if (colMap.brand !== undefined) r.brand = String(row[colMap.brand] ?? "").trim();
          if (colMap.recvdDate !== undefined) r.recvdDate = String(row[colMap.recvdDate] ?? "").trim();
          if (colMap.yarnType !== undefined) r.yarnType = String(row[colMap.yarnType] ?? "").trim();
          if (r.lot && r.shadeNo) rows.push(r);
        }
        console.log("[ExcelProcess] parseExcelToRows done", { totalRows: rows.length, colMap });
        resolve(rows);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Failed to parse Excel"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

const ExcelProcessModal: React.FC<ExcelProcessModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  poOptions,
}) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reset = () => {
    setSelectedOrderIds([]);
    setSearchTerm("");
    setExcelFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const togglePoSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredPoOptions = poOptions.filter((po) =>
    po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    console.log("[ExcelProcess] handleSubmit called", {
      selectedOrderIds,
      hasExcelFile: !!excelFile,
      excelFileName: excelFile?.name,
      poOptionsCount: poOptions.length,
    });

    if (selectedOrderIds.length === 0) {
      console.log("[ExcelProcess] Validation failed: no PO selected");
      toast.error("Please select at least one PO number");
      return;
    }
    if (!excelFile) {
      console.log("[ExcelProcess] Validation failed: no Excel file");
      toast.error("Please upload an Excel file");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("[ExcelProcess] Parsing Excel file...");
      const rows = await parseExcelToRows(excelFile);
      console.log("[ExcelProcess] Excel parsed", { rowCount: rows.length, firstRow: rows[0] });

      if (rows.length === 0) {
        toast.error("No valid rows found in Excel (need Lot and SHADE NO columns)");
        setIsSubmitting(false);
        return;
      }

      // Fetch details for all selected POs
      console.log("[ExcelProcess] Fetching details for POs:", selectedOrderIds);
      const allPoDetails = await Promise.all(
        selectedOrderIds.map((id) => yarnPurchaseOrderService.getPurchaseOrderById(id))
      );

      // Create a map of PO items for matching
      // We'll also keep track of which PO each item belongs to
      interface POItemWithMeta {
        poItem: any;
        poNumber: string;
      }
      const allPoItems: POItemWithMeta[] = [];
      allPoDetails.forEach((po: any) => {
        const poNumber = po.poNumber || po.orderNumber || "";
        const items = po.items || po.poItems || [];
        items.forEach((item: any) => {
          allPoItems.push({ poItem: item, poNumber });
        });
      });

      console.log("[ExcelProcess] Collected all PO items", { totalItems: allPoItems.length });

      const buildYarnName = (r: ExcelRow) => {
        const count = r.countSize || "";
        const colour = r.colour || "";
        const shade = r.shadeNo || "";
        const type = r.yarnType || "";
        return [count, colour, shade, type].filter(Boolean).join("-") || "Unknown";
      };

      const resolveMatch = (r: ExcelRow): POItemWithMeta | null => {
        const shadeNo = (r.shadeNo || "").trim().toLowerCase();
        const yarnNameForMatch = buildYarnName(r).toLowerCase();

        for (const { poItem, poNumber } of allPoItems) {
          const itemShade = (poItem.shadeCode || poItem.shade_code || poItem.shadeNo || "").trim().toLowerCase();
          const itemYarn = (poItem.yarnName || poItem.yarn?.yarnName || poItem.yarn?.name || "").trim().toLowerCase();
          const itemId = poItem._id || poItem.id;
          if (!itemId) continue;

          if (!shadeNo && !itemShade && itemYarn && yarnNameForMatch && itemYarn.includes(yarnNameForMatch)) return { poItem, poNumber };
          if (itemShade === shadeNo) return { poItem, poNumber };
          if (itemShade && shadeNo && (itemShade.includes(shadeNo) || shadeNo.includes(itemShade))) return { poItem, poNumber };
          if (itemYarn && yarnNameForMatch && itemYarn.includes(yarnNameForMatch)) return { poItem, poNumber };
        }
        return null;
      };

      // Group Excel rows by matched PO
      // Structure: poNumber -> lotNumber -> group of Excel rows
      const poGroups = new Map<string, Map<string, ExcelRow[]>>();

      for (const r of rows) {
        const match = resolveMatch(r);
        if (!match) continue;

        const { poNumber } = match;
        const lot = (r.lot || "LOT").trim();

        if (!poGroups.has(poNumber)) poGroups.set(poNumber, new Map());
        const lotMap = poGroups.get(poNumber)!;
        if (!lotMap.has(lot)) lotMap.set(lot, []);
        lotMap.get(lot)!.push(r);
      }

      if (poGroups.size === 0) {
        console.log("[ExcelProcess] No rows matched to any selected PO");
        toast.error("Could not match any rows to PO items. Check shade codes and yarn names.");
        setIsSubmitting(false);
        return;
      }

      // Build payload items array
      const payloadItems: YarnReceivingProcessPayload["items"] = [];

      for (const [poNumber, lotMap] of Array.from(poGroups.entries())) {
        const lots: YarnReceivingProcessPayload["items"][0]["lots"] = [];

        for (const [lotNumber, groupRows] of Array.from(lotMap.entries())) {
          const poItemWeightMap = new Map<string, number>();
          const boxUpdates: NonNullable<YarnReceivingProcessPayload["items"][0]["lots"][0]["boxUpdates"]> = [];
          let totalCones = 0;

          for (const r of groupRows) {
            const match = resolveMatch(r);
            if (!match) continue;

            const poItemId = match.poItem._id || match.poItem.id;
            const netWeight = r.netWeight ?? 0;
            const cones = r.noOfCones ?? 1;

            poItemWeightMap.set(poItemId, (poItemWeightMap.get(poItemId) || 0) + netWeight);
            totalCones += cones;
            boxUpdates.push({
              yarnName: buildYarnName(r),
              shadeCode: r.shadeNo || "",
              boxWeight: netWeight,
              numberOfCones: cones,
            });
          }

          const poItemsArr = Array.from(poItemWeightMap.entries()).map(([poItem, receivedQuantity]) => ({
            poItem,
            receivedQuantity,
          }));
          const totalWeight = poItemsArr.reduce((s, p) => s + p.receivedQuantity, 0);

          if (poItemsArr.length > 0) {
            lots.push({
              lotNumber,
              numberOfBoxes: groupRows.length,
              numberOfCones: totalCones,
              totalWeight,
              poItems: poItemsArr,
              boxUpdates,
            });
          }
        }

        if (lots.length > 0) {
          payloadItems.push({
            poNumber,
            lots,
            notes: "",
          });
        }
      }

      const payload: YarnReceivingProcessPayload = {
        items: payloadItems,
        notes: "",
      };

      console.log("[ExcelProcess] Calling yarnReceivingService.process", { payload });
      await yarnReceivingService.process(payload);
      console.log("[ExcelProcess] API call successful");
      toast.success(`Excel processed for ${payloadItems.length} PO(s)`);
      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error("[ExcelProcess] Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to process Excel");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-800">Excel Process</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              type="button"
            >
              <i className="ri-close-line text-xl" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Select PO Numbers</label>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full bg-white border border-gray-200 text-[12px] font-medium rounded px-3 py-2 cursor-pointer flex justify-between items-center hover:border-purple-300 focus-within:ring-2 focus-within:ring-purple-200"
              >
                <span className={selectedOrderIds.length > 0 ? "text-gray-800" : "text-gray-400"}>
                  {selectedOrderIds.length > 0
                    ? `${selectedOrderIds.length} PO(s) selected`
                    : "Choose POs..."}
                </span>
                <i className={`ri-arrow-down-s-line transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-2 max-h-60 overflow-y-auto">
                  <div className="sticky top-0 bg-white pb-2">
                    <input
                      type="text"
                      className="w-full text-[11px] border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-purple-300"
                      placeholder="Search PO..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="space-y-1">
                    {filteredPoOptions.map((po) => (
                      <label
                        key={po.id}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-purple-50 rounded cursor-pointer transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="w-3 h-3 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          checked={selectedOrderIds.includes(po.id)}
                          onChange={() => togglePoSelection(po.id)}
                        />
                        <span className="text-[11px] font-medium text-gray-700">{po.orderNumber}</span>
                      </label>
                    ))}
                    {filteredPoOptions.length === 0 && (
                      <div className="text-[11px] text-gray-400 text-center py-2">No POs found</div>
                    )}
                  </div>
                </div>
              )}
              {selectedOrderIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedOrderIds.map((id) => {
                    const po = poOptions.find((p) => p.id === id);
                    return (
                      <span key={id} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-bold rounded">
                        {po?.orderNumber}
                        <i className="ri-close-line cursor-pointer" onClick={() => togglePoSelection(id)} />
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Upload Excel</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                className="block w-full text-[11px] text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-purple-50 file:text-purple-600 hover:file:bg-purple-100"
              />
              {excelFile && (
                <p className="mt-1 text-[10px] text-gray-500">{excelFile.name}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                console.log("[ExcelProcess] Process button clicked", { isSubmitting, selectedOrderIds, hasFile: !!excelFile });
                handleSubmit();
              }}
              disabled={isSubmitting || selectedOrderIds.length === 0 || !excelFile}
              className="px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
              type="button"
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line text-sm animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <i className="ri-file-excel-2-line text-sm" />
                  Process
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelProcessModal;
