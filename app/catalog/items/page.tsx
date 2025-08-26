"use client"
import React, { useState, useEffect, useRef } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import { toast, Toaster } from 'react-hot-toast';
import HelpIcon from '@/shared/components/HelpIcon';

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
  category: string | { id: string; name: string; parent?: string; sortOrder?: number; status?: string; description?: string };
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
  const attributesFileInputRef = useRef<HTMLInputElement>(null);
  const bomFileInputRef = useRef<HTMLInputElement>(null);
  const processesFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, itemsPerPage, searchQuery]);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_ENDPOINTS.products}?page=${currentPage}&limit=${itemsPerPage}&search=${encodeURIComponent(searchQuery)}`);
      const data = response.data as ProductsResponse;
      
      // Debug: Log the first product to see its structure
      if (data.results && data.results.length > 0) {
        console.log('First product structure:', data.results[0]);
        console.log('Category type:', typeof data.results[0].category);
        console.log('Category value:', data.results[0].category);
      }
      
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

  const getCategoryName = (categoryId: string | any) => {
    // Handle case where categoryId might be an object
    if (typeof categoryId === 'object' && categoryId !== null) {
      return categoryId.name || 'Unknown Category';
    }
    
    // Handle string case
    if (typeof categoryId === 'string') {
      const category = categories.find(cat => cat.id === categoryId);
      return category ? category.name : categoryId;
    }
    
    return 'Unknown Category';
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
      
      // Fetch all categories to create reverse mapping
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`);
      const allCategories = categoriesResponse.data.results || [];
      
      // Create reverse mapping from category ID to category name
      const categoryNameMapping: Record<string, string> = {};
      allCategories.forEach((category: any) => {
        categoryNameMapping[category.id] = category.name;
      });
      
      const wb = XLSX.utils.book_new();

      // Create Products sheet with only basic product data
      const exportData = data.results.map(product => ({
        'ID': product.id,
        'Name': product.name,
        'Category': categoryNameMapping[product.category] || product.category, // Show category name instead of ID
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
      
      // Fetch all attributes to create reverse mapping
      const attributesResponse = await axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`);
      const allAttributes = attributesResponse.data.results || [];
      
      // Create reverse mapping: attribute value ID -> { attribute name, attribute value name }
      const reverseMapping: Record<string, { attributeName: string, attributeValueName: string }> = {};
      allAttributes.forEach((attr: any) => {
        attr.optionValues.forEach((value: any) => {
          const valueId = value.id || value._id || value.valueId;
          if (valueId) {
            reverseMapping[valueId.toString()] = {
              attributeName: attr.name,
              attributeValueName: value.name
            };
          }
        });
      });
      
      const wb = XLSX.utils.book_new();

      // Create Attributes sheet for selected products only
      const attributesData = selectedProductsData.flatMap(product => {
        if (product.attributes && Object.keys(product.attributes).length > 0) {
          return Object.entries(product.attributes).map(([attrName, attrValueId]) => {
            const mapping = reverseMapping[attrValueId];
            return {
              'Product ID': product.id,
              'Product Name': product.name,
              'Attribute Name': attrName,
              'Attribute Value': mapping ? mapping.attributeValueName : attrValueId
            };
          });
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
      
      // Fetch all raw materials to create reverse mapping
      const materialsResponse = await axios.get(`${API_BASE_URL}/raw-materials?page=1&limit=10000`);
      const materials = materialsResponse.data.results;
      
      // Create reverse mapping from material ID to material name
      const materialNameMapping: Record<string, string> = {};
      materials.forEach((material: any) => {
        materialNameMapping[material.id] = material.name;
      });
      
      const wb = XLSX.utils.book_new();

      // Create BOM sheet for selected products only
      const bomData = selectedProductsData.flatMap(product => 
        (product.bom || []).map(bom => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Material Name': materialNameMapping[bom.materialId] || bom.materialId,
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
      
      // Fetch all processes to create reverse mapping
      const processesResponse = await axios.get(`${API_BASE_URL}/processes?page=1&limit=10000`);
      const processes = processesResponse.data.results;
      
      // Create reverse mapping from process ID to process name
      const processNameMapping: Record<string, string> = {};
      processes.forEach((process: any) => {
        processNameMapping[process.id] = process.name;
      });
      
      const wb = XLSX.utils.book_new();

      // Create Processes sheet for selected products only
      const processesData = selectedProductsData.flatMap(product => 
        (product.processes || []).map(process => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Process Name': processNameMapping[process.processId || process.process || ''] || (process.processId || process.process || '')
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
          'Category': 'Electronics',
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
          'Category': 'Clothing',
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
          'Instructions': '3. Category must be the exact name of a category from your system (not ID).',
          '': ''
        },
        {
          'Instructions': '4. The system will automatically map category names to their IDs.',
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
        },
        {
          'Instructions': '8. If a category name is not found, the product will be created without a category.',
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

  const handleDownloadAttributesTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create Attributes template
      const attributesTemplateData = [
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Attribute Name': 'Color',
          'Attribute Value': 'Red'
        },
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Attribute Name': 'Size',
          'Attribute Value': 'Large'
        },
        {
          'Product ID': '68246cc23d04e20065d3d60a',
          'Product Name': 'Example Product 2',
          'Attribute Name': 'Material',
          'Attribute Value': 'Cotton'
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(attributesTemplateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Attributes');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use Attributes Import Template:',
          '': ''
        },
        {
          'Instructions': '1. This template is for updating product attributes only (not creating products).',
          '': ''
        },
        {
          'Instructions': '2. Product ID is required and must be a valid product ID from your system.',
          '': ''
        },
        {
          'Instructions': '3. Product Name is for reference only (not used in import).',
          '': ''
        },
        {
          'Instructions': '4. Attribute Name must match an existing attribute category name exactly.',
          '': ''
        },
        {
          'Instructions': '5. Attribute Value must be a valid option value for that attribute exactly.',
          '': ''
        },
        {
          'Instructions': '6. Each row represents one attribute-value pair for a product.',
          '': ''
        },
        {
          'Instructions': '7. Multiple attributes for the same product should be on separate rows.',
          '': ''
        },
        {
          'Instructions': '8. The system will automatically map attribute names and values to their IDs.',
          '': ''
        },
        {
          'Instructions': '9. Make sure attribute names and values exist in your Attributes section.',
          '': ''
        }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'attributes_import_template.xlsx');
      toast.success('Attributes template downloaded successfully');
    } catch (error) {
      console.error('Error generating attributes template:', error);
      toast.error('Error generating attributes template. Please try again.');
    }
  };

  const handleDownloadBOMTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create BOM template
      const bomTemplateData = [
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Material Name': 'Cotton Fabric',
          'Quantity': 2.5
        },
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Material Name': 'Elastic Band',
          'Quantity': 1.0
        },
        {
          'Product ID': '68246cc23d04e20065d3d60a',
          'Product Name': 'Example Product 2',
          'Material Name': 'Cotton Fabric',
          'Quantity': 3.0
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(bomTemplateData);
      XLSX.utils.book_append_sheet(wb, ws, 'BOM');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use BOM Import Template:',
          '': ''
        },
        {
          'Instructions': '1. This template is for updating product BOM only (not creating products).',
          '': ''
        },
        {
          'Instructions': '2. Product ID is required and must be a valid product ID from your system.',
          '': ''
        },
        {
          'Instructions': '3. Product Name is for reference only (not used in import).',
          '': ''
        },
        {
          'Instructions': '4. Material Name must be the exact name of a raw material from your system (not ID).',
          '': ''
        },
        {
          'Instructions': '5. Quantity must be a positive number.',
          '': ''
        },
        {
          'Instructions': '6. Each row represents one material-quantity pair for a product.',
          '': ''
        },
        {
          'Instructions': '7. Multiple materials for the same product should be on separate rows.',
          '': ''
        }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'bom_import_template.xlsx');
      toast.success('BOM template downloaded successfully');
    } catch (error) {
      console.error('Error generating BOM template:', error);
      toast.error('Error generating BOM template. Please try again.');
    }
  };

  const handleDownloadProcessesTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create Processes template
      const processesTemplateData = [
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Process Name': 'Cutting Process'
        },
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Process Name': 'Sewing Process'
        },
        {
          'Product ID': '68246cc23d04e20065d3d60a',
          'Product Name': 'Example Product 2',
          'Process Name': 'Cutting Process'
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(processesTemplateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Processes');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use Processes Import Template:',
          '': ''
        },
        {
          'Instructions': '1. This template is for updating product processes only (not creating products).',
          '': ''
        },
        {
          'Instructions': '2. Product ID is required and must be a valid product ID from your system.',
          '': ''
        },
        {
          'Instructions': '3. Product Name is for reference only (not used in import).',
          '': ''
        },
        {
          'Instructions': '4. Process Name must be the exact name of a process from your system (not ID).',
          '': ''
        },
        {
          'Instructions': '5. Each row represents one process for a product.',
          '': ''
        },
        {
          'Instructions': '6. Multiple processes for the same product should be on separate rows.',
          '': ''
        }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'processes_import_template.xlsx');
      toast.success('Processes template downloaded successfully');
    } catch (error) {
      console.error('Error generating processes template:', error);
      toast.error('Error generating processes template. Please try again.');
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

          setImportProgress(25);

          // Fetch all categories to create mapping
          const categoriesResponse = await axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`);
          const allCategories = categoriesResponse.data.results || [];
          
          // Create mapping from category name to category ID
          const categoryMapping: Record<string, string> = {};
          allCategories.forEach((category: any) => {
            categoryMapping[category.name.toLowerCase()] = category.id;
          });

          console.log('Category mapping created:', categoryMapping);

          setImportProgress(50);

          // Transform data for bulk import with category name mapping
          const transformedProducts = validProducts.map((row: any) => {
            const categoryName = row['Category'] || '';
            let categoryId = '';
            
            if (categoryName && categoryName.toString().trim() !== '') {
              // Map category name to ID
              const mappedCategoryId = categoryMapping[categoryName.toString().toLowerCase()];
              if (mappedCategoryId) {
                categoryId = mappedCategoryId;
              } else {
                console.warn(`Category "${categoryName}" not found in the system`);
                // You can choose to skip this product or continue with empty category
                // For now, we'll continue with empty category
              }
            }

            return {
              id: row['ID'] && row['ID'].toString().trim() !== '' ? row['ID'].toString() : undefined, // For updates
              name: row['Name']?.toString() || '',
              styleCode: row['Style Code']?.toString() || '',
              internalCode: row['Internal Code']?.toString() || '',
              vendorCode: row['Vendor Code']?.toString() || '',
              factoryCode: row['Factory Code']?.toString() || '',
              eanCode: row['EAN Code']?.toString() || '',
              description: row['Description']?.toString() || '',
              category: categoryId, // Use mapped category ID
              softwareCode: row['Software Code']?.toString() || undefined, // Will be auto-generated if not provided
            };
          });

          setImportProgress(75);

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

  const handleImportByAttributes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing attributes...');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse Attributes Sheet
          const attributesSheet = workbook.Sheets['Attributes'];
          if (!attributesSheet) {
            throw new Error('Attributes sheet not found in the Excel file');
          }
          const attributesData = XLSX.utils.sheet_to_json<any>(attributesSheet);
          console.log('Parsed attributes data:', attributesData);

          // Filter out rows without required fields
          const validAttributes = attributesData.filter((row: any) => {
            return row['Product ID'] && row['Attribute Name'] && row['Attribute Value'];
          });

          if (validAttributes.length === 0) {
            toast.error('No valid attributes found in the Excel file. Please ensure Product ID, Attribute Name, and Attribute Value are provided.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(25);

          // Fetch all attributes to create mapping
          const attributesResponse = await axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`);
          const allAttributes = attributesResponse.data.results || [];
          
          // Create mapping: attribute name -> attribute value name -> attribute value ID
          const attributeMapping: Record<string, Record<string, number>> = {};
          allAttributes.forEach((attr: any) => {
            attributeMapping[attr.name.toLowerCase()] = {};
            attr.optionValues.forEach((value: any) => {
              // Handle different possible ID field names
              const valueId = value.id || value._id || value.valueId;
              if (valueId) {
                attributeMapping[attr.name.toLowerCase()][value.name.toLowerCase()] = valueId;
              }
            });
          });

          setImportProgress(50);

          // Group attributes by product ID and map to IDs
          const productAttributes: Record<string, Record<string, string>> = {};
          const mappingErrors: string[] = [];

          validAttributes.forEach((row: any) => {
            const productId = row['Product ID'].toString().trim();
            const attributeName = row['Attribute Name'].toString().trim();
            const attributeValue = row['Attribute Value'].toString().trim();
            
            if (!productAttributes[productId]) {
              productAttributes[productId] = {};
            }

            // Map attribute name and value to ID
            const attributeNameLower = attributeName.toLowerCase();
            const attributeValueLower = attributeValue.toLowerCase();
            
            if (attributeMapping[attributeNameLower] && attributeMapping[attributeNameLower][attributeValueLower]) {
              const attributeValueId = attributeMapping[attributeNameLower][attributeValueLower];
              // Use attribute name as key and attribute value ID as value
              productAttributes[productId][attributeName] = attributeValueId.toString();
            } else {
              mappingErrors.push(`Product ${productId}: Attribute "${attributeName}" with value "${attributeValue}" not found in system`);
            }
          });

          // Show mapping errors if any
          if (mappingErrors.length > 0) {
            const errorMessages = mappingErrors.slice(0, 5).join('\n');
            if (mappingErrors.length > 5) {
              toast.error(`Some attribute mappings failed:\n${errorMessages}\n...and ${mappingErrors.length - 5} more errors`);
            } else {
              toast.error(`Some attribute mappings failed:\n${errorMessages}`);
            }
          }

          setImportProgress(75);

          // Update each product's attributes
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const [productId, attributes] of Object.entries(productAttributes)) {
            try {
              await axios.patch(`${API_ENDPOINTS.products}/${productId}`, {
                attributes: attributes
              });
              successCount++;
            } catch (error: any) {
              errorCount++;
              const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
              errors.push(`Product ID ${productId}: ${errorMessage}`);
            }
          }

          setImportProgress(100);
          setTimeout(() => {
            setImportProgress(null);
            toast.dismiss(loadingToast);

            if (errorCount === 0 && mappingErrors.length === 0) {
              toast.success(`Attributes imported successfully for ${successCount} product(s)!`);
            } else if (successCount === 0) {
              toast.error(`Failed to import attributes for all ${errorCount} products.`);
            } else {
              toast.success(`Attributes imported: ${successCount} successful, ${errorCount} failed.`);
            }

            // Show detailed errors if any
            if (errors.length > 0) {
              const errorMessages = errors.slice(0, 5).join('\n');
              if (errors.length > 5) {
                toast.error(`Some attributes failed to import:\n${errorMessages}\n...and ${errors.length - 5} more errors`);
              } else {
                toast.error(`Some attributes failed to import:\n${errorMessages}`);
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
      toast.error('Error importing attributes. Please try again.');
    }
  };

  const handleImportByBOM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing BOM...');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse BOM Sheet
          const bomSheet = workbook.Sheets['BOM'];
          if (!bomSheet) {
            throw new Error('BOM sheet not found in the Excel file');
          }
          const bomData = XLSX.utils.sheet_to_json<any>(bomSheet);
          console.log('Parsed BOM data:', bomData);

          // Filter out rows without required fields
          const validBOM = bomData.filter((row: any) => {
            return row['Product ID'] && row['Material Name'] && row['Quantity'] !== undefined;
          });

          if (validBOM.length === 0) {
            toast.error('No valid BOM entries found in the Excel file. Please ensure Product ID, Material Name, and Quantity are provided.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(25);

          // Fetch all raw materials to create mapping
          const materialsResponse = await axios.get(`${API_BASE_URL}/raw-materials?page=1&limit=10000`);
          const materials = materialsResponse.data.results;
          
          // Create mapping from material name to material ID
          const materialMapping: Record<string, string> = {};
          materials.forEach((material: any) => {
            materialMapping[material.name.toLowerCase()] = material.id;
          });

          console.log('Material mapping created:', materialMapping);

          setImportProgress(50);

          // Group BOM by product ID and map material names to IDs
          const productBOM: Record<string, Array<{materialId: string, quantity: number}>> = {};
          const mappingErrors: string[] = [];

          validBOM.forEach((row: any) => {
            const productId = row['Product ID'].toString().trim();
            const materialName = row['Material Name'].toString().trim();
            const quantity = parseFloat(row['Quantity']);
            
            // Map material name to ID
            const materialId = materialMapping[materialName.toLowerCase()];
            
            if (!materialId) {
              mappingErrors.push(`Material name "${materialName}" not found in the system`);
              return;
            }
            
            if (!productBOM[productId]) {
              productBOM[productId] = [];
            }
            productBOM[productId].push({
              materialId: materialId,
              quantity: quantity
            });
          });

          // Show mapping errors if any
          if (mappingErrors.length > 0) {
            const errorMessages = mappingErrors.slice(0, 5).join('\n');
            if (mappingErrors.length > 5) {
              toast.error(`Some materials not found:\n${errorMessages}\n...and ${mappingErrors.length - 5} more errors`);
            } else {
              toast.error(`Some materials not found:\n${errorMessages}`);
            }
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(75);

          // Update each product's BOM
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const [productId, bom] of Object.entries(productBOM)) {
            try {
              await axios.patch(`${API_ENDPOINTS.products}/${productId}`, {
                bom: bom
              });
              successCount++;
            } catch (error: any) {
              errorCount++;
              const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
              errors.push(`Product ID ${productId}: ${errorMessage}`);
            }
          }

          setImportProgress(100);
          setTimeout(() => {
            setImportProgress(null);
            toast.dismiss(loadingToast);

            if (errorCount === 0) {
              toast.success(`BOM imported successfully for ${successCount} product(s)!`);
            } else if (successCount === 0) {
              toast.error(`Failed to import BOM for all ${errorCount} products.`);
            } else {
              toast.success(`BOM imported: ${successCount} successful, ${errorCount} failed.`);
            }

            // Show detailed errors if any
            if (errors.length > 0) {
              const errorMessages = errors.slice(0, 5).join('\n');
              if (errors.length > 5) {
                toast.error(`Some BOM entries failed to import:\n${errorMessages}\n...and ${errors.length - 5} more errors`);
              } else {
                toast.error(`Some BOM entries failed to import:\n${errorMessages}`);
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
      toast.error('Error importing BOM. Please try again.');
    }
  };

  const handleImportByProcesses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing processes...');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse Processes Sheet
          const processesSheet = workbook.Sheets['Processes'];
          if (!processesSheet) {
            throw new Error('Processes sheet not found in the Excel file');
          }
          const processesData = XLSX.utils.sheet_to_json<any>(processesSheet);
          console.log('Parsed processes data:', processesData);

          // Filter out rows without required fields
          const validProcesses = processesData.filter((row: any) => {
            return row['Product ID'] && row['Process Name'];
          });

          if (validProcesses.length === 0) {
            toast.error('No valid processes found in the Excel file. Please ensure Product ID and Process Name are provided.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(25);

          // Fetch all processes to create mapping
          const processesResponse = await axios.get(`${API_BASE_URL}/processes?page=1&limit=10000`);
          const processes = processesResponse.data.results;
          
          // Create mapping from process name to process ID
          const processMapping: Record<string, string> = {};
          processes.forEach((process: any) => {
            processMapping[process.name.toLowerCase()] = process.id;
          });

          console.log('Process mapping created:', processMapping);

          setImportProgress(50);

          // Group processes by product ID and map process names to IDs
          const productProcesses: Record<string, Array<{processId: string}>> = {};
          const mappingErrors: string[] = [];

          validProcesses.forEach((row: any) => {
            const productId = row['Product ID'].toString().trim();
            const processName = row['Process Name'].toString().trim();
            
            // Map process name to ID
            const processId = processMapping[processName.toLowerCase()];
            
            if (!processId) {
              mappingErrors.push(`Process name "${processName}" not found in the system`);
              return;
            }
            
            if (!productProcesses[productId]) {
              productProcesses[productId] = [];
            }
            productProcesses[productId].push({
              processId: processId
            });
          });

          // Show mapping errors if any
          if (mappingErrors.length > 0) {
            const errorMessages = mappingErrors.slice(0, 5).join('\n');
            if (mappingErrors.length > 5) {
              toast.error(`Some processes not found:\n${errorMessages}\n...and ${mappingErrors.length - 5} more errors`);
            } else {
              toast.error(`Some processes not found:\n${errorMessages}`);
            }
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(75);

          // Update each product's processes
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const [productId, processes] of Object.entries(productProcesses)) {
            try {
              await axios.patch(`${API_ENDPOINTS.products}/${productId}`, {
                processes: processes
              });
              successCount++;
            } catch (error: any) {
              errorCount++;
              const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
              errors.push(`Product ID ${productId}: ${errorMessage}`);
            }
          }

          setImportProgress(100);
          setTimeout(() => {
            setImportProgress(null);
            toast.dismiss(loadingToast);

            if (errorCount === 0) {
              toast.success(`Processes imported successfully for ${successCount} product(s)!`);
            } else if (successCount === 0) {
              toast.error(`Failed to import processes for all ${errorCount} products.`);
            } else {
              toast.success(`Processes imported: ${successCount} successful, ${errorCount} failed.`);
            }

            // Show detailed errors if any
            if (errors.length > 0) {
              const errorMessages = errors.slice(0, 5).join('\n');
              if (errors.length > 5) {
                toast.error(`Some processes failed to import:\n${errorMessages}\n...and ${errors.length - 5} more errors`);
              } else {
                toast.error(`Some processes failed to import:\n${errorMessages}`);
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
      toast.error('Error importing processes. Please try again.');
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
              <div className="flex items-center space-x-3">
                <h1 className="box-title text-2xl font-semibold">Products</h1>
                <HelpIcon
                  title="Products Management"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Products Management page where you can view, manage, and organize all your products in the system.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>View Products:</strong> Browse all products with pagination and search functionality</li>
                          <li><strong>Add New Product:</strong> Click "Add Product" to create a new product</li>
                          <li><strong>Edit Products:</strong> Click the edit icon next to any product to modify its details</li>
                          <li><strong>Delete Products:</strong> Remove individual products or bulk delete selected ones</li>
                          <li><strong>Search & Filter:</strong> Use the search bar to find specific products by name, style code, or category</li>
                          <li><strong>Export Data:</strong> Export all products or selected products to Excel format</li>
                          <li><strong>Import Data:</strong> Import products from Excel files using templates</li>
                          <li><strong>Bulk Operations:</strong> Select multiple products for bulk export or deletion</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Advanced Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Export by Attributes:</strong> Export product attributes for selected products</li>
                          <li><strong>Export by BOM:</strong> Export Bill of Materials for selected products</li>
                          <li><strong>Export by Processes:</strong> Export manufacturing processes for selected products</li>
                          <li><strong>Import Templates:</strong> Download templates for different import types</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Use the "Show More" button to access advanced export and import options</li>
                          <li>Click on product names to view detailed analytics</li>
                          <li>Use the pagination controls to navigate through large product lists</li>
                          <li>Download templates before importing to ensure correct data format</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
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
                <input
                  type="file"
                  ref={attributesFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImportByAttributes}
                />
                <input
                  type="file"
                  ref={bomFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImportByBOM}
                />
                <input
                  type="file"
                  ref={processesFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImportByProcesses}
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
              <div className="flex flex-col items-end space-y-2">
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
                  <div className="flex flex-wrap gap-2 max-w-4xl justify-end">
                    {/* Export Buttons - First Row */}
                    <div className="flex flex-wrap gap-2 mb-2">
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
                    </div>
                    
                    {/* Import Buttons - Second Row */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => attributesFileInputRef.current?.click()}
                        className="ti-btn ti-btn-success"
                        disabled={isLoading}
                      >
                        <i className="ri-file-excel-2-line me-2"></i>
                        Import by Attributes
                      </button>
                      <button
                        type="button"
                        onClick={() => bomFileInputRef.current?.click()}
                        className="ti-btn ti-btn-success"
                        disabled={isLoading}
                      >
                        <i className="ri-file-excel-2-line me-2"></i>
                        Import by BOM
                      </button>
                      <button
                        type="button"
                        onClick={() => processesFileInputRef.current?.click()}
                        className="ti-btn ti-btn-success"
                        disabled={isLoading}
                      >
                        <i className="ri-file-excel-2-line me-2"></i>
                        Import by Processes
                      </button>
                    </div>
                    
                    {/* Template Buttons - Third Row */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadAttributesTemplate}
                        className="ti-btn ti-btn-outline-secondary"
                        disabled={isLoading}
                      >
                        <i className="ri-file-download-line me-2"></i>
                        Attributes Template
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadBOMTemplate}
                        className="ti-btn ti-btn-outline-secondary"
                        disabled={isLoading}
                      >
                        <i className="ri-file-download-line me-2"></i>
                        BOM Template
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadProcessesTemplate}
                        className="ti-btn ti-btn-outline-secondary"
                        disabled={isLoading}
                      >
                        <i className="ri-file-download-line me-2"></i>
                        Processes Template
                      </button>
                    </div>
                  </div>
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
                            <td><Link 
                                href={`/analytics/product-analysis/${product.id}`}
                                className="text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                {product.name}
                              </Link></td>
                            <td>{product.styleCode || ''}</td>
                            <td>{product.internalCode || ''}</td>
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