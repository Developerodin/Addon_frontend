import { Suspense } from 'react';
import { Metadata } from 'next';
import ProductionCommandClient from './ProductionCommandClient';

export const metadata: Metadata = {
  title: 'Production Command Dashboard | Addon',
  description: 'Real-time production monitoring and analytics dashboard'
};

/**
 * Loading skeleton for the dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Alert ribbon skeleton */}
      <div className="h-12 bg-gray-100 rounded-lg w-full" />
      
      {/* KPI strip skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 h-28">
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
      
      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 h-80">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-64 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Production Command Dashboard Page
 * Server component that wraps the client dashboard
 */
export default function ProductionCommandDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProductionCommandClient />
    </Suspense>
  );
}
