"use client";

import React from "react";
import type { YarnReportRow, YarnReportResponse } from "../../services/yarnInventoryService";
import { YARN_REPORT_COLUMNS } from "../yarnReportConstants";
import PaginationControls from "../../components/PaginationControls";

export interface YarnReportDataTableProps {
  report: YarnReportResponse | null;
  paginatedRows: YarnReportRow[];
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalResults: number;
  loading: boolean;
  onPageChange: (p: number) => void;
}

/**
 * Read-only yarn snapshot report grid with client-side pagination.
 */
export function YarnReportDataTable({
  report,
  paginatedRows,
  currentPage,
  pageSize,
  totalPages,
  totalResults,
  loading,
  onPageChange,
}: YarnReportDataTableProps) {
  return (
    <>
      <div className="overflow-x-auto">
        {report ? (
          report.results?.length > 0 ? (
            <table className="min-w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                {YARN_REPORT_COLUMNS.map((col) => {
                  const k = col.key as keyof YarnReportRow;
                  return (
                    <th
                      key={String(k)}
                      className="px-2 py-2 text-left font-bold text-gray-700 whitespace-nowrap border-r border-gray-200 last:border-r-0"
                    >
                      {col.label}
                    </th>
                  );
                })}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, idx) => (
                  <tr
                    key={(currentPage - 1) * pageSize + idx}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    {YARN_REPORT_COLUMNS.map((col) => {
                      const k = col.key as keyof YarnReportRow;
                      const cell = row[k];
                      return (
                        <td
                          key={String(k)}
                          className="px-2 py-1.5 text-gray-800 border-r border-gray-100 last:border-r-0"
                        >
                          {typeof cell === "number"
                            ? cell.toLocaleString()
                            : String(cell ?? "")}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <i className="ri-file-list-line text-4xl text-gray-300 mb-3" />
              <p className="text-xs text-gray-500">No data for selected date range</p>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <i className="ri-file-chart-line text-4xl text-gray-300 mb-3" />
            <p className="text-xs text-gray-500">
              Select date range and click Submit to view report
            </p>
          </div>
        )}
      </div>

      {report && report.results && report.results.length > 0 && (
        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalResults={totalResults}
            pageSize={pageSize}
            loading={loading}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </>
  );
}
