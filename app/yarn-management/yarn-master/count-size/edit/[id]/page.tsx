"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnCountSizeService, { CountSize } from '@/shared/services/yarnCountSizeService';

const EditCountSizePage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{ name: string; status: 'active' | 'inactive' }>({
    name: '',
    status: 'active',
  });

  useEffect(() => {
    if (id) fetchCountSize();
  }, [id]);

  const fetchCountSize = async () => {
    setIsLoading(true);
    try {
      const data: CountSize = await yarnCountSizeService.getCountSizeById(id);
      setFormData({
        name: data.name || '',
        status: data.status || 'active',
      });
    } catch (error) {
      toast.error('Failed to load count/size');
      router.push('/yarn-management/yarn-master/count-size');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await yarnCountSizeService.updateCountSize(id, {
        name: formData.name.trim(),
        status: formData.status,
      });
      toast.success('Count/Size updated successfully');
      router.push('/yarn-management/yarn-master/count-size');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update count/size');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="main-content">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Edit Count/Size" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Count/Size</h1>
              <Link href="/yarn-management/yarn-master/count-size" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="e.g., 40s"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="form-select">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/count-size" className="ti-btn ti-btn-light">Cancel</Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <>Updating...</> : <><i className="ri-save-line me-2"></i> Update Count/Size</>}
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

export default EditCountSizePage;

