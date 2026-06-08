"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import { usePoReturnChallans } from '@/shared/hooks/usePoReturnChallans';
import poReturnChallanService, {
  PoReturnChallan,
  getDefaultChallanListEndDate,
  getDefaultChallanListStartDate,
} from '@/shared/services/poReturnChallanService';
import { downloadChallanHtml, printChallanDocument } from '@/shared/utils/poReturnChallanPrint';
import ChallanFilters from '@/shared/components/po-return-challan/ChallanFilters';
import ChallanTable from '@/shared/components/po-return-challan/ChallanTable';
import ChallanDetailDrawer from '@/shared/components/po-return-challan/ChallanDetailDrawer';
import { downloadPoReturnChallanListExcel } from './poReturnChallanExcelExport';

/**
 * PO Return Challan history — search, view, print, download, Excel export.
 */
export default function PoReturnChallanHistoryPage() {
  const { hasSubPermission, isLoading: navLoading } = useNavigation();
  const hasPermission = hasSubPermission(
    '/yarn-management/purchase-management',
    'PO Return Challan'
  );

  const challans = usePoReturnChallans({
    from: getDefaultChallanListStartDate(),
    to: getDefaultChallanListEndDate(),
  });
  const [active, setActive] = useState<PoReturnChallan | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  const handlePrint = async (row: PoReturnChallan) => {
    try {
      const full = await poReturnChallanService.getChallanById(row.id);
      await printChallanDocument(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to print challan');
    }
  };

  const handleDownload = async (row: PoReturnChallan) => {
    try {
      const full = await poReturnChallanService.getChallanById(row.id);
      await downloadChallanHtml(full);
      toast.success(`${full.challanNumber} downloaded — open and use Print → Save as PDF`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download challan');
    }
  };

  const handleView = async (row: PoReturnChallan) => {
    try {
      const full = await poReturnChallanService.getChallanById(row.id);
      setActive(full);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load challan');
    }
  };

  const handleExportExcel = async () => {
    if (challans.totalResults === 0) {
      toast.error('No rows to export for the current filters.');
      return;
    }
    setExportingExcel(true);
    try {
      const n = await downloadPoReturnChallanListExcel(
        challans.filters,
        `po-return-challans_${new Date().toISOString().slice(0, 10)}`
      );
      if (n === 0) toast.error('No rows to export.');
      else toast.success(`Downloaded ${n} row(s) to Excel.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Excel export failed');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <>
      <Seo title="PO Return Challan History" />
      <div className="main-content !p-[10px]">
        {navLoading ? (
          <div className="flex justify-center py-16" role="status" aria-label="Loading">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
          </div>
        ) : !hasPermission ? (
          <div className="box border border-gray-100">
            <div className="box-body text-center py-12">
              <p className="text-sm text-gray-600">You don&apos;t have permission to access PO Return Challan History.</p>
            </div>
          </div>
        ) : (
          <div className="box border border-gray-100">
            <div className="box-header border-b border-gray-100 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="box-title text-base mb-0">PO Return Challan History</h1>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Immutable return documents issued when vendor returns are finalized. Default: last 30 days.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href="/yarn-management/purchase-management/po-return"
                  className="text-[11px] font-bold text-purple-700 hover:underline"
                >
                  PO Return workflow
                </Link>
                <button
                  type="button"
                  onClick={() => void handleExportExcel()}
                  disabled={challans.isLoading || exportingExcel || challans.totalResults === 0}
                  className="inline-flex items-center gap-1 px-2 py-1.5 border border-gray-200 text-[11px] font-bold text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50"
                  aria-label="Download Excel for current filters"
                >
                  <i className={`ri-file-excel-2-line text-emerald-600 ${exportingExcel ? 'animate-pulse' : ''}`} aria-hidden />
                  {exportingExcel ? 'Exporting…' : 'Download Excel'}
                </button>
              </div>
            </div>
            <div className="box-body p-4">
              <ChallanFilters
                value={challans.filters}
                onChange={challans.setFilters}
                resultsCount={challans.totalResults}
              />
              <ChallanTable
                results={challans.results}
                isLoading={challans.isLoading}
                error={challans.error}
                page={challans.page}
                totalPages={challans.totalPages}
                totalResults={challans.totalResults}
                onPageChange={challans.setPage}
                onView={handleView}
                onPrint={handlePrint}
                onDownload={handleDownload}
              />
            </div>
          </div>
        )}
      </div>

      <ChallanDetailDrawer
        challan={active}
        onClose={() => setActive(null)}
        onUpdated={(updated) => {
          setActive(updated);
          void challans.refresh();
        }}
      />
    </>
  );
}
