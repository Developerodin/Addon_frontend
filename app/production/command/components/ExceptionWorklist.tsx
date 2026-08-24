"use client";

import React, { useState } from 'react';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { ExceptionsData, ExceptionType } from '../types';

interface ExceptionWorklistProps {
  data?: ExceptionsData;
  loading?: boolean;
  onTypeChange?: (type: ExceptionType) => void;
  onPageChange?: (page: number) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const EXCEPTION_TABS: { type: ExceptionType; label: string; icon: string; color: string }[] = [
  { type: 'stalled-orders', label: 'Stalled', icon: 'ri-pause-circle-line', color: 'text-amber-600' },
  { type: 'idle-machines', label: 'Idle Machines', icon: 'ri-cpu-line', color: 'text-gray-600' },
  { type: 'yarn-blocked', label: 'Yarn Blocked', icon: 'ri-forbid-2-line', color: 'text-red-600' },
  { type: 'open-m2-aged', label: 'Aged M2', icon: 'ri-tools-line', color: 'text-purple-600' },
  { type: 'data-integrity', label: 'Data Issues', icon: 'ri-error-warning-line', color: 'text-rose-600' }
];

/**
 * Zone K: Exception Worklist
 * Paginated exceptions by type with tabs
 */
const ExceptionWorklist: React.FC<ExceptionWorklistProps> = ({
  data,
  loading = false,
  onTypeChange,
  onPageChange,
  pagination
}) => {
  const [activeTab, setActiveTab] = useState<ExceptionType>(data?.type || 'stalled-orders');

  const handleTabChange = (type: ExceptionType) => {
    setActiveTab(type);
    onTypeChange?.(type);
  };

  const items = data?.items || [];
  const currentPage = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;

  const renderTableContent = () => {
    if (loading) {
      return (
        <div className="p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600" />
          <p className="mt-2 text-xs text-gray-500">Loading...</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="p-8 text-center text-gray-400">
          <i className="ri-checkbox-circle-line text-4xl mb-2 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-600">All Clear</p>
          <p className="text-xs text-gray-500 mt-1">No exceptions of this type</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'stalled-orders':
        return (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Order</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Priority</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Last Updated</th>
                <th className="px-3 py-2 text-center text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id || item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.orderNumber}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.priority}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={`/production/supervisor?order=${item.orderNumber}`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'idle-machines':
        return (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Machine</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Model</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Floor</th>
                <th className="px-3 py-2 text-center text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.machineCode || item.machineNumber || `M-${String(item._id).slice(-6)}`}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.model || '-'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.floor || '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={`/production/floor-supervisor/knitting`}
                      className="text-blue-600 hover:underline"
                    >
                      Assign Work
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'yarn-blocked':
        return (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Article</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Machine</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Qty</th>
                <th className="px-3 py-2 text-center text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.articleCode}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {item.machineCode}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {item.quantity?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={`/yarn/issue`}
                      className="text-blue-600 hover:underline"
                    >
                      Issue Yarn
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'open-m2-aged':
        return (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Article</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Status</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">M2 Qty</th>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Last Updated</th>
                <th className="px-3 py-2 text-center text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.articleCode}
                  </td>
                  <td className="px-3 py-2">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                      {item.repairStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {item.quantity?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={`/production/repair`}
                      className="text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      case 'data-integrity':
        return (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-medium">Article</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Planned</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Accounted</th>
                <th className="px-3 py-2 text-right text-gray-500 font-medium">Difference</th>
                <th className="px-3 py-2 text-center text-gray-500 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">
                    {item.articleCode}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {item.planned?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {item.accounted?.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="text-rose-600 font-medium">
                      {item.difference?.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <a 
                      href={`/catalog/items?search=${item.articleCode}`}
                      className="text-blue-600 hover:underline"
                    >
                      Investigate
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );

      default:
        return (
          <div className="p-8 text-center text-gray-400">
            <i className="ri-error-warning-line text-4xl mb-2" />
            <p className="text-sm">Unknown exception type</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Exception Worklist</h3>
            <p className="text-xs text-gray-500">Items requiring attention</p>
          </div>
          <InfoTooltip {...SECTION_INFO.exceptions} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {EXCEPTION_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => handleTabChange(tab.type)}
            className={`
              flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap
              border-b-2 transition-colors
              ${activeTab === tab.type 
                ? 'border-blue-500 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
            `}
          >
            <i className={`${tab.icon} ${activeTab === tab.type ? tab.color : ''}`} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-64 overflow-auto">
        {renderTableContent()}
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500">
            Page {currentPage} of {totalPages} ({pagination.total} items)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <i className="ri-arrow-left-s-line" />
            </button>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-2 py-1 rounded border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <i className="ri-arrow-right-s-line" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExceptionWorklist;
