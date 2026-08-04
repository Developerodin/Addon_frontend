"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import vendorM2M3M4ManagementService, {
  formatVendorQcFloor,
  type VendorM2EntryRow,
  type VendorM2SourceFloorKey,
} from "@/shared/services/vendorM2M3M4ManagementService";
import ArticleProductImageButton from "@/shared/components/production/ArticleProductImageButton";
import DownloadExcelButton from "@/shared/components/production/DownloadExcelButton";
import {
  collectFactoryCodesFromProductFactoryCodes,
  useArticleProductImages,
} from "@/shared/hooks/useArticleProductImages";
import { getVendorRowProductFactoryCode } from "@/app/vendor-po/utils/getVendorProductFactoryCode";
import { datedExportFilename, downloadCsv, formatTimestampForCsv } from "@/shared/utils/csvExport";
import { fetchAllPaginatedResults } from "@/shared/utils/fetchAllPaginated";
import VendorM2FilterBar, { type VendorM2FloorFilter } from "./VendorM2FilterBar";
import M2Pagination from "@/app/production/m2-management/components/M2Pagination";

export interface EntriesTabProps {
  refreshKey: number;
  onResolve: (entry: VendorM2EntryRow, action: "merge" | "m3" | "m4") => void;
}

const PAGE_LIMIT = 25;

/**
 * Paginated open vendor M2 entries with VPO/reference search and floor filter.
 */
