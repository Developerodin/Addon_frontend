"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  products: 'https://addon-backend.onrender.com/v1/products'
};

const ProductListPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.products}?page=${currentPage}`);
      const data = response.data as ProductsResponse;
      setProducts(data.results);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error fetching products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`${API_ENDPOINTS.products}/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_ENDPOINTS.products}?limit=1000`);
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
    } catch (error) {
      console.error('Error exporting products:', error);
      alert('Error exporting products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // General Sheet Template
      const generalTemplate = [{
        'Product Name': 'Example Product',
        'Style Code': 'STY-XXXXX',
        'Internal Code': 'INT-XXXXX',
        'Vendor Code': 'VEN-XXXXX',
        'Factory Code': 'FAC-XXXXX',
        'EAN Code': '1234567890123',
        'Description': 'Product description here',
        'Category': 'Category Name'
      }];
      const wsGeneral = XLSX.utils.json_to_sheet(generalTemplate);
      XLSX.utils.book_append_sheet(wb, wsGeneral, 'General');

      // Attributes Sheet Template
      const attributesTemplate = [{
        'Style Code': 'STY-XXXXX',
        'Type': 'Type 1',
        'Brand': 'Brand Name',
        'MRP': '999.99',
        'Material': 'Cotton',
        'Color': 'Blue',
        'Pattern': 'Solid',
        'Season': 'Summer',
        'Occasion': 'Casual',
        'Gender': 'Unisex',
        'Age Group': 'Adult'
      }];
      const wsAttributes = XLSX.utils.json_to_sheet(attributesTemplate);
      XLSX.utils.book_append_sheet(wb, wsAttributes, 'Attributes');

      // BOM Sheet Template
      const bomTemplate = [{
        'Style Code': 'STY-XXXXX',
        'Material': 'Cotton Fabric',
        'Quantity': '2'
      }];
      const wsBOM = XLSX.utils.json_to_sheet(bomTemplate);
      XLSX.utils.book_append_sheet(wb, wsBOM, 'BOM');

      // Processes Sheet Template
      const processesTemplate = [{
        'Style Code': 'STY-XXXXX',
        'Process': 'Cutting',
        'Sequence': '1'
      }];
      const wsProcesses = XLSX.utils.json_to_sheet(processesTemplate);
      XLSX.utils.book_append_sheet(wb, wsProcesses, 'Processes');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'product_template.xlsx');
    } catch (error) {
      console.error('Error generating template:', error);
      alert('Error generating template. Please try again.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Process General sheet
          const generalSheet = workbook.Sheets['General'];
          const generalData = XLSX.utils.sheet_to_json(generalSheet) as ExcelGeneralRow[];

          // Process Attributes sheet
          const attributesSheet = workbook.Sheets['Attributes'];
          const attributesData = attributesSheet ? XLSX.utils.sheet_to_json(attributesSheet) as ExcelAttributeRow[] : [];

          // Process BOM sheet
          const bomSheet = workbook.Sheets['BOM'];
          const bomData = bomSheet ? XLSX.utils.sheet_to_json(bomSheet) as ExcelBOMRow[] : [];

          // Process Processes sheet
          const processesSheet = workbook.Sheets['Processes'];
          const processesData = processesSheet ? XLSX.utils.sheet_to_json(processesSheet) as ExcelProcessRow[] : [];

          // Combine data by Style Code
          const products = generalData.map((row) => {
            const styleCode = row['Style Code'];
            
            // Find matching attributes
            const attributes = attributesData.find(attr => attr['Style Code'] === styleCode) || {
              'Type': '',
              'Brand': '',
              'MRP': '',
              'Material': '',
              'Color': '',
              'Pattern': '',
              'Season': '',
              'Occasion': '',
              'Gender': '',
              'Age Group': ''
            };
            
            // Find matching BOM items
            const bom = bomData
              .filter(bom => bom['Style Code'] === styleCode)
              .map(bom => ({
                material: bom['Material'],
                quantity: Number(bom['Quantity'])
              }));

            // Find matching processes
            const processes = processesData
              .filter(proc => proc['Style Code'] === styleCode)
              .map(proc => ({
                process: proc['Process'],
                sequence: Number(proc['Sequence'])
              }));

            return {
              name: row['Product Name'],
              styleCode: styleCode,
              internalCode: row['Internal Code'],
              vendorCode: row['Vendor Code'],
              factoryCode: row['Factory Code'],
              eanCode: row['EAN Code'],
              description: row['Description'],
              category: row['Category'],
              attributes: {
                type: attributes['Type'],
                brand: attributes['Brand'],
                mrp: attributes['MRP'],
                material: attributes['Material'],
                color: attributes['Color'],
                pattern: attributes['Pattern'],
                season: attributes['Season'],
                occasion: attributes['Occasion'],
                gender: attributes['Gender'],
                ageGroup: attributes['Age Group']
              },
              bom,
              processes
            };
          });

          // Send to API
          await axios.post(`${API_ENDPOINTS.products}/import`, { products });
          
          alert('Products imported successfully!');
          fetchProducts(); // Refresh the list
        } catch (error) {
          console.error('Error processing import:', error);
          alert('Error processing import. Please check your file format and try again.');
        } finally {
          setIsLoading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset file input
          }
        }
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing products:', error);
      alert('Error importing products. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Seo title="Products"/>
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Products</h1>
              <div className="box-tools flex space-x-2">
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
                  className="ti-btn ti-btn-primary"
                  disabled={isLoading}
                >
                  <i className="ri-file-excel-2-line me-2"></i>
                  Import
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  className="ti-btn ti-btn-primary"
                  disabled={isLoading}
                >
                  <i className="ri-download-2-line me-2"></i>
                  Export
                </button>
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
                            <td>{product.name}</td>
                            <td>{product.styleCode}</td>
                            <td>{product.internalCode}</td>
                            <td>{product.category?.name}</td>
                            <td>{new Date(product.createdAt).toLocaleDateString()}</td>
                            <td>
                              <div className="flex space-x-2">
                                <Link 
                                  href={`/catalog/items/${product.id}/edit`}
                                  className="ti-btn ti-btn-sm ti-btn-primary"
                                >
                                  <i className="ri-pencil-line"></i>
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(product.id)}
                                  className="ti-btn ti-btn-sm ti-btn-danger"
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
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <nav className="flex space-x-2" aria-label="Pagination">
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="ti-btn ti-btn-outline-primary"
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => handlePageChange(page)}
                            className={`ti-btn ${
                              currentPage === page
                                ? 'ti-btn-primary'
                                : 'ti-btn-outline-primary'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="ti-btn ti-btn-outline-primary"
                        >
                          Next
                        </button>
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

export default ProductListPage; 