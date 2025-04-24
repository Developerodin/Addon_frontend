"use client"
import React, { useState, useEffect } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import axios from 'axios';

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

interface RawMaterial {
  id: string;
  itemName: string;
  printName: string;
  color: string;
  unit: string;
  description: string;
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

interface RawMaterialApiResponse {
  results: RawMaterial[];
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
  material: string;
  quantity: number;
  materialName?: string;
  materialUnit?: string;
}

interface ProcessItem {
  process: string;
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
  attributes: 'https://addon-backend.onrender.com/v1/product-attributes',
  rawMaterials: 'https://addon-backend.onrender.com/v1/raw-materials',
  processes: 'https://addon-backend.onrender.com/v1/processes',
  createProduct: 'https://addon-backend.onrender.com/v1/products',
  categories: 'https://addon-backend.onrender.com/v1/categories'
};

const generateSoftwareCode = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `PRD-${timestamp}-${random}`.toUpperCase();
};

const AddProductPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [bomItems, setBomItems] = useState<BomItem[]>([{ material: '', quantity: 0 }]);
  const [processItems, setProcessItems] = useState<ProcessItem[]>([{ process: '' }]);
  const [softwareCode, setSoftwareCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // API data states
  const [attributes, setAttributes] = useState<Attributes>({});
  const [attributeDefinitions, setAttributeDefinitions] = useState<AttributeOption[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [availableProcesses, setAvailableProcesses] = useState<Process[]>([]);
  
  // Add categories state
  const [categories, setCategories] = useState<Category[]>([]);

  // Add general form state
  const [generalForm, setGeneralForm] = useState({
    name: '',
    internalCode: '',
    vendorCode: '',
    factoryCode: '',
    styleCode: '',
    eanCode: '',
    description: '',
    category: '',
  });

  // Add image state
  const [productImage, setProductImage] = useState<File | null>(null);

  useEffect(() => {
    // Generate software code on component mount
    setSoftwareCode(generateSoftwareCode());
    
    // Fetch data from APIs
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch all data in parallel
        const [attributesRes, materialsRes, processesRes, categoriesRes] = await Promise.all([
          axios.get(API_ENDPOINTS.attributes),
          axios.get(API_ENDPOINTS.rawMaterials),
          axios.get(API_ENDPOINTS.processes),
          axios.get(API_ENDPOINTS.categories)
        ]);

        console.log('Product Attributes Response:', attributesRes.data);
        console.log('Raw Materials Response:', materialsRes.data);
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

        // Set raw materials from results array
        const materialsResponse = materialsRes.data as RawMaterialApiResponse;
        setRawMaterials(materialsResponse.results || []);
        
        // Set processes from results array
        const processResponse = processesRes.data as ProcessApiResponse;
        console.log('Setting processes:', processResponse.results);
        setAvailableProcesses(processResponse.results || []);

        // Set categories
        const categoriesResponse = categoriesRes.data;
        setCategories(categoriesResponse.results || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        // Show error state or notification to user
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddBomItem = () => {
    setBomItems([...bomItems, { material: '', quantity: 0 }]);
  };

  const handleBomItemChange = (index: number, field: 'material' | 'quantity', value: string | number) => {
    const newBomItems = [...bomItems];
    if (field === 'material') {
      const selectedMaterial = rawMaterials.find(m => m.id === value);
      newBomItems[index] = {
        ...newBomItems[index],
        material: value.toString(),
        materialName: selectedMaterial?.itemName || '',
        materialUnit: selectedMaterial?.unit || ''
      };
    } else if (field === 'quantity') {
      newBomItems[index] = {
        ...newBomItems[index],
        quantity: typeof value === 'string' ? parseInt(value, 10) : value
      };
    }
    setBomItems(newBomItems);
  };

  const handleRemoveBomItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleAddProcess = () => {
    setProcessItems([...processItems, { process: '' }]);
  };

  const handleProcessChange = (index: number, field: string, value: string) => {
    console.log('Process change:', { index, field, value });
    const newProcessItems = [...processItems];
    newProcessItems[index] = { ...newProcessItems[index], [field]: value };
    setProcessItems(newProcessItems);
  };

  const handleRemoveProcess = (index: number) => {
    setProcessItems(processItems.filter((_, i) => i !== index));
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

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setProductImage(event.target.files[0]);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!generalForm.name || !generalForm.category || !generalForm.internalCode || 
        !generalForm.vendorCode || !generalForm.factoryCode || !generalForm.styleCode || 
        !generalForm.eanCode || !generalForm.description) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare the product data
      const productData = {
        // General Information (all required)
        name: generalForm.name,
        softwareCode: softwareCode,
        internalCode: generalForm.internalCode,
        vendorCode: generalForm.vendorCode,
        factoryCode: generalForm.factoryCode,
        styleCode: generalForm.styleCode,
        eanCode: generalForm.eanCode,
        description: generalForm.description,
        category: generalForm.category, // This should now be an ObjectId from the categories API

        // Attributes
        attributes: Object.fromEntries(
          attributeDefinitions
            .map(attr => [attr.name, formData[attr.name.toLowerCase()]])
            .filter(([_, value]) => value)
        ),

        // BOM
        bom: bomItems
          .filter(item => item.material && item.quantity > 0)
          .map(item => ({
            materialId: item.material,
            quantity: item.quantity
          })),

        // Processes
        processes: processItems
          .filter(item => item.process)
          .map(item => ({
            processId: item.process
          }))
      };

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
      const response = await axios.post(API_ENDPOINTS.createProduct, requestData, { headers });

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
                <h1 className="box-title text-2xl font-semibold">Add New Product</h1>
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
                  </nav>
                </div>

                {/* General Tab */}
                {activeTab === 'general' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12 lg:col-span-8">
                      <div className="space-y-6">
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
                            <label className="form-label">Internal Code *</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={generalForm.internalCode}
                              onChange={(e) => handleGeneralChange('internalCode', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Vendor Code *</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={generalForm.vendorCode}
                              onChange={(e) => handleGeneralChange('vendorCode', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label">Factory Code *</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={generalForm.factoryCode}
                              onChange={(e) => handleGeneralChange('factoryCode', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="form-label">Style Code *</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={generalForm.styleCode}
                              onChange={(e) => handleGeneralChange('styleCode', e.target.value)}
                              required
                            />
                          </div>
                          <div>
                            <label className="form-label">EAN Code *</label>
                            <input 
                              type="text" 
                              className="form-control"
                              value={generalForm.eanCode}
                              onChange={(e) => handleGeneralChange('eanCode', e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        <div>
                          <label className="form-label">Description *</label>
                          <textarea 
                            className="form-control" 
                            rows={4}
                            value={generalForm.description}
                            onChange={(e) => handleGeneralChange('description', e.target.value)}
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12 lg:col-span-4">
                      <div className="space-y-6">
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
                      </div>
                    </div>
                  </div>
                )}

                {/* Attributes Tab */}
                {activeTab === 'attributes' && (
                  <div className="grid grid-cols-12 gap-6">
                    <div className="col-span-12">
                      <div className="grid grid-cols-2 gap-6">
                        {attributeDefinitions.map((attrDef) => (
                          <div key={attrDef.id} className="space-y-2">
                            <label className="form-label">{attrDef.name}</label>
                            <select 
                              className="form-select" 
                              disabled={isLoading}
                              value={formData[attrDef.name.toLowerCase()] || ''}
                              onChange={(e) => handleAttributeChange(attrDef.name.toLowerCase(), e.target.value)}
                            >
                              <option value="">Select {attrDef.name}</option>
                              {attrDef.optionValues.map((option) => (
                                <option key={option._id} value={option._id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* BOM Tab */}
                {activeTab === 'bom' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Bill of Materials</h3>
                      <button
                        onClick={handleAddBomItem}
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        <i className="ri-add-line me-2"></i> Add Material
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table whitespace-nowrap table-bordered min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-start">Material</th>
                            <th className="text-start">Unit</th>
                            <th className="text-start">Quantity</th>
                            <th className="text-start">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bomItems.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td>
                                <select
                                  className="form-select"
                                  value={item.material}
                                  onChange={(e) => handleBomItemChange(index, 'material', e.target.value)}
                                  disabled={isLoading}
                                >
                                  <option value="">Select Material</option>
                                  {rawMaterials.map((material) => (
                                    <option key={material.id} value={material.id}>
                                      {material.itemName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {item.materialUnit || ''}
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control"
                                  value={item.quantity}
                                  onChange={(e) => handleBomItemChange(index, 'quantity', Number(e.target.value))}
                                  disabled={isLoading}
                                />
                              </td>
                              <td>
                                <button
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
                  </div>
                )}

                {/* Processes Tab */}
                {activeTab === 'processes' && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium">Production Processes</h3>
                      <button
                        type="button"
                        onClick={handleAddProcess}
                        className="ti-btn ti-btn-primary"
                        disabled={isLoading}
                      >
                        <i className="ri-add-line me-2"></i> Add Process
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table whitespace-nowrap table-bordered min-w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-start">Process</th>
                            <th className="text-start">Type</th>
                            <th className="text-start">Description</th>
                            <th className="text-start">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {processItems.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200">
                              <td>
                                <select
                                  className="form-select"
                                  value={item.process}
                                  onChange={(e) => handleProcessChange(index, 'process', e.target.value)}
                                  disabled={isLoading}
                                >
                                  <option value="">Select Process</option>
                                  {availableProcesses.map((process) => (
                                    <option key={process.id} value={process.id}>
                                      {process.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                {availableProcesses.find(p => p.id === item.process)?.type || ''}
                              </td>
                              <td>
                                {availableProcesses.find(p => p.id === item.process)?.description || ''}
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProcess(index)}
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
    </div>
  );
};

export default AddProductPage;
