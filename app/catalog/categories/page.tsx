"use client"
import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const CategoriesPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Sample data - replace with your actual data
  const categories = [
    { id: 1, name: 'Electronics', sortOrder: 1, parent: null },
    { id: 2, name: 'Smartphones', sortOrder: 1, parent: 'Electronics' },
    { id: 3, name: 'Laptops', sortOrder: 2, parent: 'Electronics' },
    { id: 4, name: 'Clothing', sortOrder: 2, parent: null },
    { id: 5, name: "Men's Wear", sortOrder: 1, parent: 'Clothing' },
    { id: 6, name: "Women's Wear", sortOrder: 2, parent: 'Clothing' },
    { id: 7, name: 'Books', sortOrder: 3, parent: null },
  ];

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map(cat => cat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleCategorySelect = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, endIndex);

  return (
    <div className="main-content">
      <Seo title="Categories"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Categories</h1>
              <div className="box-tools flex items-center space-x-2">
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-file-excel-2-line me-2"></i> Import
                </button>
                <button type="button" className="ti-btn ti-btn-primary">
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/catalog/categories/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Category
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
                    placeholder="Search by category name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              <div className="table-responsive">
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
                      <th scope="col" className="text-start">Category Name</th>
                      <th scope="col" className="text-start">Parent Category</th>
                      <th scope="col" className="text-start">Sort Order</th>
                      <th scope="col" className="text-start">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentCategories.map((category, index) => (
                      <tr 
                        key={category.id} 
                        className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                      >
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input" 
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleCategorySelect(category.id)}
                          />
                        </td>
                        <td>{category.name}</td>
                        <td>
                          {category.parent ? (
                            <span className="badge bg-light text-default">
                              {category.parent}
                            </span>
                          ) : (
                            <span className="badge bg-gray-100 text-gray-500">
                              Root Category
                            </span>
                          )}
                        </td>
                        <td>{category.sortOrder}</td>
                        <td>
                          <div className="flex space-x-2">
                            <Link 
                              href={`/catalog/categories/edit/${category.id}`}
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
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredCategories.length)} of {filteredCategories.length} entries
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

export default CategoriesPage; 