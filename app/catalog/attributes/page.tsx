"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface AttributeValue {
  id: number;
  name: string;
  image: string | null;
  sortOrder: number;
}

interface Attribute {
  id: number;
  name: string;
  type: string;
  sortOrder: number;
  optionValues: AttributeValue[];
}

interface ApiResponse {
  results: Attribute[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ExcelAttribute {
  'Attribute Name': string;
  'Type': string;
  'Values': string;
  'Sort Order': number;
}

const AttributesPage = () => {
  const [selectedAttributes, setSelectedAttributes] = useState<number[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  // Fetch attributes from API
  const fetchAttributes = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/product-attributes?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch attributes');
      }
      const data: ApiResponse = await response.json();
      setAttributes(data.results || []);
      setTotalResults(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch attributes');
      setAttributes([]);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAttributes([]);
    } else {
      setSelectedAttributes(attributes.map(attr => attr.id));
    }
    setSelectAll(!selectAll);
  };

  const handleAttributeSelect = (attributeId: number) => {
    if (selectedAttributes.includes(attributeId)) {
      setSelectedAttributes(selectedAttributes.filter(id => id !== attributeId));
    } else {
      setSelectedAttributes([...selectedAttributes, attributeId]);
    }
  };

  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAttributes = attributes.slice(startIndex, endIndex);
  
  console.log('Current attributes being displayed:', currentAttributes);

  const handleExport = async () => {
    try {
      // Fetch all attributes for export
      const response = await fetch(`${API_BASE_URL}/product-attributes?page=1&limit=10000`);
      if (!response.ok) throw new Error('Failed to fetch all attributes for export');
      const data: ApiResponse = await response.json();
      const allAttributes = data.results || [];
      const exportSource = selectedAttributes.length > 0
        ? allAttributes.filter(attr => selectedAttributes.includes(attr.id))
        : allAttributes;
      const exportData = exportSource.map(attr => ({
        'ID': attr.id,
        'Attribute Name': attr.name,
        'Type': attr.type,
        'Values': attr.optionValues.map(v => v.name).join(', '),
        'Sort Order': attr.sortOrder
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 10 },
        { wch: 20 },
        { wch: 15 },
        { wch: 40 },
        { wch: 10 },
      ];
      ws['!cols'] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Attributes');
      XLSX.writeFile(wb, 'attributes.xlsx');
    } catch (err) {
      toast.error('Failed to export attributes');
    }
  };

  const handleDelete = async (attributeId: number) => {
    try {
      setIsDeleting(true);
      setDeleteId(attributeId);

      const response = await fetch(`${API_BASE_URL}/product-attributes/${attributeId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete attribute');
      }

      // Always refetch from backend after delete
      await fetchAttributes();

      toast.success('Attribute deleted successfully');
    } catch (err) {
      console.error('Error deleting attribute:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete attribute');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const confirmDelete = (attributeId: number) => {
    if (window.confirm('Are you sure you want to delete this attribute? This action cannot be undone.')) {
      handleDelete(attributeId);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setImportProgress(0);
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: (ExcelAttribute & { ID?: number })[] = XLSX.utils.sheet_to_json(worksheet);

        let processed = 0;
        for (const row of jsonData) {
          try {
            console.log('Processing row:', row);
            // Ensure type is valid
            const validTypes = ['select', 'radio', 'checkbox'];
            const type = row['Type']?.toLowerCase() || 'select';
            if (!validTypes.includes(type)) {
              throw new Error(`Invalid type: ${row['Type']} for attribute: ${row['Attribute Name']}`);
            }
            const attributeData = {
              name: row['Attribute Name'],
              type: type,
              sortOrder: Number(row['Sort Order']) || 0,
              optionValues: (row['Values'] || '')
                .split(',')
                .map(value => value.trim())
                .filter(value => value)
                .map((name, index) => ({
                  name,
                  sortOrder: index,
                  image: 'null'
                }))
            };
            // Upsert logic: try by ID, then by name
            let response, responseData;
            if (row.ID) {
              // Try to update by ID
              const existingById = attributes.find(attr => attr.id === row.ID);
              if (existingById) {
                response = await fetch(`${API_BASE_URL}/product-attributes/${row.ID}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(attributeData)
                });
                responseData = await response.json();
                if (!response.ok) {
                  throw new Error(responseData.message || `Failed to update attribute: ${attributeData.name}`);
                }
                continue;
              }
            }
            // Fallback: update by name
            const existingByName = attributes.find(attr => attr.name.trim().toLowerCase() === attributeData.name.trim().toLowerCase());
            if (existingByName) {
              response = await fetch(`${API_BASE_URL}/product-attributes/${existingByName.id}`, {
                method: 'PATCH',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(attributeData)
              });
              responseData = await response.json();
              if (!response.ok) {
                throw new Error(responseData.message || `Failed to update attribute: ${attributeData.name}`);
              }
            } else {
              // Create new attribute
              response = await fetch(`${API_BASE_URL}/product-attributes`, {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(attributeData)
              });
              responseData = await response.json();
            }
          } catch (err) {
            console.error('Error importing attribute:', err);
          }
          processed++;
          setImportProgress(Math.round((processed / jsonData.length) * 100));
        }
        // Refresh the attributes list
        await fetchAttributes();
        setImportProgress(null);
        toast.success('Import completed');
      };

      reader.onerror = (error) => {
        setImportProgress(null);
        throw new Error('Failed to read file');
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      setImportProgress(null);
      toast.error('Failed to process import file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    if (!window.confirm('Are you sure you want to delete all selected attributes? This action cannot be undone.')) return;
    setIsBulkDeleting(true);
    try {
      for (const id of selectedAttributes) {
        await fetch(`${API_BASE_URL}/product-attributes/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
      }
      // Always refetch from backend after bulk delete
      await fetchAttributes();
      setSelectedAttributes([]);
      setSelectAll(false);
      toast.success('Selected attributes deleted successfully');
    } catch (err) {
      toast.error('Failed to delete selected attributes');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Add a helper function to generate condensed pagination
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
      <Seo title="Attributes"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Attributes</h1>
              <div className="box-tools flex items-center space-x-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <button 
                  type="button" 
                  className="ti-btn ti-btn-success"
                  onClick={handleImportClick}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line me-2"></i> Import
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="ti-btn ti-btn-info"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/catalog/attributes/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Attribute
                </Link>
              </div>
            </div>
          </div>

          {/* Content Box */}
          <div className="box">
            <div className="box-body">
              {/* Search Bar */}
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
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by attribute name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {selectedAttributes.length > 0 && (
                <button className="ti-btn ti-btn-danger mb-4" onClick={handleBulkDelete} disabled={isBulkDeleting}>
                  {isBulkDeleting ? 'Deleting...' : `Delete All (${selectedAttributes.length})`}
                </button>
              )}

              {importProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-200"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-3xl mb-2"></i>
                  <p>{error}</p>
                </div>
              ) : attributes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <i className="ri-list-check text-4xl text-primary"></i>
                    </div>
                    <h3 className="text-xl font-medium mb-2">No Attributes Found</h3>
                    <p className="text-gray-500 text-center mb-6">Start by adding your first attribute.</p>
                    <Link href="/catalog/attributes/add" className="ti-btn ti-btn-primary">
                      <i className="ri-add-line me-2"></i> Add First Attribute
                    </Link>
                  </div>
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
                          <th scope="col" className="text-start">Attribute Name</th>
                          <th scope="col" className="text-start">Type</th>
                          <th scope="col" className="text-start w-80 text-base">Values</th>
                          <th scope="col" className="text-start">Sort Order</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attributes.map((attribute, index) => (
                          <tr 
                            key={attribute.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedAttributes.includes(attribute.id)}
                                onChange={() => handleAttributeSelect(attribute.id)}
                              />
                            </td>
                            <td>{attribute.name}</td>
                            <td>
                              <span className="badge bg-light text-default">
                                {attribute.type}
                              </span>
                            </td>
                            <td className="w-80 truncate align-top text-base">
                              <div className="flex flex-wrap gap-1">
                                {attribute.optionValues?.map((value, i) => (
                                  <span key={i} className="badge bg-gray-100 text-gray-600">
                                    {value.name}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td>{attribute.sortOrder}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/attributes/edit/${attribute.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => confirmDelete(attribute.id)}
                                  disabled={isDeleting || isBulkDeleting || (isDeleting && deleteId === attribute.id)}
                                >
                                  {isDeleting && deleteId === attribute.id ? (
                                    <div className="flex items-center">
                                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                      <i className="ri-delete-bin-line"></i>
                                    </div>
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

                  {/* Pagination */}
                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
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

export default AttributesPage; 