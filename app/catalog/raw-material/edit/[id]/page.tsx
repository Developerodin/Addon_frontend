"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';
import { API_BASE_URL } from '@/shared/data/utilities/api';

interface RawMaterial {
  id: string;
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
  image: string | null;
}

export default function EditRawMaterial({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [material, setMaterial] = useState<RawMaterial>({
    id: '',
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
    image: null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Fetch material data
  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/raw-materials/${params.id}`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch material');
        }

        const data = await response.json();
        setMaterial({
          id: data.id,
          name: data.name || '',
          groupName: data.groupName || '',
          type: data.type || '',
          description: data.description || '',
          brand: data.brand || '',
          countSize: data.countSize || '',
          material: data.material || '',
          color: data.color || '',
          shade: data.shade || '',
          unit: data.unit || '',
          mrp: data.mrp || '',
          hsnCode: data.hsnCode || '',
          gst: data.gst || '',
          image: data.image || null
        });
        if (data.image) {
          setImagePreview(data.image);
        }
      } catch (err) {
        console.error('Error fetching material:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to fetch material');
        router.push('/catalog/raw-material');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMaterial();
  }, [params.id, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);

      // Send the update request with JSON data
      const response = await fetch(`${API_BASE_URL}/raw-materials/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: material.name,
          groupName: material.groupName,
          type: material.type,
          description: material.description,
          brand: material.brand,
          countSize: material.countSize,
          material: material.material,
          color: material.color,
          shade: material.shade,
          unit: material.unit,
          mrp: material.mrp,
          hsnCode: material.hsnCode,
          gst: material.gst
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update material');
      }

      // If image is selected, upload it separately
      if (selectedImage) {
        const formData = new FormData();
        formData.append('image', selectedImage);

        const imageResponse = await fetch(`${API_BASE_URL}/raw-materials/${params.id}/image`, {
          method: 'PATCH',
          body: formData,
        });

        if (!imageResponse.ok) {
          const errorData = await imageResponse.json();
          throw new Error(errorData.message || 'Failed to update image');
        }
      }

      toast.success('Material updated successfully');
      router.push('/catalog/raw-material');
    } catch (err) {
      console.error('Error updating material:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update material');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Raw Material" />
      
      <div className="box">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Raw Material</h1>
        </div>
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Image</label>
                <div className="mt-1 flex items-center space-x-4">
                  {imagePreview && (
                    <div className="relative w-32 h-32">
                      <Image
                        src={imagePreview}
                        alt="Material preview"
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <label className="ti-btn ti-btn-primary cursor-pointer">
                    <span>Change Image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              </div>
              {/* Group Name Dropdown */}
              <div className="form-group">
                <label className="form-label">Group Name</label>
                <select
                  name="groupName"
                  value={material.groupName}
                  onChange={e => setMaterial({ ...material, groupName: e.target.value })}
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
                  value={material.type}
                  onChange={e => setMaterial({ ...material, type: e.target.value })}
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
                  value={material.name}
                  onChange={e => setMaterial({ ...material, name: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  value={material.description}
                  onChange={e => setMaterial({ ...material, description: e.target.value })}
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
                  value={material.brand}
                  onChange={e => setMaterial({ ...material, brand: e.target.value })}
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
                  value={material.countSize}
                  onChange={e => setMaterial({ ...material, countSize: e.target.value })}
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
                  value={material.material}
                  onChange={e => setMaterial({ ...material, material: e.target.value })}
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
                  value={material.color}
                  onChange={e => setMaterial({ ...material, color: e.target.value })}
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
                  value={material.shade}
                  onChange={e => setMaterial({ ...material, shade: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              {/* Unit Dropdown */}
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select
                  name="unit"
                  value={material.unit}
                  onChange={e => setMaterial({ ...material, unit: e.target.value })}
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
                  value={material.mrp}
                  onChange={e => setMaterial({ ...material, mrp: e.target.value })}
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
                  value={material.hsnCode}
                  onChange={e => setMaterial({ ...material, hsnCode: e.target.value })}
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
                  value={material.gst}
                  onChange={e => setMaterial({ ...material, gst: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/raw-material')}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ti-btn ti-btn-primary"
                disabled={isLoading}
              >
                {isLoading ? 'Updating...' : 'Update Material'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 