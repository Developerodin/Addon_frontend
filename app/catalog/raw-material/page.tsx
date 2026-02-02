"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';

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
  articleNo: string;
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
  'Article No.'?: string;
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
      console.log("response",response);
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
      console.log("response",response);
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
        'GST %': mat.gst,
        'Article No.': mat.articleNo
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
              articleNo: String(row['Article No.'] || '').trim(),
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
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Raw Material"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Raw Material</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Raw Material Management"
                content={
                  <div>
                    <p className="mb-4">
                      This page allows you to manage raw materials used in your manufacturing processes.
                    </p>
                    <h4 className="font-semibold mb-2">What you can do:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>View Materials:</strong> See all raw materials with their specifications and details</li>
                      <li><strong>Add New Material:</strong> Create new raw material entries with complete specifications</li>
                      <li><strong>Edit Material:</strong> Modify existing material details, pricing, and specifications</li>
                      <li><strong>Delete Material:</strong> Remove materials that are no longer needed</li>
                      <li><strong>Bulk Operations:</strong> Select multiple materials for bulk deletion</li>
                      <li><strong>Import/Export:</strong> Import materials from Excel files or export existing data</li>
                      <li><strong>Search & Filter:</strong> Find specific materials using the search functionality</li>
                      <li><strong>Pagination:</strong> Navigate through large lists of materials efficiently</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Material Information:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>Name:</strong> The name of the raw material</li>
                      <li><strong>Group Name:</strong> Category or group classification</li>
                      <li><strong>Type:</strong> Type of material (fabric, thread, etc.)</li>
                      <li><strong>Brand:</strong> Brand or manufacturer of the material</li>
                      <li><strong>Count/Size:</strong> Material specifications like count or size</li>
                      <li><strong>Material:</strong> Base material composition</li>
                      <li><strong>Color & Shade:</strong> Color and shade specifications</li>
                      <li><strong>Unit:</strong> Unit of measurement (meters, pieces, etc.)</li>
                      <li><strong>MRP:</strong> Maximum Retail Price</li>
                      <li><strong>HSN Code:</strong> Harmonized System of Nomenclature code</li>
                      <li><strong>GST %:</strong> Goods and Services Tax percentage</li>
                      <li><strong>Article No:</strong> Unique article number for identification</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Tips:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use the import feature to bulk upload materials from Excel files</li>
                      <li>Ensure all required fields (Name, Unit) are filled when adding materials</li>
                      <li>Organize materials by groups for better inventory management</li>
                      <li>Keep HSN codes and GST rates updated for accurate tax calculations</li>
                    </ul>
                  </div>
                }
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>
              <div className="relative group">
                <select
                  value={itemsPerPage}
                  onChange={e => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 text-[#495057] text-[11px] font-medium rounded px-3 py-1.5 pr-8 focus:ring-0 focus:border-gray-300 appearance-none cursor-pointer"
                >
                  <option value={10}>Show 10</option>
                  <option value={50}>Show 50</option>
                  <option value={100}>Show 100</option>
                  <option value={500}>Show 500</option>
                  <option value={1000}>Show 1000</option>
                </select>
                <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImport} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm"
              >
                <i className="ri-upload-2-line text-xs"></i> Import
              </button>
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-download-2-line text-xs"></i> Export
              </button>
              {selectedMaterials.length > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm"
                  onClick={handleDeleteSelected}
                >
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedMaterials.length})
                </button>
              )}
              <Link
                href="/catalog/raw-material/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i> Add Material
              </Link>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-error-warning-line text-xl text-red-400"></i>
              </div>
              <p className="text-[12px] font-medium text-red-600">{error}</p>
            </div>
          ) : materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-stack-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <Link href="/catalog/raw-material/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Material
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Group Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Color</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Unit</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material) => (
                  <tr key={material.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedMaterials.includes(material.id)} onChange={() => handleMaterialSelect(material.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">{material.groupName}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{material.name}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.color}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{material.unit}</td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link href={`/catalog/raw-material/edit/${material.id}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </Link>
                        <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDelete(material.id)} title="Delete">
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!isLoading && !error && (
          <div className="p-[10px] pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 bg-white">
            <div className="text-[11px] font-medium text-[#495057] tracking-tight">
              Showing <span>{totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {totalResults === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalResults)}</span> of <span>{totalResults}</span> entries <span className="ml-1 opacity-50">→</span>
            </div>
            <div className="flex items-center">
              <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Prev</button>
              <div className="flex items-center gap-1 mx-2">
                {getPagination(currentPage, totalPages).map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span>
                  ) : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>
                      {page}
                    </button>
                  )
                )}
              </div>
              <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1.5 text-[11px] font-bold text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RawMaterialPage; 