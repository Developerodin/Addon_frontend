"use client";

import React from 'react';

interface SkeletonProps {
  className?: string;
}

/**
 * KPI Strip Skeleton
 */
export const KpiSkeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`}>
    {[...Array(6)].map((_, i) => (
      <div 
        key={i} 
        className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
        style={{ height: '112px' }}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="h-3 bg-gray-200 rounded w-20" />
          <div className="h-5 w-5 bg-gray-100 rounded" />
        </div>
        <div className="h-7 bg-gray-200 rounded w-24 mb-2" />
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-100 rounded w-12" />
          <div className="h-6 bg-gray-100 rounded flex-1" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Chart Skeleton
 */
interface ChartSkeletonProps extends SkeletonProps {
  height?: number;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ 
  height = 300, 
  className = '' 
}) => (
  <div 
    className={`bg-white rounded-lg border border-gray-200 p-4 animate-pulse ${className}`}
    style={{ height }}
  >
    <div className="flex justify-between items-center mb-4">
      <div>
        <div className="h-4 bg-gray-200 rounded w-32 mb-1" />
        <div className="h-3 bg-gray-100 rounded w-24" />
      </div>
      <div className="flex gap-2">
        <div className="h-7 bg-gray-100 rounded w-16" />
        <div className="h-7 bg-gray-100 rounded w-16" />
      </div>
    </div>
    <div className="h-full bg-gray-50 rounded flex items-end justify-around px-4 pb-4" style={{ height: height - 100 }}>
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="bg-gray-200 rounded-t" 
          style={{ 
            width: '6%', 
            height: `${30 + Math.random() * 60}%` 
          }} 
        />
      ))}
    </div>
  </div>
);

/**
 * Table Skeleton
 */
interface TableSkeletonProps extends SkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  cols = 6, 
  className = '' 
}) => (
  <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse ${className}`}>
    {/* Header */}
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex gap-4">
      {[...Array(cols)].map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded flex-1" />
      ))}
    </div>
    {/* Rows */}
    {[...Array(rows)].map((_, rowIdx) => (
      <div 
        key={rowIdx} 
        className={`px-4 py-3 flex gap-4 ${rowIdx < rows - 1 ? 'border-b border-gray-100' : ''}`}
      >
        {[...Array(cols)].map((_, colIdx) => (
          <div 
            key={colIdx} 
            className="h-4 bg-gray-100 rounded flex-1" 
            style={{ opacity: 0.5 + Math.random() * 0.5 }}
          />
        ))}
      </div>
    ))}
  </div>
);

/**
 * Card Skeleton
 */
interface CardSkeletonProps extends SkeletonProps {
  height?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  height = 200, 
  className = '' 
}) => (
  <div 
    className={`bg-white rounded-lg border border-gray-200 p-4 animate-pulse ${className}`}
    style={{ height }}
  >
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
    <div className="space-y-3">
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
      <div className="h-3 bg-gray-100 rounded w-4/6" />
    </div>
  </div>
);

/**
 * Alert Ribbon Skeleton
 */
export const AlertRibbonSkeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`flex gap-3 overflow-x-auto py-2 animate-pulse ${className}`}>
    {[...Array(4)].map((_, i) => (
      <div 
        key={i} 
        className="flex-shrink-0 h-10 bg-gray-100 rounded-lg"
        style={{ width: 200 }}
      />
    ))}
  </div>
);

export default {
  KpiSkeleton,
  ChartSkeleton,
  TableSkeleton,
  CardSkeleton,
  AlertRibbonSkeleton
};
