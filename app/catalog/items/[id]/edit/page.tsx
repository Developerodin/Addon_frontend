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
  category: {
    id: string;
    name: string;
  };
  attributes: Record<string, string>;
  bom: Array<{
    material: string;
    quantity: number;
    materialName?: string;
    materialUnit?: string;
  }>;
  processes: Array<{
    process: string;
    type?: string;
    description?: string;
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
}

interface AttributeOption {
  id: string;
  name: string;
}

interface AttributeCategory {
  id: string;
  name: string;
  options: AttributeOption[];
}

const API_ENDPOINTS = {
  products: `${API_BASE_URL}/products`,
  categories: `${API_BASE_URL}/categories`,
  rawMaterials: `${API_BASE_URL}/raw-materials`,
  attributes: `${API_BASE_URL}/product-attributes`,
  processes: `${API_BASE_URL}/processes`
};

const EditProductPage = () => {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [attributeCategories, setAttributeCategories] = useState<AttributeCategory[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

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
        setRawMaterials(rawMaterials);

        // Normalize categories
        const categories = categoriesResponse.data.results || [];
        setCategories(categories);

        // Normalize product data
        let product = productResponse.data;
        // If category is a string, convert to { id, name }
        if (typeof product.category === 'string') {
          const catObj = categories.find((c: any) => c.id === product.category) || { id: product.category, name: '' };
          product.category = catObj;
        }
        // Defensive: ensure attributes, bom, processes are arrays/objects
        product.attributes = product.attributes || {};
        product.bom = Array.isArray(product.bom) ? product.bom : [];
        product.processes = Array.isArray(product.processes) ? product.processes : [];
        setFormData(product);
        if (product.image) {
          setImagePreview(product.image);
        }

        // Normalize attribute categories if needed
        let attrCats = attributesResponse.data.results || [];
        // If attribute options are not present, default to empty array
        attrCats = attrCats.map((cat: any) => ({
          ...cat,
          options: Array.isArray(cat.options) ? cat.options : []
        }));
        setAttributeCategories(attrCats);

        setProcesses(processesResponse.data.results || []);
      } catch (error) {
        console.error('Error fetching data:', error);
        alert('Error loading product data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

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

  const handleAttributeChange = (categoryId: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      attributes: {
        ...prev.attributes,
        [categoryId]: value
      }
    }));
  };

  const handleBomItemChange = (index: number, field: 'material' | 'quantity', value: string) => {
    setFormData(prev => {
      const newBom = [...prev.bom];
      if (field === 'material') {
        const material = rawMaterials.find(m => m.id === value);
        newBom[index] = {
          ...newBom[index],
          material: value,
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

  const handleProcessChange = (index: number, field: 'process' | 'type' | 'description', value: string) => {
    setFormData(prev => {
      const newProcesses = [...prev.processes];
      newProcesses[index] = {
        ...newProcesses[index],
        [field]: value
      };
      return { ...prev, processes: newProcesses };
    });
  };

  const addBomItem = () => {
    setFormData(prev => ({
      ...prev,
      bom: [...prev.bom, { material: '', quantity: 0 }]
    }));
  };

  const removeBomItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bom: prev.bom.filter((_, i) => i !== index)
    }));
  };

  const addProcess = () => {
    setFormData(prev => ({
      ...prev,
      processes: [...prev.processes, { process: '', type: '', description: '' }]
    }));
  };

  const removeProcess = (index: number) => {
    setFormData(prev => ({
      ...prev,
      processes: prev.processes.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
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
        bom: formData.bom.filter(item => item.material && item.quantity > 0).map(item => ({
          material: item.material,
          quantity: Number(item.quantity)
        })),
        processes: formData.processes.filter(proc => proc.process).map(proc => ({
          process: proc.process,
          type: proc.type || undefined,
          description: proc.description || undefined
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
                        value={formData.category.id}
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
                    {attributeCategories.map((category) => (
                      <div key={category.id}>
                        <label className="form-label">{category.name}</label>
                        <select
                          className="form-control"
                          value={formData.attributes[category.id] || ''}
                          onChange={(e) => handleAttributeChange(category.id, e.target.value)}
                        >
                          <option value="">Select {category.name}</option>
                          {category.options.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}

                {/* BOM Tab */}
                {activeTab === 'bom' && (
                  <div>
                    {formData.bom.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                        <div className="col-span-5">
                          <select
                            className="form-control"
                            value={item.material}
                            onChange={(e) => handleBomItemChange(index, 'material', e.target.value)}
                          >
                            <option value="">Select Material</option>
                            {rawMaterials.map((material) => (
                              <option key={material.id} value={material.id}>
                                {material.name} ({material.unit})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-5">
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
                    ))}
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
                    {formData.processes.map((proc, index) => (
                      <div key={index} className="grid grid-cols-12 gap-4 mb-4">
                        <div className="col-span-4">
                          <select
                            className="form-control"
                            value={proc.process}
                            onChange={(e) => handleProcessChange(index, 'process', e.target.value)}
                          >
                            <option value="">Select Process</option>
                            {processes.map((p) => (
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
                            value={proc.type || ''}
                            onChange={(e) => handleProcessChange(index, 'type', e.target.value)}
                            placeholder="Type"
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="text"
                            className="form-control"
                            value={proc.description || ''}
                            onChange={(e) => handleProcessChange(index, 'description', e.target.value)}
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
                    ))}
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