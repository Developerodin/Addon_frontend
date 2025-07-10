"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Link from 'next/link';

export default function MRPDistributionPage() {
  return (
    <>
      <Seo title="MRP Distribution - Analytics" />
      <Pageheader currentpage="MRP Distribution" activepage="Analytics" mainpage="MRP Distribution" />
      
      {/* Back to Analytics */}
      <div className="mb-6">
        <Link 
          href="/analytics"
          className="inline-flex items-center text-sm text-primary hover:text-primary/80 transition-colors duration-200"
        >
          <i className="ri-arrow-left-line mr-2"></i>
          Back to Analytics
        </Link>
      </div>

      {/* Coming Soon */}
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <i className="ri-time-line text-2xl text-blue-500"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-600 mb-6">MRP distribution detailed view is under development</p>
        </div>
      </div>
    </>
  );
} 