export default function EntriesTab({ refreshKey, onResolve }: EntriesTabProps) {
  const [entries, setEntries] = useState<VendorM2EntryRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFloor, setSourceFloor] = useState<VendorM2FloorFilter>("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await vendorM2M3M4ManagementService.getM2Entries({
          page,
          limit: PAGE_LIMIT,
          search: debouncedSearch || undefined,
          sourceFloor: (sourceFloor || undefined) as VendorM2SourceFloorKey | undefined,
        });
        if (cancelled) return;
        setEntries(res.results ?? []);
        setTotalPages(res.totalPages ?? 1);
        setTotalResults(res.totalResults ?? 0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, sourceFloor, refreshKey]);

  const factoryCodes = useMemo(
    () => collectFactoryCodesFromProductFactoryCodes(entries),
    [entries],
  );
  const { openProductImage, productImageModal } = useArticleProductImages(factoryCodes);

  /** Export all filtered vendor M2 entries as CSV. */
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const rows = await fetchAllPaginatedResults<VendorM2EntryRow>((pageNum, limit) =>
        vendorM2M3M4ManagementService.getM2Entries({
          page: pageNum,
          limit,
          search: debouncedSearch || undefined,
          sourceFloor: (sourceFloor || undefined) as VendorM2SourceFloorKey | undefined,
        })
      );

      if (rows.length === 0) {
        toast.error("No M2 entries to export");
        return;
      }

      const header = [
        "VPO",
        "Reference",
        "Factory Code",
        "Vendor Code",
        "Floor",
        "Original Qty",
        "Remaining Qty",
        "Status",
        "Marked By",
        "When",
        "Entry ID",
      ];
      const lines = rows.map((row) => [
        row.vpoNumber || "",
        row.referenceCode || "",
        getVendorRowProductFactoryCode(row),
        row.productVendorCode || "",
        formatVendorQcFloor(row.sourceFloor),
        row.originalQuantity ?? row.quantity,
        row.remainingQuantity ?? row.quantity,
        row.status ?? "OPEN",
        row.userEmail || row.userName || row.userId || "",
        formatTimestampForCsv(row.timestamp),
        row.entryId || row.id || "",
      ]);

      downloadCsv(datedExportFilename("vendor-m2-open-entries"), [header, ...lines]);
      toast.success(`Exported ${rows.length} M2 ${rows.length === 1 ? "entry" : "entries"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export M2 entries");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <div className="flex-1 min-w-[240px]">
          <VendorM2FilterBar
            search={search}
            onSearchChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            sourceFloor={sourceFloor}
            onSourceFloorChange={(v) => {
              setSourceFloor(v);
              setPage(1);
            }}
          />
        </div>
        <DownloadExcelButton
          onClick={() => void handleExportExcel()}
          isExporting={isExporting}
          disabled={!isLoading && entries.length === 0}
          ariaLabel="Export filtered vendor M2 open entries to Excel"
          className="mb-3 shrink-0"
        />
      </div>

      <div className="overflow-x-auto border-2 border-gray-200 rounded">
        <table className="w-full text-[11px] min-w-[900px]">
          <thead className="bg-yellow-50 border-b-2 border-yellow-200">
            <tr>
              <th className="text-left p-2 font-bold">VPO</th>
              <th className="text-left p-2 font-bold">Reference</th>
              <th className="text-left p-2 font-bold">Vendor Code</th>
              <th className="text-left p-2 font-bold">Floor</th>
              <th className="text-right p-2 font-bold">Orig</th>
              <th className="text-right p-2 font-bold">Remaining</th>
              <th className="text-left p-2 font-bold">Status</th>
              <th className="text-left p-2 font-bold">Marked by</th>
              <th className="text-left p-2 font-bold">When</th>
              <th className="text-left p-2 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  Loading M2 entries…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-6 text-center text-gray-500">
                  No open M2 entries match your filters.
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-2">{row.vpoNumber || "—"}</td>
                  <td className="p-2">
                    <div className="font-medium">{row.referenceCode || "—"}</div>
                    {getVendorRowProductFactoryCode(row) ? (
                      <div className="text-[10px] font-semibold text-purple-700">
                        {getVendorRowProductFactoryCode(row)}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2">{row.productVendorCode || "—"}</td>
                  <td className="p-2">{formatVendorQcFloor(row.sourceFloor)}</td>
                  <td className="p-2 text-right">{row.originalQuantity ?? row.quantity}</td>
                  <td className="p-2 text-right font-bold text-yellow-800">
                    {row.remainingQuantity ?? row.quantity}
                  </td>
                  <td className="p-2">
                    <span className="px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-900 font-bold">
                      {row.status ?? "OPEN"}
                    </span>
                  </td>
                  <td className="p-2 text-[10px]">{row.userEmail || row.userName || row.userId}</td>
                  <td className="p-2 text-[10px]">
                    {row.timestamp ? new Date(row.timestamp).toLocaleString() : "—"}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1 items-center">
                      <ArticleProductImageButton
                        factoryCode={getVendorRowProductFactoryCode(row)}
                        onClick={openProductImage}
                      />
                      {row.canMergeToM1 !== false ? (
                        <button
                          type="button"
                          className="px-2 py-0.5 text-[10px] font-bold bg-green-100 border border-green-400 rounded hover:bg-green-200"
                          onClick={() => onResolve(row, "merge")}
                        >
                          Merge M1
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 border border-gray-300 rounded text-gray-500 cursor-not-allowed"
                          title={
                            row.mergeBlockedReason ||
                            "Merge available only after flow reaches dispatch"
                          }
                          aria-label={row.mergeBlockedReason || "Merge M1 blocked until dispatch"}
                        >
                          Merge M1
                        </button>
                      )}
                      <button
                        type="button"
                        className="px-2 py-0.5 text-[10px] font-bold bg-orange-100 border border-orange-400 rounded hover:bg-orange-200"
                        onClick={() => onResolve(row, "m3")}
                      >
                        → M3
                      </button>
                      <button
                        type="button"
                        className="px-2 py-0.5 text-[10px] font-bold bg-red-100 border border-red-400 rounded hover:bg-red-200"
                        onClick={() => onResolve(row, "m4")}
                      >
                        → M4
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <M2Pagination
        page={page}
        totalPages={totalPages}
        totalResults={totalResults}
        onPageChange={setPage}
      />
      {productImageModal}
    </div>
  );
}
