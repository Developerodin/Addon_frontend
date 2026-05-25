"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import HelpIcon from '@/shared/components/HelpIcon';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import { styleCodeService, StyleCode } from '@/shared/services/styleCodeService';
import { StyleCodeSelectModal } from '@/app/catalog/style-codes/components/StyleCodeSelectModal';
import { ProcessSequenceEditor } from '@/app/catalog/items/components/ProcessSequenceEditor';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

interface AttributeOptionValue {
  _id: string;
  name: string;
  image: string;
  sortOrder: number;
}

interface AttributeOption {
  id: string;
  name: string;
  type: string;
  sortOrder: number;
  optionValues: AttributeOptionValue[];
}

interface ProcessStep {
  _id: string;
  stepTitle: string;
  stepDescription: string;
  duration: number;
  createdAt: string;
  updatedAt: string;
}

interface Process {
  id: string;
  name: string;
  type: string;
  description: string;
  status: string;
  sortOrder: number;
  steps: ProcessStep[];
}

interface ProcessApiResponse {
  results: Process[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface AttributesApiResponse {
  results: AttributeOption[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

interface Attributes {
  [key: string]: AttributeOptionValue[];
}

interface BomItem {
  yarnCatalogId: string;
  yarnName: string;
  quantity: number;
}

interface ProcessItem {
  processId: string;
}

interface FormData {
  [key: string]: string;
}

interface Category {
  id: string;
  name: string;
}

// API endpoints
const API_ENDPOINTS = {
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`,
  createProduct: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories?page=1&limit=200`
};

const generateSoftwareCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `PRD-${timestamp}-${random}`.toUpperCase();
};

const AddProductPage = () => {
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);
  
  const [activeTab, setActiveTab] = useState('general');
  const [bomItems, setBomItems] = useState<BomItem[]>([{ yarnCatalogId: '', yarnName: '', quantity: 0 }]);
  const [processItems, setProcessItems] = useState<ProcessItem[]>([{ processId: '' }]);
  const [softwareCode, setSoftwareCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // API data states
  const [attributes, setAttributes] = useState<Attributes>({});
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeOption[]>([]);
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<Process[]>([]);
  
  // Add categories state
  const [categories, setCategories] = useState<Category[]>([]);

  // Add general form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    internalCode: '',
    knittingCode: '',
    vendorCode: '',
    factoryCode: '',
    productionType: 'internal',
    description: '',
    category: '',
  });

  // Style codes array state
  interface StyleCodeItem {
    styleCodeId?: string;
    styleCode: string;
    eanCode: string;
    mrp: number;
    brand?: string;
    pack?: string;
  }

  const [styleCodes, setStyleCodes] = useState<StyleCodeItem[]>([
    { styleCodeId: '', styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }
  ]);
  const [styleCodeOptions, setStyleCodeOptions] = useState<StyleCodeItem[]>([]);

  // Add image state
  const [productImage, setProductImage] = useState<File | null>(null);

  // Yarn catalog search states
  const [yarnSearchQuery, setYarnSearchQuery] = useState('');
  const [currentYarnPage, setCurrentYarnPage] = useState(1);
  const [totalYarnPages, setTotalYarnPages] = useState(1);
  const [totalYarnResults, setTotalYarnResults] = useState(0);
  const yarnsPerPage = 50;

  // Modal states for yarn catalog selection
  const [isYarnModalOpen, setIsYarnModalOpen] = useState(false);
  const [selectedBomIndex, setSelectedBomIndex] = useState<number | null>(null);
  const [modalYarnSearchQuery, setModalYarnSearchQuery] = useState('');
  const [modalCurrentYarnPage, setModalCurrentYarnPage] = useState(1);
  const [modalYarnCatalogs, setModalYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [modalTotalYarnPages, setModalTotalYarnPages] = useState(1);
  const [modalTotalYarnResults, setModalTotalYarnResults] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Style code select modal
  const [styleCodeModalOpen, setStyleCodeModalOpen] = useState(false);
  const [styleCodeModalIndex, setStyleCodeModalIndex] = useState<number | null>(null);

  useEffect(() => {
    // Generate software code on component mount
    setSoftwareCode(generateSoftwareCode());
    
    // Fetch data from APIs
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [attributesRes, processesRes, categoriesRes, styleCodesRes] = await Promise.all([
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes),
          axios.get(API_ENDPOINTS.categories),
          styleCodeService.list({ limit: 500, sortBy: 'styleCode:asc' })
        ]);

        console.log('Product Attributes Response:', attributesRes.data);
        console.log('Processes Response:', processesRes.data);
        console.log('Categories Response:', categoriesRes.data);

        // Map the attributes response
        const attrResponse = attributesRes.data as AttributesApiResponse;
        setAttributeDefinitions(attrResponse.results || []);
        
        // Transform the attributes into a more usable format
        const transformedAttributes = attrResponse.results.reduce((acc, attr) => {
          acc[attr.name.toLowerCase()] = attr.optionValues;
          return acc;
        }, {} as Attributes);
        
        setAttributes(transformedAttributes);
        console.log('Transformed attributes:', transformedAttributes);
        
        // Set processes from results array
        const processResponse = processesRes.data as ProcessApiResponse;
        console.log('Setting processes:', processResponse.results);
        setAvailableProcesses(processResponse.results || []);

        // Set categories
        const categoriesResponse = categoriesRes.data;
        setCategories(categoriesResponse.results || []);

        // Style code options for lookup (read-only in UI)
        const styleCodesResponse = (styleCodesRes as any)?.results || [];
        const options = styleCodesResponse.map((sc: any) => ({
          styleCodeId: sc.id,
          styleCode: sc.styleCode,
          eanCode: sc.eanCode,
          mrp: sc.mrp,
          brand: sc.brand,
          pack: sc.pack,
        }));
        setStyleCodeOptions(options);

      } catch (error) {
        console.error('Error fetching data:', error);
        // Show error state or notification to user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch yarn catalogs when search query or page changes
  useEffect(() => {
    const fetchYarnCatalogs = async () => {
      try {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: currentYarnPage,
          limit: yarnsPerPage,
          yarnName: yarnSearchQuery.trim() || undefined,
          status: 'active'
        });
        setYarnCatalogs(response.results || []);
        setTotalYarnPages(response.totalPages || 1);
        setTotalYarnResults(response.totalResults || 0);
      } catch (error) {
        console.error('Error fetching yarn catalogs:', error);
        setYarnCatalogs([]);
      }
    };

    // Skip debounce on initial load (when search is empty and page is 1)
    const isInitialLoad = yarnSearchQuery === '' && currentYarnPage === 1;
    const delay = isInitialLoad ? 0 : 500;
    
    const timeoutId = setTimeout(() => {
      fetchYarnCatalogs();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [yarnSearchQuery, currentYarnPage]);

  // Fetch yarn catalogs for modal
  useEffect(() => {
    if (!isYarnModalOpen) return;

    const fetchModalYarnCatalogs = async () => {
      setIsModalLoading(true);
      try {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: modalCurrentYarnPage,
          limit: yarnsPerPage,
          yarnName: modalYarnSearchQuery.trim() || undefined,
          status: 'active'
        });
        setModalYarnCatalogs(response.results || []);
        setModalTotalYarnPages(response.totalPages || 1);
        setModalTotalYarnResults(response.totalResults || 0);
      } catch (error) {
        console.error('Error fetching yarn catalogs for modal:', error);
        setModalYarnCatalogs([]);
      } finally {
        setIsModalLoading(false);
      }
    };

    // Debounce search
    const delay = modalYarnSearchQuery.trim() ? 500 : 0;
    const timeoutId = setTimeout(() => {
      fetchModalYarnCatalogs();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [isYarnModalOpen, modalYarnSearchQuery, modalCurrentYarnPage]);

  const handleYarnSearch = (query: string) => {
    setYarnSearchQuery(query);
    setCurrentYarnPage(1); // Reset to first page when search changes
  };

  // Open yarn selection modal
  const handleOpenYarnModal = (index: number) => {
    setSelectedBomIndex(index);
    setIsYarnModalOpen(true);
    setModalYarnSearchQuery('');
    setModalCurrentYarnPage(1);
  };

  // Close yarn selection modal
  const handleCloseYarnModal = () => {
    setIsYarnModalOpen(false);
    setSelectedBomIndex(null);
    setModalYarnSearchQuery('');
    setModalCurrentYarnPage(1);
  };

  // Select yarn from modal
  const handleSelectYarn = (yarn: YarnCatalog) => {
    if (selectedBomIndex !== null) {
      const newBomItems = [...bomItems];
      newBomItems[selectedBomIndex] = {
        ...newBomItems[selectedBomIndex],
        yarnCatalogId: yarn.id,
        yarnName: yarn.yarnName
      };
      setBomItems(newBomItems);
      handleCloseYarnModal();
    }
  };

  // Handle modal search
  const handleModalYarnSearch = (query: string) => {
    setModalYarnSearchQuery(query);
    setModalCurrentYarnPage(1); // Reset to first page when search changes
  };

  const handleAddBomItem = () => {
    setBomItems([...bomItems, { yarnCatalogId: '', yarnName: '', quantity: 0 }]);
  };

  const handleBomItemChange = (index: number, field: 'yarnCatalogId' | 'quantity', value: string | number) => {
    const newBomItems = [...bomItems];
    if (field === 'yarnCatalogId') {
      // Search in both yarnCatalogs and modalYarnCatalogs
      const selectedYarn = yarnCatalogs.find(y => y.id === value) || 
                          modalYarnCatalogs.find(y => y.id === value);
      newBomItems[index] = {
        ...newBomItems[index],
        yarnCatalogId: value.toString(),
        yarnName: selectedYarn?.yarnName || ''
      };
    } else if (field === 'quantity') {
      newBomItems[index] = {
        ...newBomItems[index],
        quantity: typeof value === 'string' ? parseFloat(value) : value
      };
    }
    setBomItems(newBomItems);
  };

  const handleRemoveBomItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  // Add form state
  const [formData, setFormData] = useState<FormData>({});

  // Handle attribute change
  const handleAttributeChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle general form changes
  const handleGeneralChange = (field: string, value: string) => {
    setGeneralForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle style code changes
  const handleStyleCodeChange = (index: number, field: 'styleCode' | 'eanCode' | 'mrp' | 'brand' | 'pack', value: string | number) => {
    const newStyleCodes = [...styleCodes];
    if (field === 'mrp') {
      const numValue = typeof value === 'string' 
        ? (value.trim() === '' ? 0 : parseFloat(value)) 
        : value;
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        mrp: isNaN(numValue) ? 0 : numValue
      };
    } else {
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        [field]: value
      };
    }
    setStyleCodes(newStyleCodes);
  };

  const handleStyleCodeSelect = (index: number, styleCodeId: string) => {
    const option = styleCodeOptions.find((sc) => sc.styleCodeId === styleCodeId);
    if (!option) return;
    const newStyleCodes = [...styleCodes];
    newStyleCodes[index] = {
      styleCodeId: option.styleCodeId,
      styleCode: option.styleCode,
      eanCode: option.eanCode,
      mrp: option.mrp,
      brand: option.brand,
      pack: option.pack,
    };
    setStyleCodes(newStyleCodes);
  };

  const handleStyleCodeInput = (index: number, value: string) => {
    const match = styleCodeOptions.find(
      (sc) => sc.styleCode.toLowerCase() === value.trim().toLowerCase()
    );
    if (match) {
      handleStyleCodeSelect(index, match.styleCodeId || '');
      return;
    }
    // No match: keep typed value, clear details
    const newStyleCodes = [...styleCodes];
    newStyleCodes[index] = {
      styleCodeId: '',
      styleCode: value,
      eanCode: '',
      mrp: 0,
      brand: '',
      pack: '',
    };
    setStyleCodes(newStyleCodes);
  };

  const handleAddStyleCode = () => {
    setStyleCodes([...styleCodes, { styleCode: '', eanCode: '', mrp: 0, brand: '', pack: '' }]);
  };

  const handleRemoveStyleCode = (index: number) => {
    if (styleCodes.length > 1) {
      setStyleCodes(styleCodes.filter((_, i) => i !== index));
    }
  };

  const handleStyleCodeSelectFromModal = (sc: StyleCode) => {
    if (styleCodeModalIndex === null) return;
    const newStyleCodes = [...styleCodes];
    newStyleCodes[styleCodeModalIndex] = {
      styleCodeId: sc.id,
      styleCode: sc.styleCode,
      eanCode: sc.eanCode,
      mrp: sc.mrp,
      brand: sc.brand,
      pack: sc.pack,
    };
    setStyleCodes(newStyleCodes);
    setStyleCodeModalOpen(false);
    setStyleCodeModalIndex(null);
  };

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProductImage(event.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Console log all form data before validation
    console.log('=== FORM DATA BEFORE VALIDATION ===');
    console.log('General Form:', generalForm);
    console.log('Style Codes:', styleCodes);
    console.log('BOM Items:', bomItems);
    console.log('Process Items:', processItems);
    console.log('Attributes:', formData);
    console.log('User Type - isDesign:', isDesign, 'isProduction:', isProduction, 'isFinal:', isFinal);

    // Validate required fields based on user type
    if (isProduction) {
      // Production user: Factory Code required only when not outsourced
      if (generalForm.productionType !== 'outsourced' && (!generalForm.factoryCode || generalForm.factoryCode.trim() === '')) {
        alert('Please fill in all required fields');
        return;
      }
    } else if (isFinal) {
      // Final user: Style Codes and Description are optional
    } else if (isDesign) {
      const outsourced = generalForm.productionType === 'outsourced';
      if (!generalForm.name || generalForm.name.trim() === '' || !generalForm.category) {
        alert('Please fill in all required fields');
        return;
      }
      if (!outsourced && (
          !generalForm.internalCode || generalForm.internalCode.trim() === '' ||
          !generalForm.knittingCode || generalForm.knittingCode.trim() === '' ||
          !generalForm.vendorCode || generalForm.vendorCode.trim() === '')) {
        alert('Please fill in all required fields');
        return;
      }
    } else {
      const outsourced = generalForm.productionType === 'outsourced';
      if (!generalForm.name || generalForm.name.trim() === '' || !generalForm.category ||
          (!outsourced && (!generalForm.factoryCode || generalForm.factoryCode.trim() === ''))) {
        alert('Please fill in all required fields.');
        return;
      }
      if (!outsourced && (
          !generalForm.internalCode || generalForm.internalCode.trim() === '' ||
          !generalForm.knittingCode || generalForm.knittingCode.trim() === '' ||
          !generalForm.vendorCode || generalForm.vendorCode.trim() === '')) {
        alert('Please fill in all required fields.');
        return;
      }
    }

    // Needles attribute is required when it is shown on the form
    const needlesAttr = attributeDefinitions.find(a => a.name.toLowerCase() === 'needles');
    if (needlesAttr) {
      const showNeedles = isProduction
        || (isFinal && shouldShowAttributeForFinal(needlesAttr.name, isFinal))
        || (isDesign && shouldShowAttribute(needlesAttr.name, isDesign))
        || (!isDesign && !isFinal && !isProduction);
      if (showNeedles) {
        const needlesValue = (formData['needles'] || '').toString().trim();
        if (!needlesValue) {
          alert('Needles is a required field. Please select a value before saving.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      // Prepare the product data
      const productData: any = {};

      productData.productionType = generalForm.productionType || 'internal';

      // Style codes: send only IDs
      const styleCodeIds = styleCodes
        .filter(sc => (sc as { styleCodeId?: string }).styleCodeId && String((sc as { styleCodeId?: string }).styleCodeId).trim())
        .map(sc => (sc as { styleCodeId: string }).styleCodeId);

      console.log('=== STYLE CODES (IDs only) ===');
      console.log('styleCodeIds:', styleCodeIds);

      if (isProduction) {
        // Production user: Only Factory Code
        productData.factoryCode = generalForm.factoryCode.trim();
      } else if (isFinal) {
        // Final user: Style Codes and Description are optional
        if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
        const description = generalForm.description.trim();
        if (description) productData.description = description;
      } else if (isDesign) {
        // Design user: Basic fields (optional when outsourced)
        productData.name = generalForm.name.trim();
        productData.softwareCode = generalForm.productionType === 'outsourced' ? (softwareCode || '') : softwareCode;
        productData.internalCode = generalForm.internalCode?.trim() ?? '';
        productData.knittingCode = generalForm.knittingCode?.trim() ?? '';
        productData.vendorCode = generalForm.vendorCode?.trim() ?? '';
        productData.category = generalForm.category;
      } else {
        // Other users: All fields (Software/Internal/Knitting/Vendor optional when outsourced)
        productData.name = generalForm.name.trim();
        productData.softwareCode = softwareCode || '';
        productData.internalCode = generalForm.internalCode?.trim() ?? '';
        productData.knittingCode = generalForm.knittingCode?.trim() ?? '';
        productData.vendorCode = generalForm.vendorCode?.trim() ?? '';
        productData.category = generalForm.category;
        productData.factoryCode = generalForm.factoryCode.trim();
        if (styleCodeIds.length > 0) productData.styleCodes = styleCodeIds;
        const description = generalForm.description.trim();
        if (description) productData.description = description;
      }

      console.log('=== PRODUCT DATA TO BE SENT ===');
      console.log('Product Data:', JSON.stringify(productData, null, 2));

      // Attributes - filter based on user type
      let allowedAttributes;
      if (isProduction) {
        // Production user: Only "needles" attribute
        allowedAttributes = attributeDefinitions.filter(attr => 
          attr.name.toLowerCase() === 'needles'
        );
      } else if (isFinal) {
        // Final user: Only Brand, Age group, MRP
        allowedAttributes = attributeDefinitions.filter(attr => 
          shouldShowAttributeForFinal(attr.name, isFinal)
        );
      } else if (isDesign) {
        // Design user: Only allowed attributes
        allowedAttributes = attributeDefinitions.filter(attr => 
          shouldShowAttribute(attr.name, isDesign)
        );
      } else {
        // Other users: All attributes
        allowedAttributes = attributeDefinitions;
      }
      // Brand and Pack are in style codes, not product-level attributes
      allowedAttributes = allowedAttributes.filter(
        attr => !['brand', 'pack'].includes(attr.name.toLowerCase())
      );

      // Send attributes as attribute name -> option value name (string from masters; backend accepts e.g. Needles: "7 GG")
      productData.attributes = Object.fromEntries(
        allowedAttributes
          .map(attr => {
            const valueName = formData[attr.name.toLowerCase()];
            if (!valueName) return null;
            const option = attr.optionValues.find((o: any) => o.name === valueName || String(o._id) === String(valueName));
            return [attr.name, option ? option.name : valueName];
          })
          .filter((e): e is [string, string] => !!e && !!e[1])
      );

      // BOM, rawMaterials and Processes for production users and non-design/non-final/non-production users
      if (isProduction || (!isDesign && !isFinal && !isProduction)) {
        productData.bom = bomItems
          .filter(item => item.yarnCatalogId && item.quantity > 0)
          .map(item => ({
            yarnCatalogId: item.yarnCatalogId,
            yarnName: item.yarnName,
            quantity: item.quantity
          }));

        productData.processes = processItems
          .filter(item => item.processId)
          .map(item => ({
            processId: item.processId
          }));
      }

      // Create FormData only if there's an image
      let requestData: any;
      let headers: { 'Content-Type'?: string } = {
        'Content-Type': 'application/json'
      };

      if (productImage) {
        requestData = new FormData();
        requestData.append('data', JSON.stringify(productData));
        requestData.append('image', productImage);
        delete headers['Content-Type']; // Let browser set the correct multipart boundary
      } else {
        requestData = productData;
      }

      // Send request
      console.log('=== SENDING REQUEST ===');
      console.log('Request Data:', requestData);
      console.log('Headers:', headers);
      
      const response = await axios.post(API_ENDPOINTS.createProduct, requestData, { headers });

      console.log('=== RESPONSE RECEIVED ===');
      console.log('Product created:', response.data);
      
      // Show success message
      alert('Product created successfully!');
      
      // Redirect to products list
      window.location.href = '/catalog/items';
      
    } catch (error: any) {
      console.error('Error creating product:', error);
      alert(error.response?.data?.message || 'Error creating product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main-content">
      <Seo title="Add Product"/>
      
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12">
            {/* Page Header */}
            <div className="box !bg-transparent border-0 shadow-none">
              <div className="box-header flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <h1 className="box-title text-2xl font-semibold">Add New Product</h1>
                  <HelpIcon
                    title="Add New Product"
                    content={
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                          <p className="text-gray-700">
                            This is the Add New Product page where you can create and configure new products with detailed specifications, attributes, Bill of Materials (BOM), and manufacturing processes.
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>General Information:</strong> Set basic product details like name, codes, category, and description</li>
                            <li><strong>Product Attributes:</strong> Define custom attributes and their values for the product</li>
                            <li><strong>Bill of Materials (BOM):</strong> Specify yarn catalogs and quantities required for production</li>
                            <li><strong>Manufacturing Processes:</strong> Define the production processes and their sequence</li>
                            <li><strong>Image Upload:</strong> Add product images for visual reference</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Tab Details:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>General:</strong> Basic product information, codes, category, and description</li>
                            <li><strong>Attributes:</strong> Custom product attributes with predefined values</li>
                            <li><strong>BOM:</strong> Yarn catalogs and quantities needed for production</li>
                            <li><strong>Processes:</strong> Manufacturing processes and their sequence</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Required Fields:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li><strong>Product Name:</strong> Must be unique and descriptive</li>
                            <li><strong>Style Code:</strong> Required for product identification</li>
                            <li><strong>Category:</strong> Must select a valid product category</li>
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-700">
                            <li>Software Code is auto-generated, but you can customize it</li>
                            <li>Use the search functionality in BOM and Processes tabs to find yarn catalogs and processes</li>
                            <li>Attributes are optional but help in product categorization and filtering</li>
                            <li>Save your work frequently to avoid losing data</li>
                          </ul>
                        </div>
                      </div>
                    }
                  />
                </div>
                <div className="box-tools">
                  <Link href="/catalog/items" className="ti-btn ti-btn-outline-primary">
                    <i className="ri-arrow-left-line me-2"></i> Back to List
                  </Link>
                </div>
              </div>
            </div>

            {/* Content Box */}
            <div className="box">
              <div className="box-body">
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-4" aria-label="Tabs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('general')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'general'
                          ? 'bg-primary text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      General
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('attributes')}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        activeTab === 'attributes'
                          ? 'bg-primary text-white'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Attributes
                    </button>
                    {!isDesign && !isFinal && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActiveTab('bom')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            activeTab === 'bom'
                              ? 'bg-primary text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          BOM
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('processes')}
                          className={`px-3 py-2 text-sm font-medium rounded-md ${
                            activeTab === 'processes'
                              ? 'bg-primary text-white'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Processes
                        </button>
                      </>
                    )}
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-12 gap-6">
                    {isProduction ? (
                      // Production user: only Production Type + Factory Code
                      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Production Type *</label>
                          <select
                            className="form-control"
                            value={generalForm.productionType}
                            onChange={(e) => handleGeneralChange('productionType', e.target.value)}
                            required
                          >
                            <option value="internal">Internal</option>
                            <option value="outsourced">Outsourced</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Factory Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={generalForm.factoryCode}
                            onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                            required={generalForm.productionType !== 'outsourced'}
                          />
                        </div>
                      </div>
                    ) : isFinal ? (
                      // Final user: Production Type + Factory Code above Style Codes, then Style Codes + Description
                      <div className="col-span-12">
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="form-label">Production Type *</label>
                              <select
                                className="form-control"
                                value={generalForm.productionType}
                                onChange={(e) => handleGeneralChange('productionType', e.target.value)}
                                required
                              >
                                <option value="internal">Internal</option>
                                <option value="outsourced">Outsourced</option>
                              </select>
                            </div>
                            <div>
                              <label className="form-label">Factory Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                              <input
                                type="text"
                                className="form-control"
                                value={generalForm.factoryCode}
                                onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                                required={generalForm.productionType !== 'outsourced'}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between items-center mb-4">
                              <label className="form-label">Style Codes</label>
                              <button
                                type="button"
                                onClick={handleAddStyleCode}
                                className="ti-btn ti-btn-primary"
                              >
                                <i className="ri-add-line me-2"></i> Add Style Code
                              </button>
                            </div>
                            <div className="space-y-4">
                              {styleCodes.map((styleCodeItem, index) => {
                                const brandOptions = attributeDefinitions.find(a => a.name.toLowerCase() === 'brand')?.optionValues ?? [];
                                const packOptions = attributeDefinitions.find(a => a.name.toLowerCase() === 'pack')?.optionValues ?? [];
                                return (
                                <div key={index} className="border border-gray-200 rounded-lg p-4">
                                  <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                    {styleCodes.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveStyleCode(index)}
                                        className="ti-btn ti-btn-danger ti-btn-sm"
                                      >
                                        <i className="ri-delete-bin-line"></i>
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div>
                                      <label className="form-label">Style Code</label>
                                      <input
                                        type="text"
                                        className="form-control cursor-pointer"
                                        value={styleCodeItem.styleCode}
                                        readOnly
                                        onClick={() => { setStyleCodeModalIndex(index); setStyleCodeModalOpen(true); }}
                                        placeholder="Click to browse style codes..."
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">EAN Code</label>
                                      <input
                                        type="text"
                                        className="form-control bg-gray-50"
                                        value={styleCodeItem.eanCode}
                                        readOnly
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">MRP</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="form-control bg-gray-50"
                                        value={styleCodeItem.mrp}
                                        readOnly
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">Brand</label>
                                      <input
                                        type="text"
                                        className="form-control bg-gray-50"
                                        value={styleCodeItem.brand ?? ''}
                                        readOnly
                                      />
                                    </div>
                                    <div>
                                      <label className="form-label">Pack</label>
                                      <input
                                        type="text"
                                        className="form-control bg-gray-50"
                                        value={styleCodeItem.pack ?? ''}
                                        readOnly
                                      />
                                    </div>
                                  </div>
                                </div>
                              );})}
                            </div>
                          </div>
                          <div>
                            <label className="form-label">Description</label>
                            <textarea 
                              className="form-control" 
                              rows={4}
                              value={generalForm.description}
                              onChange={(e) => handleGeneralChange('description', e.target.value)}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="col-span-12 lg:col-span-8">
                          <div className="space-y-6">
                            {!isDesign && (
                              <>
                                <div>
                                  <label className="form-label">Product Name *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.name}
                                    onChange={(e) => handleGeneralChange('name', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">Software Code</label>
                                    <input type="text" className="form-control" value={softwareCode} readOnly />
                                  </div>
                                  <div>
                                    <label className="form-label">Internal Code / Design Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.internalCode}
                                      onChange={(e) => handleGeneralChange('internalCode', e.target.value)}
                                      required={generalForm.productionType !== 'outsourced'}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Knitting Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.knittingCode}
                                    onChange={(e) => handleGeneralChange('knittingCode', e.target.value)}
                                    required={generalForm.productionType !== 'outsourced'}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Vendor Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.vendorCode}
                                    onChange={(e) => handleGeneralChange('vendorCode', e.target.value)}
                                    required={generalForm.productionType !== 'outsourced'}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Production Type *</label>
                                  <select
                                    className="form-control"
                                    value={generalForm.productionType}
                                    onChange={(e) => handleGeneralChange('productionType', e.target.value)}
                                    required
                                  >
                                    <option value="internal">Internal</option>
                                    <option value="outsourced">Outsourced</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="form-label">Factory Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                  <input
                                    type="text"
                                    className="form-control"
                                    value={generalForm.factoryCode}
                                    onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                                    required={generalForm.productionType !== 'outsourced'}
                                  />
                                </div>
                                <div className="col-span-12">
                                  <div className="flex justify-between items-center mb-4">
                                    <label className="form-label">Style Codes</label>
                                    <button
                                      type="button"
                                      onClick={handleAddStyleCode}
                                      className="ti-btn ti-btn-primary"
                                    >
                                      <i className="ri-add-line me-2"></i> Add Style Code
                                    </button>
                                  </div>
                                  <div className="space-y-4">
                                    {styleCodes.map((styleCodeItem, index) => {
                                      const brandOptions = attributeDefinitions.find(a => a.name.toLowerCase() === 'brand')?.optionValues ?? [];
                                      const packOptions = attributeDefinitions.find(a => a.name.toLowerCase() === 'pack')?.optionValues ?? [];
                                      return (
                                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                          <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                          {styleCodes.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveStyleCode(index)}
                                              className="ti-btn ti-btn-danger ti-btn-sm"
                                            >
                                              <i className="ri-delete-bin-line"></i>
                                            </button>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                          <div>
                                            <label className="form-label">Style Code</label>
                                            <input
                                              type="text"
                                              className="form-control cursor-pointer"
                                              value={styleCodeItem.styleCode}
                                              readOnly
                                              onClick={() => { setStyleCodeModalIndex(index); setStyleCodeModalOpen(true); }}
                                              placeholder="Click to browse style codes..."
                                            />
                                          </div>
                                          <div>
                                            <label className="form-label">EAN Code</label>
                                            <input
                                              type="text"
                                              className="form-control"
                                              value={styleCodeItem.eanCode}
                                              onChange={(e) => handleStyleCodeChange(index, 'eanCode', e.target.value)}
                                            />
                                          </div>
                                          <div>
                                            <label className="form-label">MRP</label>
                                            <input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              className="form-control"
                                              value={styleCodeItem.mrp}
                                              onChange={(e) => handleStyleCodeChange(index, 'mrp', e.target.value)}
                                            />
                                          </div>
                                          <div>
                                            <label className="form-label">Brand</label>
                                            <select
                                              className="form-control"
                                              value={styleCodeItem.brand ?? ''}
                                              onChange={(e) => handleStyleCodeChange(index, 'brand', e.target.value)}
                                            >
                                              <option value="">Select Brand</option>
                                              {brandOptions.map((opt) => (
                                                <option key={opt._id} value={opt.name}>{opt.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                          <div>
                                            <label className="form-label">Pack</label>
                                            <select
                                              className="form-control"
                                              value={styleCodeItem.pack ?? ''}
                                              onChange={(e) => handleStyleCodeChange(index, 'pack', e.target.value)}
                                            >
                                              <option value="">Select Pack</option>
                                              {packOptions.map((opt) => (
                                                <option key={opt._id} value={opt.name}>{opt.name}</option>
                                              ))}
                                            </select>
                                          </div>
                                        </div>
                                      </div>
                                    );})}
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Description</label>
                                  <textarea 
                                    className="form-control" 
                                    rows={4}
                                    value={generalForm.description}
                                    onChange={(e) => handleGeneralChange('description', e.target.value)}
                                  ></textarea>
                                </div>
                              </>
                            )}
                            {isDesign && (
                              <>
                                <div>
                                  <label className="form-label">Product Name *</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.name}
                                    onChange={(e) => handleGeneralChange('name', e.target.value)}
                                    required
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="form-label">Software Code</label>
                                    <input type="text" className="form-control" value={softwareCode} readOnly />
                                  </div>
                                  <div>
                                    <label className="form-label">Internal Code / Design Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                    <input 
                                      type="text" 
                                      className="form-control"
                                      value={generalForm.internalCode}
                                      onChange={(e) => handleGeneralChange('internalCode', e.target.value)}
                                      required={generalForm.productionType !== 'outsourced'}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="form-label">Knitting Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.knittingCode}
                                    onChange={(e) => handleGeneralChange('knittingCode', e.target.value)}
                                    required={generalForm.productionType !== 'outsourced'}
                                  />
                                </div>
                                <div>
                                  <label className="form-label">Vendor Code{generalForm.productionType !== 'outsourced' ? ' *' : ''}</label>
                                  <input 
                                    type="text" 
                                    className="form-control"
                                    value={generalForm.vendorCode}
                                    onChange={(e) => handleGeneralChange('vendorCode', e.target.value)}
                                    required={generalForm.productionType !== 'outsourced'}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="col-span-12 lg:col-span-4">
                          <div className="space-y-6">
                            {!isDesign && (
                              <div>
                                <label className="form-label">Category *</label>
                                <select 
                                  className="form-select"
                                  value={generalForm.category}
                                  onChange={(e) => handleGeneralChange('category', e.target.value)}
                                  required
                                >
                                  <option value="">Select Category</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {isDesign && (
                              <div>
                                <label className="form-label">Category *</label>
                                <select 
                                  className="form-select"
                                  value={generalForm.category}
                                  onChange={(e) => handleGeneralChange('category', e.target.value)}
                                  required
                                >
                                  <option value="">Select Category</option>
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {!isDesign && (
                              <div>
                                <label className="form-label">Product Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="productImage"
                                    onChange={handleImageUpload}
                                  />
                                  <label htmlFor="productImage" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                      <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
                                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                            {isDesign && (
                              <div>
                                <label className="form-label">Product Image</label>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    id="productImage"
                                    onChange={handleImageUpload}
                                  />
                                  <label htmlFor="productImage" className="cursor-pointer">
                                    <div className="flex flex-col items-center">
                                      <i className="ri-upload-cloud-2-line text-4xl text-gray-400 mb-2"></i>
                                      <p className="text-sm text-gray-500">Click to upload or drag and drop</p>
                                      <p className="text-xs text-gray-400">SVG, PNG, JPG or GIF (MAX. 800x400px)</p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Attributes Tab */}
                {activeTab === 'attributes' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12">
                      <div className="grid grid-cols-2 gap-6">
                        {attributeDefinitions
                          .filter((attrDef) => {
                            // Brand and Pack are in Style Code section, not in Attributes form
                            const nameLower = attrDef.name.toLowerCase();
                            if (nameLower === 'brand' || nameLower === 'pack') return false;
                            if (isProduction) {
                              return nameLower === 'needles';
                            }
                            if (isFinal) {
                              return shouldShowAttributeForFinal(attrDef.name, isFinal);
                            }
                            if (isDesign) {
                              return shouldShowAttribute(attrDef.name, isDesign);
                            }
                            return true;
                          })
                          .map((attrDef) => {
                            const isNeedlesRequired = attrDef.name.toLowerCase() === 'needles' && (
                              isProduction || (isFinal && shouldShowAttributeForFinal(attrDef.name, isFinal)) ||
                              (isDesign && shouldShowAttribute(attrDef.name, isDesign)) || (!isDesign && !isFinal && !isProduction)
                            );
                            return (
                            <div key={attrDef.id} className="space-y-2">
                              <label className="form-label">{attrDef.name}{isNeedlesRequired ? ' *' : ''}</label>
                              <select 
                                className="form-select" 
                                disabled={isLoading}
                                value={formData[attrDef.name.toLowerCase()] || ''}
                                onChange={(e) => handleAttributeChange(attrDef.name.toLowerCase(), e.target.value)}
                              >
                                <option value="">Select {attrDef.name}</option>
                                {attrDef.optionValues.map((option) => (
                                  <option key={option._id} value={option.name}>
                                    {option.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          );})}
                      </div>
                    </div>
                  </div>
                )}

                {/* BOM Tab */}
                {!isDesign && !isFinal && activeTab === 'bom' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Bill of Materials</h3>
                      <button
                        type="button"
                        onClick={handleAddBomItem}
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        <i className="ri-add-line me-2"></i> Add Yarn
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table whitespace-nowrap table-bordered min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-start">Yarn Name</th>
                            <th className="text-start">Quantity in Grams</th>
                            <th className="text-start">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomItems.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleOpenYarnModal(index)}
                                  className="form-control text-left bg-white cursor-pointer hover:bg-gray-50"
                                  disabled={isLoading}
                                >
                                  {item.yarnName || 'Select Yarn Catalog'}
                                  <i className="ri-arrow-down-s-line float-right mt-1"></i>
                                </button>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  className="form-control"
                                  value={item.quantity}
                                  onChange={(e) => handleBomItemChange(index, 'quantity', Number(e.target.value))}
                                  disabled={isLoading || !item.yarnCatalogId}
                                  placeholder="Enter quantity"
                                />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBomItem(index)}
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  disabled={isLoading}
                                >
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Yarn Catalog Selection Modal */}
                    {isYarnModalOpen && (
                      <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                          {/* Background overlay */}
                          <div 
                            className="fixed inset-0 bg-transparent bg-opacity-75 transition-opacity"
                            onClick={handleCloseYarnModal}
                          ></div>

                          {/* Modal panel */}
                          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                                  Select Yarn Catalog
                                </h3>
                                <button
                                  type="button"
                                  onClick={handleCloseYarnModal}
                                  className="text-gray-400 hover:text-gray-500"
                                >
                                  <i className="ri-close-line text-2xl"></i>
                                </button>
                              </div>

                              {/* Search box */}
                              <div className="mb-4">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Search yarn catalog by name..."
                                  value={modalYarnSearchQuery}
                                  onChange={(e) => handleModalYarnSearch(e.target.value)}
                                />
                              </div>

                              {/* Yarn catalogs list */}
                              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                                {isModalLoading ? (
                                  <div className="p-8 text-center">
                                    <i className="ri-loader-4-line animate-spin text-2xl text-gray-400"></i>
                                    <p className="mt-2 text-gray-500">Loading yarn catalogs...</p>
                                  </div>
                                ) : modalYarnCatalogs.length === 0 ? (
                                  <div className="p-8 text-center">
                                    <p className="text-gray-500">No yarn catalogs found</p>
                                  </div>
                                ) : (
                                  <table className="table min-w-full">
                                    <thead className="bg-gray-50 sticky top-0">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Yarn Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {modalYarnCatalogs.map((yarn) => (
                                        <tr key={yarn.id} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                            {yarn.yarnName}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {yarn.yarnType?.name || '-'}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <button
                                              type="button"
                                              onClick={() => handleSelectYarn(yarn)}
                                              className="ti-btn ti-btn-primary"
                                            >
                                              Select
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>

                              {/* Pagination */}
                              {modalTotalYarnResults > 0 && (
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
                                  <div className="text-sm text-gray-500 whitespace-nowrap">
                                    Showing {((modalCurrentYarnPage - 1) * yarnsPerPage) + 1} to{' '}
                                    {Math.min(modalCurrentYarnPage * yarnsPerPage, modalTotalYarnResults)} of{' '}
                                    {modalTotalYarnResults} yarn catalogs
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={() => setModalCurrentYarnPage(prev => Math.max(prev - 1, 1))}
                                      disabled={modalCurrentYarnPage === 1 || isModalLoading}
                                      className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                                    >
                                      <i className="ri-arrow-left-s-line"></i> Previous
                                    </button>
                                    <span className="px-4 py-2 text-sm text-gray-600 whitespace-nowrap">
                                      Page {modalCurrentYarnPage} of {modalTotalYarnPages}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setModalCurrentYarnPage(prev => Math.min(prev + 1, modalTotalYarnPages))}
                                      disabled={modalCurrentYarnPage === modalTotalYarnPages || isModalLoading}
                                      className="ti-btn ti-btn-outline-secondary whitespace-nowrap"
                                    >
                                      Next <i className="ri-arrow-right-s-line"></i>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Processes Tab */}
                {!isDesign && !isFinal && activeTab === 'processes' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4">Production Process Sequence</h3>
                    <ProcessSequenceEditor
                      items={processItems}
                      availableProcesses={availableProcesses}
                      onChange={setProcessItems}
                      disabled={isLoading}
                    />
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 mt-6">
                  <Link href="/catalog/items" className="ti-btn ti-btn-secondary">
                    Cancel
                  </Link>
                  <button 
                    type="submit" 
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      <StyleCodeSelectModal
        open={styleCodeModalOpen}
        onClose={() => { setStyleCodeModalOpen(false); setStyleCodeModalIndex(null); }}
        onSelect={handleStyleCodeSelectFromModal}
      />
    </div>
  );
};

export default AddProductPage;
