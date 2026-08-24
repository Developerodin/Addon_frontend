"use client";

import React from 'react';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { YarnReadinessData } from '../types';

interface YarnReadinessPanelProps {
  data?: YarnReadinessData;
  loading?: boolean;
}

/**
 * Zone I: Yarn Readiness Panel
 * Cross-module visibility into yarn blockers
 */
const YarnReadinessPanel: React.FC<YarnReadinessPanelProps> = ({
  data,
  loading = false
}) => {
  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-32 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    );
  }

  const blockedRows = data?.blockedRows || 0;
  const isHealthy = blockedRows === 0;
  const isCritical = blockedRows > 10;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Yarn Readiness</h3>
              <p className="text-xs text-gray-500">Queue items waiting for yarn</p>
            </div>
            <InfoTooltip {...SECTION_INFO.yarn} />
          </div>
          <a 
            href="/yarn-management"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View Yarn Module →
          </a>
        </div>
      </div>

      <div className="p-4">
        <div className={`
          rounded-lg p-4 text-center
          ${isHealthy ? 'bg-emerald-50' : isCritical ? 'bg-red-50' : 'bg-amber-50'}
        `}>
          <div className={`
            text-4xl font-bold mb-1
            ${isHealthy ? 'text-emerald-600' : isCritical ? 'text-red-600' : 'text-amber-600'}
          `}>
            {blockedRows}
          </div>
          <div className={`
            text-sm font-medium
            ${isHealthy ? 'text-emerald-600' : isCritical ? 'text-red-600' : 'text-amber-600'}
          `}>
            {isHealthy ? 'All Clear' : `Blocked Queue Items`}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {isHealthy 
              ? 'All machine queue items have yarn issued'
              : 'Items waiting for yarn issue before production can start'}
          </div>
        </div>

        {blockedRows > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              <i className="ri-information-line mr-1" />
              Check yarn issue status in machine assignments
            </span>
            <a 
              href="/production/floor-supervisor/knitting" 
              className="text-blue-600 hover:underline"
            >
              View Knitting Queue
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default YarnReadinessPanel;
