"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';
import Image from 'next/image';

interface RawMaterial {
  id: string;
  itemName: string;
  printName: string;
  color: string;
  unit: string;
  description: string;
  image: string | null;
}

export default function EditRawMaterial({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [material, setMaterial] = useState<RawMaterial>({
    id: '',
    itemName: '',
    printName: '',
    color: '',
    unit: '',
    description: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  // Fetch material data
  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`https://addon-backend.onrender.com/v1/raw-materials/${params.id}`, {
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
        setMaterial(data);
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
      const response = await fetch(`https://addon-backend.onrender.com/v1/raw-materials/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemName: material.itemName,
          printName: material.printName,
          color: material.color,
          unit: material.unit,
          description: material.description
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

        const imageResponse = await fetch(`https://addon-backend.onrender.com/v1/raw-materials/${params.id}/image`, {
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
              {/* Material Name */}
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
                  Material Name *
                </label>
                <input
                  type="text"
                  id="itemName"
                  required
                  className="mt-1 form-control"
                  value={material.itemName}
                  onChange={(e) => setMaterial({ ...material, itemName: e.target.value })}
                />
              </div>

              {/* Print Name */}
              <div>
                <label htmlFor="printName" className="block text-sm font-medium text-gray-700">
                  Print Name
                </label>
                <input
                  type="text"
                  id="printName"
                  className="mt-1 form-control"
                  value={material.printName}
                  onChange={(e) => setMaterial({ ...material, printName: e.target.value })}
                />
              </div>

              {/* Color */}
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  type="text"
                  id="color"
                  className="mt-1 form-control"
                  value={material.color}
                  onChange={(e) => setMaterial({ ...material, color: e.target.value })}
                />
              </div>

              {/* Unit */}
              <div>
                <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                  Unit *
                </label>
                <input
                  type="text"
                  id="unit"
                  required
                  className="mt-1 form-control"
                  value={material.unit}
                  onChange={(e) => setMaterial({ ...material, unit: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  className="mt-1 form-control"
                  value={material.description}
                  onChange={(e) => setMaterial({ ...material, description: e.target.value })}
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Image
                </label>
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