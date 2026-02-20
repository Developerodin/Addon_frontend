"use client";

import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import storageSlotService from "@/shared/services/storageSlotService";

export interface BulkAllocateRow {
  boxBarcode: string;
  rackCode: string;
  rowIndex: number;
}

export interface BulkAllocateResult {
  rowIndex: number;
  boxBarcode: string;
  rackCode: string;
  success: boolean;
  error?: string;
}

export interface BulkAllocateExcelImportProps {
  onComplete?: () => void;
}

/**
 * Parse Excel file for bulk allocate: expects columns "boxbarcode" and "rackcode" (case-insensitive).
 * Returns array of { boxBarcode, rackCode, rowIndex } (1-based for display).
 */
function parseBulkAllocateExcel(file: File): Promise<BulkAllocateRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          reject(new Error("Failed to read file"));
          return;
        }
        const wb = XLSX.read(data, { type: "binary" });
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
          header: 1,
          defval: "",
        }) as unknown[][];

        if (!json.length || !Array.isArray(json[0])) {
          reject(new Error("Excel has no data or invalid format"));
          return;
        }

        const headerRow = (json[0] as string[]).map((h) => String(h || "").trim().toLowerCase());
        const boxBarcodeCol = headerRow.findIndex(
          (h) => h === "boxbarcode" || h === "box barcode" || h === "barcode"
        );
        const rackCodeCol = headerRow.findIndex(
          (h) => h === "rackcode" || h === "rack code" || h === "rack"
        );

        if (boxBarcodeCol < 0 || rackCodeCol < 0) {
          reject(
            new Error(
              'Excel must have columns "boxbarcode" and "rackcode" (or "box barcode", "rack code")'
            )
          );
          return;
        }

        const rows: BulkAllocateRow[] = [];
        for (let i = 1; i < json.length; i++) {
          const row = json[i] as unknown[];
          const boxBarcode = String((row[boxBarcodeCol] ?? "")).trim();
          const rackCode = String((row[rackCodeCol] ?? "")).trim();
          if (boxBarcode || rackCode) {
            rows.push({
              boxBarcode,
              rackCode,
              rowIndex: i + 1,
            });
          }
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsBinaryString(file);
  });
}

/** Download template Excel with headers boxbarcode, rackcode */
function downloadTemplate() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["boxbarcode", "rackcode"],
    ["BOX-001", "LT-B7-02-S1-F1"],
    ["BOX-002", "LT-B7-02-S1-F2"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Bulk Allocate");
  XLSX.writeFile(wb, "yarn_storage_bulk_allocate_template.xlsx");
}

