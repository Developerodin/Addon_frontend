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
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';

interface StyleCode {
  styleCode: string;
  eanCode: string;
  mrp: number;
}

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
  styleCodes?: StyleCode[];
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
  yarnCatalogId: string;
  yarnName: string;
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
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);
  
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
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showMoreExports, setShowMoreExports] = useState(false);
  const [selectedProductStyleCodes, setSelectedProductStyleCodes] = useState<StyleCode[]>([]);
  const [isStyleCodesModalOpen, setIsStyleCodesModalOpen] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attributesFileInputRef = useRef<HTMLInputElement>(null);
  const bomFileInputRef = useRef<HTMLInputElement>(null);
  const processesFileInputRef = useRef<HTMLInputElement>(null);
  const styleCodesFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleViewStyleCodes = (product: Product) => {
    setSelectedProductStyleCodes(product.styleCodes || []);
    setSelectedProductName(product.name);
    setIsStyleCodesModalOpen(true);
  };

  const handleCloseStyleCodesModal = () => {
    setIsStyleCodesModalOpen(false);
    setSelectedProductStyleCodes([]);
    setSelectedProductName('');
  };

  // Helper function to gradually increase progress during async operations
  const animateProgress = (start: number, end: number, duration: number = 800) => {
    const steps = 15;
    const increment = (end - start) / steps;
    const interval = duration / steps;
    let current = start;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(start + (increment * step), end);
      setExportProgress(Math.round(current));
      
      if (step >= steps || current >= end) {
        clearInterval(timer);
        setExportProgress(Math.round(end));
      }
    }, interval);

    return timer;
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

  // Helper function to get allowed fields based on user type
  const getAllowedFields = () => {
    if (isProduction) {
      return ['ID', 'Factory Code'];
    } else if (isFinal) {
      return ['ID', 'Description'];
    } else if (isDesign) {
      return ['ID', 'Name', 'Category', 'Software Code', 'Internal Code', 'Vendor Code'];
    } else {
      return ['ID', 'Name', 'Category', 'Software Code', 'Internal Code', 'Vendor Code', 'Factory Code', 'Description'];
    }
  };

  // Helper function to build export data object with only allowed fields
  const buildExportData = (product: Product, categoryNameMapping: Record<string, string>) => {
    const allowedFields = getAllowedFields();
    const exportObj: Record<string, any> = {};
    
    allowedFields.forEach(field => {
      switch(field) {
        case 'ID':
          exportObj['ID'] = product.id;
          break;
        case 'Name':
          exportObj['Name'] = product.name;
          break;
        case 'Category':
          // Handle category as string or object
          const categoryId = typeof product.category === 'object' && product.category !== null 
            ? product.category.id 
            : product.category;
          exportObj['Category'] = categoryId ? (categoryNameMapping[categoryId] || getCategoryName(categoryId)) : '';
          break;
        case 'Software Code':
          exportObj['Software Code'] = product.softwareCode;
          break;
        case 'Internal Code':
          exportObj['Internal Code'] = product.internalCode;
          break;
        case 'Vendor Code':
          exportObj['Vendor Code'] = product.vendorCode;
          break;
        case 'Factory Code':
          exportObj['Factory Code'] = product.factoryCode;
          break;
        case 'Description':
          exportObj['Description'] = product.description;
          break;
      }
    });
    
    // Add style codes as numbered columns (only for non-production users, limit to 3 columns to match template)
    if (!isProduction && product.styleCodes && product.styleCodes.length > 0) {
      // Limit to only first 3 style codes to match template structure
      const styleCodesToExport = product.styleCodes.slice(0, 3);
      styleCodesToExport.forEach((styleCode, index) => {
        const num = index + 1;
        exportObj[`Style Code ${num}`] = styleCode.styleCode || '';
        exportObj[`EAN Code ${num}`] = styleCode.eanCode || '';
        exportObj[`MRP ${num}`] = styleCode.mrp || 0;
      });
    }
    
    return exportObj;
  };

  const handleExport = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // Start smooth progress animation
      const progressTimer = animateProgress(0, 15, 300);
      
      // Fetch products
      const response = await axios.get(`${API_ENDPOINTS.products}?limit=100000`);
      const data = response.data as ProductsResponse;
      clearInterval(progressTimer);
      setExportProgress(25);
      
      // Continue animation while fetching categories
      const progressTimer2 = animateProgress(25, 45, 400);
      
      // Fetch all categories to create reverse mapping
      const categoriesResponse = await axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`);
      const allCategories = categoriesResponse.data.results || [];
      clearInterval(progressTimer2);
      setExportProgress(50);
      
      // Create reverse mapping from category ID to category name
      const categoryNameMapping: Record<string, string> = {};
      allCategories.forEach((category: any) => {
        categoryNameMapping[category.id] = category.name;
      });
      setExportProgress(60);
      
      const wb = XLSX.utils.book_new();

      // Create Products sheet with only user-appropriate fields
      const exportData = data.results.map((product, index) => {
        if (index % 100 === 0) {
          // Update progress during data processing
          setExportProgress(60 + Math.floor((index / data.results.length) * 10));
        }
        return buildExportData(product, categoryNameMapping);
      });
      setExportProgress(70);
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      setExportProgress(85);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      saveAs(data2, `products_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        toast.success('Products exported successfully');
      }, 500);
    } catch (error) {
      console.error('Error exporting products:', error);
      setExportProgress(null);
      toast.error('Error exporting products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByAttributes = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        setExportProgress(null);
        setIsLoading(false);
        return;
      }

      // Start smooth progress animation
      const progressTimer = animateProgress(0, 15, 200);
      
      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      clearInterval(progressTimer);
      setExportProgress(20);
      
      // Continue animation while fetching attributes
      const progressTimer2 = animateProgress(20, 40, 300);
      
      // Fetch all attributes to create reverse mapping
      const attributesResponse = await axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`);
      const allAttributes = attributesResponse.data.results || [];
      clearInterval(progressTimer2);
      setExportProgress(45);
      
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
      setExportProgress(55);
      
      const wb = XLSX.utils.book_new();

      // Create Attributes sheet for selected products only - filter by user type
      const attributesData = selectedProductsData.flatMap((product, index) => {
        if (index % 10 === 0) {
          // Update progress during data processing
          setExportProgress(55 + Math.floor((index / selectedProductsData.length) * 20));
        }
        if (product.attributes && Object.keys(product.attributes).length > 0) {
          return Object.entries(product.attributes)
            .filter(([attrName]) => {
              // Always exclude MRP from attributes (it's now in style codes)
              if (attrName.toLowerCase() === 'mrp') {
                return false;
              }
              // Filter attributes based on user type
              if (isProduction) {
                return attrName.toLowerCase() === 'needles';
              } else if (isFinal) {
                return shouldShowAttributeForFinal(attrName, isFinal);
              } else if (isDesign) {
                return shouldShowAttribute(attrName, isDesign);
              }
              return true; // Other users see all attributes
            })
            .map(([attrName, attrValueId]) => {
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
      setExportProgress(80);
      
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
      setExportProgress(90);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      saveAs(data2, `selected_products_attributes_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        toast.success(`Attributes exported for ${selectedProducts.length} selected product(s)`);
      }, 500);
    } catch (error) {
      console.error('Error exporting attributes:', error);
      setExportProgress(null);
      toast.error('Error exporting attributes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByBOM = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        setExportProgress(null);
        setIsLoading(false);
        return;
      }

      // Start smooth progress animation
      const progressTimer = animateProgress(0, 10, 200);
      
      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      clearInterval(progressTimer);
      setExportProgress(15);
      
      // Continue animation while fetching yarn catalogs
      const progressTimer2 = animateProgress(15, 25, 300);
      
      // Fetch all yarn catalogs to create reverse mapping
      let allYarnCatalogs: YarnCatalog[] = [];
      let currentPage = 1;
      let hasMore = true;
      const totalPagesEstimate = 10; // Estimate for progress calculation
      
      while (hasMore) {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: currentPage,
          limit: 1000,
          status: 'active'
        });
        
        allYarnCatalogs = [...allYarnCatalogs, ...(response.results || [])];
        
        // Update progress during pagination
        const progressPercent = 25 + Math.min((currentPage / totalPagesEstimate) * 30, 30);
        setExportProgress(Math.round(progressPercent));
        
        if (currentPage >= response.totalPages) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }
      clearInterval(progressTimer2);
      setExportProgress(55);
      
      // Create reverse mapping from yarn catalog ID to yarn name
      const yarnNameMapping: Record<string, string> = {};
      allYarnCatalogs.forEach((yarn: YarnCatalog) => {
        yarnNameMapping[yarn.id] = yarn.yarnName;
      });
      setExportProgress(60);
      
      const wb = XLSX.utils.book_new();

      // Create BOM sheet for selected products only
      const bomData = selectedProductsData.flatMap((product, index) => {
        if (index % 5 === 0) {
          // Update progress during data processing
          setExportProgress(60 + Math.floor((index / selectedProductsData.length) * 15));
        }
        return (product.bom || []).map(bom => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Yarn Name': bom.yarnName || yarnNameMapping[bom.yarnCatalogId] || bom.yarnCatalogId,
          'Quantity': bom.quantity
        }));
      });
      setExportProgress(80);
      
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
      setExportProgress(90);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      saveAs(data2, `selected_products_bom_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        toast.success(`BOM exported for ${selectedProducts.length} selected product(s)`);
      }, 500);
    } catch (error) {
      console.error('Error exporting BOM:', error);
      setExportProgress(null);
      toast.error('Error exporting BOM. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByProcesses = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        setExportProgress(null);
        setIsLoading(false);
        return;
      }

      // Start smooth progress animation
      const progressTimer = animateProgress(0, 15, 200);
      
      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      clearInterval(progressTimer);
      setExportProgress(20);
      
      // Continue animation while fetching processes
      const progressTimer2 = animateProgress(20, 35, 300);
      
      // Fetch all processes to create reverse mapping
      const processesResponse = await axios.get(`${API_BASE_URL}/processes?page=1&limit=10000`);
      const processes = processesResponse.data.results;
      clearInterval(progressTimer2);
      setExportProgress(45);
      
      // Create reverse mapping from process ID to process name
      const processNameMapping: Record<string, string> = {};
      processes.forEach((process: any) => {
        processNameMapping[process.id] = process.name;
      });
      setExportProgress(55);
      
      const wb = XLSX.utils.book_new();

      // Create Processes sheet for selected products only
      const processesData = selectedProductsData.flatMap((product, index) => {
        if (index % 5 === 0) {
          // Update progress during data processing
          setExportProgress(55 + Math.floor((index / selectedProductsData.length) * 20));
        }
        return (product.processes || []).map(process => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Process Name': processNameMapping[process.processId || process.process || ''] || (process.processId || process.process || '')
        }));
      });
      setExportProgress(80);
      
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
      setExportProgress(90);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      saveAs(data2, `selected_products_processes_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        toast.success(`Processes exported for ${selectedProducts.length} selected product(s)`);
      }, 500);
    } catch (error) {
      console.error('Error exporting processes:', error);
      setExportProgress(null);
      toast.error('Error exporting processes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportByStyleCodes = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // If no products are selected, show error
      if (selectedProducts.length === 0) {
        toast.error('Please select at least one product to export');
        setExportProgress(null);
        setIsLoading(false);
        return;
      }

      // Start smooth progress animation
      const progressTimer = animateProgress(0, 15, 200);
      
      // Get only selected products
      const selectedProductsData = products.filter(product => selectedProducts.includes(product.id));
      clearInterval(progressTimer);
      setExportProgress(20);
      
      const wb = XLSX.utils.book_new();

      // Create Style Codes sheet for selected products only
      const styleCodesData = selectedProductsData.flatMap((product, index) => {
        if (index % 10 === 0) {
          // Update progress during data processing
          setExportProgress(20 + Math.floor((index / selectedProductsData.length) * 60));
        }
        if (product.styleCodes && product.styleCodes.length > 0) {
          return product.styleCodes.map(styleCode => ({
            'Product ID': product.id,
            'Product Name': product.name,
            'Style Code': styleCode.styleCode || '',
            'EAN Code': styleCode.eanCode || '',
            'MRP': styleCode.mrp || 0
          }));
        }
        return [];
      });
      setExportProgress(85);
      
      if (styleCodesData.length > 0) {
        const ws = XLSX.utils.json_to_sheet(styleCodesData);
        XLSX.utils.book_append_sheet(wb, ws, 'Style Codes');
      } else {
        // If no style codes found, create a sheet with just product info
        const productData = selectedProductsData.map(product => ({
          'Product ID': product.id,
          'Product Name': product.name,
          'Note': 'No style codes found for this product'
        }));
        const ws = XLSX.utils.json_to_sheet(productData);
        XLSX.utils.book_append_sheet(wb, ws, 'Style Codes');
      }
      setExportProgress(90);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      saveAs(data2, `selected_products_style_codes_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        toast.success(`Style codes exported for ${selectedProducts.length} selected product(s)`);
      }, 500);
    } catch (error) {
      console.error('Error exporting style codes:', error);
      setExportProgress(null);
      toast.error('Error exporting style codes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();
      const allowedFields = getAllowedFields();

      // Build template data based on user type
      const buildTemplateRow = (exampleNum: number) => {
        const row: Record<string, any> = {};
        
        if (allowedFields.includes('ID')) {
          row['ID'] = exampleNum === 1 ? '680c7a2bc30d1e00643b84e8' : '68246cc23d04e20065d3d60a';
        }
        if (allowedFields.includes('Name')) {
          row['Name'] = `Example Product ${exampleNum}`;
        }
        if (allowedFields.includes('Category')) {
          row['Category'] = exampleNum === 1 ? 'Electronics' : 'Clothing';
        }
        if (allowedFields.includes('Software Code')) {
          row['Software Code'] = exampleNum === 1 ? 'PRD-M9XTTW8I-85T1C' : 'PRD-MANS85IE-BW0YJ';
        }
        if (allowedFields.includes('Internal Code')) {
          row['Internal Code'] = exampleNum === 1 ? '123' : 'INT-67890';
        }
        if (allowedFields.includes('Vendor Code')) {
          row['Vendor Code'] = exampleNum === 1 ? '456' : 'VEN-67890';
        }
        if (allowedFields.includes('Factory Code')) {
          row['Factory Code'] = exampleNum === 1 ? '789' : 'FAC-67890';
        }
        if (allowedFields.includes('Description')) {
          row['Description'] = exampleNum === 1 ? 'Example product description' : 'Another example product';
        }
        
        // Add style code columns (for non-production users)
        if (!isProduction) {
          // Add 3 style code entries as examples (users can copy-paste if they need more)
          row['Style Code 1'] = exampleNum === 1 ? 'STY-12345' : 'STY-67890';
          row['EAN Code 1'] = exampleNum === 1 ? '1234567890123' : '9876543210987';
          row['MRP 1'] = exampleNum === 1 ? 299.99 : 199.99;
          
          row['Style Code 2'] = exampleNum === 1 ? 'STY-12346' : 'STY-67891';
          row['EAN Code 2'] = exampleNum === 1 ? '1234567890124' : '9876543210988';
          row['MRP 2'] = exampleNum === 1 ? 349.99 : 249.99;
          
          row['Style Code 3'] = exampleNum === 1 ? 'STY-12347' : 'STY-67892';
          row['EAN Code 3'] = exampleNum === 1 ? '1234567890125' : '9876543210989';
          row['MRP 3'] = exampleNum === 1 ? 399.99 : 299.99;
        }
        
        return row;
      };

      const templateData = [buildTemplateRow(1), buildTemplateRow(2)];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      // Add instructions sheet with user-specific requirements
      const getRequiredFields = () => {
        if (isProduction) return 'Factory Code';
        if (isFinal) return 'Description, and at least one Style Code entry (Style Code 1, EAN Code 1, MRP 1)';
        if (isDesign) return 'Name, Category, Internal Code, Vendor Code';
        return 'Name, and at least one Style Code entry (Style Code 1, EAN Code 1, MRP 1)';
      };

      const instructionsTemplate = [
        {
          'Instructions': 'How to use this template:',
          '': ''
        },
        {
          'Instructions': '1. The Products sheet contains product information fields based on your user role.',
          '': ''
        },
        {
          'Instructions': `2. Required fields: ${getRequiredFields()}`,
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
          'Instructions': '7. Only fill in the fields visible in this template based on your user role.',
          '': ''
        },
        {
          'Instructions': '8. If a category name is not found, the product will be created without a category.',
          '': ''
        },
        {
          'Instructions': '9. Style Codes: Use numbered columns (Style Code 1, EAN Code 1, MRP 1, Style Code 2, EAN Code 2, MRP 2, etc.) to add multiple style codes per product.',
          '': ''
        },
        {
          'Instructions': '10. Each style code entry requires Style Code, EAN Code, and MRP (all three must be provided for each entry).',
          '': ''
        },
        {
          'Instructions': '11. You can add unlimited style codes by continuing the numbering (Style Code 3, EAN Code 3, MRP 3, etc.).',
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
          'Yarn Name': 'Cotton Yarn 20/1',
          'Quantity': 2.5
        },
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Yarn Name': 'Elastic Yarn 30/2',
          'Quantity': 1.0
        },
        {
          'Product ID': '68246cc23d04e20065d3d60a',
          'Product Name': 'Example Product 2',
          'Yarn Name': 'Cotton Yarn 20/1',
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
          'Instructions': '4. Yarn Name must be the exact name of a yarn catalog from your system (not ID).',
          '': ''
        },
        {
          'Instructions': '5. Quantity must be a positive number (in grams).',
          '': ''
        },
        {
          'Instructions': '6. Each row represents one yarn-quantity pair for a product.',
          '': ''
        },
        {
          'Instructions': '7. Multiple yarns for the same product should be on separate rows.',
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

  const handleDownloadStyleCodesTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Create Style Codes template
      const styleCodesTemplateData = [
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Style Code': 'STY-12345',
          'EAN Code': '1234567890123',
          'MRP': 299.99
        },
        {
          'Product ID': '680c7a2bc30d1e00643b84e8',
          'Product Name': 'Example Product 1',
          'Style Code': 'STY-12346',
          'EAN Code': '1234567890124',
          'MRP': 349.99
        },
        {
          'Product ID': '68246cc23d04e20065d3d60a',
          'Product Name': 'Example Product 2',
          'Style Code': 'STY-67890',
          'EAN Code': '9876543210987',
          'MRP': 199.99
        }
      ];
      
      const ws = XLSX.utils.json_to_sheet(styleCodesTemplateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Style Codes');

      // Add instructions sheet
      const instructionsTemplate = [
        {
          'Instructions': 'How to use Style Codes Import Template:',
          '': ''
        },
        {
          'Instructions': '1. This template is for updating product style codes only (not creating products).',
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
          'Instructions': '4. Style Code, EAN Code, and MRP are all required fields.',
          '': ''
        },
        {
          'Instructions': '5. MRP must be a positive number (greater than or equal to 0).',
          '': ''
        },
        {
          'Instructions': '6. Each row represents one style code entry for a product.',
          '': ''
        },
        {
          'Instructions': '7. Multiple style codes for the same product should be on separate rows.',
          '': ''
        },
        {
          'Instructions': '8. All style codes in the file will replace existing style codes for each product.',
          '': ''
        }
      ];
      const wsInstructions = XLSX.utils.json_to_sheet(instructionsTemplate);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(data, 'style_codes_import_template.xlsx');
      toast.success('Style Codes template downloaded successfully');
    } catch (error) {
      console.error('Error generating style codes template:', error);
      toast.error('Error generating style codes template. Please try again.');
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

          // Helper function to check if at least one style code entry exists
          const hasStyleCodeEntry = (row: any): boolean => {
            const styleCode1 = row['Style Code 1']?.toString().trim();
            const eanCode1 = row['EAN Code 1']?.toString().trim();
            const mrp1 = row['MRP 1'];
            return !!(styleCode1 && eanCode1 && mrp1 !== undefined && mrp1 !== null);
          };

          // Validate required fields based on user type
          const getRequiredFields = () => {
            if (isProduction) return ['Factory Code'];
            if (isFinal) return ['Description'];
            if (isDesign) return ['Name', 'Category', 'Internal Code', 'Vendor Code'];
            return ['Name'];
          };

          const requiredFields = getRequiredFields();
          
          // Filter out rows without required fields
          const validProducts = productsData.filter((row: any) => {
            const hasRequiredFields = requiredFields.every(field => row[field] && row[field].toString().trim() !== '');
            
            // For final users and other users (non-design, non-production), also check for at least one style code
            if (!isProduction && !isDesign) {
              return hasRequiredFields && hasStyleCodeEntry(row);
            }
            
            return hasRequiredFields;
          });

          if (validProducts.length === 0) {
            let requiredFieldsStr = requiredFields.join(', ');
            if (!isProduction && !isDesign) {
              requiredFieldsStr += ', and at least one Style Code entry (Style Code 1, EAN Code 1, MRP 1)';
            }
            toast.error(`No valid products found in the Excel file. Please ensure ${requiredFieldsStr} are provided.`);
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

          // Helper function to extract style codes from numbered columns
          const extractStyleCodes = (row: any): StyleCode[] => {
            const styleCodes: StyleCode[] = [];
            let index = 1;
            
            // Keep looking for numbered columns until we find no more
            while (true) {
              const styleCodeKey = `Style Code ${index}`;
              const eanCodeKey = `EAN Code ${index}`;
              const mrpKey = `MRP ${index}`;
              
              const styleCode = row[styleCodeKey]?.toString().trim();
              const eanCode = row[eanCodeKey]?.toString().trim();
              const mrpValue = row[mrpKey];
              
              // If we don't find any of the columns for this index, stop
              if (!styleCode && !eanCode && mrpValue === undefined) {
                break;
              }
              
              // Only add if we have at least style code and ean code
              if (styleCode && eanCode) {
                const mrp = mrpValue !== undefined && mrpValue !== null 
                  ? (typeof mrpValue === 'string' ? parseFloat(mrpValue) : Number(mrpValue))
                  : 0;
                
                if (!isNaN(mrp) && mrp >= 0) {
                  styleCodes.push({
                    styleCode,
                    eanCode,
                    mrp
                  });
                }
              }
              
              index++;
            }
            
            return styleCodes;
          };

          // Transform data for bulk import with category name mapping - only include allowed fields
          const transformedProducts = validProducts.map((row: any) => {
            const productId = row['ID'] && row['ID'].toString().trim() !== '' ? row['ID'].toString() : undefined;
            const productData: any = {
              id: productId, // For updates
            };

            // Extract style codes from numbered columns (for non-production users)
            const styleCodes = !isProduction ? extractStyleCodes(row) : [];

            // Only include fields allowed for this user type
            if (isProduction) {
              productData.factoryCode = row['Factory Code']?.toString() || '';
            } else if (isFinal) {
              productData.description = row['Description']?.toString() || '';
              // Add style codes if available
              if (styleCodes.length > 0) {
                productData.styleCodes = styleCodes;
              }
            } else if (isDesign) {
              const categoryName = row['Category'] || '';
              let categoryId = '';
              
              if (categoryName && categoryName.toString().trim() !== '') {
                const mappedCategoryId = categoryMapping[categoryName.toString().toLowerCase()];
                if (mappedCategoryId) {
                  categoryId = mappedCategoryId;
                } else {
                  console.warn(`Category "${categoryName}" not found in the system`);
                }
              }

              productData.name = row['Name']?.toString() || '';
              productData.softwareCode = row['Software Code']?.toString() || undefined;
              productData.internalCode = row['Internal Code']?.toString() || '';
              productData.vendorCode = row['Vendor Code']?.toString() || '';
              productData.category = categoryId;
            } else {
              // Other users: All fields
              const categoryName = row['Category'] || '';
              let categoryId = '';
              
              if (categoryName && categoryName.toString().trim() !== '') {
                const mappedCategoryId = categoryMapping[categoryName.toString().toLowerCase()];
                if (mappedCategoryId) {
                  categoryId = mappedCategoryId;
                } else {
                  console.warn(`Category "${categoryName}" not found in the system`);
                }
              }

              productData.name = row['Name']?.toString() || '';
              productData.internalCode = row['Internal Code']?.toString() || '';
              productData.vendorCode = row['Vendor Code']?.toString() || '';
              productData.factoryCode = row['Factory Code']?.toString() || '';
              productData.description = row['Description']?.toString() || '';
              productData.category = categoryId;
              productData.softwareCode = row['Software Code']?.toString() || undefined;
              // Add style codes if available
              if (styleCodes.length > 0) {
                productData.styleCodes = styleCodes;
              }
            }

            return productData;
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
            
            // Always exclude MRP from attributes (it's now in style codes)
            if (attributeName.toLowerCase() === 'mrp') {
              mappingErrors.push(`Product ${productId}: MRP is no longer an attribute. Please use Style Codes sheet instead.`);
              return;
            }
            
            // Filter attributes based on user type
            let isAllowed = false;
            if (isProduction) {
              isAllowed = attributeName.toLowerCase() === 'needles';
            } else if (isFinal) {
              isAllowed = shouldShowAttributeForFinal(attributeName, isFinal);
            } else if (isDesign) {
              isAllowed = shouldShowAttribute(attributeName, isDesign);
            } else {
              isAllowed = true; // Other users can import all attributes
            }

            if (!isAllowed) {
              mappingErrors.push(`Product ${productId}: Attribute "${attributeName}" is not allowed for your user role`);
              return;
            }
            
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
            return row['Product ID'] && row['Yarn Name'] && row['Quantity'] !== undefined;
          });

          if (validBOM.length === 0) {
            toast.error('No valid BOM entries found in the Excel file. Please ensure Product ID, Yarn Name, and Quantity are provided.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(25);

          // Fetch all yarn catalogs to create mapping
          let allYarnCatalogs: YarnCatalog[] = [];
          let currentPage = 1;
          let hasMore = true;
          
          while (hasMore) {
            const response = await yarnCatalogService.getYarnCatalogs({
              page: currentPage,
              limit: 1000,
              status: 'active'
            });
            
            allYarnCatalogs = [...allYarnCatalogs, ...(response.results || [])];
            
            if (currentPage >= response.totalPages) {
              hasMore = false;
            } else {
              currentPage++;
            }
          }
          
          // Create mapping from yarn name to yarn catalog ID
          const yarnMapping: Record<string, string> = {};
          allYarnCatalogs.forEach((yarn: YarnCatalog) => {
            yarnMapping[yarn.yarnName.toLowerCase()] = yarn.id;
          });

          console.log('Yarn mapping created:', yarnMapping);

          setImportProgress(50);

          // Group BOM by product ID and map yarn names to IDs
          const productBOM: Record<string, Array<{yarnCatalogId: string, yarnName: string, quantity: number}>> = {};
          const mappingErrors: string[] = [];

          validBOM.forEach((row: any) => {
            const productId = row['Product ID'].toString().trim();
            const yarnName = row['Yarn Name'].toString().trim();
            const quantity = parseFloat(row['Quantity']);
            
            // Map yarn name to yarn catalog ID
            const yarnCatalogId = yarnMapping[yarnName.toLowerCase()];
            
            if (!yarnCatalogId) {
              mappingErrors.push(`Yarn name "${yarnName}" not found in the system`);
              return;
            }
            
            if (!productBOM[productId]) {
              productBOM[productId] = [];
            }
            productBOM[productId].push({
              yarnCatalogId: yarnCatalogId,
              yarnName: yarnName,
              quantity: quantity
            });
          });

          // Show mapping errors if any
          if (mappingErrors.length > 0) {
            const errorMessages = mappingErrors.slice(0, 5).join('\n');
            if (mappingErrors.length > 5) {
              toast.error(`Some yarns not found:\n${errorMessages}\n...and ${mappingErrors.length - 5} more errors`);
            } else {
              toast.error(`Some yarns not found:\n${errorMessages}`);
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

  const handleImportByStyleCodes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportProgress(0);
    const loadingToast = toast.loading('Importing style codes...');
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          // Parse Style Codes Sheet
          const styleCodesSheet = workbook.Sheets['Style Codes'];
          if (!styleCodesSheet) {
            throw new Error('Style Codes sheet not found in the Excel file');
          }
          const styleCodesData = XLSX.utils.sheet_to_json<any>(styleCodesSheet);
          console.log('Parsed style codes data:', styleCodesData);

          // Filter out rows without required fields
          const validStyleCodes = styleCodesData.filter((row: any) => {
            return row['Product ID'] && row['Style Code'] && row['EAN Code'] && row['MRP'] !== undefined;
          });

          if (validStyleCodes.length === 0) {
            toast.error('No valid style codes found in the Excel file. Please ensure Product ID, Style Code, EAN Code, and MRP are provided.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(50);

          // Group style codes by product ID
          const productStyleCodes: Record<string, StyleCode[]> = {};
          const validationErrors: string[] = [];

          validStyleCodes.forEach((row: any) => {
            const productId = row['Product ID'].toString().trim();
            const styleCode = row['Style Code'].toString().trim();
            const eanCode = row['EAN Code'].toString().trim();
            const mrp = parseFloat(row['MRP']?.toString() || '0');
            
            if (isNaN(mrp) || mrp < 0) {
              validationErrors.push(`Product ${productId}: Invalid MRP value "${row['MRP']}"`);
              return;
            }
            
            if (!productStyleCodes[productId]) {
              productStyleCodes[productId] = [];
            }
            productStyleCodes[productId].push({
              styleCode,
              eanCode,
              mrp
            });
          });

          // Show validation errors if any
          if (validationErrors.length > 0) {
            const errorMessages = validationErrors.slice(0, 5).join('\n');
            if (validationErrors.length > 5) {
              toast.error(`Some style codes have validation errors:\n${errorMessages}\n...and ${validationErrors.length - 5} more errors`);
            } else {
              toast.error(`Some style codes have validation errors:\n${errorMessages}`);
            }
          }

          setImportProgress(75);

          // Update each product's style codes
          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const [productId, styleCodes] of Object.entries(productStyleCodes)) {
            try {
              await axios.patch(`${API_ENDPOINTS.products}/${productId}`, {
                styleCodes: styleCodes
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

            if (errorCount === 0 && validationErrors.length === 0) {
              toast.success(`Style codes imported successfully for ${successCount} product(s)!`);
            } else if (successCount === 0) {
              toast.error(`Failed to import style codes for all ${errorCount} products.`);
            } else {
              toast.success(`Style codes imported: ${successCount} successful, ${errorCount} failed.`);
            }

            // Show detailed errors if any
            if (errors.length > 0) {
              const errorMessages = errors.slice(0, 5).join('\n');
              if (errors.length > 5) {
                toast.error(`Some style codes failed to import:\n${errorMessages}\n...and ${errors.length - 5} more errors`);
              } else {
                toast.error(`Some style codes failed to import:\n${errorMessages}`);
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
      toast.error('Error importing style codes. Please try again.');
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
                <input
                  type="file"
                  ref={styleCodesFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleImportByStyleCodes}
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
                {exportProgress !== null && (
                  <div className="w-40 h-3 bg-gray-200 rounded-full overflow-hidden flex items-center ml-2">
                    <div
                      className="bg-primary h-full transition-all duration-200"
                      style={{ width: `${exportProgress}%` }}
                    ></div>
                    <span className="ml-2 text-xs text-gray-700">{exportProgress}%</span>
                  </div>
                )}
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
                      {!isProduction && (
                        <button
                          type="button"
                          onClick={handleExportByStyleCodes}
                          className="ti-btn ti-btn-info"
                          disabled={isLoading}
                        >
                          <i className="ri-download-2-line me-2"></i>
                          Export by Style Codes
                        </button>
                      )}
                      {!isDesign && !isFinal && (
                        <>
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
                    
                    {/* Export Progress Indicator */}
                    {exportProgress !== null && (
                      <div className="w-full mb-2">
                        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex items-center">
                          <div
                            className="bg-primary h-full transition-all duration-200"
                            style={{ width: `${exportProgress}%` }}
                          ></div>
                          <span className="ml-2 text-xs text-gray-700">{exportProgress}%</span>
                        </div>
                      </div>
                    )}
                    
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
                      {!isProduction && (
                        <button
                          type="button"
                          onClick={() => styleCodesFileInputRef.current?.click()}
                          className="ti-btn ti-btn-success"
                          disabled={isLoading}
                        >
                          <i className="ri-file-excel-2-line me-2"></i>
                          Import by Style Codes
                        </button>
                      )}
                      {!isDesign && !isFinal && (
                        <>
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
                        </>
                      )}
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
                      {!isProduction && (
                        <button
                          type="button"
                          onClick={handleDownloadStyleCodesTemplate}
                          className="ti-btn ti-btn-outline-secondary"
                          disabled={isLoading}
                        >
                          <i className="ri-file-download-line me-2"></i>
                          Style Codes Template
                        </button>
                      )}
                      {!isDesign && !isFinal && (
                        <>
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
                        </>
                      )}
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
                          {(!isDesign && !isProduction) || isFinal ? <th className="text-start">Style Codes</th> : null}
                          {!isDesign && !isProduction && <th className="text-start">Internal Code</th>}
                          <th className="text-start">Category</th>
                          <th className="text-start">Factory Code</th>
                          {isFinal && <th className="text-start">EAN Code</th>}
                          {isFinal && <th className="text-start">Description</th>}
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
                            <td>
                              <Link 
                                href={`/analytics/product-analysis/${product.id}`}
                                className="text-primary hover:text-primary/80 transition-colors duration-200"
                              >
                                {product.name}
                              </Link>
                            </td>
                            {(!isDesign && !isProduction) || isFinal ? (
                              <td>
                                {product.styleCodes && product.styleCodes.length > 0 ? (
                                  <button
                                    onClick={() => handleViewStyleCodes(product)}
                                    className="ti-btn ti-btn-sm ti-btn-outline-primary p-1"
                                    title={`View ${product.styleCodes.length} Style Code${product.styleCodes.length > 1 ? 's' : ''}`}
                                  >
                                    <i className="ri-eye-line"></i>
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            ) : null}
                            {!isDesign && !isProduction && <td>{product.internalCode || ''}</td>}
                            <td>{getCategoryName(product.category)}</td>
                            <td>{product.factoryCode || ''}</td>
                            {isFinal && <td>{product.eanCode || ''}</td>}
                            {isFinal && <td className="max-w-xs truncate" title={product.description || ''}>{product.description || ''}</td>}
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

      {/* Style Codes Modal */}
      {isStyleCodesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseStyleCodesModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold">Style Codes - {selectedProductName}</h2>
              <button
                onClick={handleCloseStyleCodesModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 overflow-auto">
              {selectedProductStyleCodes.length > 0 ? (
                <div className="table-responsive">
                  <table className="table whitespace-nowrap table-bordered">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-start p-3">Style Code</th>
                        <th className="text-start p-3">EAN Code</th>
                        <th className="text-start p-3">MRP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProductStyleCodes.map((styleCodeItem, index) => (
                        <tr key={index} className="border-b border-gray-200">
                          <td className="p-3">{styleCodeItem.styleCode || '-'}</td>
                          <td className="p-3">{styleCodeItem.eanCode || '-'}</td>
                          <td className="p-3">{styleCodeItem.mrp !== undefined ? styleCodeItem.mrp : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No style codes available for this product.
                </div>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-gray-200">
              <button
                onClick={handleCloseStyleCodesModal}
                className="ti-btn ti-btn-primary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
};

export default ProductListPage; 