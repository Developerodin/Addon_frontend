"use client";

import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const SalesPage = () => {
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sample data structure based on the Excel sheet
  const sales = [
    {
      id: '1',
      calendar_date: '01.03.2025',
      plant: '1057',
      plant_name: 'LINKING ROAD, KHAR',
      division: 'LP',
      division_name: 'Louis Philippe',
      material_group: 'FGSOCKS',
      material_type: 'Socks',
      material_code: 'LPM1SFLBC01358000',
      material_description: 'LOUIS PHILIPPE FULL LENGTH SOCK, No Grid',
      quantity: 2,
      mrp: 538.00,
      discount: 0.00,
      gsv: 538.00,
      nsv: 512.40,
      total_tax: 25.60
    },
    // Add more sample data here
  ];

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSales([]);
    } else {
      setSelectedSales(filteredSales.map(sale => sale.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSaleSelect = (saleId: string) => {
    if (selectedSales.includes(saleId)) {
      setSelectedSales(selectedSales.filter(id => id !== saleId));
    } else {
      setSelectedSales([...selectedSales, saleId]);
    }
  };

  // Filter sales based on search query
  const filteredSales = sales.filter(sale =>
    Object.values(sale).some(value =>
      value.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSales = filteredSales.slice(startIndex, endIndex);

  return (
    <div className="main-content">
      <Seo title="Sales Records"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Sales Records</h1>
              <div className="box-tools flex items-center space-x-2">
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-file-excel-2-line me-2"></i> Export
                </button>
                <Link href="/sales/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Sale
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control py-3"
                    placeholder="Search sales records..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table whitespace-nowrap table-bordered min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th scope="col" className="!text-start">
                        <input 
                          type="checkbox" 
                          className="form-check-input" 
                          checked={selectAll}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th scope="col" className="text-start">Date</th>
                      <th scope="col" className="text-start">Plant</th>
                      <th scope="col" className="text-start">Division</th>
                      <th scope="col" className="text-start">Material Code</th>
                      <th scope="col" className="text-start">Description</th>
                      <th scope="col" className="text-start">Qty</th>
                      <th scope="col" className="text-start">MRP</th>
                      <th scope="col" className="text-start">Discount</th>
                      <th scope="col" className="text-start">GSV</th>
                      <th scope="col" className="text-start">NSV</th>
                      <th scope="col" className="text-start">Tax</th>
                      <th scope="col" className="text-start">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentSales.map((sale, index) => (
                      <tr 
                        key={sale.id}
                        className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                      >
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectedSales.includes(sale.id)}
                            onChange={() => handleSaleSelect(sale.id)}
                          />
                        </td>
                        <td>{sale.calendar_date}</td>
                        <td>{`${sale.plant} - ${sale.plant_name}`}</td>
                        <td>{`${sale.division} - ${sale.division_name}`}</td>
                        <td>{sale.material_code}</td>
                        <td>{sale.material_description}</td>
                        <td className="text-right">{sale.quantity}</td>
                        <td className="text-right">{sale.mrp.toFixed(2)}</td>
                        <td className="text-right">{sale.discount.toFixed(2)}</td>
                        <td className="text-right">{sale.gsv.toFixed(2)}</td>
                        <td className="text-right">{sale.nsv.toFixed(2)}</td>
                        <td className="text-right">{sale.total_tax.toFixed(2)}</td>
                        <td>
                          <div className="flex space-x-2">
                            <Link 
                              href={`/sales/edit/${sale.id}`}
                              className="ti-btn ti-btn-primary ti-btn-sm"
                            >
                              <i className="ri-edit-line"></i>
                            </Link>
                            <button 
                              className="ti-btn ti-btn-danger ti-btn-sm"
                              onClick={() => {/* Add delete handler */}}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredSales.length)} of {filteredSales.length} entries
                </div>
                <nav aria-label="Page navigation" className="">
                  <ul className="flex flex-wrap items-center">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <li key={page} className="page-item">
                        <button
                          className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                            currentPage === page 
                            ? 'bg-primary text-white hover:bg-primary-dark' 
                            : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPage; 