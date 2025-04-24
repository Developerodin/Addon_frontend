"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { toast, Toaster } from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  parent?: string | null;
  description?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  image?: string;
}

export default function EditCategoryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [parentCategories, setParentCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState<Category>({
    id: '',
    name: '',
    parent: null,
    description: '',
    sortOrder: 0,
    status: 'active',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  // Fetch category data
  useEffect(() => {
    const fetchCategory = async () => {
      try {
        const response = await fetch(`http://localhost:3001/v1/categories/${params.id}`);
        if (!response.ok) throw new Error('Failed to fetch category');
        const data = await response.json();
        
        setFormData({
          id: data.id,
          name: data.name,
          parent: data.parent,
          description: data.description || '',
          sortOrder: data.sortOrder,
          status: data.status,
        });

        if (data.image) {
          setImagePreview(data.image);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching category:', error);
        toast.error('Failed to load category');
        setIsLoading(false);
      }
    };

    const fetchParentCategories = async () => {
      try {
        const response = await fetch('http://localhost:3001/v1/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        // Filter out the current category and its children to prevent circular references
        const filteredCategories = data.results.filter((cat: Category) => cat.id !== params.id);
        setParentCategories(filteredCategories);
      } catch (error) {
        console.error('Error fetching parent categories:', error);
        toast.error('Failed to load parent categories');
      }
    };

    fetchCategory();
    fetchParentCategories();
  }, [params.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const loadingToast = toast.loading('Updating category...');

    try {
      // Create the request body as a JSON object
      const requestBody = {
        name: formData.name,
        description: formData.description || '',
        sortOrder: parseInt(formData.sortOrder.toString()),
        status: formData.status,
        parent: formData.parent || null
      };

      const response = await fetch(`http://localhost:3001/v1/categories/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update category');
      }

      // If we have a new image, upload it separately
      if (imageFile) {
        const imageFormData = new FormData();
        imageFormData.append('image', imageFile);

        const imageResponse = await fetch(`http://localhost:3001/v1/categories/${params.id}/image`, {
          method: 'PATCH',
          body: imageFormData,
        });

        if (!imageResponse.ok) {
          toast.error('Category updated but failed to upload image');
        }
      }

      toast.success('Category updated successfully', { id: loadingToast });
      router.push('/catalog/categories');
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update category', { id: loadingToast });
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Category" />
      
      <div className="box !bg-transparent border-0 shadow-none mb-4">
        <div className="box-header">
          <h1 className="box-title text-2xl font-semibold">Edit Category</h1>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Category Name</label>
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
                <label className="form-label">Parent Category</label>
                <select
                  name="parent"
                  className="form-control"
                  value={formData.parent || ''}
                  onChange={handleInputChange}
                >
                  <option value="">None (Root Category)</option>
                  {parentCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
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
                  required
                />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select
                  name="status"
                  className="form-control"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="form-control"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Category Image</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleImageChange}
                  accept="image/*"
                />
                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="Category preview"
                      className="max-w-xs rounded-lg shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                className="ti-btn ti-btn-secondary"
                onClick={() => router.push('/catalog/categories')}
              >
                Cancel
              </button>
              <button type="submit" className="ti-btn ti-btn-primary">
                Update Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 