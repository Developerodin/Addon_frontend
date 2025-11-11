"use client"
import React, { useEffect, useMemo, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import supplierService, {
  Supplier,
  SupplierListResponse,
  SupplierQueryParams,
  SupplierYarnDetail,
} from '@/shared/services/supplierService';
import yarnTypeService, { YarnType } from '@/shared/services/yarnTypeService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';

const BrandPage = () => {
  const [brands, setBrands] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Supplier['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [yarnTypeMap, setYarnTypeMap] = useState<Record<string, string>>({});
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, string>>({});
  const [yarnColorMap, setYarnColorMap] = useState<Record<string, string>>({});

  const getYarnTypeLabel = (yarnType: SupplierYarnDetail['yarnType']) => {
    if (!yarnType) return 'Unknown type';
    if (typeof yarnType === 'string') {
      return yarnTypeMap[yarnType] || yarnType;
    }
    if (typeof yarnType === 'object') {
      if (yarnType.name) {
        return yarnType.name;
      }
      if (yarnType.id) {
        return yarnTypeMap[yarnType.id] || yarnType.id;
      }
    }
    return 'Unknown type';
  };

  const getYarnColorLabel = (color: SupplierYarnDetail['color']) => {
    if (!color) return 'Unknown color';
    if (typeof color === 'string') {
      return yarnColorMap[color] || color;
    }
    if (typeof color === 'object') {
      if (color.name) {
        return color.name;
      }
      if (color.id) {
        return yarnColorMap[color.id] || color.id;
      }
    }
    return 'Unknown color';
  };

  const getYarnSubtypeLabel = (subtype: SupplierYarnDetail['yarnsubtype']) => {
    if (!subtype) return '';
    if (typeof subtype === 'string') {
      return yarnSubtypeMap[subtype] || subtype;
    }
    if (typeof subtype === 'object') {
      if ('name' in subtype && subtype.name) return subtype.name;
      if ('id' in subtype && subtype.id) return yarnSubtypeMap[subtype.id] || subtype.id;
      return yarnSubtypeMap[(subtype as { _id?: string })._id || ''] || '';
    }
    return '';
  };

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [typesResponse, colorsResponse] = await Promise.all([
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 1000, page: 1 }),
        ]);

        const typeEntries = (typesResponse.results || []).map((type: YarnType) => [type.id, type.name]);
        const subtypeEntries = (typesResponse.results || []).flatMap((type: YarnType) => {
          if (!type.details || type.details.length === 0) {
            return [];
          }
          return type.details
            .map((detail) => {
              const subtypeId = detail.id || detail._id;
              if (!subtypeId) return null;
              return [subtypeId, detail.subtype] as const;
            })
            .filter(Boolean) as Array<readonly [string, string]>;
        });
        const colorEntries = (colorsResponse.results || []).map((color: YarnColor) => [color.id, color.name]);

        setYarnTypeMap(Object.fromEntries(typeEntries));
        setYarnSubtypeMap(Object.fromEntries(subtypeEntries));
        setYarnColorMap(Object.fromEntries(colorEntries));
      } catch (error) {
        console.error('Error loading yarn metadata:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn metadata');
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const params: SupplierQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery.trim()) {
        params.brandName = searchQuery.trim();
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data: SupplierListResponse = await supplierService.getSuppliers(params);
      setBrands(data.results || []);
      setTotalPages(data.totalPages || 1);
      setTotalResults(data.totalResults || 0);
      setSelectedBrands([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch brands');
      setBrands([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (brandId: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;

    setIsDeleting(true);
    setDeleteId(brandId);
    try {
      await supplierService.deleteSupplier(brandId);
      toast.success('Brand deleted successfully');
      await fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(brands.map((brand) => brand.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBrandSelect = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter((id) => id !== brandId));
    } else {
      setSelectedBrands([...selectedBrands, brandId]);
    }
  };

  const pagination = useMemo(() => {
    const pages: Array<number | '...'> = [];
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
  }, [currentPage, totalPages]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Brands" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Yarn Brands</h1>
              <Link href="/yarn-management/yarn-master/brand/add" className="ti-btn ti-btn-primary">
                <i className="ri-add-line me-2"></i> Add Brand
              </Link>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Status:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as typeof statusFilter);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search brands..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
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
              ) : brands.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Brands Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first brand.</p>
                  <Link href="/yarn-management/yarn-master/brand/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Brand
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
                          <th scope="col" className="text-start">Brand</th>
                          <th scope="col" className="text-start">Contact Person</th>
                          <th scope="col" className="text-start">Contact Info</th>
                          <th scope="col" className="text-start">Yarn Details</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brands.map((brand, index) => (
                          <tr
                            key={brand.id}
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedBrands.includes(brand.id)}
                                onChange={() => handleBrandSelect(brand.id)}
                              />
                            </td>
                            <td className="align-top">
                              <div className="font-semibold">{brand.brandName}</div>
                              <div className="text-xs text-gray-500 mt-1">{brand.address}</div>
                              {(brand.city || brand.state) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {[brand.city, brand.state].filter(Boolean).join(', ')}
                                </div>
                              )}
                              {brand.pincode ? (
                                <div className="text-xs text-gray-500 mt-1">Pincode: {brand.pincode}</div>
                              ) : null}
                              {brand.country ? (
                                <div className="text-xs text-gray-500 mt-1">Country: {brand.country}</div>
                              ) : null}
                              {brand.gstNo ? (
                                <div className="text-xs text-gray-500 mt-1">GST: {brand.gstNo}</div>
                              ) : null}
                            </td>
                            <td className="align-top">
                              <div>{brand.contactPersonName}</div>
                            </td>
                            <td className="align-top">
                              <div className="text-sm">{brand.contactNumber}</div>
                              <div className="text-xs text-primary break-all">{brand.email}</div>
                            </td>
                            <td className="align-top">
                              {brand.yarnDetails && brand.yarnDetails.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {brand.yarnDetails.map((detail, detailIndex) => {
                                    const yarnTypeLabel = getYarnTypeLabel(detail.yarnType);
                                    const yarnColorLabel = getYarnColorLabel(detail.color);
                                    const yarnSubtypeLabel = getYarnSubtypeLabel(detail.yarnsubtype);
                                    const shadeLabel =
                                      typeof detail.shadeNumber === 'string' && detail.shadeNumber.trim().length > 0
                                        ? detail.shadeNumber
                                        : 'N/A';
                                    return (
                                      <div
                                        key={`${brand.id}-yarn-${detailIndex}`}
                                        className="px-2 py-1 rounded bg-primary/10 text-primary text-xs"
                                      >
                                <span className="font-semibold">{yarnTypeLabel}</span>
                                        {yarnSubtypeLabel ? (
                                  <>
                                    <span className="mx-2">•</span>
                                            <span>{yarnSubtypeLabel}</span>
                                  </>
                                ) : null}
                                <span className="mx-2">•</span>
                                <span>{yarnColorLabel}</span>
                                {shadeLabel !== 'N/A' ? (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{shadeLabel}</span>
                                  </>
                                ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">No yarn details provided</span>
                              )}
                            </td>
                            <td className="align-top">
                              <span
                                className={`badge ${
                                  brand.status === 'active'
                                    ? 'bg-success'
                                    : brand.status === 'inactive'
                                    ? 'bg-warning text-white'
                                    : 'bg-danger'
                                }`}
                              >
                                {brand.status}
                              </span>
                            </td>
                            <td className="align-top">
                              <div className="flex space-x-2">
                                <Link
                                  href={`/yarn-management/yarn-master/brand/edit/${brand.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(brand.id)}
                                  disabled={isDeleting && deleteId === brand.id}
                                >
                                  {isDeleting && deleteId === brand.id ? (
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
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {pagination.map((page, idx) =>
                          page === '...'
                            ? (
                                <li key={`ellipsis-${idx}`} className="page-item">
                                  <span className="px-3">...</span>
                                </li>
                              )
                            : (
                                <li key={page} className="page-item">
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
                              ),
                        )}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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

export default BrandPage;

