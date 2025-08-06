"use client"
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Seo from '@/shared/layout-components/seo/seo';
import { API_BASE_URL } from '@/shared/data/utilities/api';

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
    materialId: string;
    quantity: number;
    materialName?: string;
    materialUnit?: string;
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

interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  articleNo: string;
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
  rawMaterials: `${API_BASE_URL}/raw-materials?page=1&limit=200`,
  attributes: `${API_BASE_URL}/product-attributes?page=1&limit=200`,
  processes: `${API_BASE_URL}/processes?page=1&limit=200`
};

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([]);
  const [processes, setProcesses] = useState<ProcessType[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Modal and search states
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [currentMaterialPage, setCurrentMaterialPage] = useState(1);
  const [selectedMaterialIndex, setSelectedMaterialIndex] = useState<number | null>(null);
  const materialsPerPage = 10;

  // Track entered article numbers for display
  const [enteredArticleNumbers, setEnteredArticleNumbers] = useState<Record<number, string>>({});

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
          materialsResponse,
          attributesResponse,
          processesResponse
        ] = await Promise.all([
          axios.get(`${API_ENDPOINTS.products}/${productId}`),
          axios.get(API_ENDPOINTS.categories),
          axios.get(API_ENDPOINTS.rawMaterials),
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.processes)
        ]);

        // Normalize raw materials: map itemName to name if needed
        const rawMaterials = (materialsResponse.data.results || []).map((mat: any) => ({
          ...mat,
          name: mat.name || mat.itemName || '',
        }));
        console.log('Raw Materials:', rawMaterials);
        setRawMaterials(rawMaterials);

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
              materialId: typeof item.materialId === 'object' && item.materialId !== null
                ? item.materialId.id
                : item.materialId || item.material || '',
              quantity: item.quantity,
              materialName: item.materialName,
              materialUnit: item.materialUnit
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

  // Material search and pagination functions
  const filteredMaterials = rawMaterials.filter(material =>
    material.name.toLowerCase().includes(materialSearchQuery.toLowerCase())
  );

  const totalMaterialPages = Math.ceil(filteredMaterials.length / materialsPerPage);
  const paginatedMaterials = filteredMaterials.slice(
    (currentMaterialPage - 1) * materialsPerPage,
    currentMaterialPage * materialsPerPage
  );

  const handleMaterialSearch = (query: string) => {
    setMaterialSearchQuery(query);
    setCurrentMaterialPage(1); // Reset to first page when search changes
  };

  const handleMaterialPageChange = (page: number) => {
    setCurrentMaterialPage(page);
  };

  const handleMaterialSelect = (material: RawMaterial) => {
    if (selectedMaterialIndex !== null) {
      setFormData(prev => {
        const newBom = [...prev.bom];
        newBom[selectedMaterialIndex] = {
          ...newBom[selectedMaterialIndex],
          materialId: material.id,
          materialName: material?.name,
          materialUnit: material?.unit
        };
        return { ...prev, bom: newBom };
      });
    }
    setIsMaterialModalOpen(false);
    setSelectedMaterialIndex(null);
    setMaterialSearchQuery('');
    setCurrentMaterialPage(1);
  };

  const openMaterialModal = (index: number) => {
    setSelectedMaterialIndex(index);
    setIsMaterialModalOpen(true);
  };

  const handleArticleNumberChange = (index: number, articleNo: string) => {
    // Update the entered article number for display
    setEnteredArticleNumbers(prev => ({
      ...prev,
      [index]: articleNo
    }));

    // Find material by article number
    const material = rawMaterials.find(m => m.articleNo === articleNo);
    
    setFormData(prev => {
      const newBom = [...prev.bom];
      if (material) {
        // Valid article number found - update the material
        newBom[index] = {
          ...newBom[index],
          materialId: material.id,
          materialName: material?.name,
          materialUnit: material?.unit
        };
      } else {
        // Invalid article number - clear the material but keep the article number for display
        newBom[index] = {
          ...newBom[index],
          materialId: '',
          materialName: '',
          materialUnit: '',
          quantity: 0 // Reset quantity to 0
        };
      }
      return { ...prev, bom: newBom };
    });
  };

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

  const handleBomItemChange = (index: number, field: 'materialId' | 'quantity', value: string) => {
    setFormData(prev => {
      const newBom = [...prev.bom];
      if (field === 'materialId') {
        const material = rawMaterials.find(m => m.id === value);
        newBom[index] = {
          ...newBom[index],
          materialId: value,
          materialName: material?.name,
          materialUnit: material?.unit
        };
      } else {
        newBom[index] = {
          ...newBom[index],
          [field]: parseFloat(value) || 0
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
      bom: [...prev.bom, { materialId: '', quantity: 0 }]
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
      const productData = {
        name: formData.name,
        softwareCode: formData.softwareCode,
        internalCode: formData.internalCode,
        vendorCode: formData.vendorCode,
        factoryCode: formData.factoryCode,
        styleCode: formData.styleCode,
        eanCode: formData.eanCode,
        description: formData.description,
        category: formData.category.id, // Send only the ID
        attributes: formData.attributes,
        bom: formData.bom.filter(item => item.materialId && item.quantity > 0).map(item => ({
          materialId: item.materialId,
          quantity: Number(item.quantity)
        })),
        processes: formData.processes.filter(proc => proc.processId).map(proc => ({
          processId: proc.processId
        }))
      };

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
                    {['general', 'attributes', 'bom', 'processes'].map((tab) => (
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
                      attributeCategories.map((category) => {
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
                {activeTab === 'bom' && (
                  <div>
                    {formData.bom.map((item, index) => {
                      const material = rawMaterials.find(m => m.id === item.materialId);
                      const enteredArticleNo = enteredArticleNumbers[index] || '';
                      const articleNo = enteredArticleNo || material?.articleNo || '';
                      
                      if(!material && item.materialId) {
                        return (
                          <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                            <div className="col-span-4">
                              <div className="text-xs text-red-600 mt-1">Material not found in list</div>
                              <button
                                type="button"
                                onClick={() => removeBomItem(index)}
                                className="ti-btn ti-btn-danger"
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                          <div className="col-span-4">
                            <button
                              type="button"
                              onClick={() => openMaterialModal(index)}
                              className="ti-btn border-gray-300 w-full text-left justify-start hover:bg-gray-100"
                              disabled={isLoading}
                            >
                              {material ? (
                                <span>{material.name} ({material.unit})</span>
                              ) : (
                                <span className="text-gray-500">Select Material</span>
                              )}
                              <i className="ri-arrow-down-s-line ms-auto"></i>
                            </button>
                            {/* Show warning if materialId is missing or invalid */}
                            {!item.materialId && <div className="text-xs text-yellow-600 mt-1">No material selected</div>}
                            {item.materialId && !material && <div className="text-xs text-red-600 mt-1">Material not found in list</div>}
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              className="form-control"
                              value={item.quantity}
                              onChange={(e) => handleBomItemChange(index, 'quantity', e.target.value)}
                              placeholder="Quantity"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="text"
                              className="form-control"
                              value={articleNo}
                              onChange={(e) => handleArticleNumberChange(index, e.target.value)}
                              placeholder="Article No"
                            />
                            {enteredArticleNo && !material && (
                              <div className="text-xs text-red-600 mt-1">Article number not found</div>
                            )}
                          </div>
                          <div className="col-span-2">
                            <button
                              type="button"
                              onClick={() => removeBomItem(index)}
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
                      onClick={addBomItem}
                      className="ti-btn ti-btn-primary"
                    >
                      Add Material
                    </button>
                  </div>
                )}

                {/* Processes Tab */}
                {activeTab === 'processes' && (
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

      {/* Material Selection Modal */}
      {isMaterialModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Select Material</h3>
              <button
                type="button"
                onClick={() => {
                  setIsMaterialModalOpen(false);
                  setSelectedMaterialIndex(null);
                  setMaterialSearchQuery('');
                  setCurrentMaterialPage(1);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialSearchQuery}
                  onChange={(e) => handleMaterialSearch(e.target.value)}
                  autoFocus
                  className="form-control pl-10"
                />
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>

            {/* Materials List */}
            <div className="flex-1 overflow-y-auto max-h-96">
              {paginatedMaterials.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {paginatedMaterials.map((material, index) => (
                    <div
                      key={material.id}
                      onClick={() => {
                        setSelectedMaterialIndex(index);
                        handleMaterialSelect(material);
                      }}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h2 className="font-medium text-lg text-gray-900">{material.name}</h2>
                          <p className="text-sm text-gray-700 mt-1">{material.articleNo}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {material.unit}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <i className="ri-search-line text-4xl text-gray-300 mb-4"></i>
                  <p className="text-gray-500">
                    {materialSearchQuery ? 'No materials found matching your search.' : 'No materials available.'}
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalMaterialPages >= 1 && (
              <div className="p-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Showing {((currentMaterialPage - 1) * materialsPerPage) + 1} to{' '}
                    {Math.min(currentMaterialPage * materialsPerPage, filteredMaterials.length)} of{' '}
                    {filteredMaterials.length} materials
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => handleMaterialPageChange(currentMaterialPage - 1)}
                      disabled={currentMaterialPage === 1}
                      className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                    >
                      <i className="ri-arrow-left-s-line"></i>
                    </button>
                    
                    {/* Generate pagination items with ellipsis */}
                    {(() => {
                      const pages = [];
                      const showPages = 5; // Number of page buttons to show
                      
                      if (totalMaterialPages <= showPages) {
                        // Show all pages if total is small
                        for (let i = 1; i <= totalMaterialPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Always show first page
                        pages.push(1);
                        
                        if (currentMaterialPage > 3) {
                          pages.push('...');
                        }
                        
                        // Show pages around current page
                        const start = Math.max(2, currentMaterialPage - 1);
                        const end = Math.min(totalMaterialPages - 1, currentMaterialPage + 1);
                        
                        for (let i = start; i <= end; i++) {
                          if (i !== 1 && i !== totalMaterialPages) {
                            pages.push(i);
                          }
                        }
                        
                        if (currentMaterialPage < totalMaterialPages - 2) {
                          pages.push('...');
                        }
                        
                        // Always show last page
                        if (totalMaterialPages > 1) {
                          pages.push(totalMaterialPages);
                        }
                      }
                      
                      return pages.map((page, index) => (
                        <React.Fragment key={index}>
                          {page === '...' ? (
                            <span className="px-3 py-2 text-sm text-gray-500">...</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleMaterialPageChange(page as number)}
                              className={`ti-btn ti-btn-sm ${
                                currentMaterialPage === page
                                  ? 'ti-btn-primary'
                                  : 'ti-btn-outline-secondary'
                              }`}
                            >
                              {page}
                            </button>
                          )}
                        </React.Fragment>
                      ));
                    })()}
                    
                    <button
                      type="button"
                      onClick={() => handleMaterialPageChange(currentMaterialPage + 1)}
                      disabled={currentMaterialPage === totalMaterialPages}
                      className="ti-btn ti-btn-outline-secondary ti-btn-sm"
                    >
                      <i className="ri-arrow-right-s-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EditProductPage; 