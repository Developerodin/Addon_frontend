"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { toast, Toaster } from 'react-hot-toast';

interface RawMaterial {
  id: string;
  itemName: string;
  printName: string;
  color: string;
  unit: string;
  description: string;
  image: string | null;
}

interface ExcelRow {
  'Material Name'?: string;
  'ItemName'?: string;
  'Item Name'?: string;
  'Print Name'?: string;
  'PrintName'?: string;
  'Color'?: string;
  'Unit'?: string;
  'Description'?: string;
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
  const itemsPerPage = 10;

  // Fetch raw materials from API
  const fetchMaterials = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('https://addon-backend.onrender.com/v1/raw-materials', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch raw materials');
      }

      const data = await response.json();
      console.log('Raw materials data:', data);
      
      // Check if data is in the expected format (array of raw materials)
      const materialsArray = Array.isArray(data.results) ? data.results : [];
      setMaterials(materialsArray);
    } catch (err) {
      console.error('Error fetching raw materials:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch raw materials');
      toast.error('Failed to load raw materials');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedMaterials([]);
    } else {
      setSelectedMaterials(filteredMaterials.map(mat => mat.id));
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

  const handleExport = () => {
    const exportData = materials.map(mat => ({
      'Material Name': mat.itemName,
      'Print Name': mat.printName,
      'Color': mat.color,
      'Unit': mat.unit,
      'Description': mat.description
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Raw Materials');
    XLSX.writeFile(wb, 'raw-materials.xlsx');
  };

  const handleDeleteSelected = async () => {
    if (selectedMaterials.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedMaterials.length} selected material(s)?`)) {
      try {
        for (const id of selectedMaterials) {
          const response = await fetch(`https://addon-backend.onrender.com/v1/raw-materials/${id}`, {
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
        const response = await fetch(`https://addon-backend.onrender.com/v1/raw-materials/${id}`, {
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

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = event.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

          // Show loading toast
          const loadingToast = toast.loading('Importing materials...');

          // Process each row
          for (const row of jsonData) {
            const material = {
              itemName: row['Material Name'] || row['ItemName'] || row['Item Name'] || '',
              printName: row['Print Name'] || row['PrintName'] || '',
              color: row['Color'] || '',
              unit: row['Unit'] || '',
              description: row['Description'] || ''
            };

            // Validate required fields
            if (!material.itemName || !material.unit) {
              toast.error('Material Name and Unit are required fields');
              toast.dismiss(loadingToast);
              return;
            }

            // Send to API
            const response = await fetch('https://addon-backend.onrender.com/v1/raw-materials', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(material)
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to import material: ${material.itemName}`);
            }
          }

          // Success
          toast.dismiss(loadingToast);
          toast.success('Materials imported successfully');
          fetchMaterials(); // Refresh the list
          
          // Reset the file input
          e.target.value = '';
        } catch (err) {
          console.error('Error processing Excel file:', err);
          toast.error(err instanceof Error ? err.message : 'Failed to process Excel file');
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        toast.error('Failed to read Excel file');
      };

      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Error importing materials:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to import materials');
    }
  };

  // Filter materials based on search query
  const filteredMaterials = materials.filter(material =>
    material.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.printName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    material.color.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

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
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImport}
                  />
                  <button type="button" className="ti-btn ti-btn-primary">
                    <i className="ri-file-excel-2-line me-2"></i> Import
                  </button>
                </div>
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
              <div className="mb-4">
                <div className="relative">
                  <input
                    type="text"
                    className="form-control py-3"
                    placeholder="Search by material name, print name, or color..."
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
                        <th scope="col" className="text-start">Material Name</th>
                        <th scope="col" className="text-start">Print Name</th>
                        <th scope="col" className="text-start">Color</th>
                        <th scope="col" className="text-start">Unit</th>
                        <th scope="col" className="text-start">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentMaterials.length > 0 ? (
                        currentMaterials.map((material, index) => (
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
                            <td className="font-medium">{material.itemName}</td>
                            <td>{material.printName}</td>
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
              {!isLoading && !error && filteredMaterials.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredMaterials.length)} of {filteredMaterials.length} entries
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawMaterialPage; 