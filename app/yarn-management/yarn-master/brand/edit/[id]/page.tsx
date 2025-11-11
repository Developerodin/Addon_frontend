"use client"
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import supplierService, {
  Supplier,
  SupplierYarnDetail,
  UpdateSupplierRequest,
} from '@/shared/services/supplierService';
import yarnTypeService, { YarnType } from '@/shared/services/yarnTypeService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';

interface YarnDetailForm {
  yarnType: string;
  color: string;
  shadeNumber: string;
}

type SupplierStatus = 'active' | 'inactive' | 'suspended';

interface BrandFormState {
  brandName: string;
  contactPersonName: string;
  contactNumber: string;
  email: string;
  address: string;
  gstNo: string;
  status: SupplierStatus;
  yarnDetails: YarnDetailForm[];
}

const defaultYarnDetail: YarnDetailForm = {
  yarnType: '',
  color: '',
  shadeNumber: '',
};

const EditBrandPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [yarnColors, setYarnColors] = useState<YarnColor[]>([]);
  const [formData, setFormData] = useState<BrandFormState>({
    brandName: '',
    contactPersonName: '',
    contactNumber: '',
    email: '',
    address: '',
    gstNo: '',
    status: 'active',
    yarnDetails: [],
  });

  useEffect(() => {
    const loadLookups = async () => {
      setIsLoadingOptions(true);
      try {
        const [typesResponse, colorsResponse] = await Promise.all([
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 1000, page: 1 }),
        ]);
        setYarnTypes(typesResponse.results || []);
        setYarnColors(colorsResponse.results || []);
      } catch (error) {
        console.error('Error loading yarn data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn data');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    if (id) {
      fetchBrand();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchBrand = async () => {
    setIsLoading(true);
    try {
      const data: Supplier = await supplierService.getSupplierById(id);
      setFormData({
        brandName: data.brandName || '',
        contactPersonName: data.contactPersonName || '',
        contactNumber: data.contactNumber || '',
        email: data.email || '',
        address: data.address || '',
        gstNo: data.gstNo || '',
        status: (data.status || 'active') as SupplierStatus,
        yarnDetails: data.yarnDetails && data.yarnDetails.length ? data.yarnDetails : [],
      });
    } catch (error) {
      console.error('Error fetching brand:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load brand');
      router.push('/yarn-management/yarn-master/brand');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setFormData((prev) => ({
        ...prev,
        status: value as SupplierStatus,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleYarnDetailChange = (
    index: number,
    field: keyof YarnDetailForm,
    value: string,
  ) => {
    setFormData((prev) => {
      const nextDetails = [...prev.yarnDetails];
      nextDetails[index] = {
        ...nextDetails[index],
        [field]: value,
      };
      return {
        ...prev,
        yarnDetails: nextDetails,
      };
    });
  };

  const addYarnDetail = () => {
    setFormData((prev) => ({
      ...prev,
      yarnDetails: [
        ...prev.yarnDetails,
        {
          ...defaultYarnDetail,
          yarnType: yarnTypes.length === 1 ? yarnTypes[0].id : '',
          color: yarnColors.length === 1 ? yarnColors[0].id : '',
        },
      ],
    }));
  };

  const removeYarnDetail = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      yarnDetails: prev.yarnDetails.filter((_, idx) => idx !== index),
    }));
  };

  const validateContactNumber = (value: string) => {
    const contactRegex = /^[+\d\s()-]{10,20}$/;
    return contactRegex.test(value.trim());
  };

  const validateForm = () => {
    if (!formData.brandName.trim()) {
      toast.error('Brand is required');
      return false;
    }
    if (!formData.contactPersonName.trim()) {
      toast.error('Contact person name is required');
      return false;
    }
    if (!formData.contactNumber.trim()) {
      toast.error('Contact number is required');
      return false;
    }
    if (!validateContactNumber(formData.contactNumber)) {
      toast.error('Invalid contact number format');
      return false;
    }
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }
    if (!formData.address.trim()) {
      toast.error('Address is required');
      return false;
    }

    for (const detail of formData.yarnDetails) {
      if (!detail.yarnType.trim() || !detail.color.trim() || !detail.shadeNumber.trim()) {
        toast.error('All yarn detail fields are required');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload: UpdateSupplierRequest = {
        brandName: formData.brandName.trim(),
        contactPersonName: formData.contactPersonName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        status: formData.status,
        gstNo: formData.gstNo.trim() || undefined,
        yarnDetails: formData.yarnDetails.length
          ? formData.yarnDetails.map<SupplierYarnDetail>((detail) => ({
              yarnType: detail.yarnType,
              color: detail.color,
              shadeNumber: detail.shadeNumber.trim(),
            }))
          : [],
      };

      await supplierService.updateSupplier(id, payload);
      toast.success('Brand updated successfully');
      router.push('/yarn-management/yarn-master/brand');
    } catch (error) {
      console.error('Error updating brand:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const yarnTypeOptions = useMemo(
    () => yarnTypes.filter((type) => type.status === 'active'),
    [yarnTypes],
  );
  const yarnColorOptions = useMemo(
    () => yarnColors.filter((color) => color.status === 'active'),
    [yarnColors],
  );
  const isAddDisabled = isLoadingOptions || yarnTypeOptions.length === 0 || yarnColorOptions.length === 0;

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
      <Seo title="Edit Brand" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Edit Brand</h1>
              <Link href="/yarn-management/yarn-master/brand" className="ti-btn ti-btn-light">
                <i className="ri-arrow-left-line me-2"></i> Back
              </Link>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={formData.brandName}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter brand name"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactPersonName"
                      value={formData.contactPersonName}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter contact person name"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={formData.contactNumber}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter contact number"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter email"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">GST Number</label>
                    <input
                      type="text"
                      name="gstNo"
                      value={formData.gstNo}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter GST number"
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
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="form-control"
                    rows={4}
                    placeholder="Enter address"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Yarn Details</h2>
                    <div className="flex items-center gap-3">
                      {isLoadingOptions && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
                          Loading options...
                        </span>
                      )}
                      <button
                        type="button"
                        className="ti-btn ti-btn-primary ti-btn-sm"
                        onClick={addYarnDetail}
                        disabled={isAddDisabled}
                      >
                        <i className="ri-add-line me-1"></i> Add Yarn Detail
                      </button>
                    </div>
                  </div>

                  {formData.yarnDetails.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No yarn details added. Use "Add Yarn Detail" to include yarn information.
                    </p>
                  ) : (
                    formData.yarnDetails.map((detail, index) => (
                      <div key={`yarn-detail-${index}`} className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="form-label">
                              Yarn Type <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={detail.yarnType}
                              onChange={(e) => handleYarnDetailChange(index, 'yarnType', e.target.value)}
                              className="form-select"
                              required
                              disabled={isLoadingOptions}
                            >
                              <option value="">Select yarn type</option>
                              {yarnTypeOptions.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label">
                              Color <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={detail.color}
                              onChange={(e) => handleYarnDetailChange(index, 'color', e.target.value)}
                              className="form-select"
                              required
                              disabled={isLoadingOptions}
                            >
                              <option value="">Select color</option>
                              {yarnColorOptions.map((color) => (
                                <option key={color.id} value={color.id}>
                                  {color.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label">
                              Shade Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={detail.shadeNumber}
                              onChange={(e) => handleYarnDetailChange(index, 'shadeNumber', e.target.value)}
                              className="form-control"
                              placeholder="Enter shade number"
                              required
                            />
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="ti-btn ti-btn-danger ti-btn-sm"
                            onClick={() => removeYarnDetail(index)}
                          >
                            <i className="ri-delete-bin-line me-1"></i> Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <Link href="/yarn-management/yarn-master/brand" className="ti-btn ti-btn-light">
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="ti-btn ti-btn-primary"
                    disabled={isSubmitting || (formData.yarnDetails.length > 0 && isAddDisabled)}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-2"></i> Update Brand
                      </>
                    )}
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

export default EditBrandPage;

