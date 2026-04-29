"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Seo from '@/shared/layout-components/seo/seo';
import yarnGrnService, { YarnGrn } from '@/shared/services/yarnGrnService';
import { downloadGrnHtml, printGrnDocument } from '@/shared/utils/grnPrint';
import GrnDetailDrawer from '@/shared/components/grn/GrnDetailDrawer';

/**
 * Deep-linkable, full-page view of one GRN. The drawer component is reused
 * inline as the body so the page stays small and we don't duplicate UI.
 */
export default function YarnGrnDetailPage() {
  const params = useParams<{ grnId: string }>();
  const grnId = params?.grnId;
  const router = useRouter();
  const [grn, setGrn] = useState<YarnGrn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!grnId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    yarnGrnService
      .getGrnById(grnId)
      .then((res) => { if (!cancelled) setGrn(res); })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load GRN';
        setError(message);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [grnId]);

  const handlePrint = async () => {
    if (!grn) return;
    try {
      await printGrnDocument(grn);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Print failed');
    }
  };

  const handleDownload = async () => {
    if (!grn) return;
    try {
      await downloadGrnHtml(grn);
      toast.success(`${grn.grnNumber} downloaded — open and use Print → Save as PDF`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed');
    }
  };

  return (
    <>
      <Seo title={grn?.grnNumber ? `GRN ${grn.grnNumber}` : 'Yarn GRN'} />
      <div className="main-content !p-[10px]">
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-gray-500 hover:text-gray-800"
              aria-label="Go back"
            >
              <i className="ri-arrow-left-line text-base" aria-hidden />
            </button>
            <div className="w-[3px] h-5 bg-purple-600 rounded-full" aria-hidden />
            <h1 className="text-sm font-bold text-gray-800">
              {grn?.grnNumber || 'GRN'}
            </h1>
            {grn && (
              <Link
                href={`/yarn-management/purchase-management/purchase-order-received/process/${grn.purchaseOrder}`}
                className="text-[11px] text-purple-700 hover:underline font-bold"
              >
                · PO {grn.poNumber}
              </Link>
            )}
          </div>
          {grn && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 text-[11px] font-bold rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                aria-label="Download GRN"
              >
                <i className="ri-file-download-line mr-1" aria-hidden /> Download
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 text-[11px] font-bold text-white rounded bg-indigo-600 hover:bg-indigo-700 transition-colors"
                aria-label="Print GRN"
              >
                <i className="ri-printer-line mr-1" aria-hidden /> Print
              </button>
            </div>
          )}
        </header>

        {isLoading && (
          <div className="bg-white border border-gray-100 rounded p-10 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50" aria-hidden />
            <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading GRN</p>
          </div>
        )}

        {error && (
          <div role="alert" className="bg-red-50 border border-red-100 rounded p-6 text-center">
            <i className="ri-error-warning-line text-2xl text-red-400 mb-2" aria-hidden />
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}

        {!isLoading && !error && grn && (
          // Reuse the drawer for the body — same tabs, same data, no duplication.
          // The drawer renders as a fixed overlay; we wrap it in a non-fixed shell
          // so it lives inline on this page.
          <div className="bg-white border border-gray-100 rounded">
            <div className="static-grn-detail">
              <style dangerouslySetInnerHTML={{ __html: `
                .static-grn-detail [role="dialog"] { position: static !important; display: block !important; }
                .static-grn-detail [role="dialog"] > button[aria-label="Close drawer"] { display: none !important; }
                .static-grn-detail [role="dialog"] > aside { width: 100% !important; box-shadow: none !important; }
              ` }} />
              <GrnDetailDrawer
                grn={grn}
                onClose={() => router.push('/yarn-management/grn')}
                onUpdated={setGrn}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
