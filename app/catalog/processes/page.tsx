"use client"
import React from 'react';
import Seo from '@/shared/layout-components/seo/seo';

const ProcessesPage = () => {
  return (
    <div className="main-content">
      <Seo title="Processes"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Breadcrumb */}
       
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Processes</h1>
              <div className="box-tools">
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line"></i> Add New Process
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
                    <input type="text" className="form-control py-3" placeholder="Search Processes..." />
                    <button className="absolute end-0 top-0 px-4 h-full">
                      <i className="ri-search-line text-lg"></i>
                    </button>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-8">
                  <div className="flex justify-end space-x-3">
                    <select className="form-select">
                      <option>Filter by Type</option>
                      <option>Manufacturing</option>
                      <option>Assembly</option>
                      <option>Quality Control</option>
                    </select>
                    <select className="form-select">
                      <option>Sort by</option>
                      <option>Name A-Z</option>
                      <option>Name Z-A</option>
                      <option>Most Used</option>
                    </select>
                  </div>
                </div>

                {/* Processes Grid */}
                <div className="col-span-12">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Empty State */}
                    <div className="col-span-full flex flex-col items-center justify-center p-8">
                      <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                        <i className="ri-settings-line text-4xl text-primary"></i>
                      </div>
                      <h3 className="text-xl font-medium mb-2">No Processes Found</h3>
                      <p className="text-gray-500 text-center mb-6">Start by adding your first process.</p>
                      <button type="button" className="ti-btn ti-btn-primary">
                        <i className="ri-add-line me-2"></i> Add First Process
                      </button>
                    </div>
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

export default ProcessesPage; 