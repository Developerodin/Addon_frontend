"use client";
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import GrnHistoryPanel from './GrnHistoryPanel';
import GrnMonthlySummaryTab from './GrnMonthlySummaryTab';

type GrnPageTab = 'history' | 'summary';

/**
 * Yarn GRN page: History (reprint/search) and Monthly Summary (yarn-line register).
 */
export default function YarnGrnHistoryPage() {
  const { hasSubPermission, isLoading: navLoading } = useNavigation();
  const hasPermission = hasSubPermission(
    '/yarn-management/purchase-management',
    'GRN History'
  );
  const [activeTab, setActiveTab] = useState<GrnPageTab>('history');

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
            <header className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full" aria-hidden />
                <h1 className="text-sm font-bold text-gray-800">Yarn GRN History</h1>
              </div>
            </header>

            <div
              className="mb-4 flex border-b border-gray-100"
              role="tablist"
              aria-label="Yarn GRN sections"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'history'}
                onClick={() => setActiveTab('history')}
                className={`relative px-3 py-2 text-[11px] font-bold transition-colors ${
                  activeTab === 'history'
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-history-line me-1.5 text-xs" aria-hidden />
                History
                {activeTab === 'history' && (
                  <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-purple-600" />
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'summary'}
                onClick={() => setActiveTab('summary')}
                className={`relative px-3 py-2 text-[11px] font-bold transition-colors ${
                  activeTab === 'summary'
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <i className="ri-calendar-line me-1.5 text-xs" aria-hidden />
                Monthly Summary
                {activeTab === 'summary' && (
                  <div className="absolute bottom-0 left-0 h-0.5 w-full rounded-t-full bg-purple-600" />
                )}
              </button>
            </div>

            {activeTab === 'history' ? <GrnHistoryPanel /> : <GrnMonthlySummaryTab />}
          </>
        )}
      </div>
    </>
  );
}
