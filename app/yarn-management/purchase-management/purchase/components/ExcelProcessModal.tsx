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
  /** Excel "Yarn Type" → matches backend yarn type name (e.g. Cotton, Bamboo) */
  yarnType?: string;
  /** Excel "Yarn Subtype" → matches backend yarn subtype (e.g. Compact, Combed Melange) */
  yarnSubtype?: string;
  poNumber?: string;
  _excelRowIndex?: number;
}

interface ExcelProcessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  /** PO options: { orderNumber, id } - from parent's orders list */
  poOptions: Array<{ orderNumber: string; id: string }>;
}

/** One mismatch reason: field name, value in Excel, value on PO item */
export interface MismatchReason {
  field: string;
  excelVal: string;
  poVal: string;
}

/** For unmatched row: either no PO item with same shade+count, or candidate(s) with specific mismatches */
export type UnmatchedRowMismatch =
  | { noCandidate: true }
  | { candidates: Array<{ poNumber: string; poItemSummary: string; mismatches: MismatchReason[] }> };

interface ErrorDrawerContent {
  title: string;
  message: string;
  unmatchedRows?: Array<{
    line: number;
    shadeNo: string;
    countSize: string;
    yarnType: string;
    yarnSubtype: string;
    colour: string;
    mismatchDetails?: UnmatchedRowMismatch;
  }>;
  totalUnmatched?: number;
  maxShown?: number;
}

