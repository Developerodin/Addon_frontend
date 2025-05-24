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
  category: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  attributes?: ProductAttribute;
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

interface ProductAttribute {
  type: string;
  brand: string;
  mrp: string;
  material: string;
  color: string;
  pattern: string;
  season: string;
  occasion: string;
  gender: string;
  ageGroup: string;
}

interface ProductBOM {
  material: string;
  quantity: number;
}

interface ProductProcess {
  process: string;
  sequence: number;
}

interface CompleteProduct extends Product {
  attributes: ProductAttribute;
  bom: ProductBOM[];
  processes: ProductProcess[];
}

// Update the Excel interfaces to use Style Code
interface ExcelGeneralRow {
  'Product Name': string;
  'Style Code': string;
  'Internal Code': string;
  'Vendor Code': string;
  'Factory Code': string;
  'EAN Code': string;
  'Description': string;
  'Category': string;
}

interface ExcelAttributeRow {
  'Style Code': string;
  'Type': string;
  'Brand': string;
  'MRP': string;
  'Material': string;
  'Color': string;
  'Pattern': string;
  'Season': string;
  'Occasion': string;
  'Gender': string;
  'Age Group': string;
}

interface ExcelBOMRow {
  'Style Code': string;
  'Material': string;
  'Quantity': string;
}

interface ExcelProcessRow {
  'Style Code': string;
  'Process': string;
  'Sequence': string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
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

      // General Sheet
      const generalData = data.results.map(product => ({
        'Product Name': product.name,
        'Style Code': product.styleCode,
        'Internal Code': product.internalCode,
        'Vendor Code': product.vendorCode,
        'Factory Code': product.factoryCode,
        'EAN Code': product.eanCode,
        'Description': product.description,
        'Category': product.category.name
      }));
      const wsGeneral = XLSX.utils.json_to_sheet(generalData);
      XLSX.utils.book_append_sheet(wb, wsGeneral, 'General');

      // Attributes Sheet
      const attributesData = data.results.map(product => ({
        'Style Code': product.styleCode,
        'Type': product.attributes?.type || '',
        'Brand': product.attributes?.brand || '',
        'MRP': product.attributes?.mrp || '',
        'Material': product.attributes?.material || '',
        'Color': product.attributes?.color || '',
        'Pattern': product.attributes?.pattern || '',
        'Season': product.attributes?.season || '',
        'Occasion': product.attributes?.occasion || '',
        'Gender': product.attributes?.gender || '',
        'Age Group': product.attributes?.ageGroup || ''
      }));
      const wsAttributes = XLSX.utils.json_to_sheet(attributesData);
      XLSX.utils.book_append_sheet(wb, wsAttributes, 'Attributes');

      // BOM Sheet
      const bomData = data.results.flatMap(product => 
        (product.bom || []).map(bom => ({
          'Style Code': product.styleCode,
          'Material': bom.material,
          'Quantity': bom.quantity
        }))
      );
      const wsBOM = XLSX.utils.json_to_sheet(bomData);
      XLSX.utils.book_append_sheet(wb, wsBOM, 'BOM');

      // Processes Sheet
      const processesData = data.results.flatMap(product => 
        (product.processes || []).map(process => ({
          'Style Code': product.styleCode,
          'Process': process.process,
          'Sequence': process.sequence
        }))
      );
      const wsProcesses = XLSX.utils.json_to_sheet(processesData);
      XLSX.utils.book_append_sheet(wb, wsProcesses, 'Processes');

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

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // General Sheet Template (required fields)
      const generalTemplate = [
        {
          'Product Name': 'Example T-Shirt',
          'Style Code': 'STY-12345',
          'Internal Code': 'INT-12345',
          'Vendor Code': 'VEN-12345',
          'Factory Code': 'FAC-12345',
          'EAN Code': '1234567890123',
          'Description': 'Basic cotton t-shirt with round neck',
          'Category': 'T-Shirts'
        },
        {
          'Product Name': 'Example Jeans',
          'Style Code': 'STY-67890',
          'Internal Code': 'INT-67890',
          'Vendor Code': 'VEN-67890',
          'Factory Code': 'FAC-67890',
          'EAN Code': '9876543210987',
          'Description': 'Slim fit denim jeans',
          'Category': 'Jeans'
        }
      ];
      const wsGeneral = XLSX.utils.json_to_sheet(generalTemplate);
      XLSX.utils.book_append_sheet(wb, wsGeneral, 'General');

