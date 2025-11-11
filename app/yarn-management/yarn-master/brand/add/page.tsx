"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import supplierService, {
  CreateSupplierRequest,
  SupplierYarnDetail,
} from '@/shared/services/supplierService';
import yarnTypeService, { YarnType } from '@/shared/services/yarnTypeService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';

interface YarnDetailForm {
  yarnType: string;
  yarnsubtype: string;
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
  city: string;
  state: string;
  pincode: string;
  country: string;
  gstNo: string;
  status: SupplierStatus;
  yarnDetails: YarnDetailForm[];
}

const defaultYarnDetail: YarnDetailForm = {
  yarnType: '',
  yarnsubtype: '',
  color: '',
  shadeNumber: '',
};

const AddBrandPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [yarnColors, setYarnColors] = useState<YarnColor[]>([]);
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, { id: string; name: string }[]>>({});
  const [formData, setFormData] = useState<BrandFormState>({
    brandName: '',
    contactPersonName: '',
    contactNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
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
        const rawTypes = typesResponse.results || [];
        const normalizedTypes = rawTypes
          .map((type) => {
            const normalizedTypeId = type.id || type._id || '';
            const normalizedDetails = Array.isArray(type.details)
              ? type.details
                  .map((detail) => {
                    const detailId = detail?.id || detail?._id || '';
                    if (!detailId || !detail?.subtype) {
                      return null;
                    }
                    return {
                      ...detail,
                      id: detailId,
                      subtype: detail.subtype,
                    };
                  })
                  .filter(Boolean)
              : [];

            if (!normalizedTypeId) {
              console.warn('[AddBrandPage] Yarn type missing id/_id', type);
            }

            return {
              ...type,
              id: normalizedTypeId,
              details: normalizedDetails,
            };
          })
          .filter((type): type is YarnType & { id: string } => Boolean(type.id));

        setYarnTypes(normalizedTypes);

        const subtypeEntries = normalizedTypes.reduce<Record<string, { id: string; name: string }[]>>((acc, type) => {
          if (Array.isArray(type.details) && type.details.length > 0) {
            const options = type.details.map((detail) => ({
              id: detail.id,
              name: detail.subtype ?? detail.name ?? '',
            }));
            if (options.length > 0) {
              acc[type.id] = options.filter((option) => option.id && option.name);
            }
          }
          return acc;
        }, {});

        setYarnSubtypeMap(subtypeEntries);

        const rawColors = colorsResponse.results || [];
        const normalizedColors = rawColors
          .map((color) => {
            const normalizedColorId = color.id || color._id || '';
            if (!normalizedColorId) {
              console.warn('[AddBrandPage] Yarn color missing id/_id', color);
            }
            return {
              ...color,
              id: normalizedColorId,
            };
          })
          .filter((color): color is YarnColor & { id: string } => Boolean(color.id));

        setYarnColors(normalizedColors);

        console.debug('[AddBrandPage] Loaded yarn metadata', {
          typeCount: normalizedTypes.length,
          colorCount: normalizedColors.length,
          subtypeParentCount: Object.keys(subtypeEntries).length,
        });
      } catch (error) {
        console.error('Error loading yarn data:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn data');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadLookups();
  }, []);

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

  const updateYarnDetail = useCallback((index: number, updates: Partial<YarnDetailForm>) => {
    setFormData((prev) => {
      const nextDetails = [...prev.yarnDetails];
      nextDetails[index] = {
        ...nextDetails[index],
        ...updates,
      };
      return {
        ...prev,
        yarnDetails: nextDetails,
      };
    });
  }, []);

  const getSubtypeOptions = useCallback(
    (yarnTypeId: string) => {
      if (!yarnTypeId) return [];
      return yarnSubtypeMap[yarnTypeId] || [];
    },
    [yarnSubtypeMap],
  );

  const handleYarnTypeChange = useCallback(
    async (index: number, value: string) => {
      updateYarnDetail(index, { yarnType: value, yarnsubtype: '' });

      if (!value) {
        return;
      }

      const existingSubtypes = yarnSubtypeMap[value];
      if (!existingSubtypes) {
        try {
          const type = await yarnTypeService.getTypeById(value);
          const details = (type.details || []).filter((detail) => detail?.subtype);
          const options = details
            .map((detail) => {
              const subtypeId = detail.id || detail._id;
              if (!subtypeId || !detail.subtype) return null;
              return { id: subtypeId, name: detail.subtype };
            })
            .filter(Boolean) as { id: string; name: string }[];
          setYarnSubtypeMap((prev) => ({
            ...prev,
            [value]: options,
          }));
          if (options.length === 1) {
            updateYarnDetail(index, { yarnsubtype: options[0].id });
          }
        } catch (error) {
          console.error('Error loading yarn subtypes:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to load yarn subtypes');
        }
      } else if (existingSubtypes.length === 1) {
        updateYarnDetail(index, { yarnsubtype: existingSubtypes[0].id });
      }
    },
    [updateYarnDetail, yarnSubtypeMap],
  );

  const handleYarnDetailChange = useCallback(
    (index: number, field: keyof YarnDetailForm, value: string) => {
      updateYarnDetail(index, { [field]: value } as Partial<YarnDetailForm>);
    },
    [updateYarnDetail],
  );

  const addYarnDetail = () => {
    console.debug('[AddBrandPage] Add Yarn Detail clicked', {
      isLoadingOptions,
      yarnTypeCount: yarnTypeOptions.length,
      yarnColorCount: yarnColorOptions.length,
      existingDetails: formData.yarnDetails.length,
    });

    if (!isLoadingOptions && (yarnTypeOptions.length === 0 || yarnColorOptions.length === 0)) {
      console.warn('[AddBrandPage] Yarn detail options missing when adding detail', {
        yarnTypeCount: yarnTypeOptions.length,
        yarnColorCount: yarnColorOptions.length,
      });
    }

    setFormData((prev) => {
      const autoTypeId = yarnTypeOptions.length === 1 ? yarnTypeOptions[0].id : '';
      const subtypeOptions = autoTypeId ? getSubtypeOptions(autoTypeId) : [];
      const autoSubtype = subtypeOptions.length === 1 ? subtypeOptions[0].id : '';
      const autoColorId = yarnColorOptions.length === 1 ? yarnColorOptions[0].id : '';

      const updatedDetails = [
        ...prev.yarnDetails,
        {
          ...defaultYarnDetail,
          yarnType: autoTypeId,
          yarnsubtype: autoSubtype,
          color: autoColorId,
        },
      ];

      console.debug('[AddBrandPage] Yarn detail list updated', updatedDetails);

      return {
        ...prev,
        yarnDetails: updatedDetails,
      };
    });
  };

  const removeYarnDetail = (index: number) => {
    console.debug('[AddBrandPage] Removing yarn detail', { index, totalDetails: formData.yarnDetails.length });
    setFormData((prev) => ({
      ...prev,
      yarnDetails: prev.yarnDetails.filter((_, idx) => idx !== index),
    }));
  };

  const validateContactNumber = (value: string) => {
    const contactRegex = /^\+?[\d\s()-]{10,15}$/;
    return contactRegex.test(value.trim());
  };

  const validatePincode = (value: string) => {
    return /^[0-9]{6}$/.test(value.trim());
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
    if (!formData.city.trim()) {
      toast.error('City is required');
      return false;
    }
    if (!formData.state.trim()) {
      toast.error('State is required');
      return false;
    }
    if (!formData.pincode.trim()) {
      toast.error('Pincode is required');
      return false;
    }
    if (!validatePincode(formData.pincode)) {
      toast.error('Invalid pincode format. Must be 6 digits');
      return false;
    }
    if (!formData.country.trim()) {
      toast.error('Country is required');
      return false;
    }

    for (const detail of formData.yarnDetails) {
      if (!detail.yarnType.trim()) {
        toast.error('Yarn type is required for each yarn detail');
        return false;
      }
      if (!detail.color.trim()) {
        toast.error('Color is required for each yarn detail');
        return false;
      }
      const subtypeOptions = getSubtypeOptions(detail.yarnType);
      if (subtypeOptions.length > 0 && !detail.yarnsubtype.trim()) {
        toast.error('Yarn sub type is required when available');
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
      const payload: CreateSupplierRequest = {
        brandName: formData.brandName.trim(),
        contactPersonName: formData.contactPersonName.trim(),
        contactNumber: formData.contactNumber.trim(),
        email: formData.email.trim().toLowerCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim(),
        status: formData.status,
        gstNo: formData.gstNo.trim() || undefined,
        yarnDetails: formData.yarnDetails.length
          ? formData.yarnDetails.map<SupplierYarnDetail>((detail) => {
              const normalizedDetail: SupplierYarnDetail = {
                yarnType: detail.yarnType,
                color: detail.color,
              };
              if (detail.yarnsubtype.trim()) {
                normalizedDetail.yarnsubtype = detail.yarnsubtype.trim();
              }
              if (detail.shadeNumber.trim()) {
                normalizedDetail.shadeNumber = detail.shadeNumber.trim();
              }
              return normalizedDetail;
            })
          : undefined,
      };

      await supplierService.createSupplier(payload);
      toast.success('Brand created successfully');
      router.push('/yarn-management/yarn-master/brand');
    } catch (error) {
      console.error('Error creating brand:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create brand');
    } finally {
      setIsSubmitting(false);
    }
  };

  const yarnTypeOptions = useMemo(
    () =>
      yarnTypes.filter((type) => {
        if (!type?.status) return false;
        return type.status.toLowerCase() === 'active';
      }),
    [yarnTypes],
  );
  const yarnColorOptions = useMemo(
    () =>
      yarnColors.filter((color) => {
        if (!color?.status) return false;
        return color.status.toLowerCase() === 'active';
      }),
    [yarnColors],
  );
  const isAddDisabled = isLoadingOptions;

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Add Brand" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Add Brand</h1>
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
                  <div>
                    <label className="form-label">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter city"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter state"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter 6 digit pincode"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="form-control"
                      placeholder="Enter country"
                      required
                    />
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
                        className="ti-btn ti-btn-primary flex items-center gap-1 whitespace-nowrap px-4 py-2"
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
                    formData.yarnDetails.map((detail, index) => {
                      const subtypeOptions = getSubtypeOptions(detail.yarnType);
                      return (
                        <div
                          key={`yarn-detail-${index}`}
                          className="border border-gray-200 rounded-lg p-4 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="form-label">
                                Yarn Type <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={detail.yarnType}
                                onChange={(e) => handleYarnTypeChange(index, e.target.value)}
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
                                Yarn Sub Type{' '}
                                {subtypeOptions.length > 0 ? (
                                  <span className="text-red-500">*</span>
                                ) : (
                                  <span className="text-xs text-gray-400 ms-1">(Optional)</span>
                                )}
                              </label>
                              <select
                                value={detail.yarnsubtype}
                                onChange={(e) => handleYarnDetailChange(index, 'yarnsubtype', e.target.value)}
                                className="form-select"
                                disabled={isLoadingOptions || subtypeOptions.length === 0}
                                required={subtypeOptions.length > 0}
                              >
                                <option value="">Select yarn sub type</option>
                                {subtypeOptions.map((subtype) => (
                                  <option key={subtype.id} value={subtype.id}>
                                    {subtype.name}
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
                              <label className="form-label">Shade Number</label>
                              <input
                                type="text"
                                value={detail.shadeNumber}
                                onChange={(e) => handleYarnDetailChange(index, 'shadeNumber', e.target.value)}
                                className="form-control"
                                placeholder="Enter shade number"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="ti-btn ti-btn-danger flex items-center gap-1 whitespace-nowrap px-4 py-2"
                              onClick={() => removeYarnDetail(index)}
                            >
                              <i className="ri-delete-bin-line me-1"></i> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })
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
                        Creating...
                      </>
                    ) : (
                      <>
                        <i className="ri-save-line me-2"></i> Create Brand
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

export default AddBrandPage;

