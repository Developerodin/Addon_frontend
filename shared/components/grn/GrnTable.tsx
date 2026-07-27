"use client";
import React from 'react';
import type { YarnGrn } from '@/shared/services/yarnGrnService';

interface GrnTableProps {
  results: YarnGrn[];
  isLoading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
  onView: (grn: YarnGrn) => void;
  onPrint: (grn: YarnGrn) => void;
  onDownload: (grn: YarnGrn) => void;
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

const fmtINR = (n: number, digits = 2) =>
  Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * Sum net weight (kg) across all lots on a GRN.
 */
const sumNetWeight = (lots: YarnGrn['lots'] = []): number =>
  lots.reduce((sum, lot) => sum + (Number(lot.netWeight) || 0), 0);

const StatusBadge: React.FC<{ grn: YarnGrn }> = ({ grn }) => {
  if (grn.status === 'superseded') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 uppercase">
        Superseded
      </span>
    );
  }
  if (grn.status === 'voided') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700 uppercase">
        Voided
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700 uppercase">
      Active
    </span>
  );
};

const RevisionBadge: React.FC<{ grn: YarnGrn }> = ({ grn }) =>
  grn.revisionNo > 0 ? (
    <span
      className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-700"
      title={`Revision ${grn.revisionNo} of ${grn.baseGrnNumber}`}
    >
      R{grn.revisionNo}
    </span>
  ) : null;

const LegacyBadge: React.FC<{ grn: YarnGrn }> = ({ grn }) =>
  grn.isLegacy ? (
    <span
      className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-700"
      title="Backfilled from existing PO data"
    >
      Legacy
    </span>
  ) : null;

/**
 * Tabular results renderer for the GRN history page. Pure presentational —
 * all data fetching/state lives in useGrns. Loading, error, and empty states
 * are handled inline so the parent page stays declarative.
 */
const GrnTable: React.FC<GrnTableProps> = ({
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
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading GRNs</p>
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
            <h3 className="text-xs font-bold text-gray-400 mb-1">NO GRN MATCHES</h3>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50/30">
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">GRN No</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">GRN Date</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">PO No</th>
                <th scope="col" className="px-3 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Supplier</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Lots</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Boxes</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Net Wt (kg)</th>
                <th scope="col" className="px-3 py-3 text-right text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Grand Total</th>
                <th scope="col" className="px-3 py-3 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Status</th>
                <th scope="col" className="px-3 py-3 text-center text-[11px] font-bold text-[#495057] uppercase tracking-wider border-b border-gray-200">Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((grn) => {
                const totalBoxes = (grn.lots || []).reduce((s, l) => s + (l.numberOfBoxes || 0), 0);
                const totalNetWeight = sumNetWeight(grn.lots);
                return (
                  <tr key={grn.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="px-3 py-2 border-b border-gray-100">
                      <button
                        type="button"
                        onClick={() => onView(grn)}
                        className="text-[12px] font-bold text-purple-700 hover:underline"
                        aria-label={`View ${grn.grnNumber}`}
                      >
                        {grn.grnNumber}
                      </button>
                      <RevisionBadge grn={grn} />
                      <LegacyBadge grn={grn} />
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700">{fmtDate(grn.grnDate)}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700 font-bold">{grn.poNumber}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700">{grn.supplier?.name || '—'}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700 text-right">{(grn.lots || []).length}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700 text-right">{totalBoxes}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700 text-right">{fmtINR(totalNetWeight)}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-[11px] text-gray-700 text-right">₹ {fmtINR(grn.totals?.grandTotal || 0)}</td>
                    <td className="px-3 py-2 border-b border-gray-100 text-center">
                      <StatusBadge grn={grn} />
                    </td>
                    <td className="px-3 py-2 border-b border-gray-100">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onView(grn)}
                          className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                          title="View details"
                          aria-label={`View ${grn.grnNumber} details`}
                        >
                          <i className="ri-eye-line" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(grn)}
                          className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                          title="Print"
                          aria-label={`Print ${grn.grnNumber}`}
                        >
                          <i className="ri-printer-line" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDownload(grn)}
                          className="px-2 py-1 text-[10px] font-bold text-gray-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Save as PDF (uses browser print dialog)"
                          aria-label={`Download ${grn.grnNumber} as PDF`}
                        >
                          <i className="ri-file-download-line" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-[11px] text-gray-500 font-bold">
            Page {page} of {totalPages} · {totalResults} GRN(s)
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

export default GrnTable;
