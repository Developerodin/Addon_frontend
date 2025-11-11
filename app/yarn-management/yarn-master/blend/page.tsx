"use client";
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import yarnBlendService, { YarnBlend } from '@/shared/services/yarnBlendService';

const BlendPage = () => {
  const { hasSubPermission } = useNavigation();
  const [blends, setBlends] = useState<YarnBlend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedBlends, setSelectedBlends] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasPermission = hasSubPermission('/yarn-management/yarn-master', 'Blend');

  useEffect(() => {
    if (hasPermission) {
      fetchBlends();
    }
  }, [currentPage, itemsPerPage, searchQuery, hasPermission]);

  const fetchBlends = async () => {
    setIsLoading(true);
    try {
      const response = await yarnBlendService.getBlends({
        page: currentPage,
        limit: itemsPerPage,
        name: searchQuery.trim() || undefined,
      });
      setBlends(response.results || []);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
      setSelectedBlends([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching blends:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch blends');
      setBlends([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (blendId: string) => {
    if (!window.confirm('Are you sure you want to delete this blend?')) return;
    
    setIsDeleting(true);
    setDeleteId(blendId);
    try {
      await yarnBlendService.deleteBlend(blendId);
      toast.success('Blend deleted successfully');
      await fetchBlends();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete blend');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBlends([]);
    } else {
      setSelectedBlends(blends.map(b => b.id));
    }
    setSelectAll(!selectAll);
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

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Blend.</p>
          <Link href="/yarn-management/yarn-master" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Master
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Blends" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Blends</h1>
              <Link href="/yarn-management/yarn-master/blend/add" className="ti-btn ti-btn-primary">
                <i className="ri-add-line me-2"></i> Add Blend
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
                    placeholder="Search blends..."
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
              ) : blends.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Blends Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first blend.</p>
                  <Link href="/yarn-management/yarn-master/blend/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Blend
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
                          <th scope="col" className="text-start">Created At</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {blends.map((blend, index) => (
                          <tr 
                            key={blend.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedBlends.includes(blend.id)}
                                onChange={() => {
                                  if (selectedBlends.includes(blend.id)) {
                                    setSelectedBlends(selectedBlends.filter(id => id !== blend.id));
                                  } else {
                                    setSelectedBlends([...selectedBlends, blend.id]);
                                  }
                                }}
                              />
                            </td>
                            <td>{blend.name}</td>
                            <td>{blend.createdAt ? new Date(blend.createdAt).toLocaleString() : '-'}</td>
                            <td>
                              <span className={`badge ${blend.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                {blend.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/yarn-management/yarn-master/blend/edit/${blend.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(blend.id)}
                                  disabled={isDeleting && deleteId === blend.id}
                                >
                                  {isDeleting && deleteId === blend.id ? (
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

export default BlendPage;

