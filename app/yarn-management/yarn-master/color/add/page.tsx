"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnColorService from '@/shared/services/yarnColorService';

const AddColorPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    colorCode: string;
    pantoneName: string;
    status: 'active' | 'inactive';
  }>({
    name: '',
    colorCode: '',
    pantoneName: '',
    status: 'active',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Color family name is required');
      return;
    }
    if (!formData.colorCode.trim()) {
      toast.error('Pantone/color code is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await yarnColorService.createColor({
        name: formData.name.trim(),
        colorCode: formData.colorCode.trim(),
        pantoneName: formData.pantoneName.trim() || undefined,
        status: formData.status,
      });
      toast.success('Color created successfully');
      router.push('/yarn-management/yarn-master/color');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create color');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Color" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Color</h1>
              <Link href="/yarn-management/yarn-master/color" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Color Family Name <span className="text-red-500">*</span></label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" placeholder="Enter color family name" required />
                  </div>
                  <div>
                    <label className="form-label">Pantone Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="colorCode"
                      value={formData.colorCode}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter pantone or color code"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">Pantone Name</label>
                    <input
                      type="text"
                      name="pantoneName"
                      value={formData.pantoneName}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter pantone name"
                    />
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select name="status" value={formData.status} onChange={handleInputChange} className="form-select">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/color" className="ti-btn ti-btn-light">Cancel</Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <>Creating...</> : <><i className="ri-save-line me-2"></i> Create Color</>}
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

export default AddColorPage;

