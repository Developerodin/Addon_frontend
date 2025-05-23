'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Image from 'next/image';
import { toast, Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface RawMaterialForm {
  name: string;
  groupName: string;
  type: string;
  description: string;
  brand: string;
  countSize: string;
  material: string;
  color: string;
  shade: string;
  unit: string;
  mrp: string;
  hsnCode: string;
  gst: string;
  image?: File;
  imagePreview?: string;
}

export default function AddRawMaterial() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<RawMaterialForm>({
    name: '',
    groupName: '',
    type: '',
    description: '',
    brand: '',
    countSize: '',
    material: '',
    color: '',
    shade: '',
    unit: '',
    mrp: '',
    hsnCode: '',
    gst: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const requestData = {
        name: formData.name,
        groupName: formData.groupName,
        type: formData.type,
        description: formData.description,
        brand: formData.brand,
        countSize: formData.countSize,
        material: formData.material,
        color: formData.color,
        shade: formData.shade,
        unit: formData.unit,
        mrp: formData.mrp,
        hsnCode: formData.hsnCode,
        gst: formData.gst,
        image: 'null',
      };

      const response = await fetch(`${API_BASE_URL}/raw-materials`, {
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

                  {/* Group Name Dropdown */}
                  <div className="form-group">
                    <label className="form-label">Group Name</label>
                    <select
                      name="groupName"
                      value={formData.groupName}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="">Select Group</option>
                      <option value="Embroidery">Embroidery</option>
                      <option value="Packing Material">Packing Material</option>
                      <option value="Yarn">Yarn</option>
                      <option value="Finished Goods">Finished Goods</option>
                      <option value="Stationary">Stationary</option>
                      <option value="Household">Household</option>
                      <option value="Machine Tools">Machine Tools</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>

                  {/* Type Dropdown */}
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleChange}
                      className="form-control"
                      required
                    >
                      <option value="">Select Type</option>
                      <option value="Threads">Threads</option>
                      <option value="Tag">Tag</option>
                      <option value="Polybags">Polybags</option>
                      <option value="Box">Box</option>
                      <option value="Stands">Stands</option>
                      <option value="Socks">Socks</option>
                      <option value="Stickers">Stickers</option>
                    </select>
                  </div>

                  {/* Name */}
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      className="form-control"
                      rows={2}
                      required
                    ></textarea>
                  </div>

                  {/* Brand */}
                  <div className="form-group">
                    <label className="form-label">Brand</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Count/Size */}
                  <div className="form-group">
                    <label className="form-label">Count/Size</label>
                    <input
                      type="text"
                      name="countSize"
                      value={formData.countSize}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Material */}
                  <div className="form-group">
                    <label className="form-label">Material</label>
                    <input
                      type="text"
                      name="material"
                      value={formData.material}
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

                  {/* Shade */}
                  <div className="form-group">
                    <label className="form-label">Shade</label>
                    <input
                      type="text"
                      name="shade"
                      value={formData.shade}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* Unit Dropdown */}
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
                      <option value="Meter">Meter</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Kilograms">Kilograms</option>
                      <option value="Grams">Grams</option>
                      <option value="Liter">Liter</option>
                      <option value="Pairs">Pairs</option>
                      <option value="Packet">Packet</option>
                      <option value="Packs">Packs</option>
                    </select>
                  </div>

                  {/* MRP */}
                  <div className="form-group">
                    <label className="form-label">MRP</label>
                    <input
                      type="text"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* HSN Code */}
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input
                      type="text"
                      name="hsnCode"
                      value={formData.hsnCode}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>

                  {/* GST % */}
                  <div className="form-group">
                    <label className="form-label">GST %</label>
                    <input
                      type="text"
                      name="gst"
                      value={formData.gst}
                      onChange={handleChange}
                      className="form-control"
                      required
                    />
                  </div>
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
