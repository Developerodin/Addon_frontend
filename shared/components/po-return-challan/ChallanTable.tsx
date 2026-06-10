"use client";
import React from 'react';
import type { PoReturnChallan } from '@/shared/services/poReturnChallanService';

interface ChallanTableProps {
  results: PoReturnChallan[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  onView: (challan: PoReturnChallan) => void;
  onPrint: (challan: PoReturnChallan) => void;
  onDownload: (challan: PoReturnChallan) => void;
}

const fmtDate = (value?: string | Date | null): string => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Formats challan net/gross weight (kg) to four decimal places.
 */
const fmtKg = (value?: number | null): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(4);
};

/**
 * Tabular results for PO return challan history.
 */
const ChallanTable: React.FC<ChallanTableProps> = ({
  results,
  isLoading,
  error,
  page,
  totalPages,
  totalResults,
  onPageChange,
  onView,
  onPrint,
  onDownload,
}) => {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" aria-hidden />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading challans</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
            <i className="ri-error-warning-line text-2xl text-red-400 mb-3" aria-hidden />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <i className="ri-file-list-3-line text-3xl text-gray-300 mb-3" aria-hidden />
            <p className="text-sm text-gray-500">No return challans match the current filters.</p>
          </div>
        ) : (
          <table className="min-w-full text-[11px]" aria-label="PO return challan history">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-600">
                <th className="text-left px-3 py-2 font-bold">Challan No</th>
                <th className="text-left px-3 py-2 font-bold">Date</th>
                <th className="text-left px-3 py-2 font-bold">PO No</th>
                <th className="text-left px-3 py-2 font-bold">Vendor</th>
                <th className="text-right px-3 py-2 font-bold">Boxes</th>
                <th className="text-right px-3 py-2 font-bold">Cones</th>
                <th className="text-right px-3 py-2 font-bold">Net (kg)</th>
                <th className="text-left px-3 py-2 font-bold">Intent</th>
                <th className="text-right px-3 py-2 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">{row.challanNumber}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(row.challanDate)}</td>
                  <td className="px-3 py-2 font-mono text-gray-800">{row.poNumber}</td>
                  <td
                    className="px-3 py-2 text-gray-800 max-w-[180px] truncate"
                    title={row.consignee?.name ?? row.supplier?.name}
                  >
                    {row.consignee?.name ?? row.supplier?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.totals?.boxCount ??
                      row.lines?.filter((l) => l.lineType === 'box').length ??
                      '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.totals?.coneCount ??
                      row.lines?.filter((l) => l.lineType !== 'box').length ??
                      row.lines?.length ??
                      '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-blue-700">
                    {fmtKg(row.totals?.totalNetWeight)}
                  </td>
                  <td className="px-3 py-2 text-gray-700">{row.cancellationIntent || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onView(row)}
                        className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
                        aria-label={`View ${row.challanNumber}`}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrint(row)}
                        className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
                        aria-label={`Print ${row.challanNumber}`}
                      >
                        Print
                      </button>
                      <button
                        type="button"
                        onClick={() => onDownload(row)}
                        className="px-2 py-1 text-[10px] font-bold border border-gray-200 rounded hover:bg-gray-50"
                        aria-label={`Download ${row.challanNumber}`}
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && !error && totalPages > 0 && (
        <nav
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-gray-100 text-[11px]"
          aria-label="Challan pagination"
        >
          <p className="text-gray-600 tabular-nums">
            Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
            <span className="text-gray-400"> · {totalResults} total</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-2 py-1 border border-gray-200 rounded font-bold disabled:opacity-40"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-2 py-1 border border-gray-200 rounded font-bold disabled:opacity-40"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default ChallanTable;
