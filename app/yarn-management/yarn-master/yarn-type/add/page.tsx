"use client"
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnTypeService from '@/shared/services/yarnTypeService';
import yarnCountSizeService, { CountSize } from '@/shared/services/yarnCountSizeService';
import CountSizeMultiSelect from '../components/CountSizeMultiSelect';

type DetailFormState = {
  subtype: string;
  countSize: string[];
};

const AddYarnTypePage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCountSizeLoading, setIsCountSizeLoading] = useState(false);
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [formData, setFormData] = useState<{ name: string; status: 'active' | 'inactive' }>({
    name: '',
    status: 'active'
  });
  const [details, setDetails] = useState<DetailFormState[]>([{ subtype: '', countSize: [] }]);

  useEffect(() => {
    const fetchCountSizes = async () => {
      setIsCountSizeLoading(true);
      try {
        const response = await yarnCountSizeService.getCountSizes({ status: 'active', limit: 1000 });
        setCountSizes(response.results || []);
      } catch (error) {
        toast.error('Failed to load count sizes');
      } finally {
        setIsCountSizeLoading(false);
      }
    };

    fetchCountSizes();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailInputChange = (index: number, value: string) => {
    setDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], subtype: value };
      return updated;
    });
  };

  const handleCountSizeChange = (index: number, selectedIds: string[]) => {
    setDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], countSize: selectedIds };
      return updated;
    });
  };

  const addDetailRow = () => {
    setDetails(prev => [...prev, { subtype: '', countSize: [] }]);
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
        const countSizeIds = detail.countSize
          .map(countSizeId => countSizeId.trim())
          .filter(id => id.length > 0);

        return {
          subtype: trimmedSubtype,
          ...(countSizeIds.length > 0 ? { countSize: countSizeIds } : {})
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
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">Details</h2>
                    <button type="button" className="ti-btn ti-btn-primary flex items-center gap-1 whitespace-nowrap px-4 py-2" onClick={addDetailRow}>
                      <i className="ri-add-line"></i>
                      Add Detail
                    </button>
                  </div>
                  {details.length === 0 && (
                    <p className="text-sm text-gray-500">No details added yet.</p>
                  )}
                  {details.map((detail, index) => (
                    <div key={index} className="border border-gray-200 rounded-xl p-5 space-y-5 bg-white/60">
                      <div className="flex items-center justify-between gap-3 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </span>
                          <h3 className="text-base font-semibold">Detail {index + 1}</h3>
                        </div>
                        <button
                          type="button"
                          className="ti-btn ti-btn-danger flex items-center gap-1 whitespace-nowrap px-4 py-2"
                          onClick={() => removeDetailRow(index)}
                          disabled={details.length === 1}
                          title={details.length === 1 ? 'At least one detail is required' : 'Remove detail'}
                        >
                          <i className="ri-delete-bin-line"></i>
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">Subtype <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={detail.subtype}
                            onChange={(e) => handleDetailInputChange(index, e.target.value)}
                            className="form-control"
                            placeholder="Enter subtype"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Count Size</label>
                          <CountSizeMultiSelect
                            options={countSizes}
                            selected={detail.countSize}
                            onChange={selectedIds => handleCountSizeChange(index, selectedIds)}
                            isLoading={isCountSizeLoading}
                            placeholder="Select count sizes"
                          />
                        </div>
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