      // Attributes Sheet Template
      const attributesTemplate = [
        {
          'Style Code': 'STY-12345',
          'Type': 'Casual',
          'Brand': 'Example Brand',
          'MRP': '999.99',
          'Material': 'Cotton',
          'Color': 'Blue',
          'Pattern': 'Solid',
          'Season': 'Summer',
          'Occasion': 'Casual',
          'Gender': 'Unisex',
          'Age Group': 'Adult'
        },
        {
          'Style Code': 'STY-67890',
          'Type': 'Casual',
          'Brand': 'Example Brand',
          'MRP': '1999.99',
          'Material': 'Denim',
          'Color': 'Blue',
          'Pattern': 'Solid',
          'Season': 'All Season',
          'Occasion': 'Casual',
          'Gender': 'Unisex',
          'Age Group': 'Adult'
        }
      ];
      const wsAttributes = XLSX.utils.json_to_sheet(attributesTemplate);
      XLSX.utils.book_append_sheet(wb, wsAttributes, 'Attributes');

      // BOM Sheet Template
      const bomTemplate = [
        {
          'Style Code': 'STY-12345',
          'Material': 'Cotton Fabric',
          'Quantity': '2'
        },
        {
          'Style Code': 'STY-12345',
          'Material': 'Thread',
          'Quantity': '1'
        },
        {
          'Style Code': 'STY-67890',
          'Material': 'Denim Fabric',
          'Quantity': '3'
        },
        {
          'Style Code': 'STY-67890',
          'Material': 'Zipper',
          'Quantity': '1'
        }
      ];
      const wsBOM = XLSX.utils.json_to_sheet(bomTemplate);
      XLSX.utils.book_append_sheet(wb, wsBOM, 'BOM');

