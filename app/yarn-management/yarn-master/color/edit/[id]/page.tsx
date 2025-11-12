"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';

const EditColorPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    colorCode: string;
    pantoneName: string;
    status: 'active' | 'inactive';
  }>({ name: '', colorCode: '#000000', pantoneName: '', status: 'active' });

  useEffect(() => {
    if (id) fetchColor();
  }, [id]);

  const fetchColor = async () => {
    setIsLoading(true);
    try {
      const data: YarnColor = await yarnColorService.getColorById(id);
      setFormData({
        name: data.name || '',
        colorCode: data.colorCode ? data.colorCode.toUpperCase() : '#000000',
        pantoneName: data.pantoneName || '',
        status: data.status || 'active',
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load color');
      router.push('/yarn-management/yarn-master/color');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleColorCodeChange = (value: string) => {
    if (!value) {
      setFormData(prev => ({ ...prev, colorCode: '#000000' }));
      return;
    }
    let normalized = value.startsWith('#') ? value : `#${value}`;
    normalized = normalized.slice(0, 7).toUpperCase();
    setFormData(prev => ({ ...prev, colorCode: normalized }));
  };

  const isValidHex = (value: string) => /^#([0-9A-F]{6})$/i.test(value);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Color family name is required');
      return;
    }
   

    setIsSubmitting(true);
    try {
      await yarnColorService.updateColor(id, {
        name: formData.name.trim(),
        colorCode: formData.colorCode.toUpperCase(),
        pantoneName: formData.pantoneName.trim() || undefined,
        status: formData.status,
      });
      toast.success('Color updated successfully');
      router.push('/yarn-management/yarn-master/color');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update color');
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
      <Seo title="Edit Color" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Color</h1>
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
                      onChange={(e) => handleColorCodeChange(e.target.value)}
                      onBlur={(e) => {
                        if (!e.target.value.startsWith('#')) {
                          handleColorCodeChange(`#${e.target.value}`);
                        }
                      }}
                      className="form-control uppercase"
                      placeholder="#FFFFFF"
                      maxLength={7}
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
                    {isSubmitting ? <>Updating...</> : <><i className="ri-save-line me-2"></i> Update Color</>}
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

export default EditColorPage;