const BulkAllocateExcelImport: React.FC<BulkAllocateExcelImportProps> = ({ onComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BulkAllocateResult[] | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setResults(null);
    setParsedCount(null);
  };

  const processFile = async () => {
    if (!file) {
      toast.error("Please select an Excel file");
      return;
    }

    setIsProcessing(true);
    setResults(null);
    setParsedCount(null);

    try {
      const rows = await parseBulkAllocateExcel(file);
      const validRows = rows.filter(
        (r) => (r.boxBarcode || "").trim() && (r.rackCode || "").trim()
      );
      if (validRows.length === 0) {
        toast.error("No valid rows found. Ensure columns boxbarcode and rackcode have data.");
        setIsProcessing(false);
        return;
      }

      setParsedCount(validRows.length);

      // Group by rackCode (preserve first-seen order for assignmentIndex)
      const rackOrder: string[] = [];
      const rackToBoxes = new Map<string, Array<{ boxBarcode: string; rowIndex: number }>>();
      const rowIndexMap = new Map<string, number>(); // key: "rackBarcode\tboxBarcode" -> rowIndex

      for (const r of validRows) {
        const rackBarcode = r.rackCode.trim();
        const boxBarcode = r.boxBarcode.trim();
        const key = `${rackBarcode}\t${boxBarcode}`;
        if (!rackToBoxes.has(rackBarcode)) {
          rackOrder.push(rackBarcode);
          rackToBoxes.set(rackBarcode, []);
        }
        rackToBoxes.get(rackBarcode)!.push({ boxBarcode, rowIndex: r.rowIndex });
        if (!rowIndexMap.has(key)) rowIndexMap.set(key, r.rowIndex);
      }

      const assignments = rackOrder.map((rackBarcode) => ({
        rackBarcode,
        boxBarcodes: [...new Set(rackToBoxes.get(rackBarcode)!.map((x) => x.boxBarcode))],
      }));

      const response = await storageSlotService.bulkAssignBoxes({ assignments });
      const out: BulkAllocateResult[] = [];

      for (const u of response.updated) {
        const key = `${u.rackBarcode}\t${u.barcode}`;
        out.push({
          rowIndex: rowIndexMap.get(key) ?? 0,
          boxBarcode: u.barcode,
          rackCode: u.rackBarcode,
          success: true,
        });
      }

      for (let i = 0; i < response.failed.length; i++) {
        const f = response.failed[i];
        const assignmentIndex = f.assignmentIndex ?? i;
        const assign = assignments[assignmentIndex];
        const rackBarcode = f.rackBarcode ?? assign?.rackBarcode ?? "";
        const boxBarcodes = f.boxBarcodes ?? assign?.boxBarcodes ?? [];
        const reason = f.reason ?? "assignment_failed";
        if (boxBarcodes.length > 0) {
          for (const barcode of boxBarcodes) {
            const key = `${rackBarcode}\t${barcode}`;
            out.push({
              rowIndex: rowIndexMap.get(key) ?? 0,
              boxBarcode: barcode,
              rackCode: rackBarcode,
              success: false,
              error: reason,
            });
          }
        } else {
          out.push({
            rowIndex: 0,
            boxBarcode: assign ? "(no boxes)" : "-",
            rackCode: rackBarcode,
            success: false,
            error: reason,
          });
        }
      }

      setResults(out);
      if (response.failedCount === 0) {
        toast.success(response.message || `All ${response.updatedCount} box(es) allocated.`);
        onComplete?.();
      } else {
        toast.success(
          response.message ||
            `${response.updatedCount} allocated, ${response.failedCount} assignment(s) had issues.`,
          { duration: 5000 }
        );
        if (response.updatedCount > 0) onComplete?.();
      }
    } catch (err) {
      console.error("Bulk allocate Excel error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process Excel");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="box">
      <div className="box-header">
        <h3 className="box-title">
          <i className="ri-file-excel-2-line me-2 text-green-600"></i>
          Bulk Allocate (Excel)
        </h3>
      </div>
      <div className="box-body space-y-4">
        <p className="text-[11px] text-gray-600">
          Upload an Excel file with columns <strong>boxbarcode</strong> and{" "}
          <strong>rackcode</strong>. Each row will allocate that box to the given rack (same as
          scanning box barcode and entering rack code one by one).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTemplate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className="ri-download-line text-xs"></i>
            Download template
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50"
          >
            <i className="ri-file-excel-2-line text-green-600 text-xs"></i>
            {file ? file.name : "Choose file"}
          </button>
          <button
            type="button"
            onClick={processFile}
            disabled={!file || isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs"></i>
                Processing...
              </>
            ) : (
              <>
                <i className="ri-upload-2-line text-xs"></i>
                Upload &amp; Allocate
              </>
            )}
          </button>
        </div>

        {results && results.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-[11px] font-semibold text-gray-700">
              Results {parsedCount != null ? `(${results.filter((r) => r.success).length}/${parsedCount} succeeded)` : ""}
            </div>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Row</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Box Barcode</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Rack Code</th>
                    <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className={r.success ? "bg-green-50/50" : "bg-red-50/50"}>
                      <td className="px-2 py-1">{r.rowIndex}</td>
                      <td className="px-2 py-1 font-mono">{r.boxBarcode}</td>
                      <td className="px-2 py-1 font-mono">{r.rackCode}</td>
                      <td className="px-2 py-1">
                        {r.success ? (
                          <span className="text-green-700 font-medium">OK</span>
                        ) : (
                          <span className="text-red-700" title={r.error}>
                            {r.error || "Failed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkAllocateExcelImport;
