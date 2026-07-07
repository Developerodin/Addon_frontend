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
import { styleCodeService } from '@/shared/services/styleCodeService';
import productService, { ProductBulkRow } from '@/shared/services/productService';

interface StyleCode {
  styleCode?: string;
  eanCode?: string;
  mrp?: number;
  id?: string;
  styleCodeId?: string;
}

interface Product {
  id: string;
  name: string;
  softwareCode: string;
  internalCode: string;
  knittingCode?: string;
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
  const [styleCodeSearch, setStyleCodeSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [showMoreExports, setShowMoreExports] = useState(false);
  const [selectedProductStyleCodes, setSelectedProductStyleCodes] = useState<StyleCode[]>([]);
  const [isStyleCodesModalOpen, setIsStyleCodesModalOpen] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [styleCodeLookup, setStyleCodeLookup] = useState<Array<{ id: string; styleCode: string; eanCode: string; mrp: number }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attributesFileInputRef = useRef<HTMLInputElement>(null);
  const bomFileInputRef = useRef<HTMLInputElement>(null);
  const processesFileInputRef = useRef<HTMLInputElement>(null);
  const styleCodesFileInputRef = useRef<HTMLInputElement>(null);
  const processExcelFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, itemsPerPage, searchQuery, styleCodeSearch]);

  // Fetch style codes once for resolving IDs in modal/export
  useEffect(() => {
    styleCodeService.list({ limit: 5000, sortBy: 'styleCode:asc' }).then((res: any) => {
      const list = res?.results ?? res ?? [];
      setStyleCodeLookup(Array.isArray(list) ? list.map((sc: any) => ({
        id: sc.id ?? sc._id ?? '',
        styleCode: sc.styleCode ?? '',
        eanCode: sc.eanCode ?? '',
        mrp: sc.mrp ?? 0
      })) : []);
    }).catch(() => setStyleCodeLookup([]));
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      });
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (styleCodeSearch.trim()) params.set('styleCode', styleCodeSearch.trim());
      const response = await axios.get(`${API_ENDPOINTS.products}?${params.toString()}`);
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

  const handleViewStyleCodes = async (product: Product) => {
    const raw = product.styleCodes || [];
    const getIdFromItem = (item: any): string => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') return String(item.styleCodeId ?? item.id ?? item._id ?? '').trim();
      return '';
    };

    // Collect IDs that need resolving
    const ids = raw.map(getIdFromItem).filter(Boolean);
    const lookupById = new Map(styleCodeLookup.map((sc) => [sc.id, sc]));
    const missingIds = Array.from(new Set(ids.filter((id) => !lookupById.has(id))));

    // Resolve missing IDs on-demand so modal doesn't show blanks
    if (missingIds.length > 0) {
      try {
        const fetched = await Promise.all(
          missingIds.map((id) =>
            styleCodeService
              .get(id)
              .then((sc) => ({ id: sc.id, styleCode: sc.styleCode ?? '', eanCode: sc.eanCode ?? '', mrp: sc.mrp ?? 0 }))
              .catch(() => null)
          )
        );
        const ok = fetched.filter((x): x is { id: string; styleCode: string; eanCode: string; mrp: number } => !!x && !!x.id);
        if (ok.length > 0) {
          setStyleCodeLookup((prev) => {
            const prevById = new Map(prev.map((p) => [p.id, p]));
            ok.forEach((sc) => prevById.set(sc.id, sc));
            return Array.from(prevById.values());
          });
          ok.forEach((sc) => lookupById.set(sc.id, sc));
        }
      } catch (e) {
        // ignore; we'll still show ID placeholders below
      }
    }

    const resolved: StyleCode[] = raw.map((item: any) => {
      // Already has full fields
      if (item && typeof item === 'object' && (item.styleCode != null || item.eanCode != null || item.mrp != null)) {
        return { styleCode: item.styleCode ?? '', eanCode: item.eanCode ?? '', mrp: item.mrp ?? 0 };
      }
      const id = getIdFromItem(item);
      const found = id ? lookupById.get(id) : undefined;
      return found
        ? { styleCode: found.styleCode, eanCode: found.eanCode, mrp: found.mrp }
        : { styleCode: id ? `(ID: ${id})` : '', eanCode: '', mrp: 0 };
    });

    setSelectedProductStyleCodes(resolved);
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
      return ['ID', 'Factory Code', 'Needles'];
    } else if (isFinal) {
      return ['ID', 'Description', 'Needles'];
    } else if (isDesign) {
      return ['ID', 'Name', 'Category', 'Software Code', 'Internal Code', 'Knitting Code', 'Vendor Code', 'Needles'];
    } else {
      return ['ID', 'Name', 'Category', 'Software Code', 'Internal Code', 'Knitting Code', 'Vendor Code', 'Factory Code', 'Description', 'Needles'];
    }
  };

  // Helper: resolve style code item to ID (product.styleCodes can be ID strings or objects)
  const getStyleCodeId = (item: any, lookup: Array<{ id: string; styleCode: string; eanCode: string; mrp: number }>): string => {
    if (typeof item === 'string' && item.trim()) return item.trim();
    const id = item?.id ?? item?.styleCodeId ?? item?._id;
    if (id) return String(id);
    const code = item?.styleCode?.toString().trim();
    if (code) {
      const found = lookup.find(sc => sc.styleCode === code || sc.id === code);
      if (found) return found.id;
    }
    return '';
  };

  // Helper function to build export data object with only allowed fields
  const buildExportData = (
    product: Product,
    categoryNameMapping: Record<string, string>,
    options?: { styleCodeLookup: Array<{ id: string; styleCode: string; eanCode: string; mrp: number }>; attributeValueIdToName: Record<string, string> }
  ) => {
    const allowedFields = getAllowedFields();
    const exportObj: Record<string, any> = {};
    const lookup = options?.styleCodeLookup ?? [];
    const attrValueToName = options?.attributeValueIdToName ?? {};

    allowedFields.forEach(field => {
      switch(field) {
        case 'ID':
          exportObj['ID'] = product.id;
          break;
        case 'Name':
          exportObj['Name'] = product.name;
          break;
        case 'Category':
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
        case 'Knitting Code':
          exportObj['Knitting Code'] = product.knittingCode || '';
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
        case 'Needles':
          const needlesKey = product.attributes && Object.keys(product.attributes).find(k => k.toLowerCase() === 'needles');
          const needlesVal = needlesKey ? product.attributes![needlesKey] : '';
          exportObj['Needles'] = (needlesVal && attrValueToName[needlesVal]) ? attrValueToName[needlesVal] : (needlesVal || '');
          break;
      }
    });

    // Add style code columns for non-production: only Style Code ID 1, 2, 3... (no EAN/MRP/name to avoid confusion)
    if (!isProduction) {
      const list = product.styleCodes || [];
      const count = list.length === 0 ? 1 : list.length;
      for (let index = 0; index < count; index++) {
        const num = index + 1;
        const item = list[index];
        const id = item != null ? getStyleCodeId(item, lookup) : '';
        exportObj[`Style Code ID ${num}`] = id || '';
      }
    }

    return exportObj;
  };

  const handleExport = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      
      // Check if products are selected
      let productsToExport: Product[] = [];
      
      if (selectedProducts.length > 0) {
        // Export only selected products
        productsToExport = products.filter(product => selectedProducts.includes(product.id));
        
        if (productsToExport.length === 0) {
          toast.error('No selected products found to export');
          setExportProgress(null);
          setIsLoading(false);
          return;
        }
      } else {
        // Export all products
        const response = await axios.get(`${API_ENDPOINTS.products}?limit=100000`);
        const data = response.data as ProductsResponse;
        productsToExport = data.results;
      }
      
      setExportProgress(25);
      
      // Continue animation while fetching categories
      const progressTimer2 = animateProgress(25, 45, 400);
      
      // Fetch all categories and product-attributes in parallel for mapping
      const [categoriesResponse, attributesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`),
        axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`)
      ]);
      const allCategories = categoriesResponse.data.results || [];
      const allAttributes = attributesResponse.data.results || [];
      clearInterval(progressTimer2);
      setExportProgress(50);

      // Create reverse mapping from category ID to category name
      const categoryNameMapping: Record<string, string> = {};
      allCategories.forEach((category: any) => {
        categoryNameMapping[category.id] = category.name;
      });
      // Attribute value ID -> display name (for Needles and other attributes in export)
      const attributeValueIdToName: Record<string, string> = {};
      allAttributes.forEach((attr: any) => {
        (attr.optionValues || []).forEach((value: any) => {
          const valueId = value.id || value._id || value.valueId;
          if (valueId && (value.name != null || value.value != null)) {
            attributeValueIdToName[String(valueId)] = value.name ?? value.value ?? '';
          }
        });
      });
      setExportProgress(60);

      const wb = XLSX.utils.book_new();
      const exportOptions = { styleCodeLookup, attributeValueIdToName };

      // Create Products sheet with only user-appropriate fields
      const exportData = productsToExport.map((product, index) => {
        if (index % 100 === 0) {
          setExportProgress(60 + Math.floor((index / productsToExport.length) * 10));
        }
        return buildExportData(product, categoryNameMapping, exportOptions);
      });
      setExportProgress(70);
      
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      setExportProgress(85);

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      setExportProgress(95);
      const fileName = selectedProducts.length > 0 
        ? `selected_products_${new Date().toISOString().split('T')[0]}.xlsx`
        : `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(data2, fileName);
      setExportProgress(100);
      
      setTimeout(() => {
        setExportProgress(null);
        const message = selectedProducts.length > 0
          ? `${selectedProducts.length} selected product(s) exported successfully`
          : 'Products exported successfully';
        toast.success(message);
      }, 500);
    } catch (error) {
      console.error('Error exporting products:', error);
      setExportProgress(null);
      toast.error('Error exporting products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Export ALL products (paginated fetch) in same format as Export - for large catalogs e.g. 6000+ */
  const handleExportAll = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      const PAGE_SIZE = 1000;
      let allProducts: Product[] = [];
      let page = 1;
      let totalPages = 1;

      // Paginate through all products
      do {
        const response = await axios.get(
          `${API_ENDPOINTS.products}?page=${page}&limit=${PAGE_SIZE}`
        );
        const data = response.data as ProductsResponse;
        allProducts = [...allProducts, ...(data.results || [])];
        totalPages = data.totalPages ?? 1;
        setExportProgress(Math.min(15, Math.round((page / totalPages) * 15)));
        page++;
      } while (page <= totalPages);

      if (allProducts.length === 0) {
        toast.error('No products found to export');
        setExportProgress(null);
        setIsLoading(false);
        return;
      }

      setExportProgress(20);
      const progressTimer2 = animateProgress(20, 40, 400);
      const [categoriesResponse, attributesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`),
        axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`)
      ]);
      const allCategories = categoriesResponse.data.results || [];
      const allAttributes = attributesResponse.data.results || [];
      clearInterval(progressTimer2);
      setExportProgress(50);

      const categoryNameMapping: Record<string, string> = {};
      allCategories.forEach((category: any) => {
        categoryNameMapping[category.id] = category.name;
      });
      const attributeValueIdToName: Record<string, string> = {};
      allAttributes.forEach((attr: any) => {
        (attr.optionValues || []).forEach((value: any) => {
          const valueId = value.id || value._id || value.valueId;
          if (valueId && (value.name != null || value.value != null)) {
            attributeValueIdToName[String(valueId)] = value.name ?? value.value ?? '';
          }
        });
      });
      setExportProgress(60);

      const wb = XLSX.utils.book_new();
      const exportOptions = { styleCodeLookup, attributeValueIdToName };
      const exportData = allProducts.map((product, index) => {
        if (index % 200 === 0) {
          setExportProgress(60 + Math.floor((index / allProducts.length) * 25));
        }
        return buildExportData(product, categoryNameMapping, exportOptions);
      });
      setExportProgress(85);

      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const data2 = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      setExportProgress(95);
      saveAs(data2, `products_all_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      setTimeout(() => {
        setExportProgress(null);
        toast.success(`All ${allProducts.length} products exported successfully`);
      }, 500);
    } catch (error) {
      console.error('Error exporting all products:', error);
      setExportProgress(null);
      toast.error('Error exporting all products. Please try again.');
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

      // Build template with fixed column order so Style Code ID, Needles always visible where applicable
      const buildTemplateRow = (exampleNum: number) => {
        const row: Record<string, any> = {};
        // Base fields in consistent order
        if (allowedFields.includes('ID')) row['ID'] = exampleNum === 1 ? '680c7a2bc30d1e00643b84e8' : '68246cc23d04e20065d3d60a';
        if (allowedFields.includes('Name')) row['Name'] = `Example Product ${exampleNum}`;
        if (allowedFields.includes('Category')) row['Category'] = exampleNum === 1 ? 'Electronics' : 'Clothing';
        if (allowedFields.includes('Software Code')) row['Software Code'] = exampleNum === 1 ? 'PRD-M9XTTW8I-85T1C' : 'PRD-MANS85IE-BW0YJ';
        if (allowedFields.includes('Internal Code')) row['Internal Code'] = exampleNum === 1 ? '123' : 'INT-67890';
        if (allowedFields.includes('Knitting Code')) row['Knitting Code'] = exampleNum === 1 ? 'KNIT-123' : 'KNIT-67890';
        if (allowedFields.includes('Vendor Code')) row['Vendor Code'] = exampleNum === 1 ? '456' : 'VEN-67890';
        if (allowedFields.includes('Factory Code')) row['Factory Code'] = exampleNum === 1 ? '789' : 'FAC-67890';
        if (allowedFields.includes('Description')) row['Description'] = exampleNum === 1 ? 'Example product description' : 'Another example product';
        // Needles: pass option value name (string from masters); backend expects e.g. attributes.Needles: "7 GG"
        if (allowedFields.includes('Needles')) row['Needles'] = exampleNum === 1 ? '7 GG' : '10 GG';
        // Style codes: only Style Code ID 1, 2, 3... (no EAN/MRP columns)
        if (!isProduction) {
          row['Style Code ID 1'] = exampleNum === 1 ? '6990090b7cd417242c5e848f' : '';
          row['Style Code ID 2'] = '';
          row['Style Code ID 3'] = '';
        }
        return row;
      };

      const templateData = [buildTemplateRow(1), buildTemplateRow(2)];
      
      const ws = XLSX.utils.json_to_sheet(templateData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');

      // Add instructions sheet with user-specific requirements
      const getRequiredFields = () => {
        if (isProduction) return 'Factory Code (Needles optional)';
        if (isFinal) return 'Description, and at least one Style Code ID (Style Code ID 1, 2, 3...)';
        if (isDesign) return 'Name, Category, Internal Code, Vendor Code';
        return 'Name, and at least one Style Code ID (Style Code ID 1, 2, 3...)';
      };

      const instructionsTemplate = [
        { 'Instructions': 'How to use this template:', '': '' },
        { 'Instructions': '0. Style Code ID 1, 2, 3…: fill only the style code IDs from the Style Code master. Needles = option value name from masters (e.g. "7 GG"); you can use ID or name, system passes the name string to backend.', '': '' },
        { 'Instructions': '1. The Products sheet contains product information fields based on your user role.', '': '' },
        { 'Instructions': `2. Required fields: ${getRequiredFields()}`, '': '' },
        { 'Instructions': '3. Category must be the exact name of a category from your system (not ID).', '': '' },
        { 'Instructions': '4. The system will automatically map category names to their IDs.', '': '' },
        { 'Instructions': '5. ID field: Leave empty for new products, include ID for updating existing products.', '': '' },
        { 'Instructions': '6. Software Code: Leave empty for new products (auto-generated), include for updates.', '': '' },
        { 'Instructions': '7. Only fill in the fields visible in this template based on your user role.', '': '' },
        { 'Instructions': '8. If a category name is not found, the product will be created without a category.', '': '' },
        { 'Instructions': '9. Style Codes: Use Style Code ID 1, Style Code ID 2, etc. with IDs from the Style Code master. Fill only the ID – no other columns needed.', '': '' },
        { 'Instructions': '11. Needles: Use the Needles option value name from the attribute master (e.g. "7 GG"). Backend expects attributes.Needles as string from masters. You can use ID or option name in Excel; system passes the resolved name string on import.', '': '' }
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
          const rawProductsData = XLSX.utils.sheet_to_json<any>(productsSheet, { defval: '' });
          // Normalize rows: trim header keys so "Name ", " Style Code ID 1 " etc. match expected keys
          const productsData = rawProductsData.map((row: any) => {
            const normalized: Record<string, any> = {};
            Object.keys(row).forEach(k => {
              const key = (k && typeof k === 'string') ? k.trim() : k;
              if (key) normalized[key] = row[k];
            });
            return normalized;
          });
          console.log('Parsed products data:', productsData);

          const getRowVal = (row: any, key: string) => {
            const val = row[key];
            if (val !== undefined && val !== null) return val;
            const keyLower = key.toLowerCase();
            const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === keyLower);
            return foundKey != null ? row[foundKey] : undefined;
          };

          // Use all rows from the sheet; no front-end validation for Name or style codes (backend may validate).
          const validProducts = productsData;
          if (validProducts.length === 0) {
            toast.error('No rows found in the Excel file.');
            setImportProgress(null);
            toast.dismiss(loadingToast);
            return;
          }

          setImportProgress(25);

          // Fetch categories, style codes, and product-attributes for mapping
          const [categoriesResponse, styleCodesListRes, attributesResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/categories?page=1&limit=10000`),
            styleCodeService.list({ limit: 5000, sortBy: 'styleCode:asc' }),
            axios.get(`${API_BASE_URL}/product-attributes?page=1&limit=10000`)
          ]);
          const allCategories = categoriesResponse.data.results || [];
          const styleCodesList = (styleCodesListRes as any)?.results ?? (styleCodesListRes as any) ?? [];
          const styleCodeLookupList = Array.isArray(styleCodesList) ? styleCodesList.map((sc: any) => ({
            id: sc.id ?? sc._id ?? '',
            styleCode: (sc.styleCode ?? '').toString().trim().toLowerCase(),
            eanCode: sc.eanCode ?? '',
            mrp: sc.mrp ?? 0
          })) : [];
          const allAttributes = attributesResponse?.data?.results || [];

          const categoryMapping: Record<string, string> = {};
          allCategories.forEach((category: any) => {
            categoryMapping[category.name.toLowerCase()] = category.id;
          });
          const styleCodeToIdMap: Record<string, string> = {};
          styleCodeLookupList.forEach((sc: { id: string; styleCode: string }) => {
            if (sc.styleCode && sc.id) styleCodeToIdMap[sc.styleCode] = sc.id;
          });
          // Needles: resolve Excel value (id or name) -> option value name (backend expects string from masters e.g. Needles: "7 GG")
          const needlesToNameMap: Record<string, string> = {};
          const needlesAttr = allAttributes.find((a: any) => (a.name || '').toLowerCase() === 'needles');
          if (needlesAttr && Array.isArray(needlesAttr.optionValues)) {
            needlesAttr.optionValues.forEach((opt: any) => {
              const id = String(opt.id || opt._id || opt.valueId || '');
              const name = (opt.name || opt.value || '').toString().trim();
              if (name) {
                needlesToNameMap[name.toLowerCase()] = name;
                needlesToNameMap[name] = name;
              }
              if (id) needlesToNameMap[id] = name || id;
            });
          }

          setImportProgress(50);

          // Extract style code IDs: prefer "Style Code ID 1", else resolve "Style Code 1" via master lookup (use getRowVal so export/template column names match)
          const extractStyleCodeIds = (row: any): string[] => {
            const ids: string[] = [];
            let index = 1;
            while (true) {
              const idKey = `Style Code ID ${index}`;
              const idVal = String(getRowVal(row, idKey) ?? '').trim();
              if (idVal) {
                ids.push(idVal);
                index++;
                continue;
              }
              const styleCodeKey = `Style Code ${index}`;
              const styleCodeVal = String(getRowVal(row, styleCodeKey) ?? '').trim();
              if (!styleCodeVal) break;
              const resolvedId = styleCodeToIdMap[styleCodeVal.toLowerCase()];
              if (resolvedId) ids.push(resolvedId);
              index++;
              if (index > 20) break;
            }
            return ids;
          };

          // Transform data for bulk import - use getRowVal for all fields so export/template column names match (trim + case-insensitive)
          const transformedProducts = validProducts.map((row: any) => {
            const idVal = getRowVal(row, 'ID');
            const productId = idVal !== undefined && idVal !== null && String(idVal).trim() !== '' ? String(idVal).trim() : undefined;
            const productData: any = {
              id: productId, // For updates
            };

            // styleCodes: array of IDs e.g. ["6990090b7cd417242c5e848f"]
            const styleCodeIds = !isProduction ? extractStyleCodeIds(row) : [];
            // attributes: { Needles: "7 GG" } - pass option value name (string from masters)
            const needlesVal = String(getRowVal(row, 'Needles') ?? '').trim();
            if (needlesVal) {
              productData.attributes = productData.attributes || {};
              const needlesName = needlesToNameMap[needlesVal.toLowerCase()] || needlesToNameMap[needlesVal] || needlesVal;
              productData.attributes['Needles'] = needlesName;
            }

            // Only include fields allowed for this user type
            if (isProduction) {
              productData.factoryCode = String(getRowVal(row, 'Factory Code') ?? '').trim() || '';
            } else if (isFinal) {
              productData.description = String(getRowVal(row, 'Description') ?? '').trim() || '';
              if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
            } else if (isDesign) {
              const categoryName = String(getRowVal(row, 'Category') ?? '').trim();
              let categoryId = '';
              if (categoryName) {
                const mappedCategoryId = categoryMapping[categoryName.toLowerCase()];
                if (mappedCategoryId) categoryId = mappedCategoryId;
                else console.warn(`Category "${categoryName}" not found in the system`);
              }
              productData.name = String(getRowVal(row, 'Name') ?? '').trim() || '';
              productData.softwareCode = (() => { const v = getRowVal(row, 'Software Code'); return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : undefined; })();
              productData.internalCode = String(getRowVal(row, 'Internal Code') ?? '').trim() || '';
              productData.knittingCode = String(getRowVal(row, 'Knitting Code') ?? '').trim() || '';
              productData.vendorCode = String(getRowVal(row, 'Vendor Code') ?? '').trim() || '';
              productData.category = categoryId;
              if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
            } else {
              const categoryName = String(getRowVal(row, 'Category') ?? '').trim();
              let categoryId = '';
              if (categoryName) {
                const mappedCategoryId = categoryMapping[categoryName.toLowerCase()];
                if (mappedCategoryId) categoryId = mappedCategoryId;
                else console.warn(`Category "${categoryName}" not found in the system`);
              }
              productData.name = String(getRowVal(row, 'Name') ?? '').trim() || '';
              productData.internalCode = String(getRowVal(row, 'Internal Code') ?? '').trim() || '';
              productData.knittingCode = String(getRowVal(row, 'Knitting Code') ?? '').trim() || '';
              productData.vendorCode = String(getRowVal(row, 'Vendor Code') ?? '').trim() || '';
              productData.factoryCode = String(getRowVal(row, 'Factory Code') ?? '').trim() || '';
              productData.description = String(getRowVal(row, 'Description') ?? '').trim() || '';
              productData.category = categoryId;
              productData.softwareCode = (() => { const v = getRowVal(row, 'Software Code'); return v !== undefined && v !== null && String(v).trim() !== '' ? String(v).trim() : undefined; })();
              if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
            }

            return productData;
          });

          setImportProgress(75);

          // For updates (rows with ID), fetch existing product and merge attributes, bom, processes so they are not cleared by backend
          const BATCH_SIZE = 10;
          const toMerge = transformedProducts.filter((p: any) => p.id);
          const existingMap = new Map<string, Product>();
          if (toMerge.length > 0) {
            for (let i = 0; i < toMerge.length; i += BATCH_SIZE) {
              const batch = toMerge.slice(i, i + BATCH_SIZE);
              const fetched = await Promise.all(
                batch.map((p: any) =>
                  axios.get(`${API_ENDPOINTS.products}/${p.id}`).then((r) => r.data).catch(() => null)
                )
              );
              fetched.forEach((existing: Product | null, idx) => {
                const id = batch[idx].id;
                if (existing && id) existingMap.set(id, existing);
              });
            }
          }

          const mergedProducts = transformedProducts.map((productData: any) => {
            const id = productData.id;
            if (!id) return productData;
            const existing = existingMap.get(id);
            if (!existing) return productData;

            // Merge attributes: keep existing, overwrite with Excel (e.g. Needles)
            const mergedAttributes = { ...(existing.attributes || {}) };
            if (productData.attributes && typeof productData.attributes === 'object') {
              Object.assign(mergedAttributes, productData.attributes);
            }
            const payload: any = { ...productData };
            payload.attributes = Object.keys(mergedAttributes).length > 0 ? mergedAttributes : undefined;
            // Preserve BOM and processes so backend does not clear them
            if (existing.bom && existing.bom.length > 0) payload.bom = existing.bom;
            if (existing.processes && existing.processes.length > 0) payload.processes = existing.processes;
            return payload;
          });

          // Send bulk import request (with merged data for updates)
          const response = await axios.post(`${API_ENDPOINTS.products}/bulk-import`, {
            products: mergedProducts,
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
          
          // Build set of valid (attributeName, attributeValue) for validation — we send name → value string, not IDs
          const validAttributeValueSet = new Set<string>();
          allAttributes.forEach((attr: any) => {
            const attrKey = (attr.name ?? '').toString().toLowerCase();
            (attr.optionValues || []).forEach((value: any) => {
              const valueName = (value.name ?? value.value ?? '').toString().trim().toLowerCase();
              if (valueName) validAttributeValueSet.add(`${attrKey}::${valueName}`);
            });
          });

          setImportProgress(50);

          // Group attributes by product ID — pass attribute name → value string (no value IDs)
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

            // Validate option exists, then store attribute name → value string
            const key = `${attributeName.toLowerCase()}::${attributeValue.toLowerCase()}`;
            if (validAttributeValueSet.has(key)) {
              productAttributes[productId][attributeName] = attributeValue;
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

          // Parse BOM Sheet — try exact match, then case-insensitive, then fall back to first sheet
          const sheetNames = workbook.SheetNames;
          if (sheetNames.length === 0) {
            throw new Error('The Excel file contains no sheets');
          }

          let bomSheetName = sheetNames.find((name: string) => name === 'BOM')
            || sheetNames.find((name: string) => name.toLowerCase() === 'bom')
            || sheetNames[0];

          const bomSheet = workbook.Sheets[bomSheetName];
          const rawBomData = XLSX.utils.sheet_to_json<any>(bomSheet);

          // Normalize column headers by trimming whitespace
          const bomData = rawBomData.map((row: any) => {
            const normalized: any = {};
            Object.keys(row).forEach((key) => {
              normalized[key.trim()] = row[key];
            });
            return normalized;
          });
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

  /** Process Excel: export via GET /v1/products/bulk-export → download Excel */
  const handleProcessExcelExport = async () => {
    try {
      setExportProgress(0);
      setIsLoading(true);
      const rows = await productService.bulkExport();
      setExportProgress(50);
      const wb = XLSX.utils.book_new();
      const cols = ['id', 'name', 'knittingCode', 'factoryCode', 'Needles', 'styleCodeId1', 'styleCodeId2', 'styleCodeId3', 'styleCodeId4', 'styleCodeId5', 'styleCodeId6', 'styleCodeId7', 'styleCodeId8', 'styleCodeId9', 'styleCodeId10'];
      const exportData = rows.map((r: ProductBulkRow) => {
        const row: Record<string, string> = {};
        const src = r as unknown as Record<string, unknown>;
        cols.forEach(c => {
          const val = c === 'Needles' && src['attributes'] && typeof src['attributes'] === 'object'
            ? (src['attributes'] as Record<string, unknown>)['Needles']
            : src[c];
          row[c] = val != null ? String(val) : '';
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `process_excel_products_${new Date().toISOString().split('T')[0]}.xlsx`);
      setExportProgress(100);
      setTimeout(() => { setExportProgress(null); toast.success('Process Excel export completed.'); }, 400);
    } catch (error: any) {
      setExportProgress(null);
      toast.error(error?.message || 'Process Excel export failed.');
    } finally {
      setIsLoading(false);
    }
  };

  /** Process Excel Import: parse Excel → build payload (same shape as PATCH edit: attributes.Needles, styleCodeId1…10) → POST /v1/products/bulk-upsert */
  const handleProcessExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportProgress(0);
    const loadingToast = toast.loading('Process Excel: importing...');
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets['Products'] || workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        toast.dismiss(loadingToast);
        toast.error('No sheet found in the Excel file.');
        setImportProgress(null);
        return;
      }
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const getVal = (r: Record<string, unknown>, key: string) => {
        const v = r[key];
        if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
        const lower = key.toLowerCase();
        const k = Object.keys(r).find(x => x.trim().toLowerCase() === lower);
        return k != null && r[k] != null && String(r[k]).trim() !== '' ? String(r[k]).trim() : '';
      };
      const products = raw.map(row => {
        const name = getVal(row, 'name');
        if (!name || name.trim() === '') return null;
        const product: Record<string, unknown> = {
          name: name.trim(),
        };
        const id = getVal(row, 'id');
        if (id) product.id = id;
        const knittingCode = getVal(row, 'knittingCode');
        if (knittingCode) product.knittingCode = knittingCode;
        const factoryCode = getVal(row, 'factoryCode');
        if (factoryCode) product.factoryCode = factoryCode;
        const Needles = getVal(row, 'Needles');
        if (Needles) {
          product.attributes = { Needles };
        }
        for (let i = 1; i <= 10; i++) {
          const val = getVal(row, `styleCodeId${i}`);
          if (val) product[`styleCodeId${i}`] = val;
        }
        return product;
      }).filter((p): p is Record<string, unknown> => p != null) as unknown as ProductBulkRow[];
      if (products.length === 0) {
        toast.dismiss(loadingToast);
        toast.error('No valid product rows (name required).');
        setImportProgress(null);
        return;
      }

      // For updates (rows with id), fetch existing product and merge attributes, bom, processes so they are not cleared
      const withId = products.filter((p: ProductBulkRow) => p.id);
      const existingById = new Map<string, Product>();
      const BATCH = 10;
      for (let i = 0; i < withId.length; i += BATCH) {
        const batch = withId.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map((p) =>
            axios.get(`${API_ENDPOINTS.products}/${(p as ProductBulkRow & { id: string }).id}`).then((r) => r.data as Product).catch(() => null)
          )
        );
        results.forEach((ex, idx) => {
          const id = (batch[idx] as ProductBulkRow & { id: string }).id;
          if (ex && id) existingById.set(id, ex);
        });
      }

      const mergedForUpsert = products.map((p) => {
        const row = { ...p } as ProductBulkRow & { bom?: ProductBOM[]; processes?: ProductProcess[] };
        const id = (p as ProductBulkRow & { id?: string }).id;
        if (!id) return row;
        const existing = existingById.get(id);
        if (!existing) return row;
        // Merge attributes so we don't wipe other attributes
        const mergedAttrs = { ...(existing.attributes || {}) };
        if ((p as ProductBulkRow).attributes && typeof (p as ProductBulkRow).attributes === 'object') {
          Object.assign(mergedAttrs, (p as ProductBulkRow).attributes);
        }
        row.attributes = Object.keys(mergedAttrs).length > 0 ? (mergedAttrs as { Needles?: string }) : undefined;
        if (existing.bom?.length) row.bom = existing.bom;
        if (existing.processes?.length) row.processes = existing.processes;
        return row;
      });

      setImportProgress(50);
      const result = await productService.bulkUpsert(mergedForUpsert as ProductBulkRow[], 50);
      setImportProgress(100);
      setTimeout(() => {
        setImportProgress(null);
        toast.dismiss(loadingToast);
        const r = result.results;
        const created = r.created ?? 0;
        const updated = r.updated ?? 0;
        const failed = r.failed ?? 0;
        if (failed === 0) toast.success(`Process Excel: ${created} created, ${updated} updated.`);
        else toast.success(`Process Excel: ${created} created, ${updated} updated, ${failed} failed.`);
        if (r.errors?.length) toast.error(r.errors.slice(0, 3).map((err: any) => err.error || err.productName).join('; '));
        fetchProducts();
      }, 500);
    } catch (err: any) {
      setImportProgress(null);
      toast.dismiss(loadingToast);
      toast.error(err?.message || 'Process Excel import failed.');
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
    <div className="main-content !p-[10px]">
      <Seo title="Products"/>

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Products</h1>
              <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                {totalResults}
              </span>
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

            <div className="flex flex-wrap items-center gap-2">
              {/* Search by style code */}
              <div className="relative flex items-center gap-1">
                <div className="relative">
                  <input
                    type="text"
                    className="bg-white border border-gray-200 pl-8 pr-8 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-52 min-w-[140px] placeholder:text-gray-400 transition-all font-medium"
                    placeholder="Search by style code..."
                    value={styleCodeSearch}
                    onChange={(e) => {
                      setStyleCodeSearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Search products by style code"
                  />
                  <i className="ri-barcode-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" aria-hidden="true"></i>
                  {styleCodeSearch.trim() ? (
                    <button
                      type="button"
                      onClick={() => {
                        setStyleCodeSearch('');
                        setCurrentPage(1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      aria-label="Clear style code search"
                    >
                      <i className="ri-close-line"></i>
                    </button>
                  ) : null}
                </div>
                {styleCodeSearch.trim() ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-100 whitespace-nowrap">
                    Style: {styleCodeSearch.trim()}
                  </span>
                ) : null}
              </div>

              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  className="bg-white border border-gray-200 pl-8 pr-3 py-1.5 text-[11px] rounded focus:ring-0 focus:border-purple-300 w-48 min-w-[120px] placeholder:text-gray-400 transition-all font-medium"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
              </div>

              {/* Items per page */}
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

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors shadow-sm"
                disabled={isLoading}
              >
                <i className="ri-file-download-line text-xs"></i>
                Template
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
                <input
                  type="file"
                  ref={processExcelFileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleProcessExcelImport}
                />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded hover:bg-emerald-700 transition-colors shadow-sm"
                disabled={isLoading}
              >
                <i className="ri-file-excel-2-line text-xs"></i>
                Import
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
                disabled={isLoading}
              >
                <i className="ri-download-2-line text-xs"></i>
                Export
              </button>
              {exportProgress !== null && (
                <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden flex items-center">
                  <div className="bg-primary h-full transition-all duration-200" style={{ width: `${exportProgress}%` }}></div>
                  <span className="ml-1.5 text-[10px] text-gray-600 font-medium">{exportProgress}%</span>
                </div>
              )}
              {/* {selectedProducts.length > 0 && (
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded border transition-colors ${"bg-red-50 text-red-600 border-red-100 hover:bg-red-100 shadow-sm"}`}
                  onClick={handleBulkDelete}
                  disabled={isLoading}
                >
                  <i className="ri-delete-bin-line text-xs"></i>
                  Delete ({selectedProducts.length})
                </button>
              )} */}
              <Link
                href="/catalog/items/add"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              >
                <i className="ri-add-line text-xs"></i>
                Add Product
              </Link>
              <button
                type="button"
                onClick={() => setShowMoreExports(!showMoreExports)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-[#495057] text-[11px] font-bold rounded hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                <i className="ri-more-line text-xs"></i>
                {showMoreExports ? 'Less' : 'More'}
              </button>
              {showMoreExports && (
                <div className="flex flex-wrap gap-2 mt-2 w-full">
                  <button type="button" onClick={handleExportAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 text-[11px] font-bold rounded hover:bg-purple-100" disabled={isLoading}>
                    <i className="ri-download-2-line text-xs"></i> Export All
                  </button>
                  {/* <span className="text-[11px] font-bold text-gray-500 self-center mr-1">Process Excel:</span>
                  <button type="button" onClick={handleProcessExcelExport} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold rounded hover:bg-amber-100" disabled={isLoading}>
                    <i className="ri-download-2-line text-xs"></i> Process Excel Export
                  </button>
                  <button type="button" onClick={() => processExcelFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold rounded hover:bg-amber-100" disabled={isLoading}>
                    <i className="ri-file-excel-2-line text-xs"></i> Process Excel Import
                  </button> */}
                  <button type="button" onClick={handleExportByAttributes} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-100 text-[11px] font-bold rounded hover:bg-sky-100" disabled={isLoading}>
                    <i className="ri-download-2-line text-xs"></i> Export by Attributes
                  </button>
                  {!isDesign && !isFinal && (
                    <>
                      <button type="button" onClick={handleExportByBOM} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-100 text-[11px] font-bold rounded hover:bg-sky-100" disabled={isLoading}>
                        <i className="ri-download-2-line text-xs"></i> Export by BOM
                      </button>
                      <button type="button" onClick={handleExportByProcesses} className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-600 border border-sky-100 text-[11px] font-bold rounded hover:bg-sky-100" disabled={isLoading}>
                        <i className="ri-download-2-line text-xs"></i> Export by Processes
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => attributesFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold rounded hover:bg-emerald-100" disabled={isLoading}>
                    <i className="ri-file-excel-2-line text-xs"></i> Import by Attributes
                  </button>
                  {!isDesign && !isFinal && (
                    <>
                      <button type="button" onClick={() => bomFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold rounded hover:bg-emerald-100" disabled={isLoading}>
                        <i className="ri-file-excel-2-line text-xs"></i> Import by BOM
                      </button>
                      <button type="button" onClick={() => processesFileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold rounded hover:bg-emerald-100" disabled={isLoading}>
                        <i className="ri-file-excel-2-line text-xs"></i> Import by Processes
                      </button>
                    </>
                  )}
                  <button type="button" onClick={handleDownloadAttributesTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-100" disabled={isLoading}>
                    <i className="ri-file-download-line text-xs"></i> Attributes Template
                  </button>
                  {!isDesign && !isFinal && (
                    <>
                      <button type="button" onClick={handleDownloadBOMTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-100" disabled={isLoading}>
                        <i className="ri-file-download-line text-xs"></i> BOM Template
                      </button>
                      <button type="button" onClick={handleDownloadProcessesTemplate} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 text-[11px] font-bold rounded hover:bg-gray-100" disabled={isLoading}>
                        <i className="ri-file-download-line text-xs"></i> Processes Template
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4 opacity-50"></div>
              <p className="text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase">Loading Data</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <i className="ri-inbox-line text-xl text-gray-200"></i>
              </div>
              <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
                    <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                  </th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Name</th>
                  {(!isDesign && !isProduction) || isFinal ? <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Style Codes</th> : null}
                  {!isDesign && !isProduction && <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Internal Code</th>}
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Category</th>
                  <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Factory Code</th>
                  {isFinal && <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">EAN Code</th>}
                  {isFinal && <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Description</th>}
                  <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="pl-[10px] pr-1 py-2.5 border border-gray-200">
                      <input type="checkbox" checked={selectedProducts.includes(product.id)} onChange={() => handleProductSelect(product.id)} className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5" />
                    </td>
                    <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                      <Link href={`/analytics/product-analysis/${product.id}`} className="text-purple-600 hover:text-purple-700 transition-colors">
                        {product.name}
                      </Link>
                    </td>
                    {(!isDesign && !isProduction) || isFinal ? (
                      <td className="px-1.5 py-2.5 border border-gray-200">
                        {product.styleCodes && product.styleCodes.length > 0 ? (
                          <button onClick={() => handleViewStyleCodes(product)} className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title={`View ${product.styleCodes.length} Style Code${product.styleCodes.length > 1 ? 's' : ''}`}>
                            <i className="ri-eye-line text-xs"></i>
                          </button>
                        ) : (
                          <span className="text-[12px] text-gray-400">-</span>
                        )}
                      </td>
                    ) : null}
                    {!isDesign && !isProduction && <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{product.internalCode || ''}</td>}
                    <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">{getCategoryName(product.category)}</td>
                    <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{product.factoryCode || ''}</td>
                    {isFinal && <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">{product.eanCode || ''}</td>}
                    {isFinal && <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 max-w-xs truncate border border-gray-200" title={product.description || ''}>{product.description || ''}</td>}
                    <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Link href={`/catalog/items/${product.id}/edit`} className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="Edit">
                          <i className="ri-pencil-line text-xs"></i>
                        </Link>
                        {/* <button className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors" onClick={() => handleDelete(product.id)} title="Delete">
                          <i className="ri-delete-bin-line text-xs"></i>
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
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
      </div>

      {/* Style Codes Modal */}
      {isStyleCodesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseStyleCodesModal}>
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-[10px] border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-800">Style Codes - {selectedProductName}</h2>
              <button onClick={handleCloseStyleCodesModal} className="text-gray-500 hover:text-gray-700 transition-colors p-1">
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
            <div className="p-[10px] overflow-auto">
              {selectedProductStyleCodes.length > 0 ? (
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">Style Code</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">EAN Code</th>
                      <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProductStyleCodes.map((styleCodeItem, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 border border-gray-200">
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-200">{styleCodeItem.styleCode || '-'}</td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-200">{styleCodeItem.eanCode || '-'}</td>
                        <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-900 border border-gray-200">{styleCodeItem.mrp !== undefined ? styleCodeItem.mrp : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-[12px] text-gray-500">No style codes available for this product.</div>
              )}
            </div>
            <div className="flex justify-end p-[10px] border-t border-gray-200">
              <button onClick={handleCloseStyleCodesModal} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm">
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