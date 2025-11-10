"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnTypeService from '@/shared/services/yarnTypeService';

const AddYarnTypePage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<{ name: string; status: 'active' | 'inactive' }>({
    name: '',
    status: 'active'
  });
  const [details, setDetails] = useState([{ subtype: '', countSize: [] as string[], weight: '' }]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailChange = (index: number, field: 'subtype' | 'weight' | 'countSize', value: string) => {
    setDetails(prev => {
      const updated = [...prev];
      if (field === 'countSize') {
        updated[index] = { ...updated[index], countSize: value ? value.split(',').map(item => item.trim()).filter(Boolean) : [] };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  const addDetailRow = () => {
    setDetails(prev => [...prev, { subtype: '', countSize: [], weight: '' }]);
  };

  const removeDetailRow = (index: number) => {
    setDetails(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      toast.error('Yarn type name is required');
      return;
    }

    const normalizedDetails = details
      .map(detail => {
        const trimmedSubtype = detail.subtype.trim();
        const trimmedWeight = detail.weight.trim();
        const normalizedCountSize = detail.countSize && detail.countSize.length > 0 ? detail.countSize : undefined;

        return {
          subtype: trimmedSubtype,
          ...(normalizedCountSize ? { countSize: normalizedCountSize } : {}),
          ...(trimmedWeight ? { weight: trimmedWeight } : {})
        };
      })
      .filter(detail => detail.subtype);

    setIsSubmitting(true);
    try {
      await yarnTypeService.createType({
        name: trimmedName,
        status: formData.status,
        ...(normalizedDetails.length > 0 ? { details: normalizedDetails } : {})
      });

      toast.success('Yarn type created successfully');
      router.push('/yarn-management/yarn-master/yarn-type');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create yarn type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Yarn Type" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Yarn Type</h1>
              <Link href="/yarn-management/yarn-master/yarn-type" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="form-label">Yarn Type Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" placeholder="Enter yarn type name" required />
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-medium">Details</h2>
                    <button type="button" className="ti-btn ti-btn-outline-primary ti-btn-sm" onClick={addDetailRow}>
                      <i className="ri-add-line me-1"></i> Add Detail
                    </button>
                  </div>
                  {details.length === 0 && (
                    <p className="text-sm text-gray-500">No details added yet.</p>
                  )}
                  {details.map((detail, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">Subtype <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={detail.subtype}
                            onChange={(e) => handleDetailChange(index, 'subtype', e.target.value)}
                            className="form-control"
                            placeholder="Enter subtype"
                          />
                        </div>
                        <div>
                          <label className="form-label">Count Sizes (comma separated)</label>
                          <input
                            type="text"
                            value={detail.countSize.join(', ')}
                            onChange={(e) => handleDetailChange(index, 'countSize', e.target.value)}
                            className="form-control"
                            placeholder="e.g. 40s, 60s"
                          />
                        </div>
                        <div>
                          <label className="form-label">Weight</label>
                          <input
                            type="text"
                            value={detail.weight}
                            onChange={(e) => handleDetailChange(index, 'weight', e.target.value)}
                            className="form-control"
                            placeholder="Enter weight"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="ti-btn ti-btn-outline-danger ti-btn-sm"
                          onClick={() => removeDetailRow(index)}
                        >
                          <i className="ri-delete-bin-line me-1"></i> Remove Detail
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/yarn-type" className="ti-btn ti-btn-light">Cancel</Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <>Creating...</> : <><i className="ri-save-line me-2"></i> Create Yarn Type</>}
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

export default AddYarnTypePage;

