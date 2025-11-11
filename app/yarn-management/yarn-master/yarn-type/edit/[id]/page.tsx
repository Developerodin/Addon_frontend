"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import yarnTypeService from '@/shared/services/yarnTypeService';
import yarnCountSizeService, { CountSize } from '@/shared/services/yarnCountSizeService';

type DetailFormState = {
  subtype: string;
  countSize: string;
  tearWeight: string;
};

const EditYarnTypePage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCountSizeLoading, setIsCountSizeLoading] = useState(false);
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [formData, setFormData] = useState<{ name: string; status: 'active' | 'inactive' }>({ name: '', status: 'active' });
  const [details, setDetails] = useState<DetailFormState[]>([{ subtype: '', countSize: '', tearWeight: '' }]);
  const [yarnName, setYarnName] = useState('');

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

  useEffect(() => {
    if (id) fetchYarnType();
  }, [id]);

  const fetchYarnType = async () => {
    setIsLoading(true);
    try {
      const data = await yarnTypeService.getTypeById(id);
      setFormData({ name: data.name || '', status: data.status || 'active' });
      setYarnName(data.yarnName || '');
      if (data.details && data.details.length > 0) {
        setDetails(
          data.details.map(detail => {
            let countSizeId = '';
            if (Array.isArray(detail.countSize) && detail.countSize.length > 0) {
              const firstCountSize = detail.countSize[0] as unknown;
              if (typeof firstCountSize === 'string') {
                countSizeId = firstCountSize;
              } else if (firstCountSize && typeof firstCountSize === 'object') {
                const countSizeObject = firstCountSize as { id?: string; _id?: string };
                countSizeId = countSizeObject.id || countSizeObject._id || '';
              }
            }

            return {
              subtype: detail.subtype || '',
              countSize: countSizeId,
              tearWeight: detail.tearWeight || ''
            };
          })
        );
      } else {
        setDetails([{ subtype: '', countSize: '', tearWeight: '' }]);
      }
    } catch (error) {
      toast.error('Failed to load yarn type');
      router.push('/yarn-management/yarn-master/yarn-type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDetailChange = (index: number, field: keyof DetailFormState, value: string) => {
    setDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addDetailRow = () => {
    setDetails(prev => [...prev, { subtype: '', countSize: '', tearWeight: '' }]);
  };

  const removeDetailRow = (index: number) => {
    setDetails(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleYarnNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYarnName(e.target.value);
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
        const trimmedTearWeight = detail.tearWeight?.trim() || '';
        const countSizeId = detail.countSize.trim();

        return {
          subtype: trimmedSubtype,
          ...(countSizeId ? { countSize: [countSizeId] } : {}),
          ...(trimmedTearWeight ? { tearWeight: trimmedTearWeight } : {})
        };
      })
      .filter(detail => detail.subtype);

    const trimmedYarnName = yarnName.trim();

    setIsSubmitting(true);
    try {
      await yarnTypeService.updateType(id, {
        name: trimmedName,
        status: formData.status,
        ...(trimmedYarnName ? { yarnName: trimmedYarnName } : {}),
        ...(normalizedDetails.length > 0 ? { details: normalizedDetails } : { details: [] })
      });

      toast.success('Yarn type updated successfully');
      router.push('/yarn-management/yarn-master/yarn-type');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update yarn type');
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
      <Seo title="Edit Yarn Type" />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Yarn Type</h1>
              <Link href="/yarn-management/yarn-master/yarn-type" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>
          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="form-label">Name <span className="text-red-500">*</span></label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="form-control" placeholder="Enter yarn type name" required />
                </div>
                <div>
                  <label className="form-label">Yarn Name</label>
                  <input
                    type="text"
                    value={yarnName}
                    onChange={handleYarnNameChange}
                    className="form-control"
                    placeholder="Enter yarn name"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Yarn name is auto-generated by default. You can override it here if needed.
                  </p>
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
                            onChange={(e) => handleDetailChange(index, 'subtype', e.target.value)}
                            className="form-control"
                            placeholder="Enter subtype"
                          />
                        </div>
                        <div>
                          <label className="form-label">Tear Weight</label>
                          <input
                            type="text"
                            value={detail.tearWeight || ''}
                            onChange={(e) => handleDetailChange(index, 'tearWeight', e.target.value)}
                            className="form-control"
                            placeholder="Enter tear weight"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label">Count Size</label>
                          {isCountSizeLoading ? (
                            <div className="text-sm text-gray-500">Loading count sizes...</div>
                          ) : countSizes.length > 0 ? (
                            <select
                              className="form-select"
                              value={detail.countSize}
                              onChange={(e) => handleDetailChange(index, 'countSize', e.target.value)}
                            >
                              <option value="">Select count size</option>
                              {countSizes.map(countSize => (
                                <option key={countSize.id} value={countSize.id}>
                                  {countSize.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-sm text-gray-500">No count sizes available.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/yarn-type" className="ti-btn ti-btn-light">Cancel</Link>
                  <button type="submit" className="ti-btn ti-btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? <>Updating...</> : <><i className="ri-save-line me-2"></i> Update Yarn Type</>}
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

export default EditYarnTypePage;

