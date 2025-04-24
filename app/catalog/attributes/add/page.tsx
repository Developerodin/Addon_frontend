"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Pageheader from '@/shared/layout-components/page-header/pageheader';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';

// Types
interface OptionValue {
  name: string;
  image: File | null;
  sortOrder: string;
}

interface ApiOptionValue {
  name: string;
  image?: string;
  sortOrder: number;
}

interface AttributePayload {
  name: string;
  type: string;
  sortOrder: number;
  optionValues: ApiOptionValue[];
}

// Server action to create attribute
async function createAttribute(payload: AttributePayload) {
  console.log('Sending payload:', payload);
  
  try {
    const response = await fetch('http://localhost:3001/v1/product-attributes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);

    if (!response.ok) {
      throw new Error(responseData.message || 'Failed to create attribute');
    }

    return responseData;
  } catch (error) {
    console.error('Error in createAttribute:', error);
    throw error;
  }
}

const AddAttributePage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'select', // Default type
    description: '',
    sortOrder: '',
    values: [
      { name: '', image: null, sortOrder: '' }
    ] as OptionValue[]
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleValueChange = (index: number, field: keyof OptionValue, value: any) => {
    const newValues = [...formData.values];
    newValues[index] = {
      ...newValues[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      values: newValues
    }));
  };

  const addValueField = () => {
    setFormData(prev => ({
      ...prev,
      values: [...prev.values, { name: '', image: null, sortOrder: '' }]
    }));
  };

  const removeValueField = (index: number) => {
    const newValues = formData.values.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      values: newValues
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submission started');
    
    try {
      setIsSubmitting(true);

      const errors: string[] = [];

      // Validate required fields
      if (!formData.name.trim()) {
        errors.push('Attribute name is required');
      }

      if (!formData.sortOrder.trim()) {
        errors.push('Sort order is required');
      } else if (isNaN(parseInt(formData.sortOrder))) {
        errors.push('Sort order must be a valid number');
      }

      // Validate option values
      formData.values.forEach((value, index) => {
        if (!value.name.trim()) {
          errors.push(`Option value #${index + 1}: Name is required`);
        }
        if (!value.sortOrder.trim()) {
          errors.push(`Option value #${index + 1}: Sort order is required`);
        } else if (isNaN(parseInt(value.sortOrder))) {
          errors.push(`Option value #${index + 1}: Sort order must be a valid number`);
        }
      });

      // If there are any validation errors, show them and return
      if (errors.length > 0) {
        errors.forEach(error => {
          console.log('Validation error:', error);
          toast.error(error);
        });
        return;
      }

      // Prepare payload
      const payload: AttributePayload = {
        name: formData.name.trim(),
        type: formData.type,
        sortOrder: parseInt(formData.sortOrder),
        optionValues: formData.values.map(value => {
          const optionValue: ApiOptionValue = {
            name: value.name.trim(),
            sortOrder: parseInt(value.sortOrder)
          };
          
          // Only add image to payload if it exists
          if (value.image) {
            optionValue.image = URL.createObjectURL(value.image);
          }
          
          return optionValue;
        })
      };

      console.log('Submitting payload:', payload);

      // Submit the form
      const result = await createAttribute(payload);
      console.log('Submission result:', result);
      
      // Reset form to initial state
      setFormData({
        name: '',
        type: 'select',
        description: '',
        sortOrder: '',
        values: [
          { name: '', image: null, sortOrder: '' }
        ]
      });

      // Show success message
      toast.success('Attribute created successfully');
      
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      if (error instanceof Error) {
        toast.error(`Error: ${error.message}`);
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        toast.error(`Error: ${error.message}`);
      } else {
        toast.error('An unexpected error occurred while creating the attribute');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      <Seo title="Add Attribute" />
      <Pageheader currentpage="Add Attribute" activepage="Attributes" mainpage="Add Attribute" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-12 col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title">Option</h5>
            </div>
            <div className="box-body">
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6">
                  {/* Option Details */}
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="name" className="form-label required">Option Name</label>
                        <div className="flex">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                            <i className="ri-translate-2"></i>
                          </span>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            className="form-control !rounded-l-none"
                            placeholder="Option Name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="type" className="form-label">Type</label>
                        <select
                          id="type"
                          name="type"
                          className="form-select"
                          value={formData.type}
                          onChange={handleInputChange}
                        >
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <div className="form-group">
                        <label htmlFor="sortOrder" className="form-label">Sort Order</label>
                        <input
                          type="text"
                          id="sortOrder"
                          name="sortOrder"
                          className="form-control"
                          placeholder="Sort Order"
                          value={formData.sortOrder}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Option Values */}
                  <div className="mt-6">
                    <h6 className="text-base font-semibold mb-4">Option Values</h6>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200 rounded-lg">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider required border-r border-gray-200 bg-gray-50">
                              Option Value Name
                            </th>
                            <th className="px-6 py-3 text-center text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">
                              Image
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50">
                              Sort Order
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.values.map((value, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 border-r border-gray-200">
                                <div className="flex">
                                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                    <i className="ri-translate-2"></i>
                                  </span>
                                  <input
                                    type="text"
                                    className="form-control !rounded-l-none"
                                    placeholder="Option Value Name"
                                    value={value.name}
                                    onChange={(e) => handleValueChange(index, 'name', e.target.value)}
                                    required
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 border-r border-gray-200">
                                <div className="w-24 text-center h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary relative">
                                  {value.image ? (
                                    <div className="relative m-auto w-full h-full">
                                      <Image
                                        src={URL.createObjectURL(value.image)}
                                        alt="Preview"
                                        fill
                                        className="object-contain rounded-lg"
                                      />
                                      <button
                                        type="button"
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-sm hover:bg-red-600 transition-colors"
                                        onClick={() => handleValueChange(index, 'image', null)}
                                      >
                                        <i className="ri-close-line"></i>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="text-center">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleValueChange(index, 'image', file);
                                          }
                                        }}
                                      />
                                      <i className="ri-upload-cloud-2-line text-2xl text-gray-400"></i>
                                      <div className="mt-1 text-xs text-gray-500">Upload</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 border-r border-gray-200">
                                <input
                                  type="text"
                                  className="form-control"
                                  placeholder="Sort Order"
                                  value={value.sortOrder}
                                  onChange={(e) => handleValueChange(index, 'sortOrder', e.target.value)}
                                  required
                                />
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  className="text-red-500 hover:text-red-700"
                                  onClick={() => removeValueField(index)}
                                  disabled={formData.values.length === 1}
                                >
                                  <i className="ri-delete-bin-line text-lg"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addValueField}
                      >
                        Add Option Value
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-6">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => router.back()}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAttributePage;
