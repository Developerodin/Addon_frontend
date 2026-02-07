"use client";
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';
import * as XLSX from 'xlsx';

const ColorPage = () => {
  const [colors, setColors] = useState<YarnColor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  useEffect(() => {
    fetchColors();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchColors = async () => {
    setIsLoading(true);
    try {
      const response = await yarnColorService.getColors({
        page: currentPage,
        limit: itemsPerPage,
        name: searchQuery.trim() || undefined,
      });
      const formattedResults = (response.results || []).map(color => ({
        ...color,
        colorCode: color.colorCode ? color.colorCode.toUpperCase() : '#000000',
        pantoneName: color.pantoneName || '',
      }));
      setColors(formattedResults);
      setTotalPages(response.totalPages || 1);
      setTotalResults(response.totalResults || 0);
      setSelectedColors([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching colors:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch colors');
      setColors([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (colorId: string) => {
    if (!window.confirm('Are you sure you want to delete this color?')) return;
    
    setIsDeleting(true);
    setDeleteId(colorId);
    try {
      await yarnColorService.deleteColor(colorId);
      toast.success('Color deleted successfully');
      await fetchColors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete color');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedColors([]);
    } else {
      setSelectedColors(colors.map(c => c.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDeleteSelected = async () => {
    if (selectedColors.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedColors.length} selected color(s)?`)) return;
    
    setIsDeletingSelected(true);
    try {
      await Promise.all(selectedColors.map(id => yarnColorService.deleteColor(id)));
      toast.success(`${selectedColors.length} color(s) deleted successfully`);
      setSelectedColors([]);
      setSelectAll(false);
      await fetchColors();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete selected colors');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet([
        { 'Color Family Name': 'Ocean Blue', 'Pantone Name': 'Blue 072 C', 'Pantone Code': '#1E90FF', Status: 'active' },
        { 'Color Family Name': 'Sunset Orange', 'Pantone Name': 'Orange 021 C', 'Pantone Code': '#FF4500', Status: 'inactive' },
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Colors');
      XLSX.writeFile(workbook, 'yarn-colors-template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading color template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleExport = async () => {
    try {
      const response = await yarnColorService.getColors({
        page: 1,
        limit: 10000,
      });
      const allColors = (response.results || []).map(color => ({
        ...color,
        colorCode: color.colorCode ? color.colorCode.toUpperCase() : '#000000',
        pantoneName: color.pantoneName || '',
      }));
      const exportSource =
        selectedColors.length > 0
          ? allColors.filter(color => selectedColors.includes(color.id))
          : allColors;

      if (exportSource.length === 0) {
        toast.error('No colors available for export');
        return;
      }

      const exportData = exportSource.map(color => ({
        ID: color.id,
        'Color Family Name': color.name,
        'Pantone Name': color.pantoneName || '',
        'Pantone Code': color.colorCode,
        Status: color.status,
        'Created At': color.createdAt ? new Date(color.createdAt).toLocaleString() : '',
        'Updated At': color.updatedAt ? new Date(color.updatedAt).toLocaleString() : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 20 }, // ID
        { wch: 30 }, // Color Family Name
        { wch: 25 }, // Pantone Name
        { wch: 18 }, // Pantone Code
        { wch: 10 }, // Status
        { wch: 22 }, // Created At
        { wch: 22 }, // Updated At
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Colors');
      XLSX.writeFile(workbook, 'yarn-colors.xlsx');
      toast.success('Colors exported successfully');
    } catch (error) {
      console.error('Error exporting colors:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export colors');
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
        
        // Read all rows including empty ones, then filter
        const jsonData: Array<
          {
            ID?: string;
            'Color Family Name'?: string;
            Name?: string;
            'Pantone Name'?: string;
            'Pantone Code'?: string;
            'Color Code'?: string;
            Status?: string;
          }
        > = XLSX.utils.sheet_to_json(worksheet, { 
          defval: '', // Default value for empty cells
          raw: false // Convert all values to strings
        });

        console.log(`Total rows read from Excel: ${jsonData.length}`);

        if (jsonData.length === 0) {
          throw new Error('Import file is empty');
        }

        const existingResponse = await yarnColorService.getColors({ page: 1, limit: 10000 });
        const existingColors = existingResponse.results || [];
        const colorsById = new Map(existingColors.map(color => [color.id, color]));

        const normalizedColors: Array<{
          id?: string;
          name: string;
          colorCode: string;
          pantoneName?: string;
          status: 'active' | 'inactive';
        }> = [];

        const errors: string[] = [];
        let processed = 0;
        let skipped = 0;

        for (let rowIndex = 0; rowIndex < jsonData.length; rowIndex++) {
          const row = jsonData[rowIndex];
          try {
            const rawName =
              row['Color Family Name']?.toString().trim() ??
              row.Name?.toString().trim() ??
              '';
            const rawPantoneName = row['Pantone Name']?.toString().trim() ?? '';
            const rawColorCode =
              row['Pantone Code']?.toString().trim() ??
              row['Color Code']?.toString().trim() ??
              '';
            const rawStatus = row.Status?.toString().trim().toLowerCase() ?? 'active';

            // Skip empty rows but don't count as error
            if (!rawName && !rawColorCode && !rawPantoneName) {
              skipped++;
              continue;
            }

            if (!rawName) {
              errors.push(`Row ${rowIndex + 2}: Name is required (skipped)`);
              skipped++;
              continue;
            }

            const status: 'active' | 'inactive' =
              rawStatus === 'inactive' ? 'inactive' : 'active';

            // Only match by ID if provided - allow duplicate names
            const idFromRow = row.ID?.toString().trim();
            const existingById = idFromRow ? colorsById.get(idFromRow) : undefined;
            const finalId = existingById?.id;

            // Add to array - allow duplicates by name
            normalizedColors.push({
              ...(finalId ? { id: finalId } : {}),
              name: rawName,
              colorCode: rawColorCode || '#000000', // Default color code if not provided
              ...(rawPantoneName ? { pantoneName: rawPantoneName } : {}),
              status,
            });
          } catch (rowError) {
            errors.push(`Row ${rowIndex + 2}: ${rowError instanceof Error ? rowError.message : 'Unknown error'}`);
            skipped++;
            console.error(`Error importing color row ${rowIndex + 2}:`, rowError, row);
          } finally {
            processed += 1;
            setImportProgress(Math.min(95, Math.round((processed / jsonData.length) * 90)));
          }
        }

        // Log summary
        console.log(`Import Summary: Total rows: ${jsonData.length}, Processed: ${processed}, Valid: ${normalizedColors.length}, Skipped: ${skipped}`);
        if (errors.length > 0) {
          console.warn('Import errors:', errors);
        }

        const colorsPayload = normalizedColors;

        if (colorsPayload.length === 0) {
          throw new Error('No valid color records found in the import file');
        }

        if (colorsPayload.length > 1000) {
          throw new Error('A maximum of 1000 colors can be imported at once');
        }

        await yarnColorService.bulkImportColors({ colors: colorsPayload });
        setImportProgress(100);

        await fetchColors();
        
        // Show detailed success message
        const successMessage = skipped > 0
          ? `Colors imported successfully! ${colorsPayload.length} imported, ${skipped} skipped. ${errors.length > 0 ? `Check console for details.` : ''}`
          : `Colors imported successfully! ${colorsPayload.length} color(s) imported.`;
        
        toast.success(successMessage);
        
        if (errors.length > 0 && errors.length <= 10) {
          // Show first few errors if not too many
          setTimeout(() => {
            toast.error(`Some rows were skipped: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}`, { duration: 5000 });
          }, 1000);
        }
      } catch (error) {
        console.error('Error processing import file:', error);
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
      <Seo title="Colors" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Colors</h1>
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
              {selectedColors.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-[11px] font-bold rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                  onClick={handleDeleteSelected}
                  disabled={isDeletingSelected}
                >
                  {isDeletingSelected ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                      Deleting
                    </>
                  ) : (
                    <>
                      <i className="ri-delete-bin-line"></i> Delete ({selectedColors.length})
                    </>
                  )}
                </button>
              )}
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
                href="/yarn-management/yarn-master/color/add"
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
                <option value={500}>500</option>
                <option value={1000}>1000</option>
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
          ) : colors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center min-h-[300px]">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-2">No Colors</h3>
              <Link
                href="/yarn-management/yarn-master/color/add"
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
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Color Family Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pantone Code</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Pantone Name</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Created At</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Status</th>
                      <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colors.map((color) => (
                      <tr key={color.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                          <input
                            type="checkbox"
                            checked={selectedColors.includes(color.id)}
                            onChange={() => {
                              if (selectedColors.includes(color.id)) {
                                setSelectedColors(selectedColors.filter(id => id !== color.id));
                              } else {
                                setSelectedColors([...selectedColors, color.id]);
                              }
                            }}
                            className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-800 border border-gray-200">{color.name}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">{color.pantoneName || '-'}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-800 border border-gray-200">{color.colorCode}</td>
                        <td className="px-1.5 py-2.5 text-[12px] text-gray-600 border border-gray-200">{color.createdAt ? new Date(color.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-1.5 py-2.5 border border-gray-200">
                          <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${color.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {color.status}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/yarn-management/yarn-master/color/edit/${color.id}`}
                              className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                            >
                              <i className="ri-edit-line text-sm"></i>
                            </Link>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-600 border border-red-100 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                              onClick={() => handleDelete(color.id)}
                              disabled={isDeleting && deleteId === color.id}
                            >
                              {isDeleting && deleteId === color.id ? (
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

export default ColorPage;


