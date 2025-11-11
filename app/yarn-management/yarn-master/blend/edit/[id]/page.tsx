"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { useNavigation } from '@/shared/contextapi/navigationContext';
import yarnBlendService, { YarnBlend } from '@/shared/services/yarnBlendService';

const EditBlendPage = () => {
  const router = useRouter();
  const params = useParams();
  const { hasSubPermission } = useNavigation();
  const id = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{ name: string; status: 'active' | 'inactive' }>({ 
    name: '', 
    status: 'active' 
  });

  const hasPermission = hasSubPermission('/yarn-management/yarn-master', 'Blend');

  useEffect(() => {
    if (id && hasPermission) {
      fetchBlend();
    }
  }, [id, hasPermission]);

  const fetchBlend = async () => {
    setIsLoading(true);
    try {
      const data: YarnBlend = await yarnBlendService.getBlendById(id);
      setFormData({ 
        name: data.name || '', 
        status: data.status || 'active' 
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load blend');
      router.push('/yarn-management/yarn-master/blend');
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
      toast.error('Blend name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await yarnBlendService.updateBlend(id, {
        name: formData.name.trim(),
        status: formData.status,
      });
      toast.success('Blend updated successfully');
      router.push('/yarn-management/yarn-master/blend');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update blend');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-500 mb-4">You don't have permission to edit blends.</p>
          <Link href="/yarn-management/yarn-master/blend" className="ti-btn ti-btn-primary">
            <i className="ri-arrow-left-line me-2"></i>
            Back to Blends
          </Link>
        </div>
      </div>
    );
  }

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
      <Seo title="Edit Blend" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Blend</h1>
              <Link href="/yarn-management/yarn-master/blend" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Blend Name <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      className="form-control" 
                      placeholder="Enter blend name" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select 
                      name="status" 
                      value={formData.status} 
                      onChange={handleInputChange} 
                      className="form-select"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/blend" className="ti-btn ti-btn-light">Cancel</Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <>Updating...</> : <><i className="ri-save-line me-2"></i> Update Blend</>}
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

export default EditBlendPage;

