"use client";

import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';

const SalesPage = () => {
  return (
    <div className="main-content">
      <Seo title="Sales"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
       

          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Sales</h1>
              <div className="box-tools">
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line"></i> New Sale
                </button>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              <div className="grid grid-cols-12 gap-6">
                {/* Search and Filters */}
                <div className="col-span-12 lg:col-span-4">
                  <div className="relative">
                    <input type="text" className="form-control py-3" placeholder="Search Sales..." />
                    <button className="absolute end-0 top-0 px-4 h-full">
                      <i className="ri-search-line text-lg"></i>
                    </button>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-8">
                  <div className="flex justify-end space-x-3">
                    <select className="form-select">
                      <option>Filter by Status</option>
                      <option>Completed</option>
                      <option>Pending</option>
                      <option>Cancelled</option>
                    </select>
                    <select className="form-select">
                      <option>Sort by</option>
                      <option>Date (Newest)</option>
                      <option>Date (Oldest)</option>
                      <option>Amount (High-Low)</option>
                      <option>Amount (Low-High)</option>
                    </select>
                  </div>
                </div>

                {/* Sales List */}
                <div className="col-span-12">
                  <div className="flex flex-col items-center justify-center p-8">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <i className="ri-shopping-cart-line text-4xl text-primary"></i>
                    </div>
                    <h3 className="text-xl font-medium mb-2">No Sales Found</h3>
                    <p className="text-gray-500 text-center mb-6">Start by creating your first sale.</p>
                    <button type="button" className="ti-btn ti-btn-primary">
                      <i className="ri-add-line me-2"></i> Create First Sale
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage; 