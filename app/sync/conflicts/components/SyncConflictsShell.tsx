'use client';

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';

type TabId = 'open' | 'history';

interface SyncConflictsShellProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  openCount: number;
  serverSiteId: string | null;
  onRefresh: () => void;
  refreshing: boolean;
  children: React.ReactNode;
}

export default function SyncConflictsShell({
  activeTab,
  onTabChange,
  openCount,
  serverSiteId,
  onRefresh,
  refreshing,
  children,
}: SyncConflictsShellProps) {
  return (
    <div className="main-content !p-[10px]">
      <Seo title="Sync conflicts" />
      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0 rounded">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-5 bg-purple-600 rounded-full" />
                <h1 className="text-sm font-bold text-gray-800">Sync conflicts</h1>
                {openCount > 0 && (
                  <span className="bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {openCount} open
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-gray-500 max-w-2xl">
                Review fields that changed on both factory and cloud. Decisions are{' '}
                <span className="font-semibold">recorded only</span> — they do not change orders, floors, or quantities.
                {serverSiteId && (
                  <span className="block mt-0.5 text-gray-600">
                    Deciding for server: <span className="font-mono text-[10px]">{serverSiteId}</span>
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <i className={`ri-refresh-line ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Reload
            </button>
          </div>

          <div className="flex gap-1 border-b border-gray-100 mb-4" role="tablist" aria-label="Sync review sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'open'}
              onClick={() => onTabChange('open')}
              className={`px-3 py-2 text-[11px] font-bold rounded-t border-b-2 transition-colors ${
                activeTab === 'open'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Open conflicts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => onTabChange('history')}
              className={`px-3 py-2 text-[11px] font-bold rounded-t border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Decision log
            </button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
