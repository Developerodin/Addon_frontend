"use client";
import React, { useState, useEffect } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast, Toaster } from "react-hot-toast";
import yarnCatalogService, { YarnCatalog } from "@/shared/services/yarnCatalogService";

const CataloguingPage = () => {
  const { hasSubPermission } = useNavigation();
  const [yarns, setYarns] = useState<YarnCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const hasPermission = hasSubPermission('/yarn-management', 'Cataloguing');

  useEffect(() => {
    if (hasPermission) {
      const timeoutId = setTimeout(() => {
        fetchYarnCatalogs();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [currentPage, itemsPerPage, searchTerm, hasPermission]);

  const fetchYarnCatalogs = async () => {
    setIsLoading(true);
    try {
      const response = await yarnCatalogService.getYarnCatalogs({
        page: currentPage,
        limit: itemsPerPage,
        yarnName: searchTerm.trim() || undefined,
      });
      setYarns(response.results || []);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
    } catch (error) {
      console.error('Error fetching yarn catalogs:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch yarn catalogs');
      setYarns([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteYarn = async (yarnId: string) => {
    if (!window.confirm('Are you sure you want to delete this yarn catalog?')) return;
    
    setIsDeleting(true);
    setDeleteId(yarnId);
    try {
      await yarnCatalogService.deleteYarnCatalog(yarnId);
      toast.success('Yarn catalog deleted successfully');
      await fetchYarnCatalogs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete yarn catalog');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
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

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to access Yarn Cataloguing.</p>
          <Link href="/yarn-management" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Yarn Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Cataloguing" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">Yarn Cataloguing</h1>
                <p className="text-gray-600 mt-1">Manage yarn specifications and catalog</p>
              </div>
              <div className="box-tools">
                <Link 
                  href="/yarn-management/cataloguing/add"
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-add-line me-1"></i>
                  Add Yarn
                </Link>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                <div className="flex items-center">
                  <label className="mr-2 text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
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
                    placeholder="Search by yarn name..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Yarn Specifications Table */}
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Yarn Catalogs ({totalResults})</h3>
            </div>
            <div className="box-body">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : yarns.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <i className="ri-book-open-line text-4xl"></i>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Catalogs</h3>
                  <p className="text-gray-500 mb-4">Start by adding your first yarn catalog.</p>
                  <Link 
                    href="/yarn-management/cataloguing/add"
                    className="ti-btn ti-btn-primary"
                  >
                    <i className="ri-add-line me-2"></i>
                    Add First Yarn
                  </Link>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Yarn Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Subtype
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Count Size
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Blend
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Color
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            GST
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {yarns.map((yarn) => (
                          <tr key={yarn.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {yarn.yarnName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.yarnType?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.yarnSubtype?.subtype ? String(yarn.yarnSubtype.subtype) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.countSize?.name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.blend?.name || (yarn.blend as any)?.brandName || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.colorFamily ? (
                                <span className="inline-flex items-center">
                                  <span 
                                    className="w-4 h-4 rounded-full mr-2 border border-gray-300"
                                    style={{ backgroundColor: yarn.colorFamily.colorCode || '#ccc' }}
                                  ></span>
                                  {yarn.colorFamily.name || '-'}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {yarn.gst ? `${yarn.gst}%` : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`badge ${yarn.status === 'active' ? 'bg-success' : yarn.status === 'inactive' ? 'bg-warning' : 'bg-danger'}`}>
                                {yarn.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Link
                                  href={`/yarn-management/cataloguing/edit/${yarn.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                  title="Edit"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  onClick={() => handleDeleteYarn(yarn.id)}
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  title="Delete"
                                  disabled={isDeleting && deleteId === yarn.id}
                                >
                                  {isDeleting && deleteId === yarn.id ? (
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

export default CataloguingPage;
