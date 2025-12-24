"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

interface StyleCodeItem {
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
  styleCodes?: StyleCodeItem[];
  styleCode?: string; // Keep for backward compatibility
  eanCode?: string; // Keep for backward compatibility
  description: string;
  category?: {
    id: string;
    name: string;
  };
  attributes: Record<string, string>;
  bom: Array<{
    yarnCatalogId: string;
    yarnName: string;
    quantity: number;
  }>;
  processes: Array<{
    processId: string;
  }>;
  image?: string;
}

interface Category {
  id: string;
  name: string;
}

interface AttributeOption {
  id: string;
  name: string;
}

interface AttributeOptionValue {
  _id: string;
  name: string;
  image?: string;
  sortOrder?: number;
}

interface AttributeCategory {
  id: string;
  name: string;
  type?: string;
  sortOrder?: number;
  options?: AttributeOption[];
  optionValues: AttributeOptionValue[];
}

interface ProcessType {
  id: string;
  name: string;
  type?: string;
  description?: string;
}

const API_ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories?page=1&limit=200`,
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`
};

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { user } = useSelector((state: any) => state.auth);
  const isDesign = isDesignUser(user);
  const isProduction = isProductionUser(user);
  const isFinal = isFinalUser(user);

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([]);
  const [processes, setProcesses] = useState<ProcessType[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Yarn catalog pagination states
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

  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    softwareCode: '',
    internalCode: '',
    vendorCode: '',
    factoryCode: '',
    styleCodes: [{ styleCode: '', eanCode: '', mrp: 0 }],
    description: '',
    category: { id: '', name: '' },
    attributes: {},
    bom: [],
    processes: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          productResponse,
          categoriesResponse,
          attributesResponse,
          processesResponse
        ] = await Promise.all([
          axios.get(`${API_ENDPOINTS.products}/${productId}`),
          axios.get(API_ENDPOINTS.categories),
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes)
        ]);

        // Normalize categories
        const categories = categoriesResponse.data.results || [];
        setCategories(categories);

        // Normalize product data
        let product = productResponse.data;
        // Debug: log backend BOM
        console.log('Backend BOM:', productResponse.data);
        
        // Ensure category is properly initialized
        if (!product.category) {
          product.category = { id: '', name: '' };
        } else if (typeof product.category === 'string') {
          const catObj = categories.find((c: Category) => c.id === product.category);
          if (catObj) {
            product.category = catObj;
          } else {
            product.category = { id: product.category, name: 'Unknown Category' };
          }
        }

        // Normalize styleCodes - handle both old (styleCode/eanCode) and new (styleCodes array) formats
        if (product.styleCodes && Array.isArray(product.styleCodes)) {
          // New format: already an array
          product.styleCodes = product.styleCodes.map((sc: any) => ({
            styleCode: sc.styleCode || '',
            eanCode: sc.eanCode || '',
            mrp: sc.mrp || 0
          }));
        } else if (product.styleCode || product.eanCode) {
          // Old format: convert to array
          product.styleCodes = [{
            styleCode: product.styleCode || '',
            eanCode: product.eanCode || '',
            mrp: 0 // Default MRP for old entries
          }];
        } else {
          // No style codes: initialize with empty entry
          product.styleCodes = [{ styleCode: '', eanCode: '', mrp: 0 }];
        }
        
        // Defensive: ensure attributes, bom, processes are arrays/objects
        product.attributes = product.attributes || {};
        
        // Normalize attribute data
        const normalizedAttributes = { ...product.attributes };
        
        // Log the original attributes
        console.log('Original product attributes:', product.attributes);
        
        // Helper function to get process ID
        const getProcessId = (proc: any): string => {
          if (typeof proc === 'object') {
            if (proc.id) return proc.id;
            if (proc.process?.id) return proc.process.id;
            if (proc.processId?.id) return proc.processId.id;
            if (typeof proc.process === 'string') return proc.process;
            if (typeof proc.processId === 'string') return proc.processId;
          }
          return proc || '';
        };

        // Process the bom and processes arrays
        product.bom = Array.isArray(product.bom)
          ? product.bom.map((item: any) => ({
              yarnCatalogId: typeof item.yarnCatalogId === 'object' && item.yarnCatalogId !== null
                ? item.yarnCatalogId.id || item.yarnCatalogId._id
                : item.yarnCatalogId || item.materialId || '',
              yarnName: item.yarnName || item.materialName || '',
              quantity: item.quantity || 0
            }))
          : [];
        // Debug: log normalized BOM
        console.log('Normalized BOM:', product.bom);
        
        // Normalize processes to always have processId as string
        product.processes = Array.isArray(product.processes)
          ? product.processes.map((proc: any) => ({
              processId: getProcessId(proc)
            }))
          : [];

        console.log('Normalized processes:', product.processes);
        
        // Set the product data with normalized attributes
        setFormData({
          ...product,
          attributes: normalizedAttributes,
          processes: product.processes
        });
        console.log('Product data loaded:', product);
        console.log('Product attributes:', product.attributes);
        if (product.image) {
          setImagePreview(product.image);
        }

        // Process attribute categories
        let attrCats = attributesResponse.data.results || [];
        
        // Map attribute categories with their option values - handle both data structures
        attrCats = attrCats.map((cat: any) => {
          // Check which format is available in the API response
          const hasOptionValues = Array.isArray(cat.optionValues) && cat.optionValues.length > 0;
          const hasOptions = Array.isArray(cat.options) && cat.options.length > 0;
          
          // Transform options to optionValues format if needed
          let optionValues = hasOptionValues ? cat.optionValues : [];
          
          // If only options is available, convert to optionValues format
          if (!hasOptionValues && hasOptions) {
            optionValues = cat.options.map((opt: any) => ({
              _id: opt.id || opt._id,
              name: opt.name,
              sortOrder: opt.sortOrder || 0
            }));
          }
          
          console.log(`Category ${cat.name} options:`, { 
            hasOptionValues, 
            hasOptions, 
            optionValues 
          });
          
          return {
            ...cat,
            optionValues: optionValues,
            options: cat.options || [] // Keep for backward compatibility
          };
        });
        
        console.log('Processed attribute categories:', attrCats);
        setAttributeCategories(attrCats);

        setProcesses((processesResponse.data.results || []) as ProcessType[]);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading product data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  // Fetch yarn catalogs
  useEffect(() => {
    const fetchYarnCatalogs = async () => {
      try {
        const response = await yarnCatalogService.getYarnCatalogs({
          page: currentYarnPage,
          limit: yarnsPerPage,
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

    const isInitialLoad = currentYarnPage === 1;
    const delay = isInitialLoad ? 0 : 500;
    
    const timeoutId = setTimeout(() => {
      fetchYarnCatalogs();
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [currentYarnPage]);

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

  // Debug effect to monitor attributeCategories
  useEffect(() => {
    if (attributeCategories.length > 0) {
      console.log('attributeCategories updated:', attributeCategories);
      console.log('First category optionValues:', attributeCategories[0].optionValues);
      
      // Map category names to IDs to help debug
      const categoryNameToId: Record<string, string> = {};
      attributeCategories.forEach(cat => {
        categoryNameToId[cat.name] = cat.id;
      });
      console.log('Category name to ID mapping:', categoryNameToId);
      
      // Check if product attributes match by name or by ID
      if (Object.keys(formData.attributes).length > 0) {
        console.log('Current product attributes:', formData.attributes);
        
        // Check which attributes match by name vs. by ID
        const matchesByName = attributeCategories.filter(cat => 
          formData.attributes[cat.name] !== undefined
        );
        
        const matchesById = attributeCategories.filter(cat => 
          formData.attributes[cat.id] !== undefined
        );
        
        console.log('Attributes matching by name:', matchesByName.map(c => c.name));
        console.log('Attributes matching by ID:', matchesById.map(c => c.name));
      }
    }
  }, [attributeCategories, formData.attributes]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: { id: value, name: categories.find(c => c.id === value)?.name || '' }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAttributeChange = (categoryName: string, value: string) => {
    console.log('Changing attribute:', categoryName, 'to value:', value);
    
    // Find the category ID that corresponds to this name if available
    const category = attributeCategories.find(cat => cat.name === categoryName);
    const categoryId = category?.id || '';
    
    console.log('Category found:', category ? 'yes' : 'no', 'ID:', categoryId);
    
    setFormData(prev => {
      const updatedAttributes = {
        ...prev.attributes,
        [categoryName]: value // Use the category name as the key
      };
      
      console.log('Updated attributes:', updatedAttributes);
      return {
        ...prev,
        attributes: updatedAttributes
      };
    });
  };

  const handleBomItemChange = (index: number, field: 'yarnCatalogId' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newBom = [...prev.bom];
      if (field === 'yarnCatalogId') {
        // Search in both yarnCatalogs and modalYarnCatalogs
        const selectedYarn = yarnCatalogs.find(y => y.id === value) || 
                            modalYarnCatalogs.find(y => y.id === value);
        newBom[index] = {
          ...newBom[index],
          yarnCatalogId: value.toString(),
          yarnName: selectedYarn?.yarnName || ''
        };
      } else {
        newBom[index] = {
          ...newBom[index],
          quantity: typeof value === 'string' ? parseFloat(value) : value
        };
      }
      return { ...prev, bom: newBom };
    });
  };

  const handleProcessChange = (index: number, value: string) => {
    console.log('Changing process at index', index, 'to value:', value);
    setFormData(prev => {
      const newProcesses = [...prev.processes];
      newProcesses[index] = { processId: value };
      console.log('New processes array:', newProcesses);
      return { ...prev, processes: newProcesses };
    });
  };

  const handleStyleCodeChange = (index: number, field: 'styleCode' | 'eanCode' | 'mrp', value: string | number) => {
    setFormData(prev => {
      const newStyleCodes = [...(prev.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }])];
      newStyleCodes[index] = {
        ...newStyleCodes[index],
        [field]: field === 'mrp' ? (typeof value === 'string' ? parseFloat(value) || 0 : value) : value
      };
      return { ...prev, styleCodes: newStyleCodes };
    });
  };

  const addStyleCode = () => {
    setFormData(prev => ({
      ...prev,
      styleCodes: [...(prev.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }]), { styleCode: '', eanCode: '', mrp: 0 }]
    }));
  };

  const removeStyleCode = (index: number) => {
    setFormData(prev => {
      const currentStyleCodes = prev.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }];
      if (currentStyleCodes.length > 1) {
        return { ...prev, styleCodes: currentStyleCodes.filter((_, i) => i !== index) };
      }
      return prev;
    });
  };

  const addProcess = () => {
    setFormData(prev => ({
      ...prev,
      processes: [...prev.processes, { processId: '' }]
    }));
  };

  const removeProcess = (index: number) => {
    setFormData(prev => ({
      ...prev,
      processes: prev.processes.filter((_, i) => i !== index)
    }));
  };

  const addBomItem = () => {
    setFormData(prev => ({
      ...prev,
      bom: [...prev.bom, { yarnCatalogId: '', yarnName: '', quantity: 0 }]
    }));
  };

  const removeBomItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bom: prev.bom.filter((_, i) => i !== index)
    }));
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
      setFormData(prev => {
        const newBom = [...prev.bom];
        newBom[selectedBomIndex] = {
          ...newBom[selectedBomIndex],
          yarnCatalogId: yarn.id,
          yarnName: yarn.yarnName
        };
        return { ...prev, bom: newBom };
      });
      handleCloseYarnModal();
    }
  };

  // Handle modal search
  const handleModalYarnSearch = (query: string) => {
    setModalYarnSearchQuery(query);
    setModalCurrentYarnPage(1); // Reset to first page when search changes
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Submitting with attributes:', formData.attributes);
      
      // Prepare the base product data
      const productData: any = {};

      if (isProduction) {
        // Production user: Only Factory Code
        productData.factoryCode = formData.factoryCode;
      } else if (isFinal) {
        // Final user: Style Codes array and Description
        productData.styleCodes = (formData.styleCodes || []).filter(sc => sc.styleCode && sc.eanCode && sc.mrp > 0);
        productData.description = formData.description;
      } else if (isDesign) {
        // Design user: Basic fields
        productData.name = formData.name;
        productData.softwareCode = formData.softwareCode;
        productData.internalCode = formData.internalCode;
        productData.vendorCode = formData.vendorCode;
        productData.category = formData.category?.id || '';
      } else {
        // Other users: All fields
        productData.name = formData.name;
        productData.softwareCode = formData.softwareCode;
        productData.internalCode = formData.internalCode;
        productData.vendorCode = formData.vendorCode;
        productData.category = formData.category?.id || '';
        productData.factoryCode = formData.factoryCode;
        productData.styleCodes = (formData.styleCodes || []).filter(sc => sc.styleCode && sc.eanCode && sc.mrp > 0);
        productData.description = formData.description;
      }

      // Attributes - filter based on user type
      let allowedAttributes;
      if (isProduction) {
        // Production user: Only "needles" attribute
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category && category.name.toLowerCase() === 'needles';
          })
        );
      } else if (isFinal) {
        // Final user: Only Brand, Age group, MRP
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttributeForFinal(category.name, isFinal) : false;
          })
        );
      } else if (isDesign) {
        // Design user: Only allowed attributes
        allowedAttributes = Object.fromEntries(
          Object.entries(formData.attributes).filter(([key]) => {
            const category = attributeCategories.find(cat => 
              cat.name === key || cat.id === key
            );
            return category ? shouldShowAttribute(category.name, isDesign) : false;
          })
        );
      } else {
        // Other users: All attributes
        allowedAttributes = formData.attributes;
      }
      
      productData.attributes = allowedAttributes;

      // BOM and Processes for production users and non-design/non-final/non-production users
      if (isProduction || (!isDesign && !isFinal && !isProduction)) {
        productData.bom = formData.bom.filter(item => item.yarnCatalogId && item.quantity > 0).map(item => ({
          yarnCatalogId: item.yarnCatalogId,
          yarnName: item.yarnName,
          quantity: Number(item.quantity)
        }));
        productData.processes = formData.processes.filter(proc => proc.processId).map(proc => ({
          processId: proc.processId
        }));
      }

      if (selectedImage) {
        const formDataObj = new FormData();
        formDataObj.append('image', selectedImage);
        
        // Append all other fields
        Object.entries(productData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object') {
              formDataObj.append(key, JSON.stringify(value));
            } else {
              formDataObj.append(key, value.toString());
            }
          }
        });

        await axios.patch(`${API_ENDPOINTS.products}/${productId}`, formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await axios.patch(`${API_ENDPOINTS.products}/${productId}`, productData, {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      alert('Product updated successfully!');
      router.push('/catalog/items');
    } catch (error: any) {
      console.error('Error updating product:', error);
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || error.message || 'Error updating product';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="text-center py-10">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Edit Product" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h3 className="box-title">Edit Product</h3>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    {['general', 'attributes', ...(isDesign || isFinal ? [] : ['bom', 'processes'])].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab
                            ? 'border-primary text-primary'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isProduction ? (
                      // Production user: Only Factory Code
                      <div>
                        <label className="form-label">Factory Code *</label>
                        <input
                          type="text"
                          name="factoryCode"
                          className="form-control"
                          value={formData.factoryCode}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    ) : isFinal ? (
                      // Final user: Style Codes array and Description
                      <>
                        <div className="md:col-span-2">
                          <div className="flex justify-between items-center mb-4">
                            <label className="form-label">Style Codes *</label>
                            <button
                              type="button"
                              onClick={addStyleCode}
                              className="ti-btn ti-btn-primary ti-btn-sm"
                            >
                              <i className="ri-add-line me-2"></i> Add Style Code
                            </button>
                          </div>
                          <div className="space-y-4">
                            {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }]).map((styleCodeItem, index) => (
                              <div key={index} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                  <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                  {(formData.styleCodes || []).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => removeStyleCode(index)}
                                      className="ti-btn ti-btn-danger ti-btn-sm"
                                    >
                                      <i className="ri-delete-bin-line"></i>
                                    </button>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <label className="form-label">Style Code *</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={styleCodeItem.styleCode}
                                      onChange={(e) => handleStyleCodeChange(index, 'styleCode', e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">EAN Code *</label>
                                    <input
                                      type="text"
                                      className="form-control"
                                      value={styleCodeItem.eanCode}
                                      onChange={(e) => handleStyleCodeChange(index, 'eanCode', e.target.value)}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <label className="form-label">MRP *</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      className="form-control"
                                      value={styleCodeItem.mrp}
                                      onChange={(e) => handleStyleCodeChange(index, 'mrp', e.target.value)}
                                      required
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Description *</label>
                          <textarea
                            name="description"
                            className="form-control"
                            value={formData.description}
                            onChange={handleInputChange}
                            required
                            rows={4}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        {!isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
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
                            <div>
                              <label className="form-label">Software Code *</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code *</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Vendor Code *</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Factory Code *</label>
                              <input
                                type="text"
                                name="factoryCode"
                                className="form-control"
                                value={formData.factoryCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <div className="flex justify-between items-center mb-4">
                                <label className="form-label">Style Codes *</label>
                                <button
                                  type="button"
                                  onClick={addStyleCode}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-add-line me-2"></i> Add Style Code
                                </button>
                              </div>
                              <div className="space-y-4">
                                {(formData.styleCodes || [{ styleCode: '', eanCode: '', mrp: 0 }]).map((styleCodeItem, index) => (
                                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-3">
                                      <h4 className="font-medium text-sm">Style Code Entry {index + 1}</h4>
                                      {(formData.styleCodes || []).length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeStyleCode(index)}
                                          className="ti-btn ti-btn-danger ti-btn-sm"
                                        >
                                          <i className="ri-delete-bin-line"></i>
                                        </button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div>
                                        <label className="form-label">Style Code *</label>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={styleCodeItem.styleCode}
                                          onChange={(e) => handleStyleCodeChange(index, 'styleCode', e.target.value)}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">EAN Code *</label>
                                        <input
                                          type="text"
                                          className="form-control"
                                          value={styleCodeItem.eanCode}
                                          onChange={(e) => handleStyleCodeChange(index, 'eanCode', e.target.value)}
                                          required
                                        />
                                      </div>
                                      <div>
                                        <label className="form-label">MRP *</label>
                                        <input
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          className="form-control"
                                          value={styleCodeItem.mrp}
                                          onChange={(e) => handleStyleCodeChange(index, 'mrp', e.target.value)}
                                          required
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Description *</label>
                              <textarea
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                                rows={4}
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="form-control"
                              />
                              {imagePreview && (
                                <div className="mt-4">
                                  <img
                                    src={imagePreview}
                                    alt="Product preview"
                                    className="max-w-xs rounded-lg shadow-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {isDesign && (
                          <>
                            <div>
                              <label className="form-label">Name *</label>
                              <input
                                type="text"
                                name="name"
                                className="form-control"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Category *</label>
                              <select
                                name="category"
                                className="form-control"
                                value={formData.category?.id || ''}
                                onChange={handleInputChange}
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
                            <div>
                              <label className="form-label">Software Code *</label>
                              <input
                                type="text"
                                name="softwareCode"
                                className="form-control"
                                value={formData.softwareCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Internal Code</label>
                              <input
                                type="text"
                                name="internalCode"
                                className="form-control"
                                value={formData.internalCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">Vendor Code *</label>
                              <input
                                type="text"
                                name="vendorCode"
                                className="form-control"
                                value={formData.vendorCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="form-label">Product Image</label>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="form-control"
                              />
                              {imagePreview && (
                                <div className="mt-4">
                                  <img
                                    src={imagePreview}
                                    alt="Product preview"
                                    className="max-w-xs rounded-lg shadow-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Attributes Tab */}
                {activeTab === 'attributes' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Debug information */}
                    {attributeCategories.length === 0 ? (
                      <div className="col-span-2 text-center py-4">
                        <p>No attribute categories found.</p>
                      </div>
                    ) : (
                      attributeCategories
                        .filter((category) => {
                          if (isProduction) {
                            // Production user: Only show "needles" attribute
                            return category.name.toLowerCase() === 'needles';
                          }
                          if (isFinal) {
                            // Final user: Only show Brand, Age group, MRP
                            return shouldShowAttributeForFinal(category.name, isFinal);
                          }
                          // Design user: Show allowed attributes
                          if (isDesign) {
                            return shouldShowAttribute(category.name, isDesign);
                          }
                          // Other users: Show all attributes
                          return true;
                        })
                        .map((category) => {
                          // Get the current attribute value - try both by ID and by name
                          const valueById = formData.attributes[category.id] || '';
                          const valueByName = formData.attributes[category.name] || '';
                          const currentValue = valueById || valueByName;
                          
                          return (
                            <div key={category.id} className="space-y-2">
                              <label className="form-label">{category.name}</label>
                              <select
                                className="form-control"
                                value={currentValue}
                                onChange={(e) => handleAttributeChange(category.name, e.target.value)}
                              >
                                <option value="">Select {category.name}</option>
                                {category.optionValues && category.optionValues.length > 0 ? (
                                  category.optionValues.map((option) => (
                                    <option 
                                      key={option._id} 
                                      value={option._id}
                                    >
                                      {option.name}
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>No options available</option>
                                )}
                              </select>
                            </div>
                          );
                        })
                    )}
                  </div>
                )}

                {/* BOM Tab */}
                {!isDesign && !isFinal && activeTab === 'bom' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Bill of Materials</h3>
                      <button
                        type="button"
                        onClick={addBomItem}
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
                          {formData.bom.map((item, index) => (
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
                                  onClick={() => removeBomItem(index)}
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
                    {formData.processes.map((proc, index) => {
                      const currentProcessId = typeof proc.processId === 'object' && proc.processId !== null && 'id' in proc.processId 
                        ? (proc.processId as any).id 
                        : proc.processId;
                      console.log('Current process:', { proc, currentProcessId });
                      
                      return (
                        <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                          <div className="col-span-4">
                            <select
                              className="form-control"
                              value={currentProcessId}
                              onChange={(e) => handleProcessChange(index, e.target.value)}
                            >
                              <option value="">Select Process</option>
                              {processes.map((p: ProcessType) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              className="form-control"
                              value={processes.find(p => p.id === currentProcessId)?.type || ''}
                              readOnly
                              placeholder="Type"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              className="form-control"
                              value={processes.find(p => p.id === currentProcessId)?.description || ''}
                              readOnly
                              placeholder="Description"
                            />
                          </div>
                          <div className="col-span-2">
                            <button
                              type="button"
                              onClick={() => removeProcess(index)}
                              className="ti-btn ti-btn-danger"
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={addProcess}
                      className="ti-btn ti-btn-primary"
                    >
                      Add Process
                    </button>
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.push('/catalog/items')}
                    className="ti-btn ti-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage; 