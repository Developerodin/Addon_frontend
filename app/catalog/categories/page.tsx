"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface Category {
  id: string;
  name: string;
  parent?: string | null;
  description?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  image?: string;
}

interface ExcelRow {
  'Category Name': string;
  'Description'?: string;
  'Parent Category'?: string;
  'Sort Order'?: string | number;
  'Status'?: string;
}

const CategoriesPage = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 10;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/v1/categories', {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch categories');
      }

      const data = await response.json();
      console.log('Categories data:', data);
      
      // Check if data is in the expected format (array of categories)
      const categoriesArray = Array.isArray(data.results) ? data.results : [];
      setCategories(categoriesArray);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(filteredCategories.map(cat => cat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleCategorySelect = (categoryId: string) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      setSelectedCategories([...selectedCategories, categoryId]);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        const response = await fetch(`http://localhost:3001/v1/categories/${id}`, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete category');
        }

        // Remove the deleted category from the local state
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== id));
        // Remove from selected categories if it was selected
        setSelectedCategories(prev => prev.filter(selectedId => selectedId !== id));
        
        toast.success('Category deleted successfully');
      } catch (err) {
        console.error('Error deleting category:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to delete category');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedCategories.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedCategories.length} selected category(s)?`)) {
      try {
        let hasError = false;
        const deletePromises = selectedCategories.map(async (id) => {
          try {
            const response = await fetch(`http://localhost:3001/v1/categories/${id}`, {
              method: 'DELETE',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Failed to delete category: ${id}`);
            }
            return id;
          } catch (err) {
            hasError = true;
            console.error(`Error deleting category ${id}:`, err);
            return null;
          }
        });

        const results = await Promise.all(deletePromises);
        const successfulDeletes = results.filter((id): id is string => id !== null);

        // Remove successfully deleted categories from the local state
        setCategories(prevCategories => 
          prevCategories.filter(cat => !successfulDeletes.includes(cat.id))
        );
        
        // Clear selected categories
        setSelectedCategories([]);
        setSelectAll(false);

        if (hasError) {
          toast.error('Some categories could not be deleted');
        } else {
          toast.success('Selected categories deleted successfully');
        }
      } catch (err) {
        console.error('Error in bulk delete:', err);
        toast.error('Failed to delete some categories');
      }
    }
  };

  // Filter categories based on search query
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCategories = filteredCategories.slice(startIndex, endIndex);

  const handleExport = () => {
    try {
      // Prepare data for export
      const exportData = categories.map(category => ({
        'Category Name': category.name,
        'Description': category.description || '',
        'Parent Category': categories.find(p => p.id === category.parent)?.name || 'None',
        'Sort Order': category.sortOrder,
        'Status': category.status
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Categories');

      // Generate file name with timestamp
      const fileName = `categories_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Save file
      XLSX.writeFile(wb, fileName);
      toast.success('Categories exported successfully');
    } catch (error) {
      console.error('Error exporting categories:', error);
      toast.error('Failed to export categories');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const loadingToast = toast.loading('Importing categories...');
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

          let successCount = 0;
          let errorCount = 0;

          for (const row of jsonData) {
            try {
              const categoryData = {
                name: row['Category Name'],
                description: row['Description'] || '',
                sortOrder: parseInt(row['Sort Order']?.toString() || '0'),
                status: (row['Status']?.toString()?.toLowerCase() === 'active') ? 'active' : 'inactive',
                parent: null as string | null
              };

              // Find parent category ID by name if provided
              const parentName = row['Parent Category'];
              if (parentName && parentName !== 'None') {
                const parentCategory = categories.find(c => c.name === parentName);
                if (parentCategory) {
                  categoryData.parent = parentCategory.id;
                }
              }

              const response = await fetch('http://localhost:3001/v1/categories', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData),
              });

              if (!response.ok) {
                throw new Error(`Failed to import category: ${row['Category Name']}`);
              }

              successCount++;
            } catch (error) {
              console.error('Error importing category:', error);
              errorCount++;
            }
          }

          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // Show results
          toast.dismiss(loadingToast);
          if (successCount > 0) {
            toast.success(`Successfully imported ${successCount} categories`);
          }
          if (errorCount > 0) {
            toast.error(`Failed to import ${errorCount} categories`);
          }

          // Refresh the categories list
          fetchCategories();
        } catch (error) {
          console.error('Error processing file:', error);
          toast.error('Failed to process import file', { id: loadingToast });
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing categories:', error);
      toast.error('Failed to import categories', { id: loadingToast });
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Categories"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Categories</h1>
              <div className="box-tools flex items-center space-x-2">
                {selectedCategories.length > 0 && (
                  <button 
                    type="button" 
                    className="ti-btn ti-btn-danger"
                    onClick={handleDeleteSelected}
                  >
                    <i className="ri-delete-bin-line me-2"></i> 
                    Delete Selected ({selectedCategories.length})
                  </button>
                )}

                {/* Import/Export Buttons */}
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
                <button
                  type="button"
                  className="ti-btn ti-btn-success"
                  onClick={handleExport}
                >
                  <i className="ri-download-2-line me-2"></i> Export
                </button>

                <Link href="/catalog/categories/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add New Category
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
                    placeholder="Search by category name..."
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
                        <th scope="col" className="text-start">Category Name</th>
                        <th scope="col" className="text-start">Parent Category</th>
                        <th scope="col" className="text-start">Sort Order</th>
                        <th scope="col" className="text-start">Status</th>
                        <th scope="col" className="text-start">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentCategories.length > 0 ? (
                        currentCategories.map((category, index) => (
                          <tr 
                            key={category.id} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input 
                                type="checkbox" 
                                className="form-check-input" 
                                checked={selectedCategories.includes(category.id)}
                                onChange={() => handleCategorySelect(category.id)}
                              />
                            </td>
                            <td>{category.name}</td>
                            <td>
                              {category.parent ? (
                                <span className="badge bg-light text-default">
                                  {categories.find(c => c.id === category.parent)?.name || category.parent}
                                </span>
                              ) : (
                                <span className="badge bg-gray-100 text-gray-500">
                                  Root Category
                                </span>
                              )}
                            </td>
                            <td>{category.sortOrder}</td>
                            <td>
                              <span className={`badge ${category.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                                {category.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/categories/edit/${category.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button 
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(category.id)}
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
                                <i className="ri-folder-line text-4xl text-primary"></i>
                              </div>
                              <h3 className="text-xl font-medium mb-2">No Categories Found</h3>
                              <p className="text-gray-500 text-center mb-6">Start by adding your first category.</p>
                              <Link href="/catalog/categories/add" className="ti-btn ti-btn-primary">
                                <i className="ri-add-line me-2"></i> Add First Category
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
              {!isLoading && !error && filteredCategories.length > itemsPerPage && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredCategories.length)} of {filteredCategories.length} entries
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

export default CategoriesPage; 