const normalizeHeader = (h: string): string => {
  return (h || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "")
    .replace(/\//g, ""); // "COUNT/SIZE" -> "countsize" so it maps to countSize
};

const HEADER_MAP: Record<string, string> = {
  lot: "lot",
  lotno: "lot",
  lotnumber: "lot",
  shadeno: "shadeNo",
  shadenumber: "shadeNo",
  shade: "shadeNo",
  shadecode: "shadeNo",
  netweight: "netWeight",
  netwt: "netWeight",
  noofcones: "noOfCones",
  nofconesroundup: "noOfCones",
  countsize: "countSize",
  count: "countSize",
  size: "countSize",
  colour: "colour",
  color: "colour",
  pantonename: "colour",
  brand: "brand",
  brandaspersystem: "brand",
  recvddate: "recvdDate",
  receiveddate: "recvdDate",
  yarntype: "yarnType",
  yarnsubtype: "yarnSubtype",
  ponumber: "poNumber",
};

/** Expected format description for user-facing errors */
const EXPECTED_FORMAT_MSG =
  "This process expects a RECEIVING/BAGS DETAILS Excel with columns: Lot, Shade No (or Shade Code), Net Weight, No of Cones, Count/Size, Colour, Brand. " +
  "PO details or order-item files (with only Item, Quantity, Rate, etc.) cannot be used here.";

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
          reject(
            new Error(
              "Excel has no data rows (or only a header). " + EXPECTED_FORMAT_MSG
            )
          );
          return;
        }
        // Build colMap for a candidate row (to check if it has required columns)
        const buildColMapForRow = (row: any[]): Record<string, number> => {
          const map: Record<string, number> = {};
          (row || []).forEach((h: any, idx: number) => {
            const key = HEADER_MAP[normalizeHeader(String(h ?? "").trim())];
            if (key && map[key] === undefined) map[key] = idx;
          });
          return map;
        };
        // Only treat a row as header if it has BOTH Lot and Shade No as column headers.
        // This avoids mistaking a title row like "Po details yarn loft..." (contains "lot") for the header.
        let headerRowIndex = -1;
        for (let r = 0; r < Math.min(10, rawRows.length); r++) {
          const row = rawRows[r] as any[];
          if (!row || row.length === 0) continue;
          const candidateMap = buildColMapForRow(row);
          if (candidateMap.lot !== undefined && candidateMap.shadeNo !== undefined) {
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

        if (colMap.lot === undefined) {
          reject(
            new Error(
              "Required column 'Lot' (or Lot No) not found. If row 1 is a title (e.g. 'Po details yarn loft...'), the next row must be the header with columns: Lot, Shade No, Net Weight, etc. " +
                EXPECTED_FORMAT_MSG
            )
          );
          return;
        }
        if (colMap.shadeNo === undefined) {
          reject(
            new Error(
              "Required column 'Shade No' (or Shade Code / Shade) not found. If row 1 is a title, the next row must be the header with Lot and Shade No. " +
                EXPECTED_FORMAT_MSG
            )
          );
          return;
        }

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
          if (colMap.yarnSubtype !== undefined) r.yarnSubtype = String(row[colMap.yarnSubtype] ?? "").trim();
          if (colMap.poNumber !== undefined) r.poNumber = String(row[colMap.poNumber] ?? "").trim();
          if (r.lot && r.shadeNo) {
            r._excelRowIndex = i + 1;
            rows.push(r);
          }
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
  const [errorDrawer, setErrorDrawer] = useState<ErrorDrawerContent | null>(null);

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
    setErrorDrawer(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeErrorDrawer = () => setErrorDrawer(null);

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
        toast.error("No valid rows in Excel");
        setErrorDrawer({
          title: "No valid rows in Excel",
          message: "No valid rows found. Each row must have both Lot and Shade No (or Shade Code) filled. " + EXPECTED_FORMAT_MSG,
        });
        setIsSubmitting(false);
        return;
      }

      const normalizePoForCompare = (s: string | undefined) =>
        (s ?? "").trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
      const selectedPoNorm = new Set(
        poOptions.filter((p) => selectedOrderIds.includes(p.id)).map((p) => normalizePoForCompare(p.orderNumber))
      );
      const rowsForSelectedPo = rows.filter((r) => {
        if (!r.poNumber) return true;
        return selectedPoNorm.has(normalizePoForCompare(r.poNumber));
      });

      if (rowsForSelectedPo.length === 0) {
        toast.error("No rows for selected PO");
        setErrorDrawer({
          title: "No rows for selected PO",
          message: "No Excel rows belong to the selected PO(s). " +
            (rows.some((r) => r.poNumber) ? "Use the 'Po number' column to match the selected PO (e.g. PO-2026-895)." : "Add a 'Po number' column and set it to the selected PO, or ensure your rows match the selected PO."),
        });
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

      /** Count/size in system format (strip apostrophe: 30's → 30s) for payload sent to backend. */
      const countSizeForPayload = (s: string | undefined) =>
        (s ?? "").trim().replace(/'/g, "");
      const buildYarnName = (r: ExcelRow) => {
        const count = countSizeForPayload(r.countSize);
        const colour = r.colour || "";
        const shade = r.shadeNo || "";
        const type = r.yarnType || "";
        return [count, colour, shade, type].filter(Boolean).join("-") || "Unknown";
      };

      /** Normalize for strict match: trim, lowercase, strip all whitespace (so "8780340 / X" matches "8780340/X") */
      const n = (s: string | undefined) =>
        (typeof s === "string" ? s : s != null ? String(s) : "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "");

      /** Normalize count/size so "20's" and "20s" match (strip apostrophe). */
      const nCountSize = (s: string | undefined) => n(s).replace(/'/g, "");

      /** Shade: strict exact match. Only trim + toLowerCase (no collapsing spaces) so same shade string is required. */
      const nShade = (s: string | undefined): string =>
        (typeof s === "string" ? s : s != null ? String(s) : "").trim().toLowerCase();

      /** Parse yarnName when API returns null for type/subtype/colour. Format: "20s-Dark Orange-Dk. Orange-Cotton/Compact" */
      const parseYarnName = (yarnName: string | undefined) => {
        if (!yarnName || typeof yarnName !== "string") return { type: "", subtype: "", colourVariants: [] as string[] };
        const parts = yarnName.trim().split("-");
        const last = parts[parts.length - 1] ?? "";
        const [type = "", subtype = ""] = last.includes("/") ? last.split("/") : [last, ""];
        const colourFromName = parts.length >= 3 ? parts[2]?.trim() : "";
        const labelFromName = parts.length >= 2 ? parts[1]?.trim() : "";
        const colourVariants = [colourFromName, labelFromName].filter(Boolean);
        return { type, subtype, colourVariants };
      };

      /** Backend yarn type name (e.g. Cotton, Bamboo) from item.yarn.yarnType.name or parsed from yarnName */
      const getItemYarnTypeName = (item: any): string => {
        const raw = (item as any).yarn?.yarnType?.name ?? (item as any).yarnType?.name;
        if (typeof raw === "string" && raw.trim()) return raw;
        return parseYarnName((item as any).yarnName).type;
      };

      /** Backend yarn subtype (e.g. Compact, Combed Melange) from item or parsed from yarnName */
      const getItemSubtype = (item: any): string => {
        const raw = item.yarnSubtype ?? item.yarn?.subtype ?? item.yarn?.yarnSubtype;
        if (typeof raw === "string" && raw.trim()) return raw;
        if (raw && typeof raw === "object" && typeof (raw as any).subtype === "string") return (raw as any).subtype;
        return parseYarnName((item as any).yarnName).subtype;
      };

      /** Normalize subtype same as general text (trim, lowercase, collapse spaces). Exact match only – no alias. */
      const nSubtype = (s: string | undefined): string => n(s);

      /** Colour: exact match only. Full string normalized (trim, lowercase, collapse spaces) – do NOT strip parenthetical so "Navy (New)" does not match "Navy". */
      const nColour = (s: string | undefined): string => n(s);
      /** All normalized colour strings for PO item (full form only – no base/stripped form). */
      const getItemColourVariants = (item: any): string[] => {
        const raw = [
          (item as any).colour,
          (item as any).color,
          (item as any).pantoneName,
          (item as any).yarn?.colour,
          (item as any).yarn?.color,
          (item as any).yarn?.colorFamily?.name,
          (item as any).yarn?.colorFamily?.colorCode,
          ...parseYarnName((item as any).yarnName).colourVariants,
        ].filter((v) => v != null && String(v).trim() !== "");
        return [...new Set(raw.map((v) => nColour(v)).filter(Boolean))];
      };

      /** Strict match: shade, count/size, colour (exact full string), yarn type and subtype must match exactly; if either side has type/subtype the other must have same (missing = mismatch). */
      const resolveMatch = (r: ExcelRow): POItemWithMeta | null => {
        const excelShade = nShade(r.shadeNo);
        const excelCountSize = nCountSize(r.countSize);
        const excelYarnType = n(r.yarnType);
        const excelYarnSubtype = nSubtype(r.yarnSubtype);
        const excelColour = nColour(r.colour);

        for (const { poItem, poNumber } of allPoItems) {
          const itemId = poItem._id || poItem.id;
          if (!itemId) continue;

          const itemShade = nShade(poItem.shadeCode ?? poItem.shade_code ?? poItem.shadeNo);
          const itemCountSize = nCountSize(poItem.sizeCount ?? poItem.size_count ?? poItem.countSize);
          const itemYarnType = n(getItemYarnTypeName(poItem));
          const itemSubtype = nSubtype(getItemSubtype(poItem));
          const itemColourVariants = getItemColourVariants(poItem);

          const shadeMatch = excelShade === itemShade;
          const countSizeMatch = excelCountSize === itemCountSize;
          const colourMatch = excelColour ? itemColourVariants.includes(excelColour) : true;
          const typeMatch = excelYarnType === itemYarnType;
          const subtypeMatch = excelYarnSubtype === itemSubtype;

          if (shadeMatch && countSizeMatch && typeMatch && subtypeMatch && colourMatch) return { poItem, poNumber };
        }
        return null;
      };

      /** For error reporting: find candidates (same shade+count) and list exact mismatches (field, excel value, PO value). */
      const getMismatchDetails = (r: ExcelRow): UnmatchedRowMismatch => {
        const excelShade = nShade(r.shadeNo);
        const excelCountSize = nCountSize(r.countSize);
        const excelYarnType = n(r.yarnType);
        const excelYarnSubtype = nSubtype(r.yarnSubtype);
        const excelColour = nColour(r.colour);
        const candidates: Array<{ poNumber: string; poItemSummary: string; mismatches: MismatchReason[] }> = [];

        for (const { poItem, poNumber } of allPoItems) {
          const itemId = poItem._id || poItem.id;
          if (!itemId) continue;
          const itemShade = nShade(poItem.shadeCode ?? poItem.shade_code ?? poItem.shadeNo);
          const itemCountSize = nCountSize(poItem.sizeCount ?? poItem.size_count ?? poItem.countSize);
          if (excelShade !== itemShade || excelCountSize !== itemCountSize) continue;

          const itemYarnType = n(getItemYarnTypeName(poItem));
          const itemSubtype = nSubtype(getItemSubtype(poItem));
          const itemColourVariants = getItemColourVariants(poItem);
          const itemColourDisplay = itemColourVariants.length ? itemColourVariants.join(", ") : "(none)";

          const mismatches: MismatchReason[] = [];
          if (excelYarnType !== itemYarnType) {
            mismatches.push({
              field: "Yarn Type",
              excelVal: (r.yarnType ?? "").trim() || "(missing in Excel)",
              poVal: itemYarnType ? getItemYarnTypeName(poItem) : "(missing in PO item)",
            });
          }
          if (excelYarnSubtype !== itemSubtype) {
            mismatches.push({
              field: "Yarn Subtype",
              excelVal: (r.yarnSubtype ?? "").trim() || "(missing in Excel)",
              poVal: itemSubtype ? getItemSubtype(poItem) : "(missing in PO item)",
            });
          }
          const colourMatch = excelColour ? itemColourVariants.includes(excelColour) : true;
          if (!colourMatch) {
            mismatches.push({
              field: "Colour",
              excelVal: (r.colour ?? "").trim() || "(missing in Excel)",
              poVal: itemColourDisplay,
            });
          }
          if (mismatches.length === 0) continue;
          const poItemSummary =
            [itemShade || "(no shade)", itemCountSize || "(no count)", itemYarnType || "(no type)", itemSubtype || "(no subtype)"].join(" / ");
          candidates.push({ poNumber, poItemSummary, mismatches });
        }

        if (candidates.length === 0) return { noCandidate: true };
        return { candidates };
      };

      // Group Excel rows by matched PO; track unmatched for error report
      const poGroups = new Map<string, Map<string, ExcelRow[]>>();
      const unmatchedRows: Array<{ line: number; shadeNo: string; countSize: string; yarnType: string; yarnSubtype: string; colour: string }> = [];

      for (const r of rowsForSelectedPo) {
        const match = resolveMatch(r);
        if (!match) {
          unmatchedRows.push({
            line: r._excelRowIndex ?? 0,
            shadeNo: r.shadeNo ?? "",
            countSize: r.countSize ?? "",
            yarnType: r.yarnType ?? "",
            yarnSubtype: r.yarnSubtype ?? "",
            colour: r.colour ?? "",
            mismatchDetails: getMismatchDetails(r),
          });
          continue;
        }

        const { poNumber } = match;
        const lot = (r.lot || "LOT").trim();

        if (!poGroups.has(poNumber)) poGroups.set(poNumber, new Map());
        const lotMap = poGroups.get(poNumber)!;
        if (!lotMap.has(lot)) lotMap.set(lot, []);
        lotMap.get(lot)!.push(r);
      }

      if (poGroups.size === 0 || unmatchedRows.length > 0) {
        const isNone = poGroups.size === 0;
        console.log("[ExcelProcess] Validation failed – errors in drawer", { unmatchedRows: unmatchedRows.length, noMatch: isNone });
        toast.error(isNone ? "No rows matched" : "Fix errors in Excel – process not run");
        setErrorDrawer({
          title: isNone ? "No rows matched" : "Data mismatch – fix in Excel or PO",
          message: isNone
            ? "Could not match any Excel rows to the selected PO items. Each row must exactly match a PO line item on: Shade No, Count/Size, Yarn Type, Yarn Subtype, Colour (exact – e.g. 'Navy (New)' does not match 'Navy'). If a value is missing on Excel or PO, fix it so both sides match."
            : `${unmatchedRows.length} row(s) did not exactly match any PO line item. See reasons below: fix either in Excel or in the PO so Shade, Count/Size, Colour, Yarn Type and Yarn Subtype match exactly. Process will not run until all rows match.`,
          unmatchedRows: unmatchedRows.slice(0, 50),
          totalUnmatched: unmatchedRows.length,
          maxShown: 50,
        });
        setIsSubmitting(false);
        return;
      }

      // All rows matched – build payload and call process API
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
      const message = error instanceof Error ? error.message : "Failed to process Excel";
      console.error("[ExcelProcess] Error:", error);
      toast.error("Excel process failed");
      setErrorDrawer({
        title: "Excel process failed",
        message,
      });
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

      {/* Error drawer from right */}
      {errorDrawer && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 transition-opacity"
            onClick={closeErrorDrawer}
            aria-hidden
          />
          <div className="excel-process-error-drawer fixed top-0 right-0 bottom-0 z-[61] w-full max-w-md bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-red-50">
              <h3 className="text-sm font-bold text-red-800">{errorDrawer.title}</h3>
              <button
                type="button"
                onClick={closeErrorDrawer}
                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs text-gray-700 leading-relaxed">{errorDrawer.message}</p>
              {errorDrawer.unmatchedRows && errorDrawer.unmatchedRows.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-700 mb-2">
                    Rows that did not match ({errorDrawer.totalUnmatched ?? errorDrawer.unmatchedRows.length}
                    {errorDrawer.totalUnmatched && (errorDrawer.maxShown ?? 0) < errorDrawer.totalUnmatched
                      ? ` shown, first ${errorDrawer.maxShown ?? 50}`
                      : ""}
                    ):
                  </p>
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-gray-100 text-gray-600 font-semibold">
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Row</th>
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Shade No</th>
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Count/Size</th>
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Yarn Type</th>
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Yarn Subtype</th>
                          <th className="text-left py-1.5 px-2 border-b border-gray-200">Colour</th>
                        </tr>
                      </thead>
                      <tbody>
                        {errorDrawer.unmatchedRows.map((u, idx) => (
                          <React.Fragment key={idx}>
                            <tr className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-1.5 px-2 font-medium">{u.line}</td>
                              <td className="py-1.5 px-2">{u.shadeNo || "–"}</td>
                              <td className="py-1.5 px-2">{u.countSize || "–"}</td>
                              <td className="py-1.5 px-2">{u.yarnType || "–"}</td>
                              <td className="py-1.5 px-2">{u.yarnSubtype ?? "–"}</td>
                              <td className="py-1.5 px-2">{u.colour || "–"}</td>
                            </tr>
                            {u.mismatchDetails && (
                              <tr className="border-b border-gray-100 bg-amber-50/80">
                                <td colSpan={6} className="py-1.5 px-2 text-[10px] text-gray-700">
                                  {"noCandidate" in u.mismatchDetails ? (
                                    <span>No PO line item with same Shade + Count/Size. Add a matching item on the PO or fix Excel.</span>
                                  ) : (
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {u.mismatchDetails.candidates.slice(0, 2).map((c, i) => (
                                        <li key={i}>
                                          <span className="font-medium">PO {c.poNumber}</span> – {c.poItemSummary}
                                          <ul className="ml-3 mt-0.5 list-[circle] list-inside text-red-700">
                                            {c.mismatches.map((m, j) => (
                                              <li key={j}>
                                                {m.field}: Excel &quot;{m.excelVal}&quot; vs PO &quot;{m.poVal}&quot; – fix in Excel or PO.
                                              </li>
                                            ))}
                                          </ul>
                                        </li>
                                      ))}
                                      {u.mismatchDetails.candidates.length > 2 && (
                                        <li className="text-gray-500">+ {u.mismatchDetails.candidates.length - 2} more candidate(s)</li>
                                      )}
                                    </ul>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <button
                type="button"
                onClick={closeErrorDrawer}
                className="w-full px-3 py-2 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            .excel-process-error-drawer {
              animation: excelProcessDrawerIn 0.2s ease-out;
            }
            @keyframes excelProcessDrawerIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}} />
        </>
      )}
    </div>
  );
};

export default ExcelProcessModal;
