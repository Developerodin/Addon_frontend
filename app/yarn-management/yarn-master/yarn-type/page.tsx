"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnTypeService, { YarnType } from '@/shared/services/yarnTypeService';

const YarnTypePage = () => {
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchYarnTypes();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchYarnTypes = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (searchQuery.trim()) {
        params.name = searchQuery.trim();
      }
      const data = await yarnTypeService.getTypes(params);
      setYarnTypes(data.results || []);
      setTotalPages(data.totalPages || 1);
      setTotalResults(data.totalResults || 0);
    } catch (error) {
      console.error('Error fetching yarn types:', error);
      toast.error('Failed to fetch yarn types');
      setYarnTypes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!window.confirm('Are you sure you want to delete this yarn type?')) return;
    
    setIsDeleting(true);
    setDeleteId(typeId);
    try {
      await yarnTypeService.deleteType(typeId);
      toast.success('Yarn type deleted successfully');
      await fetchYarnTypes();
    } catch (error) {
      toast.error('Failed to delete yarn type');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes(yarnTypes.map(t => t.id));
    }
    setSelectAll(!selectAll);
  };

  const handleTypeSelect = (typeId: string) => {
    if (selectedTypes.includes(typeId)) {
      setSelectedTypes(selectedTypes.filter(id => id !== typeId));
    } else {
      setSelectedTypes([...selectedTypes, typeId]);
    }
  };

  function getPagination(currentPage: number, totalPages: number) {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Types" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Yarn Types</h1>
              <Link href="/yarn-management/yarn-master/yarn-type/add" className="ti-btn ti-btn-primary">
                <i className="ri-add-line me-2"></i> Add Yarn Type
              </Link>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={e => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search yarn types..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : yarnTypes.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Yarn Types Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first yarn type.</p>
                  <Link href="/yarn-management/yarn-master/yarn-type/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Yarn Type
                  </Link>
                </div>
              ) : (
                <>
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
                          <th scope="col" className="text-start">Name</th>
                          <th scope="col" className="text-start">Details</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yarnTypes.map((type, index) => (
                          <tr 
                            key={type.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedTypes.includes(type.id)}
                                onChange={() => handleTypeSelect(type.id)}
                              />
                            </td>
                            <td>{type.name}</td>
                            <td>
                              {type.details && type.details.length > 0 ? (
                                <div className="space-y-1">
                                  {type.details.map((detail, detailIdx) => (
                                    <div key={`${type.id}-detail-${detailIdx}`}>
                                      <span className="font-medium">{detail.subtype}</span>
                                      {detail.countSize && detail.countSize.length > 0 && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          Sizes: {detail.countSize.join(', ')}
                                        </span>
                                      )}
                                      {detail.weight && (
                                        <span className="ml-2 text-xs text-gray-500">
                                          Weight: {detail.weight}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              <span className={`badge ${type.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                {type.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/yarn-management/yarn-master/yarn-type/edit/${type.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(type.id)}
                                  disabled={isDeleting && deleteId === type.id}
                                >
                                  {isDeleting && deleteId === type.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  ) : (
                                    <i className="ri-delete-bin-line"></i>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
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
                        {getPagination(currentPage, totalPages).map((page, idx) =>
                          page === '...'
                            ? <li key={"ellipsis-" + idx} className="page-item"><span className="px-3">...</span></li>
                            : <li key={page} className="page-item">
                                <button
                                  className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                    currentPage === page 
                                    ? 'bg-primary text-white hover:bg-primary-dark' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                  }`}
                                  onClick={() => setCurrentPage(Number(page))}
                                >
                                  {page}
                                </button>
                              </li>
                        )}
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YarnTypePage;

