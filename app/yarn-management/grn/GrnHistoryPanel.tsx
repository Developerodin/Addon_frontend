"use client";
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useGrns } from '@/shared/hooks/useGrns';
import { downloadGrnHtml, printGrnDocument } from '@/shared/utils/grnPrint';
import yarnGrnService, { YarnGrn } from '@/shared/services/yarnGrnService';
import GrnFilters from '@/shared/components/grn/GrnFilters';
import GrnTable from '@/shared/components/grn/GrnTable';
import GrnDetailDrawer from '@/shared/components/grn/GrnDetailDrawer';
import { downloadGrnListExcel } from './grnExcelExport';

/**
 * GRN History tab: search, reprint, and Excel-export issued GRNs.
 */
export default function GrnHistoryPanel() {
  const grns = useGrns();
  const [active, setActive] = useState<YarnGrn | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  /**
   * Re-fetch then print so list projections never starve the template.
   * @param grn - list-row GRN
   */
  const handlePrint = async (grn: YarnGrn) => {
    try {
      const full = await yarnGrnService.getGrnById(grn.id);
      await printGrnDocument(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print GRN';
      toast.error(message);
    }
  };

  /**
   * Download the printable HTML for a GRN.
   * @param grn - list-row GRN
   */
  const handleDownload = async (grn: YarnGrn) => {
    try {
      const full = await yarnGrnService.getGrnById(grn.id);
      await downloadGrnHtml(full);
      toast.success(`${grn.grnNumber} downloaded — open and use Print → Save as PDF`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download GRN';
      toast.error(message);
    }
  };

  /**
   * Open the detail drawer with a full GRN snapshot.
   * @param grn - list-row GRN
   */
  const handleView = async (grn: YarnGrn) => {
    try {
      const full = await yarnGrnService.getGrnById(grn.id);
      setActive(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GRN';
      toast.error(message);
    }
  };

  /**
   * Export every GRN matching the current filters to Excel.
   */
  const handleExportExcel = async () => {
    if (grns.totalResults === 0) {
      toast.error('No rows to export for the current filters.');
      return;
    }
    setExportingExcel(true);
    try {
      const count = await downloadGrnListExcel(
        grns.filters,
        `yarn-grns_${new Date().toISOString().slice(0, 10)}`
      );
      if (count === 0) toast.error('No rows to export.');
      else toast.success(`Downloaded ${count} GRN(s) to Excel.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Excel export failed';
      toast.error(message);
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-[11px] text-gray-500 font-bold">
          Reprint any past Goods Receipt Note — by GRN no, lot no, PO, supplier or date.
        </p>
        <button
          type="button"
          onClick={() => void handleExportExcel()}
          disabled={grns.isLoading || exportingExcel || grns.totalResults === 0}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-colors"
          aria-label="Download GRN list as Excel for current filters"
        >
          <i
            className={`ri-file-excel-2-line text-white ${exportingExcel ? 'animate-pulse' : ''}`}
            aria-hidden
          />
          {exportingExcel ? 'Exporting…' : 'Download Excel'}
        </button>
      </header>

      <GrnFilters
        value={grns.filters}
        onChange={grns.setFilters}
        resultsCount={grns.totalResults}
      />

      <GrnTable
        results={grns.results}
        isLoading={grns.isLoading}
        error={grns.error}
        page={grns.page}
        totalPages={grns.totalPages}
        totalResults={grns.totalResults}
        onPageChange={grns.setPage}
        onView={handleView}
        onPrint={handlePrint}
        onDownload={handleDownload}
      />

      <GrnDetailDrawer
        grn={active}
        onClose={() => setActive(null)}
        onUpdated={(updated) => {
          setActive(updated);
          void grns.refresh();
        }}
      />
    </>
  );
}
