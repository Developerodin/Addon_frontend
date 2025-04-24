'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';

interface RawMaterialForm {
  itemName: string;
  printName: string;
  color: string;
  unit: string;
  description: string;
  image?: File;
  imagePreview?: string;
}

export default function AddRawMaterial() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<RawMaterialForm>({
    itemName: '',
    printName: '',
    color: '',
    unit: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare the request data
      const requestData = {
        itemName: formData.itemName,
        printName: formData.printName,
        color: formData.color,
        unit: formData.unit,
        description: formData.description,
        image: 'null' // Making image optional with default null value
      };

      const response = await fetch('https://addon-backend.onrender.com/v1/raw-materials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add raw material');
      }

      toast.success('Raw material added successfully');
      router.push('/catalog/raw-material');
    } catch (error) {
      console.error('Error adding raw material:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add raw material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file,
        imagePreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Raw Material" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Raw Material</h1>
            </div>
          </div>

          {/* Form Box */}
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Image Upload - Optional */}
                  <div className="form-group col-span-2">
                    <label className="form-label">Image (Optional)</label>
                    <div className="flex items-center space-x-4">
                      <div 
                        className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors duration-150"
                        onClick={handleImageClick}
                      >
                        {formData.imagePreview ? (
                          <div className="relative w-full h-full">
                            <Image
                              src={formData.imagePreview}
                              alt="Preview"
                              fill
                              className="object-cover rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="text-center">
                            <i className="ri-image-add-line text-3xl text-gray-400"></i>
                            <p className="text-sm text-gray-500 mt-2">Click to upload</p>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Item Name */}
                  <div className="form-group">
                    <label className="form-label">Item Name</label>
                    <input
                      type="text"
                      name="itemName"
                      value={formData.itemName}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Print Name */}
                  <div className="form-group">
                    <label className="form-label">Print Name</label>
                    <input
                      type="text"
                      name="printName"
                      value={formData.printName}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Color */}
                  <div className="form-group">
                    <label className="form-label">Color</label>
                    <input
                      type="text"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Unit */}
                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="">Select Unit</option>
                      <option value="Meters">Meters</option>
                      <option value="Yards">Yards</option>
                      <option value="Pieces">Pieces</option>
                      <option value="Kilograms">Kilograms</option>
                      <option value="Liters">Liters</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div className="form-group col-span-2">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-control"
                    rows={4}
                    required
                  ></textarea>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="ti-btn ti-btn-light"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      'Add Raw Material'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
