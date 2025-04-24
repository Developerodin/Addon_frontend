"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';

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
  const itemsPerPage = 5;
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Fetch attributes from API
  const fetchAttributes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/v1/product-attributes', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch attributes');
      }

      const data: ApiResponse = await response.json();
      console.log('Raw API Response:', data);

      // Extract attributes from the results array
      const attributesArray = data.results || [];
      console.log('Processed attributes:', attributesArray);

      setAttributes(attributesArray);
    } catch (err) {
      console.error('Error fetching attributes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch attributes');
      toast.error('Failed to load attributes');
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAttributes([]);
    } else {
      setSelectedAttributes(filteredAttributes.map(attr => attr.id));
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

  // Filter attributes based on search query
  const filteredAttributes = Array.isArray(attributes) 
    ? attributes.filter(attribute => 
        attribute?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  
  console.log('Filtered attributes:', filteredAttributes);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAttributes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAttributes = filteredAttributes.slice(startIndex, endIndex);
  
  console.log('Current attributes being displayed:', currentAttributes);

  const handleExport = () => {
    // Prepare data for export
    const exportData = attributes.map(attr => ({
      'Attribute Name': attr.name,
      'Type': attr.type,
      'Values': attr.optionValues.map(v => v.name).join(', '),
      'Sort Order': attr.sortOrder
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Add column widths
    const colWidths = [
      { wch: 20 }, // Attribute Name
      { wch: 15 }, // Type
      { wch: 40 }, // Values
      { wch: 10 }, // Sort Order
    ];
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attributes');

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, 'attributes.xlsx');
  };

  const handleDelete = async (attributeId: number) => {
    try {
      setIsDeleting(true);
      setDeleteId(attributeId);

      const response = await fetch(`http://localhost:3001/v1/product-attributes/${attributeId}`, {
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

      // Remove the deleted attribute from the state
      setAttributes(prevAttributes => 
        prevAttributes.filter(attr => attr.id !== attributeId)
      );

      // Remove from selected attributes if it was selected
      setSelectedAttributes(prev => 
        prev.filter(id => id !== attributeId)
      );

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
      const reader = new FileReader();

      reader.onload = async (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: ExcelAttribute[] = XLSX.utils.sheet_to_json(worksheet);

        console.log('Parsed Excel Data:', jsonData);

        // Process each row and create attributes
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

            console.log('Sending attribute data to API:', attributeData);

            const response = await fetch('http://localhost:3001/v1/product-attributes', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(attributeData)
            });

            console.log('API Response status:', response.status);
            const responseData = await response.json();
            console.log('API Response data:', responseData);

            if (!response.ok) {
              throw new Error(responseData.message || `Failed to import attribute: ${attributeData.name}`);
            }

            toast.success(`Imported: ${attributeData.name}`);
          } catch (err) {
            console.error('Error importing attribute:', err);
            toast.error(`Failed to import attribute: ${row['Attribute Name']}`);
          }
        }

        // Refresh the attributes list
        await fetchAttributes();
        toast.success('Import completed');
      };

      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        throw new Error('Failed to read file');
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Error processing import:', err);
      toast.error('Failed to process import file');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
                  className="ti-btn ti-btn-primary"
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
                  className="ti-btn ti-btn-primary"
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
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control py-3"
                    placeholder="Search by attribute name..."
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
                          <th scope="col" className="text-start">Values</th>
                          <th scope="col" className="text-start">Sort Order</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentAttributes.map((attribute, index) => (
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
                            <td>
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
                                  disabled={isDeleting && deleteId === attribute.id}
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
                  {filteredAttributes.length > itemsPerPage && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm text-gray-500">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredAttributes.length)} of {filteredAttributes.length} entries
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
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <li key={page} className="page-item">
                              <button
                                className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                  currentPage === page 
                                  ? 'bg-primary text-white hover:bg-primary-dark' 
                                  : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                }`}
                                onClick={() => setCurrentPage(page)}
                              >
                                {page}
                              </button>
                            </li>
                          ))}
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