      // Processes Sheet Template
      const processesTemplate = [
        {
          'Style Code': 'STY-12345',
          'Process': 'Cutting',
          'Sequence': '1'
        },
        {
          'Style Code': 'STY-12345',
          'Process': 'Sewing',
          'Sequence': '2'
        },
        {
          'Style Code': 'STY-67890',
          'Process': 'Cutting',
          'Sequence': '1'
        },
        {
          'Style Code': 'STY-67890',
          'Process': 'Sewing',
          'Sequence': '2'
        }
      ];
      const wsProcesses = XLSX.utils.json_to_sheet(processesTemplate);
      XLSX.utils.book_append_sheet(wb, wsProcesses, 'Processes');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use this template:',
          '': ''
        },
        {
          'Instructions': '1. The General sheet is required and must contain all products you want to import.',
          '': ''
        },
        {
          'Instructions': '2. Product Name and Style Code are required fields. All other fields are recommended.',
          '': ''
        },
        {
          'Instructions': '3. Category must match an existing category name in the system.',
          '': ''
        },
        {
          'Instructions': '4. The Style Code is used to link data across all sheets.',
          '': ''
        },
        {
          'Instructions': '5. Do not change the sheet names or column headers.',
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
      // 1. Fetch categories and build map
      const categoriesRes = await axios.get(API_ENDPOINTS.categories);
      const categories = categoriesRes.data.results || categoriesRes.data;
      const categoryMap: Record<string, string> = {};
      console.log('Categories from API:', categories);
      
      categories.forEach((cat: {name: string, id: string}) => {
        const key = cat.name.trim().toLowerCase();
        categoryMap[key] = cat.id;
        // Also add variations without spaces for more flexible matching
        categoryMap[key.replace(/\s+/g, '')] = cat.id;
      });
      
      console.log('Category mapping:', categoryMap);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse General Sheet
          const generalSheet = workbook.Sheets['General'];
          if (!generalSheet) {
            throw new Error('General sheet not found in the Excel file');
          }
          const generalData = XLSX.utils.sheet_to_json<ExcelGeneralRow>(generalSheet);
          console.log('Parsed general data:', generalData);

          // Parse Attributes Sheet
          const attributesSheet = workbook.Sheets['Attributes'];
          const attributesData = attributesSheet ? 
            XLSX.utils.sheet_to_json<ExcelAttributeRow>(attributesSheet) : [];
          
          // Create a map of attributes by style code
          const attributesMap: Record<string, ProductAttribute> = {};
          attributesData.forEach(row => {
            attributesMap[row['Style Code']] = {
              type: row['Type'] || '',
              brand: row['Brand'] || '',
              mrp: row['MRP'] || '',
              material: row['Material'] || '',
              color: row['Color'] || '',
              pattern: row['Pattern'] || '',
              season: row['Season'] || '',
              occasion: row['Occasion'] || '',
              gender: row['Gender'] || '',
              ageGroup: row['Age Group'] || ''
            };
          });

          // Parse BOM Sheet
          const bomSheet = workbook.Sheets['BOM'];
          const bomData = bomSheet ? 
            XLSX.utils.sheet_to_json<ExcelBOMRow>(bomSheet) : [];
          
          // Create a map of BOM items by style code
          const bomMap: Record<string, ProductBOM[]> = {};
          bomData.forEach(row => {
            if (!bomMap[row['Style Code']]) {
              bomMap[row['Style Code']] = [];
            }
            bomMap[row['Style Code']].push({
              material: row['Material'] || '',
              quantity: Number(row['Quantity']) || 0
            });
          });

          // Parse Processes Sheet
          const processesSheet = workbook.Sheets['Processes'];
          const processesData = processesSheet ? 
            XLSX.utils.sheet_to_json<ExcelProcessRow>(processesSheet) : [];
          
          // Create a map of processes by style code
          const processesMap: Record<string, ProductProcess[]> = {};
          processesData.forEach(row => {
            if (!processesMap[row['Style Code']]) {
              processesMap[row['Style Code']] = [];
            }
            processesMap[row['Style Code']].push({
              process: row['Process'] || '',
              sequence: Number(row['Sequence']) || 0
            });
          });

          // Combine data by Style Code
          const products = generalData.map((row) => {
            const styleCode = row['Style Code'];
            
            // Map category name to ID with more flexible matching
            let categoryId = null;
            const categoryName = (row['Category'] || '').trim();
            const categoryNameLower = categoryName.toLowerCase();
            
            // Try direct match first
            if (categoryMap[categoryNameLower]) {
              categoryId = categoryMap[categoryNameLower];
            } 
            // Try without spaces
            else if (categoryMap[categoryNameLower.replace(/\s+/g, '')]) {
              categoryId = categoryMap[categoryNameLower.replace(/\s+/g, '')];
            }
            // If no match and we have categories, use the first one as fallback
            else if (categories.length > 0 && categoryName) {
              console.log(`Category not found: "${categoryName}", using first available category as fallback`);
              categoryId = categories[0].id;
            }
            
            console.log(`Row category "${categoryName}" mapped to ID:`, categoryId);

            // Validate required fields with more detailed logging
            if (!row['Product Name'] || !row['Style Code']) {
              console.log('Skipping row due to missing critical fields (Product Name or Style Code):', row);
              return null;
            }
            
            // Skip if category is still missing after all attempts
            if (!categoryId) {
              console.log('Skipping row due to missing category mapping:', row);
              return null;
            }

            // Get attributes for this style code
            const attrs = attributesMap[styleCode] || {
              type: '',
              brand: '',
              mrp: '',
              material: '',
              color: '',
              pattern: '',
              season: '',
              occasion: '',
              gender: '',
              ageGroup: ''
            };

            // Get BOM items for this style code
            const bomItems = bomMap[styleCode] || [];
            
            // Get processes for this style code
            const processItems = processesMap[styleCode] || [];

            return {
              name: row['Product Name'],
              styleCode: styleCode,
              softwareCode: '',
              internalCode: row['Internal Code'] || '',
              vendorCode: row['Vendor Code'] || '',
              factoryCode: row['Factory Code'] || '',
              eanCode: row['EAN Code'] || '',
              description: row['Description'] || '',
              category: categoryId,
              attributes: {
                type: attrs.type,
                brand: attrs.brand,
                mrp: attrs.mrp,
                material: attrs.material,
                color: attrs.color,
                pattern: attrs.pattern,
                season: attrs.season,
                occasion: attrs.occasion,
                gender: attrs.gender,
                ageGroup: attrs.ageGroup
              },
              bom: bomItems.map(item => ({
                materialId: item.material, // Change to materialId if that's what the API expects
                quantity: item.quantity
              })),
              processes: processItems.map(item => ({
                processId: item.process // Change to processId if that's what the API expects
              }))
            };
          }).filter(Boolean); // Remove nulls

          // Update progress
          setImportProgress(50);

          // Send to API
          try {
            console.log('Sending products to API:', products);
            // Check if we need to send products as an array or one by one
            if (products.length === 0) {
              toast.error('No valid products found in the Excel file');
              setImportProgress(null);
              toast.dismiss(loadingToast);
              return;
            }
            
            // Option 1: Send all products in one request (if API supports batch import)
            // const response = await axios.post(`${API_ENDPOINTS.products}`, { products });
            
            // Option 2: Send products one by one
            let successCount = 0;
            let failCount = 0;
            const totalProducts = products.length;
            
            for (let i = 0; i < products.length; i++) {
              try {
                const product = products[i];
                await axios.post(API_ENDPOINTS.products, product);
                successCount++;
                setImportProgress(Math.floor((i + 1) / totalProducts * 100));
              } catch (err) {
                console.error(`Error importing product ${i+1}:`, err);
                failCount++;
              }
            }
            
            console.log(`Import completed: ${successCount} succeeded, ${failCount} failed`);
            
            setImportProgress(100);
            setTimeout(() => {
              setImportProgress(null);
              toast.dismiss(loadingToast);
              
              if (failCount === 0) {
                toast.success(`${successCount} products imported successfully!`);
              } else if (successCount === 0) {
                toast.error(`Import failed for all ${failCount} products.`);
              } else {
                toast.success(`Import completed: ${successCount} products imported, ${failCount} failed.`);
              }
              
              fetchProducts(); // Refresh the list
            }, 500);
          } catch (error: any) {
            console.error('API Error:', error.response?.data || error.message);
            setImportProgress(null);
            toast.dismiss(loadingToast);
            
            // Handle specific API error responses
            if (error.response) {
              if (error.response.status === 400) {
                const errorData = error.response.data;
                if (errorData.message) {
                  toast.error(`Import failed: ${errorData.message}`);
                } else if (errorData.errors && Array.isArray(errorData.errors)) {
                  toast.error(`Import failed: ${errorData.errors.join('; ')}`);
                } else {
                  toast.error('Import failed: Invalid data format. Please check your Excel file.');
                }
              } else {
                toast.error(`Import failed: ${error.response.status} - ${error.response.statusText}`);
              }
            } else {
              toast.error('Error processing import: ' + (error.message || 'Please check your file format and try again.'));
            }
          }
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
                    placeholder="Search by product name, style code, or category..."
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
                            <td>{product.category?.name}</td>
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