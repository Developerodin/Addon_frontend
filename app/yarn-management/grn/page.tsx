"use client";
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { useGrns } from '@/shared/hooks/useGrns';
import { downloadGrnHtml, printGrnDocument } from '@/shared/utils/grnPrint';
import yarnGrnService, { YarnGrn } from '@/shared/services/yarnGrnService';
import GrnFilters from '@/shared/components/grn/GrnFilters';
import GrnTable from '@/shared/components/grn/GrnTable';
import GrnDetailDrawer from '@/shared/components/grn/GrnDetailDrawer';

/**
 * Yarn GRN History page.
 *
 * Lets users search every GRN ever issued by GRN no, PO no, lot no,
 * supplier, or date range, then preview / print / download any of them.
 * Each row's Print and Download actions hit the snapshot stored on the GRN
 * so historical reprints look identical to the day the GRN was issued.
 */
export default function YarnGrnHistoryPage() {
  const { hasSubPermission, isLoading: navLoading } = useNavigation();
  const hasPermission = hasSubPermission(
    '/yarn-management/purchase-management',
    'GRN History'
  );
  const grns = useGrns();
  const [active, setActive] = useState<YarnGrn | null>(null);

  const handlePrint = async (grn: YarnGrn) => {
    try {
      // For list-table actions we re-fetch the full doc by id so we always
      // print the freshest snapshot — the list endpoint may return a slim
      // projection in the future without breaking the print code path.
      const full = await yarnGrnService.getGrnById(grn.id);
      await printGrnDocument(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to print GRN';
      toast.error(message);
    }
  };

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

  const handleView = async (grn: YarnGrn) => {
    try {
      const full = await yarnGrnService.getGrnById(grn.id);
      setActive(full);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load GRN';
      toast.error(message);
    }
  };

  return (
    <>
      <Seo title="Yarn GRN History" />
      <div className="main-content !p-[10px]">
        {navLoading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : !hasPermission ? (
          <div className="box border border-gray-100">
            <div className="box-body text-center py-12">
              <p className="text-sm text-gray-600">
                You don&apos;t have permission to access GRN History.
              </p>
            </div>
          </div>
        ) : (
          <>
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">Yarn GRN History</h1>
          </div>
          <p className="text-[11px] text-gray-500 font-bold">
            Reprint any past Goods Receipt Note — by GRN no, lot no, PO, supplier or date.
          </p>
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
            // Keep the open drawer in sync and refresh the list so the row
            // shows the new vendor invoice / discrepancy values immediately.
            setActive(updated);
            void grns.refresh();
          }}
        />
          </>
        )}
      </div>
    </>
  );
}
