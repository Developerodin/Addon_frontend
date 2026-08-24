"use client";

import React, { useMemo } from 'react';
import { formatters } from '@/shared/components/recharts/chartConfig';
import InfoTooltip, { SECTION_INFO } from './InfoTooltip';
import type { ArticlePerformanceData, ArticlePerformance } from '../types';

interface ArticlePerformancePanelProps {
  data?: ArticlePerformanceData;
  loading?: boolean;
  onSortChange?: (sortBy: 'volume' | 'defects' | 'cycleTime') => void;
}

/**
 * Zone J: Article Performance Panel
 * Top performers and bottleneck articles
 */
const ArticlePerformancePanel: React.FC<ArticlePerformancePanelProps> = ({
  data,
  loading = false,
  onSortChange
}) => {
  const topArticles = useMemo(() => {
    if (!data?.articles) return [];
    return data.articles.slice(0, 10);
  }, [data]);

  const getDefectBadgeColor = (rate: number) => {
    if (rate <= 2) return 'bg-emerald-100 text-emerald-700';
    if (rate <= 5) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 h-80 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-40 mb-4" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Article Performance</h3>
              <p className="text-xs text-gray-500">
                Sorted by {data?.sortBy === 'volume' ? 'dispatch volume' : data?.sortBy === 'defects' ? 'defect rate' : 'cycle time'}
              </p>
            </div>
            <InfoTooltip {...SECTION_INFO.articles} />
          </div>
          {onSortChange && (
            <select
              value={data?.sortBy || 'volume'}
              onChange={(e) => onSortChange(e.target.value as 'volume' | 'defects' | 'cycleTime')}
              className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="volume">By Volume</option>
              <option value="defects">By Defects</option>
              <option value="cycleTime">By Cycle Time</option>
            </select>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-72">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">#</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Article</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Dispatched</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Received</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">M1</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Defect %</th>
            </tr>
          </thead>
          <tbody>
            {topArticles.length > 0 ? (
              topArticles.map((article, idx) => (
                <tr 
                  key={article._id} 
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-3 py-2 text-gray-400 font-medium">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-gray-800">
                    <a 
                      href={`/catalog/items?search=${article._id}`}
                      className="hover:text-blue-600 hover:underline"
                    >
                      {article._id}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatters.number(article.totalDispatched)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatters.number(article.totalReceived)}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {formatters.number(article.totalM1)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className={`
                      inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                      ${getDefectBadgeColor(article.defectRate)}
                    `}>
                      {article.defectRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                  <i className="ri-file-list-3-line text-2xl mb-2 block" />
                  No article data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data?.articles && data.articles.length > 10 && (
        <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 text-center">
          Showing top 10 of {data.articles.length} articles
        </div>
      )}
    </div>
  );
};

export default ArticlePerformancePanel;
