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
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Colors" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Colors</h1>
              <div className="box-tools flex items-center space-x-2">
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
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                    disabled={isDeletingSelected}
                  >
                    {isDeletingSelected ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <i className="ri-delete-bin-line me-2"></i> Delete Selected ({selectedColors.length})
                      </>
                    )}
                  </button>
                )}
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
                <Link href="/yarn-management/yarn-master/color/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add Color
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
                    placeholder="Search colors..."
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
              ) : colors.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Colors Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first color.</p>
                  <Link href="/yarn-management/yarn-master/color/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Color
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
                          <th scope="col" className="text-start">Color Family Name</th>
                          <th scope="col" className="text-start">Pantone Name</th>
                          <th scope="col" className="text-start">Pantone Code</th>
                          <th scope="col" className="text-start">Created At</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {colors.map((color, index) => (
                          <tr 
                            key={color.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedColors.includes(color.id)}
                                onChange={() => {
                                  if (selectedColors.includes(color.id)) {
                                    setSelectedColors(selectedColors.filter(id => id !== color.id));
                                  } else {
                                    setSelectedColors([...selectedColors, color.id]);
                                  }
                                }}
                              />
                            </td>
                            <td>{color.name}</td>
                            <td>{color.pantoneName || '-'}</td>
                            <td>{color.colorCode}</td>
                            <td>{color.createdAt ? new Date(color.createdAt).toLocaleString() : '-'}</td>
                            <td>
                              <span className={`badge ${color.status === 'active' ? 'bg-success' : 'bg-danger'}`}>
                                {color.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/yarn-management/yarn-master/color/edit/${color.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(color.id)}
                                  disabled={isDeleting && deleteId === color.id}
                                >
                                  {isDeleting && deleteId === color.id ? (
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

export default ColorPage;


