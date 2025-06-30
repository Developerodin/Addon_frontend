"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { toast, Toaster } from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  softwareCode: string;
  internalCode: string;
  vendorCode: string;
  factoryCode: string;
  styleCode: string;
  eanCode: string;
  description: string;
  category: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  attributes?: Record<string, string>;
  bom?: ProductBOM[];
  processes?: ProductProcess[];
}

interface ProductsResponse {
  results: Product[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface ProductBOM {
  _id?: string;
  materialId: string;
  quantity: number;
}

interface ProductProcess {
  _id?: string;
  processId?: string;
  process?: string;
  sequence?: number;
}

const API_ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories`
};

const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showMoreExports, setShowMoreExports] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.products}?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`);
      const data = response.data as ProductsResponse;
      setProducts(data.results);
      setTotalPages(data.totalPages);
      setTotalResults(data.totalResults);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Error fetching products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.categories);
      const data = response.data;
      setCategories(data.results || data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleProductSelect = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedProducts.length} selected product(s)?`)) return;
    toast.loading('Deleting selected products...');
    try {
      await Promise.all(selectedProducts.map(id => axios.delete(`${API_ENDPOINTS.products}/${id}`)));
      toast.dismiss();
      toast.success('Selected products deleted successfully');
      setSelectedProducts([]);
      setSelectAll(false);
      fetchProducts();
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to delete selected products');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    toast.loading('Deleting product...');
    try {
      await axios.delete(`${API_ENDPOINTS.products}/${id}`);
      toast.dismiss();
      toast.success('Product deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.dismiss();
      toast.error('Error deleting product. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_ENDPOINTS.products}?limit=100000`);
      const data = response.data as ProductsResponse;
      
      const wb = XLSX.utils.book_new();

      // Create Products sheet with only basic product data
      const exportData = data.results.map(product => ({
        'ID': product.id,
        'Name': product.name,
        'Category': product.category, // This is the category ID
        'Software Code': product.softwareCode,
        'Internal Code': product.internalCode,
        'Vendor Code': product.vendorCode,
        'Factory Code': product.factoryCode,
        'Style Code': product.styleCode,
        'EAN Code': product.eanCode,
        'Description': product.description
      }));
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data2, `products_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Products exported successfully');
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Error exporting products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByAttributes = async () => {
    try {
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        return;
      }

      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      
      const wb = XLSX.utils.book_new();

      // Create Attributes sheet for selected products only
      const attributesData = selectedProductsData.flatMap(product => {
        if (product.attributes && Object.keys(product.attributes).length > 0) {
          return Object.entries(product.attributes).map(([attrName, attrValue]) => ({
            'Product ID': product.id,
            'Product Name': product.name,
            'Attribute Name': attrName,
            'Attribute Value': attrValue
          }));
        }
        return [];
      });
      
      if (attributesData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(attributesData);
        XLSX.utils.book_append_sheet(wb, ws, 'Attributes');
      } else {
        // If no attributes found, create a sheet with just product info
        const productData = selectedProductsData.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Note': 'No attributes found for this product'
        }));
        const ws = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(wb, ws, 'Attributes');
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data2, `selected_products_attributes_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Attributes exported for ${selectedProducts.length} selected product(s)`);
    } catch (error) {
      console.error('Error exporting attributes:', error);
      toast.error('Error exporting attributes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByBOM = async () => {
    try {
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        return;
      }

      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      
      const wb = XLSX.utils.book_new();

      // Create BOM sheet for selected products only
      const bomData = selectedProductsData.flatMap(product => 
        (product.bom || []).map(bom => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Material ID': bom.materialId,
          'Quantity': bom.quantity
        }))
      );
      
      if (bomData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(bomData);
        XLSX.utils.book_append_sheet(wb, ws, 'BOM');
      } else {
        // If no BOM found, create a sheet with just product info
        const productData = selectedProductsData.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Note': 'No BOM found for this product'
        }));
        const ws = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(wb, ws, 'BOM');
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data2, `selected_products_bom_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`BOM exported for ${selectedProducts.length} selected product(s)`);
    } catch (error) {
      console.error('Error exporting BOM:', error);
      toast.error('Error exporting BOM. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByProcesses = async () => {
    try {
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        return;
      }

      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      
      const wb = XLSX.utils.book_new();

      // Create Processes sheet for selected products only
      const processesData = selectedProductsData.flatMap(product => 
        (product.processes || []).map(process => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Process ID': process.processId || process.process || ''
        }))
      );
      
      if (processesData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(processesData);
        XLSX.utils.book_append_sheet(wb, ws, 'Processes');
      } else {
        // If no processes found, create a sheet with just product info
        const productData = selectedProductsData.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Note': 'No processes found for this product'
        }));
        const ws = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(wb, ws, 'Processes');
      }

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data2, `selected_products_processes_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(`Processes exported for ${selectedProducts.length} selected product(s)`);
    } catch (error) {
      console.error('Error exporting processes:', error);
      toast.error('Error exporting processes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create a simple template with only basic product fields
      const templateData = [
        {
          'ID': '680c7a2bc30d1e00643b84e8',
          'Name': 'Example Product 1',
          'Category': '680b3411fa35ca00651ff788',
          'Software Code': 'PRD-M9XTTW8I-85T1C',
          'Internal Code': '123',
          'Vendor Code': '456',
          'Factory Code': '789',
          'Style Code': 'STY-12345',
          'EAN Code': '1234567890123',
          'Description': 'Example product description'
        },
        {
          'ID': '68246cc23d04e20065d3d60a',
          'Name': 'Example Product 2',
          'Category': '680b341dfa35ca00651ff792',
          'Software Code': 'PRD-MANS85IE-BW0YJ',
          'Internal Code': 'INT-67890',
          'Vendor Code': 'VEN-67890',
          'Factory Code': 'FAC-67890',
          'Style Code': 'STY-67890',
          'EAN Code': '9876543210987',
          'Description': 'Another example product'
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use this template:',
          '': ''
        },
        {
          'Instructions': '1. The Products sheet contains all the basic product information.',
          '': ''
        },
        {
          'Instructions': '2. Product Name and Style Code are required fields.',
          '': ''
        },
        {
          'Instructions': '3. Category must be a valid category ID from your system.',
          '': ''
        },
        {
          'Instructions': '4. To find category IDs, check the Categories section in your system.',
          '': ''
        },
        {
          'Instructions': '5. ID field: Leave empty for new products, include ID for updating existing products.',
          '': ''
        },
        {
          'Instructions': '6. Software Code: Leave empty for new products (auto-generated), include for updates.',
          '': ''
        },
        {
          'Instructions': '7. All other fields are optional but recommended.',
          '': ''
        }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'product_template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error generating template:', error);
      toast.error('Error generating template. Please try again.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setImportProgress(0);
  const loadingToast = toast.loading('Importing products...');
  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Parse Products Sheet
        const productsSheet = workbook.Sheets['Products'];
        if (!productsSheet) {
          throw new Error('Products sheet not found in the Excel file');
        }
        const productsData = XLSX.utils.sheet_to_json<any>(productsSheet);
        console.log('Parsed products data:', productsData);

        // Filter out rows without required fields
        const validProducts = productsData.filter((row: any) => {
          return row['Name'] && row['Style Code'];
        });

        if (validProducts.length === 0) {
          toast.error('No valid products found in the Excel file. Please ensure Name and Style Code are provided.');
          setImportProgress(null);
          toast.dismiss(loadingToast);
          return;
        }

        setImportProgress(50);

        // Transform data for bulk import
        const transformedProducts = validProducts.map((row: any) => ({
          id: row['ID'] && row['ID'].trim() !== '' ? row['ID'] : undefined, // For updates
          name: row['Name'],
          styleCode: row['Style Code'],
          internalCode: row['Internal Code'] || '',
          vendorCode: row['Vendor Code'] || '',
          factoryCode: row['Factory Code'] || '',
          eanCode: row['EAN Code'] || '',
          description: row['Description'] || '',
          category: row['Category'] || '', // This should be a category ID
          softwareCode: row['Software Code'] || undefined, // Will be auto-generated if not provided
        }));

        // Send bulk import request
        const response = await axios.post(`${API_ENDPOINTS.products}/bulk-import`, {
          products: transformedProducts,
          batchSize: 50, // You can adjust this if needed
        });

        const { results } = response.data;

        setImportProgress(100);
        setTimeout(() => {
          setImportProgress(null);
          toast.dismiss(loadingToast);

          if (results.failed === 0) {
            toast.success(`Import completed successfully! ${results.created} created, ${results.updated} updated.`);
          } else if (results.created === 0 && results.updated === 0) {
            toast.error(`Import failed for all ${results.failed} products.`);
          } else {
            toast.success(`Import completed: ${results.created} created, ${results.updated} updated, ${results.failed} failed.`);
          }

          // Show detailed errors if any
          if (results.errors && results.errors.length > 0) {
            const errorMessages = results.errors.slice(0, 5).map((err: any) =>
              `${err.productName}: ${err.error}`
            ).join('\n');
            if (results.errors.length > 5) {
              toast.error(`Some products failed to import:\n${errorMessages}\n...and ${results.errors.length - 5} more errors`);
            } else {
              toast.error(`Some products failed to import:\n${errorMessages}`);
            }
          }

          fetchProducts(); // Refresh the list
        }, 500);

      } catch (error: any) {
        setImportProgress(null);
        toast.dismiss(loadingToast);
        console.error('Excel processing error:', error);
        toast.error('Error processing Excel file: ' + (error.message || 'Please check your file format and try again.'));
      }
    };

    reader.readAsArrayBuffer(file);
  } catch (error) {
    setImportProgress(null);
    toast.dismiss(loadingToast);
    toast.error('Error importing products. Please try again.');
  }
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
      <Seo title="Products"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Products</h1>
              <div className="box-tools flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="ti-btn ti-btn-secondary"
                  disabled={isLoading}
                >
                  <i className="ri-file-download-line me-2"></i>
                  Download Template
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImport}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="ti-btn ti-btn-success"
                  disabled={isLoading}
                >
                  <i className="ri-file-excel-2-line me-2"></i>
                  Import
                </button>
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
                  onClick={handleExport}
                  className="ti-btn ti-btn-primary"
                  disabled={isLoading}
                >
                  <i className="ri-download-2-line me-2"></i>
                  Export
                </button>
                {selectedProducts.length > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-danger"
                    onClick={handleBulkDelete}
                    disabled={isLoading}
                  >
                    <i className="ri-delete-bin-line me-2"></i>
                    Delete Selected ({selectedProducts.length})
                  </button>
                )}
                <Link href="/catalog/items/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i>
                  Add Product
                </Link>
              </div>
            </div>
          </div>
          
          {/* Show More Button Section - Right Aligned */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="flex justify-end mr-5">
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowMoreExports(!showMoreExports)}
                  className="ti-btn ti-btn-outline-primary"
                  disabled={isLoading}
                >
                  <i className="ri-more-line me-2"></i>
                  {showMoreExports ? 'Show Less' : 'Show More'}
                </button>
                {showMoreExports && (
                  <>
                    <button
                      type="button"
                      onClick={handleExportByAttributes}
                      className="ti-btn ti-btn-info"
                      disabled={isLoading}
                    >
                      <i className="ri-download-2-line me-2"></i>
                      Export by Attributes
                    </button>
                    <button
                      type="button"
                      onClick={handleExportByBOM}
                      className="ti-btn ti-btn-info"
                      disabled={isLoading}
                    >
                      <i className="ri-download-2-line me-2"></i>
                      Export by BOM
                    </button>
                    <button
                      type="button"
                      onClick={handleExportByProcesses}
                      className="ti-btn ti-btn-info"
                      disabled={isLoading}
                    >
                      <i className="ri-download-2-line me-2"></i>
                      Export by Processes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          {/* Content Box */}
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
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                  </select>
                </div>
                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search by product name, style code, or category name..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-10">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th className="text-start">Name</th>
                          <th className="text-start">Style Code</th>
                          <th className="text-start">Internal Code</th>
                          <th className="text-start">Category</th>
                          <th className="text-start">Created At</th>
                          <th className="text-start">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => (
                          <tr key={product.id} className="border-b border-gray-200">
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleProductSelect(product.id)}
                              />
                            </td>
                            <td>{product.name}</td>
                            <td>{product.styleCode}</td>
                            <td>{product.internalCode}</td>
                            <td>{getCategoryName(product.category)}</td>
                            <td>{product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link href={`/catalog/items/${product.id}/edit`} className="ti-btn ti-btn-primary ti-btn-sm">
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(product.id)}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {!isLoading && (
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default ProductListPage; 