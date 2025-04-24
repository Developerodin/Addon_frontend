"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';

export default function Page() {
  return (
    <>
   
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Breadcrumb */}
        

          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Analytics</h1>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Sample Analytics Cards */}
                <div className="box">
                  <div className="box-body">
                    <h3 className="font-semibold mb-2">Total Sales</h3>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                </div>
                <div className="box">
                  <div className="box-body">
                    <h3 className="font-semibold mb-2">Total Orders</h3>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
                <div className="box">
                  <div className="box-body">
                    <h3 className="font-semibold mb-2">Average Order Value</h3>
                    <p className="text-2xl font-bold">$0.00</p>
                  </div>
                </div>
                <div className="box">
                  <div className="box-body">
                    <h3 className="font-semibold mb-2">Conversion Rate</h3>
                    <p className="text-2xl font-bold">0%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 