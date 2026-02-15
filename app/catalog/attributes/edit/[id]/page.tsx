"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { API_BASE_URL } from '@/shared/data/utilities/api';
import * as XLSX from 'xlsx';

interface AttributeValue {
  id?: number;
  _id?: string;
  name: string;
  image: string | null;
  sortOrder: number;
}

interface Attribute {
  id: number | string;
  name: string;
  type: string;
  attributeType?: string; // 'Manufacturing' | 'Warehouse'
  sortOrder: number;
  optionValues: AttributeValue[];
}

type OptionValueForm = {
  name: string;
  image: File | null;
  sortOrder: number;
  id?: number;
  _id?: string;
};

const EditAttributePage = ({ params }: { params: { id: string } }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [attribute, setAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'select',
    attributeType: 'Manufacturing' as string,
    sortOrder: 0,
    optionValues: [] as OptionValueForm[]
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch attribute details
  useEffect(() => {
    const fetchAttribute = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/product-attributes/${params.id}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch attribute');
        }

        const data = await response.json();
        setAttribute(data);
        
        // Initialize form data with existing values
        const validAttrTypes = ['Manufacturing', 'Warehouse'];
        setFormData({
          name: data.name,
          type: data.type,
          attributeType: validAttrTypes.includes(data.attributeType) ? data.attributeType : 'Manufacturing',
          sortOrder: data.sortOrder,
          optionValues: data.optionValues.map((value: AttributeValue) => ({
            name: value.name,
            image: null,
            sortOrder: value.sortOrder,
            id: value.id,
            _id: value._id
          }))
        });
      } catch (err) {
        console.error('Error fetching attribute:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch attribute');
        toast.error('Failed to load attribute');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttribute();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOptionChange = (index: number, field: string, value: string | File | null | number) => {
    setFormData(prev => {
      const newOptions = [...prev.optionValues];
      newOptions[index] = {
        ...newOptions[index],
        [field]: value
      };
      return {
        ...prev,
        optionValues: newOptions
      };
    });
  };

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      optionValues: [
        ...prev.optionValues,
        { name: '', image: null, sortOrder: prev.optionValues.length } as OptionValueForm
      ]
    }));
  };

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      optionValues: prev.optionValues.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      setError(null);

      // Prepare form data
      const updateData = {
        name: formData.name,
        type: formData.type,
        attributeType: formData.attributeType || 'Manufacturing',
        sortOrder: formData.sortOrder,
        optionValues: formData.optionValues.map(option => ({
          name: option.name,
          sortOrder: option.sortOrder
        }))
      };

      const response = await fetch(`${API_BASE_URL}/product-attributes/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update attribute');
      }

      toast.success('Attribute updated successfully');
      router.push('/catalog/attributes');
    } catch (err) {
      console.error('Error updating attribute:', err);
      setError(err instanceof Error ? err.message : 'Failed to update attribute');
      toast.error('Failed to update attribute');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportNeedlesOptionValues = () => {
    const rows = formData.optionValues.map((opt) => {
      const id = opt._id ?? (opt.id != null ? String(opt.id) : '');
      return {
        Name: opt.name,
        ID: id,
        'Sort Order': opt.sortOrder,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Option Values');
    const filename = `needles-option-values-${params.id}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Option values exported to Excel');
  };

  const isNeedlesAttribute = attribute?.name?.toLowerCase() === "needles";

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || !attribute) {
    return (
      <div className="main-content">
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="text-center py-8 text-red-500">
            <i className="ri-error-warning-line text-3xl mb-2"></i>
            <p>{error || 'Attribute not found'}</p>
          </div>
          <button
            onClick={() => router.push('/catalog/attributes')}
            className="ti-btn ti-btn-primary"
          >
            Back to Attributes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Attribute" />
      
      <div className="box !bg-transparent border-0 shadow-none">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Attribute</h1>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    name="name"
                    className="form-control"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={isSaving}
                  />
                </div>

                <div>
                  <label className="form-label">Type</label>
                  <select
                    name="type"
                    className="form-control"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  >
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Attribute Type</label>
                  <select
                    name="attributeType"
                    className="form-control"
                    value={formData.attributeType}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Warehouse">Warehouse</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Sort Order</label>
                  <input
                    type="number"
                    name="sortOrder"
                    className="form-control"
                    value={formData.sortOrder}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* Option Values */}
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h3 className="text-lg font-medium shrink-0">Option Values</h3>
                  <div className="flex flex-wrap items-center gap-3 min-w-0">
                    {isNeedlesAttribute && (
                      <button
                        type="button"
                        className="ti-btn ti-btn-secondary shrink-0"
                        onClick={handleExportNeedlesOptionValues}
                        disabled={isSaving}
                      >
                        <i className="ri-download-line me-2"></i>
                        Export to Excel
                      </button>
                    )}
                    <button
                      type="button"
                      className="ti-btn ti-btn-primary shrink-0"
                      onClick={handleAddOption}
                      disabled={isSaving}
                    >
                      <i className="ri-add-line me-2"></i>
                      Add Option
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formData.optionValues.map((option, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 items-end p-4 border rounded-lg"
                    >
                      <div className="min-w-0">
                        <label className="form-label">Name</label>
                        <input
                          type="text"
                          className="form-control w-full"
                          value={option.name}
                          onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                          required
                          disabled={isSaving}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="form-label">Sort Order</label>
                        <input
                          type="number"
                          className="form-control w-full"
                          value={option.sortOrder}
                          onChange={(e) => handleOptionChange(index, 'sortOrder', parseInt(e.target.value))}
                          disabled={isSaving}
                        />
                      </div>
                      <button
                        type="button"
                        className="ti-btn ti-btn-danger shrink-0"
                        onClick={() => handleRemoveOption(index)}
                        disabled={isSaving}
                        title="Remove option"
                      >
                        <i className="ri-delete-bin-line me-1"></i>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={() => router.push('/catalog/attributes')}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ti-btn ti-btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAttributePage; 