"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnCountSizeService, { CountSize } from '@/shared/services/yarnCountSizeService';
import * as XLSX from 'xlsx';

const CountSizePage = () => {
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  useEffect(() => {
    fetchCountSizes();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchCountSizes = async () => {
    setIsLoading(true);
    try {
      const response = await yarnCountSizeService.getCountSizes({
        page: currentPage,
        limit: itemsPerPage,
        name: searchQuery.trim() || undefined,
      });
      setCountSizes(response.results || []);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
      setSelectedItems([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching count/sizes:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch count/sizes');
      setCountSizes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this count/size?')) return;
    
    setIsDeleting(true);
    setDeleteId(itemId);
    try {
      await yarnCountSizeService.deleteCountSize(itemId);
      toast.success('Count/Size deleted successfully');
      await fetchCountSizes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete count/size');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(countSizes.map(item => item.id));
    }
    setSelectAll(!selectAll);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([
        { Name: '40s', Status: 'active' },
        { Name: '44s', Status: 'inactive' },
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CountSizes');
      XLSX.writeFile(workbook, 'yarn-count-sizes-template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading count/size template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const response = await yarnCountSizeService.getCountSizes({
        page: 1,
        limit: 10000,
      });
      const allCountSizes = response.results || [];
      const exportSource =
        selectedItems.length > 0
          ? allCountSizes.filter(item => selectedItems.includes(item.id))
          : allCountSizes;

      if (exportSource.length === 0) {
        toast.error('No count/size records available for export');
        return;
      }

      const exportData = exportSource.map(item => ({
        ID: item.id,
        Name: item.name,
        Status: item.status,
        'Created At': item.createdAt ? new Date(item.createdAt).toLocaleString() : '',
        'Updated At': item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 30 },
        { wch: 10 },
        { wch: 22 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'CountSizes');
      XLSX.writeFile(workbook, 'yarn-count-sizes.xlsx');
      toast.success('Count/Size records exported successfully');
    } catch (error) {
      console.error('Error exporting count/size records:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export count/size records');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async event => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('Unable to read file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: Array<{ ID?: string; Name?: string; Status?: string }> =
          XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
          throw new Error('Import file is empty');
        }

        const existingResponse = await yarnCountSizeService.getCountSizes({ page: 1, limit: 10000 });
        const existingItems = existingResponse.results || [];
        const itemsById = new Map(existingItems.map(item => [item.id, item]));
        const itemsByName = new Map(
          existingItems.map(item => [item.name.trim().toLowerCase(), item]),
        );

        const normalizedCountSizes = new Map<
          string,
          {
            id?: string;
            name: string;
            status: 'active' | 'inactive';
          }
        >();

        let processed = 0;
        for (const row of jsonData) {
          try {
            const rawName = row.Name?.toString().trim() ?? '';
            const rawStatus = row.Status?.toString().trim().toLowerCase() ?? 'active';

            if (!rawName) {
              throw new Error('Name is required');
            }

            const status: 'active' | 'inactive' = rawStatus === 'inactive' ? 'inactive' : 'active';

            const idFromRow = row.ID?.toString().trim();
            const normalizedNameKey = rawName.toLowerCase();
            const existingById = idFromRow ? itemsById.get(idFromRow) : undefined;
            const existingByName = itemsByName.get(normalizedNameKey);
            const finalId = existingById?.id ?? existingByName?.id;
            const key = finalId ?? normalizedNameKey;

            normalizedCountSizes.set(key, {
              ...(finalId ? { id: finalId } : {}),
              name: rawName,
              status,
            });
          } catch (rowError) {
            console.error('Error importing count/size row:', rowError);
          } finally {
            processed += 1;
            setImportProgress(Math.min(95, Math.round((processed / jsonData.length) * 90)));
          }
        }

        const countSizesPayload = Array.from(normalizedCountSizes.values());

        if (countSizesPayload.length === 0) {
          throw new Error('No valid count/size records found in the import file');
        }

        if (countSizesPayload.length > 1000) {
          throw new Error('A maximum of 1000 count/size records can be imported at once');
        }

        await yarnCountSizeService.bulkImportCountSizes({ countSizes: countSizesPayload });
        setImportProgress(100);

        await fetchCountSizes();
        toast.success('Count/Size records imported successfully');
      } catch (error) {
        console.error('Error processing count/size import file:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to process import file');
      } finally {
        setImportProgress(null);
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read import file');
      setImportProgress(null);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
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
      <Seo title="Count/Size" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Count/Size</h1>
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
                    className="ti-btn ti-btn-secondary"
                    onClick={handleDownloadTemplate}
                  >
                    <i className="ri-download-line me-2"></i> Download Template
                  </button>
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
                <button type="button" className="ti-btn ti-btn-info" onClick={handleExport}>
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/yarn-management/yarn-master/count-size/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add Count/Size
                </Link>
              </div>
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
                    placeholder="Search count/size..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

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
              ) : countSizes.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Count/Size Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first count/size.</p>
                  <Link href="/yarn-management/yarn-master/count-size/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Count/Size
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
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Created At</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {countSizes.map((item, index) => (
                          <tr 
                            key={item.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedItems.includes(item.id)}
                                onChange={() => {
                                  if (selectedItems.includes(item.id)) {
                                    setSelectedItems(selectedItems.filter(id => id !== item.id));
                                  } else {
                                    setSelectedItems([...selectedItems, item.id]);
                                  }
                                }}
                              />
                            </td>
                            <td>{item.name}</td>
                            <td>
                              <span className={`badge ${item.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td>{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/yarn-management/yarn-master/count-size/edit/${item.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(item.id)}
                                  disabled={isDeleting && deleteId === item.id}
                                >
                                  {isDeleting && deleteId === item.id ? (
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

export default CountSizePage;


