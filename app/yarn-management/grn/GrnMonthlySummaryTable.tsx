"use client";
import React from 'react';
import type {
  YarnGrnMonthlySummaryRow,
  YarnGrnMonthlySummaryTotals,
} from '@/shared/services/yarnGrnService';

interface GrnMonthlySummaryTableProps {
  results: YarnGrnMonthlySummaryRow[];
  totals: YarnGrnMonthlySummaryTotals;
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  onView: (grnId: string) => void;
}

/**
 * @param value - date-ish input
 * @returns DD-MM-YYYY or em dash
 */
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
 * @param n - numeric value
 * @param digits - fraction digits
 */
const fmtINR = (n: number, digits = 2) =>
  Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * Renders a GRN-level cell that is blank on follow-on yarn lines.
 * @param value - number or null
 * @param asCurrency - prefix rupee when true
 */
const headerNum = (value: number | null, asCurrency = false): string => {
  if (value === null || value === undefined) return '';
  return asCurrency ? `₹ ${fmtINR(value)}` : fmtINR(value, 0);
};

const thClass =
  'px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200';
const thRight = `${thClass} text-right`;
const tdClass = 'px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700';
const tdRight = `${tdClass} text-right`;
const footClass =
  'px-3 py-2 border-t-2 border-gray-200 text-[11px] font-bold text-gray-800 bg-gray-50';

/**
 * Yarn-line monthly register table. Footer uses month-true unique-GRN totals.
 */
const GrnMonthlySummaryTable: React.FC<GrnMonthlySummaryTableProps> = ({
  results,
  totals,
  isLoading,
  error,
  page,
  totalPages,
  totalResults,
  onPageChange,
  onView,
}) => {
  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div
              className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"
              aria-hidden
            />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">
              Loading summary
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" role="alert">
            <i className="ri-error-warning-line text-2xl text-red-400 mb-3" aria-hidden />
            <h3 className="text-xs font-bold text-red-500 mb-1">{error}</h3>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <i className="ri-inbox-line text-xl text-gray-200" aria-hidden />
            </div>
            <h3 className="text-xs font-bold text-gray-400 mb-1">NO GRNS THIS MONTH</h3>
          </div>
        ) : (
          <table className="w-full border-collapse" aria-label="Yarn GRN monthly summary">
            <thead>
              <tr className="bg-gray-50/30">
                <th scope="col" className={thClass}>GRN No</th>
                <th scope="col" className={thClass}>GRN Date</th>
                <th scope="col" className={thClass}>PO Number</th>
                <th scope="col" className={thClass}>Supplier</th>
                <th scope="col" className={thRight}>No of Box</th>
                <th scope="col" className={thClass}>Yarn Name</th>
                <th scope="col" className={thClass}>Shade Code</th>
                <th scope="col" className={thRight}>Qty</th>
                <th scope="col" className={thRight}>Rate</th>
                <th scope="col" className={thRight}>Amount</th>
                <th scope="col" className={thRight}>GST</th>
                <th scope="col" className={thRight}>Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr
                  key={`${row.grnId}-${idx}`}
                  className="hover:bg-purple-50/40 transition-colors"
                >
                  <td className={tdClass}>
                    <button
                      type="button"
                      onClick={() => onView(row.grnId)}
                      className="text-[12px] font-bold text-purple-700 hover:underline"
                      aria-label={`View ${row.grnNumber}`}
                    >
                      {row.grnNumber}
                    </button>
                  </td>
                  <td className={tdClass}>{fmtDate(row.grnDate)}</td>
                  <td className={`${tdClass} font-bold`}>{row.poNumber || '—'}</td>
                  <td className={tdClass}>{row.supplier || '—'}</td>
                  <td className={tdRight}>{headerNum(row.numberOfBoxes)}</td>
                  <td className={tdClass}>{row.yarnName || '—'}</td>
                  <td className={tdClass}>{row.shadeCode || '—'}</td>
                  <td className={tdRight}>{fmtINR(row.qty)}</td>
                  <td className={tdRight}>{fmtINR(row.rate)}</td>
                  <td className={tdRight}>{fmtINR(row.amount)}</td>
                  <td className={tdRight}>{headerNum(row.gst, true)}</td>
                  <td className={tdRight}>{headerNum(row.grandTotal, true)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={footClass} colSpan={4}>
                  {totals.grnCount} GRN(s) · {totals.lineCount} line(s)
                </td>
                <td className={`${footClass} text-right`}>{fmtINR(totals.boxes, 0)}</td>
                <td className={footClass} colSpan={2} />
                <td className={`${footClass} text-right`}>{fmtINR(totals.qty)}</td>
                <td className={footClass} />
                <td className={`${footClass} text-right`}>₹ {fmtINR(totals.amount)}</td>
                <td className={`${footClass} text-right`}>₹ {fmtINR(totals.gst)}</td>
                <td className={`${footClass} text-right`}>₹ {fmtINR(totals.grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 font-bold">
            Page {page} of {totalPages} · {totalResults} line(s)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
              className="px-2.5 py-1 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <i className="ri-arrow-left-s-line" aria-hidden /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
              className="px-2.5 py-1 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next <i className="ri-arrow-right-s-line" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GrnMonthlySummaryTable;
