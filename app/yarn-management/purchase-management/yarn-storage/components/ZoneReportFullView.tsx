"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  BoxWithRack,
  ConeWithRack,
  REPORT_PAGE_SIZE_OPTIONS,
  filterReportBoxes,
  filterReportCones,
  getReportTotalPages,
  paginateReportRows,
} from "./zoneReportSearch";
import {
  selectChevronBgStyle,
  storageBtnSecondaryClass,
  storageCompactSelectClass,
  storageIconBtnClass,
  storageInputClass,
  storagePaginationBarClass,
} from "./storageUiClasses";
import {
  formatWeightKgCell,
  resolveBoxGrossWeightKg,
  resolveBoxNetWeightKg,
  resolveConeNetWeightKg,
} from "../utils/boxWeightDisplay";

type ReportTab = "boxes" | "cones";

/**
 * Formats cone status values for display (e.g. not_issued → not issued).
 */
const formatConeStatus = (value?: string): string =>
  value ? value.replace(/_/g, " ") : "-";

interface ZoneReportFullViewProps {
  isLongTerm: boolean;
  boxes: BoxWithRack[];
  cones: ConeWithRack[];
  onBack: () => void;
}

/**
 * Full report table with search and pagination for zone report drawer.
 */
const ZoneReportFullView: React.FC<ZoneReportFullViewProps> = ({
  isLongTerm,
  boxes,
  cones,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [activeTab, setActiveTab] = useState<ReportTab>("boxes");

  const showConesTab = !isLongTerm && cones.length > 0;
  const showBoxesTab = boxes.length > 0;
  const effectiveTab: ReportTab =
    showConesTab && !showBoxesTab ? "cones" : activeTab;

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize, effectiveTab]);

  const filteredBoxes = useMemo(
    () => filterReportBoxes(boxes, searchQuery),
    [boxes, searchQuery]
  );
  const filteredCones = useMemo(
    () => filterReportCones(cones, searchQuery),
    [cones, searchQuery]
  );

  const activeRows = effectiveTab === "boxes" ? filteredBoxes : filteredCones;
  const totalPages = getReportTotalPages(activeRows.length, pageSize);
  const displayPage = Math.min(page, totalPages);
  const paginatedBoxes = paginateReportRows(filteredBoxes, displayPage, pageSize);
  const paginatedCones = paginateReportRows(filteredCones, displayPage, pageSize);

  const emptyMessage =
    searchQuery.trim().length > 0
      ? `No results for "${searchQuery.trim()}"`
      : effectiveTab === "boxes"
        ? "No boxes in this zone."
        : "No cones in this zone.";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
      >
        <i className="ri-arrow-left-line" aria-hidden /> Back
      </button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="zone-report-search"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500"
          >
            Search report
          </label>
          <div className="flex items-center gap-2">
            <input
              id="zone-report-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Box ID, PO, yarn, rack…"
              className={`${storageInputClass} min-w-0 flex-1`}
              aria-label="Search report rows"
            />
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className={storageIconBtnClass}
                title="Clear search"
                aria-label="Clear report search"
              >
                <i className="ri-close-line text-base" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>

        {showConesTab && showBoxesTab ? (
          <div
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
            role="tablist"
            aria-label="Report data type"
          >
            <button
              type="button"
              role="tab"
              aria-selected={effectiveTab === "boxes"}
              onClick={() => setActiveTab("boxes")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                effectiveTab === "boxes"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Boxes ({filteredBoxes.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={effectiveTab === "cones"}
              onClick={() => setActiveTab("cones")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                effectiveTab === "cones"
                  ? "bg-white text-purple-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Cones ({filteredCones.length})
            </button>
          </div>
        ) : null}
      </div>

      {activeRows.length > 0 ? (
        <div className={storagePaginationBarClass}>
          <span className="text-sm text-gray-700">
            Showing {(displayPage - 1) * pageSize + 1}–
            {Math.min(displayPage * pageSize, activeRows.length)} of{" "}
            {activeRows.length.toLocaleString()}
            {searchQuery.trim() ? (
              <span className="text-gray-500"> (filtered)</span>
            ) : null}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="zone-report-page-size"
                className="text-xs font-medium text-gray-600"
              >
                Per page
              </label>
              <select
                id="zone-report-page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className={storageCompactSelectClass}
                style={selectChevronBgStyle}
              >
                {REPORT_PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={displayPage <= 1}
                className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                aria-label="Previous report page"
              >
                <i className="ri-arrow-left-s-line text-base" aria-hidden />
              </button>
              <span className="min-w-[6.5rem] text-center text-sm text-gray-700">
                {displayPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={displayPage >= totalPages}
                className={`${storageBtnSecondaryClass} px-2 disabled:pointer-events-none disabled:opacity-40`}
                aria-label="Next report page"
              >
                <i className="ri-arrow-right-s-line text-base" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {activeRows.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">{emptyMessage}</p>
        ) : effectiveTab === "boxes" ? (
          <div className="max-h-[calc(100vh-18rem)] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgb(229,231,235)]">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Box ID
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    PO
                  </th>
                  <th className="min-w-[12rem] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Yarn
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                    {isLongTerm ? "Gross (kg)" : "Weight (kg)"}
                  </th>
                  {isLongTerm ? (
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                      Net (kg)
                    </th>
                  ) : null}
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Rack
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBoxes.map((b) => {
                  const gross = resolveBoxGrossWeightKg(b);
                  const net = resolveBoxNetWeightKg(b);
                  return (
                    <tr key={b._id ?? b.boxId ?? b.barcode} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-900">
                        {b.boxId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-primary">
                        {b.poNumber ?? "-"}
                      </td>
                      <td className="max-w-[16rem] px-3 py-2 text-gray-800" title={b.yarnName}>
                        <span className="line-clamp-2 break-words">{b.yarnName ?? "-"}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                        {formatWeightKgCell(gross, 2)}
                      </td>
                      {isLongTerm ? (
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                          {formatWeightKgCell(net, 2)}
                        </td>
                      ) : null}
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-700">
                        {b.rackCode ?? b.storageLocation ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-18rem)] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 shadow-[0_1px_0_0_rgb(229,231,235)]">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Cone Barcode
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    PO
                  </th>
                  <th className="min-w-[12rem] px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Yarn
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Issue Status
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Return Status
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                    Gross (kg)
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                    Tear (kg)
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide text-gray-600">
                    Net (kg)
                  </th>
                  <th className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-gray-600">
                    Rack
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedCones.map((c) => {
                  const gross = c.coneWeight ?? 0;
                  const tear = c.tearWeight ?? 0;
                  return (
                    <tr key={c._id ?? c.barcode} className="hover:bg-gray-50/80">
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-900">
                        {c.barcode}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-primary">
                        {c.poNumber ?? "-"}
                      </td>
                      <td className="max-w-[16rem] px-3 py-2 text-gray-800" title={c.yarnName}>
                        <span className="line-clamp-2 break-words">{c.yarnName ?? "-"}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 capitalize text-gray-700">
                        {formatConeStatus(c.issueStatus)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 capitalize text-gray-700">
                        {formatConeStatus(c.returnStatus)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                        {gross.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                        {tear.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">
                        {(gross - tear).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-700">
                        {c.rackCode ?? c.coneStorageId ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZoneReportFullView;
