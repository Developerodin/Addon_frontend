"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import { useSelector } from 'react-redux';
import { isDesignUser, isProductionUser, isFinalUser, shouldShowAttribute, shouldShowAttributeForFinal } from '@/shared/utils/userUtils';

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

  const [formData, setFormData] = useState<Product>({
    id: '',
    name: '',
    softwareCode: '',
    internalCode: '',
    vendorCode: '',
    factoryCode: '',
    styleCode: '',
    eanCode: '',
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
        const selectedYarn = yarnCatalogs.find(y => y.id === value);
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
        // Final user: Only Style Code, EAN Code, Description
        productData.styleCode = formData.styleCode;
        productData.eanCode = formData.eanCode;
        productData.description = formData.description;
      } else if (isDesign) {
        // Design user: Basic fields
        productData.name = formData.name;
        productData.softwareCode = formData.softwareCode;
        productData.internalCode = formData.internalCode;
        productData.vendorCode = formData.vendorCode;
        productData.category = formData.category.id;
      } else {
        // Other users: All fields
        productData.name = formData.name;
        productData.softwareCode = formData.softwareCode;
        productData.internalCode = formData.internalCode;
        productData.vendorCode = formData.vendorCode;
        productData.category = formData.category.id;
        productData.factoryCode = formData.factoryCode;
        productData.styleCode = formData.styleCode;
        productData.eanCode = formData.eanCode;
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
                      // Final user: Only Style Code, EAN Code, Description
                      <>
                        <div>
                          <label className="form-label">Style Code *</label>
                          <input
                            type="text"
                            name="styleCode"
                            className="form-control"
                            value={formData.styleCode}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                        <div>
                          <label className="form-label">EAN Code *</label>
                          <input
                            type="text"
                            name="eanCode"
                            className="form-control"
                            value={formData.eanCode}
                            onChange={handleInputChange}
                            required
                          />
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
                            <div>
                              <label className="form-label">Style Code *</label>
                              <input
                                type="text"
                                name="styleCode"
                                className="form-control"
                                value={formData.styleCode}
                                onChange={handleInputChange}
                                required
                              />
                            </div>
                            <div>
                              <label className="form-label">EAN Code *</label>
                              <input
                                type="text"
                                name="eanCode"
                                className="form-control"
                                value={formData.eanCode}
                                onChange={handleInputChange}
                                required
                              />
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
                                <select
                                  className="form-select"
                                  value={item.yarnCatalogId}
                                  onChange={(e) => handleBomItemChange(index, 'yarnCatalogId', e.target.value)}
                                  disabled={isLoading}
                                >
                                  <option value="">Select Yarn Catalog</option>
                                  {yarnCatalogs.map((yarn) => (
                                    <option key={yarn.id} value={yarn.id}>
                                      {yarn.yarnName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
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
                    {totalYarnPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-500">
                          Showing {((currentYarnPage - 1) * yarnsPerPage) + 1} to{' '}
                          {Math.min(currentYarnPage * yarnsPerPage, totalYarnResults)} of{' '}
                          {totalYarnResults} yarn catalogs
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => setCurrentYarnPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentYarnPage === 1}
                            className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                          >
                            <i className="ri-arrow-left-s-line"></i>
                          </button>
                          <span className="px-3 py-2 text-sm text-gray-600">
                            Page {currentYarnPage} of {totalYarnPages}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentYarnPage(prev => Math.min(prev + 1, totalYarnPages))}
                            disabled={currentYarnPage === totalYarnPages}
                            className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                          >
                            <i className="ri-arrow-right-s-line"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Processes Tab */}
                {!isDesign && !isFinal && activeTab === 'processes' && (
                  <div>
                    {formData.processes.map((proc, index) => {
                      const currentProcessId = typeof proc.processId === 'object' ? proc.processId.id : proc.processId;
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