"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';

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
  attributeType?: string; // 'Manufacturing' | 'Warehouse', default 'Manufacturing'
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
  'Attribute Type'?: string;
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
        'Attribute Type': attr.attributeType ?? 'Manufacturing',
        'Values': attr.optionValues.map(v => v.name).join(', '),
        'Sort Order': attr.sortOrder
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 10 },
        { wch: 20 },
        { wch: 15 },
        { wch: 14 },
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
            const attrType = (row['Attribute Type'] ?? 'Manufacturing').trim();
            const validAttrTypes = ['Manufacturing', 'Warehouse'];
            const attributeType = validAttrTypes.includes(attrType) ? attrType : 'Manufacturing';
            const attributeData = {
              name: row['Attribute Name'],
              type: type,
              attributeType,
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
    <div className="main-content !p-[10px]">
      <Toaster position="top-right" />
      <Seo title="Attributes"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Attributes</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
              <HelpIcon
                title="Product Attributes Management"
                content={
                  <div>
                    <p className="mb-4">This page allows you to manage product attributes that define the characteristics and properties of your products.</p>
                    <h4 className="font-semibold mb-2">What you can do:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>View Attributes:</strong> See all product attributes with their types and values</li>
                      <li><strong>Add New Attribute:</strong> Create new product attributes with custom types and values</li>
                      <li><strong>Edit Attribute:</strong> Modify existing attribute details, types, and option values</li>
                      <li><strong>Delete Attribute:</strong> Remove attributes that are no longer needed</li>
                      <li><strong>Bulk Operations:</strong> Select multiple attributes for bulk deletion</li>
                      <li><strong>Import/Export:</strong> Import attributes from Excel files or export existing data</li>
                      <li><strong>Search & Filter:</strong> Find specific attributes using the search functionality</li>
                      <li><strong>Pagination:</strong> Navigate through large lists of attributes efficiently</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Attribute Information:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>Name:</strong> The name of the product attribute (e.g., Color, Size, Material)</li>
                      <li><strong>Type:</strong> The type of attribute (e.g., select, radio, checkbox, text)</li>
                      <li><strong>Option Values:</strong> Available options for the attribute (e.g., Red, Blue, Green for Color)</li>
                      <li><strong>Sort Order:</strong> The order in which attributes should be displayed</li>
                      <li><strong>Images:</strong> Associated images for attribute values (if applicable)</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Common Attribute Types:</h4>
                    <ul className="list-disc list-inside mb-4 space-y-1">
                      <li><strong>Select:</strong> Dropdown selection with predefined options</li>
                      <li><strong>Radio:</strong> Single choice from multiple options</li>
                      <li><strong>Checkbox:</strong> Multiple choice selection</li>
                      <li><strong>Text:</strong> Free text input</li>
                      <li><strong>Number:</strong> Numeric input</li>
                    </ul>
                    <h4 className="font-semibold mb-2">Tips:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Use the import feature to bulk upload attributes from Excel files</li>
                      <li>Organize attributes by type for better product organization</li>
                      <li>Use descriptive names for attributes to make them easily identifiable</li>
                      <li>Set appropriate sort orders to control display sequence</li>
                      <li>Add images to attribute values for better visual representation</li>
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
                  onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
              <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
              <button type="button" onClick={handleImportClick} disabled={isImporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm">
                {isImporting ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-upload-2-line text-xs"></i>} Import
              </button>
              {importProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${importProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{importProgress}%</span>
                </div>
              )}
              <button type="button" onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-download-2-line text-xs"></i> Export
              </button>
              {selectedAttributes.length > 0 && (
                <button type="button" onClick={handleBulkDelete} disabled={isBulkDeleting} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm">
                  <i className="ri-delete-bin-line text-xs"></i> Delete ({selectedAttributes.length})
                </button>
              )}
              <Link href="/catalog/attributes/add" className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add Attribute
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
          ) : attributes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-list-check text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
              <Link href="/catalog/attributes/add" className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
                <i className="ri-add-line text-xs"></i> Add First Attribute
              </Link>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Attribute Name</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Attribute Type</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Values</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Sort Order</th>
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attribute) => (
                  <tr key={attribute.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedAttributes.includes(attribute.id)} onChange={() => handleAttributeSelect(attribute.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">{attribute.name}</td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight bg-purple-100 text-purple-800">{attribute.type}</span>
                    </td>
                    <td className="px-1.5 py-2.5 border border-gray-200">
                      <span className="inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded tracking-tight bg-gray-100 text-gray-700">{attribute.attributeType ?? 'Manufacturing'}</span>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {attribute.optionValues?.map((value, i) => (
                          <span key={i} className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-700">{value.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{attribute.sortOrder}</td>
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link href={`/catalog/attributes/edit/${attribute.id}`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </Link>
                        <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => confirmDelete(attribute.id)} title="Delete" disabled={isDeleting && deleteId === attribute.id}>
                          {isDeleting && deleteId === attribute.id ? <i className="ri-loader-4-line text-xs animate-spin"></i> : <i className="ri-delete-bin-line text-xs"></i>}
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
                  page === '...' ? <span key={`ellipsis-${idx}`} className="text-gray-300 text-[10px]">...</span> : (
                    <button key={page} onClick={() => setCurrentPage(Number(page))} className={`w-7 h-7 flex items-center justify-center text-[11px] font-bold rounded transition-all ${currentPage === page ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>{page}</button>
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

export default AttributesPage; 