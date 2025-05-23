"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface RawMaterial {
  id: string;
  name: string;
  groupName: string;
  type: string;
  description: string;
  brand: string;
  countSize: string;
  material: string;
  color: string;
  shade: string;
  unit: string;
  mrp: string;
  hsnCode: string;
  gst: string;
}

interface ExcelRow {
  'ID'?: string;
  'Name'?: string;
  'Group Name'?: string;
  'Type'?: string;
  'Description'?: string;
  'Brand'?: string;
  'Count/Size'?: string;
  'Material'?: string;
  'Color'?: string;
  'Shade'?: string;
  'Unit'?: string;
  'MRP'?: string;
  'HSN Code'?: string;
  'GST %'?: string;
  [key: string]: string | undefined;
}

const RawMaterialPage = () => {
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const REQUIRED_FIELDS = ['name', 'unit'];

  // Fetch raw materials from API (with pagination and search)
  const fetchMaterials = async (page = 1, limit = itemsPerPage, search = '') => {
    try {
      setIsLoading(true);
      setError(null);
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : '';
      const response = await fetch(`${API_BASE_URL}/raw-materials?page=${page}&limit=${limit}${searchParam}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch raw materials');
      }
      const data = await response.json();
      const materialsArray = Array.isArray(data.results) ? data.results : [];
      setMaterials(materialsArray);
      setTotalResults(data.totalResults || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch raw materials');
      setMaterials([]);
      setTotalPages(1);
      toast.error('Failed to load raw materials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials(currentPage, itemsPerPage, searchQuery);
  }, [currentPage, itemsPerPage, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(materials.map(mat => mat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleMaterialSelect = (materialId: string) => {
    if (selectedMaterials.includes(materialId)) {
      setSelectedMaterials(selectedMaterials.filter(id => id !== materialId));
    } else {
      setSelectedMaterials([...selectedMaterials, materialId]);
    }
  };

  const handleExport = async () => {
    try {
      // Always fetch all raw materials for export
      const response = await fetch(`${API_BASE_URL}/raw-materials?page=1&limit=100000`);
      if (!response.ok) throw new Error('Failed to fetch all raw materials for export');
      const data = await response.json();
      const exportSource = Array.isArray(data.results) ? data.results : [];
      const exportData = exportSource.map((mat: RawMaterial) => ({
        'ID': mat.id,
        'Name': mat.name,
        'Group Name': mat.groupName,
        'Type': mat.type,
        'Description': mat.description,
        'Brand': mat.brand,
        'Count/Size': mat.countSize,
        'Material': mat.material,
        'Color': mat.color,
        'Shade': mat.shade,
        'Unit': mat.unit,
        'MRP': mat.mrp,
        'HSN Code': mat.hsnCode,
        'GST %': mat.gst
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Raw Materials');
      const fileName = `raw-materials_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Raw materials exported successfully');
    } catch (error) {
      console.error('Error exporting raw materials:', error);
      toast.error('Failed to export raw materials');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedMaterials.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedMaterials.length} selected material(s)?`)) {
      try {
        for (const id of selectedMaterials) {
          const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
            method: 'DELETE',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to delete material: ${id}`);
          }
        }

        toast.success('Selected materials deleted successfully');
        setSelectedMaterials([]);
        fetchMaterials(); // Refresh the list
      } catch (err) {
        console.error('Error deleting materials:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete materials');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      try {
        const response = await fetch(`${API_BASE_URL}/raw-materials/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete material');
        }

        toast.success('Material deleted successfully');
        fetchMaterials(); // Refresh the list
      } catch (err) {
        console.error('Error deleting material:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete material');
      }
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing materials...');
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
          let successCount = 0;
          let errorCount = 0;
          let skippedCount = 0;
          let firstErrorMsg = '';
          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            // Map all fields as strings
            const material = {
              name: String(row['Name'] || '').trim(),
              groupName: String(row['Group Name'] || '').trim(),
              type: String(row['Type'] || '').trim(),
              description: String(row['Description'] || '').trim(),
              brand: String(row['Brand'] || '').trim(),
              countSize: String(row['Count/Size'] || '').trim(),
              material: String(row['Material'] || '').trim(),
              color: String(row['Color'] || '').trim(),
              shade: String(row['Shade'] || '').trim(),
              unit: String(row['Unit'] || '').trim(),
              mrp: String(row['MRP'] || '').trim(),
              hsnCode: String(row['HSN Code'] || '').trim(),
              gst: String(row['GST %'] || '').trim(),
              image: 'null'
            };
            console.log('Importing material:', material);
            // Validate all required fields
            const missingFields = REQUIRED_FIELDS.filter(f => !material[f as keyof typeof material]);
            if (missingFields.length > 0) {
              skippedCount++;
              if (!firstErrorMsg) firstErrorMsg = `Row ${i + 2}: Missing required fields: ${missingFields.join(', ')}`;
              continue;
            }
            let materialId = row['ID'];
            // If ID is present, update; if not, always create new (do not upsert by name)
            try {
              if (materialId) {
                // Update existing
                const patchResponse = await fetch(`${API_BASE_URL}/raw-materials/${materialId}`, {
                  method: 'PATCH',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(material),
                });
                const patchResult = await patchResponse.clone().json().catch(() => ({}));
                console.log('PATCH response:', patchResponse.status, patchResult);
                if (!patchResponse.ok) {
                  const errData = patchResult;
                  throw new Error(errData.message || 'Failed to update');
                }
                successCount++;
              } else {
                // Create new
                const postResponse = await fetch(`${API_BASE_URL}/raw-materials`, {
                  method: 'POST',
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(material),
                });
                const postResult = await postResponse.clone().json().catch(() => ({}));
                console.log('POST response:', postResponse.status, postResult);
                if (!postResponse.ok) {
                  const errData = postResult;
                  throw new Error(errData.message || 'Failed to create');
                }
                successCount++;
              }
            } catch (error: any) {
              errorCount++;
              console.error('Import error:', error);
              if (!firstErrorMsg) firstErrorMsg = `Row ${i + 2}: ${error.message || 'Unknown error'}`;
            }
            setImportProgress(Math.round(((i + 1) / jsonData.length) * 100));
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
          setImportProgress(null);
          toast.dismiss(loadingToast);
          if (successCount > 0) toast.success(`Successfully imported/updated ${successCount} materials`);
          if (errorCount > 0) toast.error(`Failed to import/update ${errorCount} materials. ${firstErrorMsg}`);
          if (skippedCount > 0) toast.error(`Skipped ${skippedCount} row(s) due to missing required fields. ${firstErrorMsg}`);
          fetchMaterials();
        } catch (err: any) {
          setImportProgress(null);
          toast.error('Failed to process import file: ' + (err.message || ''), { id: loadingToast });
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err: any) {
      setImportProgress(null);
      toast.error('Failed to import materials: ' + (err.message || ''), { id: loadingToast });
    }
  };

  // Filter materials based on search query
  const filteredMaterials = materials.filter(material =>
    (material.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (material.color?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Condensed pagination helper
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
      <Seo title="Raw Material"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Raw Material</h1>
              <div className="box-tools flex items-center space-x-2">
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleImport}
                  />
                  <button
                    type="button"
                    className="ti-btn ti-btn-success"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="ri-upload-2-line me-2"></i> Import
                  </button>
                </div>
                {importProgress !== null && (
                  <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                    <span className="ml-2 text-xs text-gray-700">{importProgress}%</span>
                  </div>
                )}
                <button
                  type="button"
                  className="ti-btn ti-btn-primary"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                {selectedMaterials.length > 0 && (
                  <button 
                    type="button" 
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i> 
                    Delete Selected ({selectedMaterials.length})
                  </button>
                )}
                <Link href="/catalog/raw-material/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add Raw Material
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
                    placeholder="Search by material name or color..."
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
              ) : error ? (
                <div className="text-center py-8 text-red-500">
                  <i className="ri-error-warning-line text-3xl mb-2"></i>
                  <p>{error}</p>
                </div>
              ) : (
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
                        <th scope="col" className="text-start">Group Name</th>
                        <th scope="col" className="text-start">Name</th>
                        <th scope="col" className="text-start">Color</th>
                        <th scope="col" className="text-start">Unit</th>
                        <th scope="col" className="text-start">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {materials.length > 0 ? (
                        materials.map((material, index) => (
                          <tr 
                            key={material.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedMaterials.includes(material.id)}
                                onChange={() => handleMaterialSelect(material.id)}
                              />
                            </td>
                            <td>{material.groupName}</td>
                            <td className="font-medium">{material.name}</td>
                            <td>{material.color}</td>
                            <td>{material.unit}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/raw-material/edit/${material.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(material.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <i className="ri-stack-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">No Raw Materials Found</h3>
                              <p className="text-gray-500 text-center mb-6">Start by adding your first raw material.</p>
                              <Link href="/catalog/raw-material/add" className="ti-btn ti-btn-primary">
                                <i className="ri-add-line me-2"></i> Add First Material
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {!isLoading && !error && (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawMaterialPage; 