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
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Count/Size" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Count/Size</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={handleDownloadTemplate}
              >
                <i className="ri-download-line"></i> Template
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-[11px] font-bold rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                    Importing
                  </>
                ) : (
                  <>
                    <i className="ri-file-excel-2-line"></i> Import
                  </>
                )}
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={handleExport}
              >
                <i className="ri-download-2-line"></i> Export
              </button>
              <Link
                href="/yarn-management/yarn-master/count-size/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line"></i> Add
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-medium text-gray-600">Rows:</label>
              <select
                className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300"
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
            <div className="relative">
              <input
                type="text"
                className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 font-medium"
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
            </div>
          </div>

          {importProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-200"
                style={{ width: `${importProgress}%` }}
              ></div>
              <div className="text-[10px] text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-16 min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 opacity-50"></div>
            </div>
          ) : countSizes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-2">No Count/Size</h3>
              <Link
                href="/yarn-management/yarn-master/count-size/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
              >
                <i className="ri-add-line"></i> Add First
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                        />
                      </th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                      <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countSizes.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.id)}
                            onChange={() => {
                              if (selectedItems.includes(item.id)) {
                                setSelectedItems(selectedItems.filter(id => id !== item.id));
                              } else {
                                setSelectedItems([...selectedItems, item.id]);
                              }
                            }}
                            className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">{item.name}</td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${item.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">
                          {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/yarn-management/yarn-master/count-size/edit/${item.id}`}
                              className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </Link>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                              onClick={() => handleDelete(item.id)}
                              disabled={isDeleting && deleteId === item.id}
                            >
                              {isDeleting && deleteId === item.id ? (
                                <div className="animate-spin h-3.5 w-3.5 border-2 border-red-600 border-t-transparent rounded-full"></div>
                              ) : (
                                <i className="ri-delete-bin-line text-sm"></i>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
                <div className="text-[11px] font-medium text-[#495057] tracking-tight">
                  Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults}
                </div>
                <nav className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {getPagination(currentPage, totalPages).map((page, idx) =>
                    page === '...' ? (
                      <span key={'ellipsis-' + idx} className="px-2 text-[11px] text-gray-400">...</span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${
                          currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        onClick={() => setCurrentPage(Number(page))}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>
                </nav>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CountSizePage;


