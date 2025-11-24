"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import supplierService, {
  Supplier,
  SupplierYarnDetail,
  UpdateSupplierRequest,
} from '@/shared/services/supplierService';
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';

interface YarnDetailForm {
  yarnCatalogId: string;
  yarnName: string;
  yarnType: string;
  yarnsubtype: string;
  color: string;
  shadeNumber: string;
  tearweight: string;
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
  yarnCatalogId: '',
  yarnName: '',
  yarnType: '',
  yarnsubtype: '',
  color: '',
  shadeNumber: '',
  tearweight: '',
};

const EditBrandPage = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [yarnColors, setYarnColors] = useState<YarnColor[]>([]);
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
        const [catalogResponse, colorsResponse] = await Promise.all([
          yarnCatalogService.getYarnCatalogs({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 1000, page: 1 }),
        ]);
        const rawCatalogs = catalogResponse.results || [];
        const normalizedCatalogs: YarnCatalog[] = [];
        rawCatalogs.forEach((catalog) => {
          const normalizedCatalogId = (catalog.id as string) || (catalog as { _id?: string })._id || '';
          const rawType = catalog.yarnType;

          if (!rawType) {
            console.warn('[EditBrandPage] Yarn catalog missing yarnType', catalog);
            return;
          }

          const normalizedTypeId = rawType.id || (rawType as { _id?: string })._id || '';
          if (!normalizedCatalogId || !normalizedTypeId) {
            console.warn('[EditBrandPage] Yarn catalog missing id/_id', catalog);
            return;
          }

          let normalizedSubtype: YarnCatalog['yarnSubtype'];
          const rawSubtype = catalog.yarnSubtype;
          if (rawSubtype) {
            const normalizedSubtypeId = rawSubtype.id || (rawSubtype as { _id?: string })._id || '';
            if (normalizedSubtypeId) {
              normalizedSubtype = {
                ...rawSubtype,
                id: normalizedSubtypeId,
              };
            }
          }

          const normalizedCatalog: YarnCatalog = {
            ...catalog,
            id: normalizedCatalogId,
            yarnType: {
              ...rawType,
              id: normalizedTypeId,
            },
            ...(normalizedSubtype ? { yarnSubtype: normalizedSubtype } : {}),
          };

          normalizedCatalogs.push(normalizedCatalog);
        });

        const activeCatalogs = normalizedCatalogs.filter((catalog) => {
          const status = (catalog.status || '').toLowerCase();
          return status === 'active';
        });

        setYarnCatalogs(activeCatalogs);

        const rawColors = colorsResponse.results || [];
        const normalizedColors = rawColors
          .map((color) => {
            const normalizedColorId = (color.id as string) || (color as { _id?: string })._id || '';
            if (!normalizedColorId) {
              console.warn('[EditBrandPage] Yarn color missing id/_id', color);
            }
            return {
              ...color,
              id: normalizedColorId,
            };
          })
          .filter((color): color is YarnColor & { id: string } => Boolean(color.id));

        setYarnColors(normalizedColors);

        console.debug('[EditBrandPage] Loaded yarn metadata', {
          catalogCount: activeCatalogs.length,
          colorCount: normalizedColors.length,
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

  const yarnCatalogMap = useMemo(
    () =>
      yarnCatalogs.reduce<Record<string, YarnCatalog>>((acc, catalog) => {
        if (catalog.id) {
          acc[catalog.id] = catalog;
        }
        return acc;
      }, {}),
    [yarnCatalogs],
  );

  useEffect(() => {
    if (id && !isLoadingOptions) {
      fetchBrand();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoadingOptions]);

  const fetchBrand = async () => {
    setIsLoading(true);
    try {
      const data: Supplier = await supplierService.getSupplierById(id);
      
      // Build catalog map from current yarnCatalogs state
      const catalogMap = yarnCatalogs.reduce<Record<string, YarnCatalog>>((acc, catalog) => {
        if (catalog.id) {
          acc[catalog.id] = catalog;
        }
        return acc;
      }, {});

      const normalizedDetails: YarnDetailForm[] =
        data.yarnDetails && data.yarnDetails.length
          ? data.yarnDetails.map((detail) => {
              const yarnTypeId =
                typeof detail.yarnType === 'string'
                  ? detail.yarnType
                  : detail.yarnType?.id || (detail.yarnType as { _id?: string })?._id || '';
              const yarnSubtypeId =
                typeof detail.yarnsubtype === 'string'
                  ? detail.yarnsubtype
                  : detail.yarnsubtype?.id ||
                    (detail.yarnsubtype as { _id?: string })?._id ||
                    '';
              const colorId =
                typeof detail.color === 'string'
                  ? detail.color
                  : detail.color?.id || (detail.color as { _id?: string })?._id || '';

              // Try to find matching yarn catalog
              let matchingCatalogId = '';
              let matchingCatalogName = '';
              
              // First check if yarnCatalogId is directly available
              if (detail.yarnCatalogId) {
                matchingCatalogId = detail.yarnCatalogId;
                const catalog = catalogMap[matchingCatalogId];
                if (catalog) {
                  matchingCatalogName = catalog.yarnName || '';
                }
              } else if (detail.yarnCatalog) {
                // Check if yarnCatalog object is available
                const catalogRef = typeof detail.yarnCatalog === 'string' 
                  ? detail.yarnCatalog 
                  : detail.yarnCatalog.id || (detail.yarnCatalog as { _id?: string })?._id || '';
                if (catalogRef) {
                  matchingCatalogId = catalogRef;
                  const catalog = catalogMap[matchingCatalogId];
                  if (catalog) {
                    matchingCatalogName = catalog.yarnName || '';
                  }
                }
              } else {
                // Find catalog by matching yarnType and yarnsubtype
                const matchingCatalog = yarnCatalogs.find((catalog) => {
                  const catalogTypeId = catalog.yarnType?.id || (catalog.yarnType as { _id?: string })?._id || '';
                  const catalogSubtypeId = catalog.yarnSubtype?.id || (catalog.yarnSubtype as { _id?: string })?._id || '';
                  
                  const typeMatches = catalogTypeId === yarnTypeId;
                  const subtypeMatches = !yarnSubtypeId || !catalogSubtypeId || catalogSubtypeId === yarnSubtypeId;
                  
                  return typeMatches && subtypeMatches;
                });
                
                if (matchingCatalog) {
                  matchingCatalogId = matchingCatalog.id;
                  matchingCatalogName = matchingCatalog.yarnName || '';
                }
              }

              return {
                yarnCatalogId: matchingCatalogId,
                yarnName: matchingCatalogName,
                yarnType: yarnTypeId,
                yarnsubtype: yarnSubtypeId,
                color: colorId,
                shadeNumber: typeof detail.shadeNumber === 'string' ? detail.shadeNumber : '',
                tearweight:
                  typeof detail.tearweight === 'string'
                    ? detail.tearweight
                    : typeof detail.tearweight === 'number'
                      ? String(detail.tearweight)
                      : '',
              };
            })
          : [];

      setFormData({
        brandName: data.brandName || '',
        contactPersonName: data.contactPersonName || '',
        contactNumber: data.contactNumber || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pincode: data.pincode || '',
        country: data.country || '',
        gstNo: data.gstNo || '',
        status: (data.status || 'active') as SupplierStatus,
        yarnDetails: normalizedDetails,
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

  const handleYarnCatalogChange = useCallback(
    (index: number, catalogId: string) => {
      const selectedCatalog = catalogId ? yarnCatalogMap[catalogId] : undefined;

      updateYarnDetail(index, {
        yarnCatalogId: catalogId,
        yarnName: selectedCatalog?.yarnName ?? '',
        yarnType: selectedCatalog?.yarnType?.id ?? '',
        yarnsubtype: selectedCatalog?.yarnSubtype?.id ?? '',
      });

      if (!catalogId) {
        console.debug('[EditBrandPage] Yarn catalog cleared for detail', { index });
      } else if (!selectedCatalog) {
        console.warn('[EditBrandPage] Selected yarn catalog not found in lookup', { index, catalogId });
      }
    },
    [updateYarnDetail, yarnCatalogMap],
  );

  const handleYarnDetailChange = useCallback(
    (index: number, field: keyof YarnDetailForm, value: string) => {
      updateYarnDetail(index, { [field]: value } as Partial<YarnDetailForm>);
    },
    [updateYarnDetail],
  );

  const addYarnDetail = () => {
    console.debug('[EditBrandPage] Add Yarn Detail clicked', {
      isLoadingOptions,
      yarnCatalogCount: yarnCatalogOptions.length,
      yarnColorCount: yarnColorOptions.length,
      existingDetails: formData.yarnDetails.length,
    });

    if (!isLoadingOptions && (yarnCatalogOptions.length === 0 || yarnColorOptions.length === 0)) {
      console.warn('[EditBrandPage] Yarn detail options missing when adding detail', {
        yarnCatalogCount: yarnCatalogOptions.length,
        yarnColorCount: yarnColorOptions.length,
      });
    }

    setFormData((prev) => {
      const autoCatalog = yarnCatalogOptions.length === 1 ? yarnCatalogOptions[0] : undefined;
      const autoColorId = yarnColorOptions.length === 1 ? yarnColorOptions[0].id : '';

      const updatedDetails = [
        ...prev.yarnDetails,
        {
          ...defaultYarnDetail,
          yarnCatalogId: autoCatalog?.id ?? '',
          yarnName: autoCatalog?.yarnName ?? '',
          yarnType: autoCatalog?.yarnType?.id ?? '',
          yarnsubtype: autoCatalog?.yarnSubtype?.id ?? '',
          color: autoColorId,
        },
      ];

      console.debug('[EditBrandPage] Yarn detail list updated', updatedDetails);

      return {
        ...prev,
        yarnDetails: updatedDetails,
      };
    });
  };

  const removeYarnDetail = (index: number) => {
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
      if (!detail.yarnCatalogId.trim()) {
        toast.error('Yarn name is required for each yarn detail');
        return false;
      }
      const selectedCatalog = yarnCatalogMap[detail.yarnCatalogId];
      if (!selectedCatalog) {
        toast.error('Selected yarn name is unavailable. Please choose a different yarn');
        return false;
      }
      if (!detail.yarnType.trim()) {
        toast.error('Selected yarn is missing a yarn type configuration');
        return false;
      }
      if (!detail.color.trim()) {
        toast.error('Color is required for each yarn detail');
        return false;
      }
      const requiresSubtype = Boolean(selectedCatalog?.yarnSubtype?.id);
      if (requiresSubtype && !detail.yarnsubtype.trim()) {
        toast.error('Yarn sub type is required for the selected yarn');
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
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        country: formData.country.trim(),
        status: formData.status,
        gstNo: formData.gstNo.trim() || undefined,
        yarnDetails: formData.yarnDetails.length
          ? formData.yarnDetails.map<SupplierYarnDetail>((detail) => {
              const normalizedDetail: SupplierYarnDetail = {
                yarnName: detail.yarnName.trim(),
                color: detail.color,
              };
              if (detail.shadeNumber.trim()) {
                normalizedDetail.shadeNumber = detail.shadeNumber.trim();
              }
              if (detail.tearweight.trim()) {
                normalizedDetail.tearweight = detail.tearweight.trim();
              }
              return normalizedDetail;
            })
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

  const yarnCatalogOptions = useMemo(
    () => yarnCatalogs.filter((catalog) => Boolean(catalog?.id)),
    [yarnCatalogs],
  );
  const yarnColorOptions = useMemo(
    () =>
      yarnColors.filter((color) => {
        if (!color?.status) return false;
        return color.status.toLowerCase() === 'active';
      }),
    [yarnColors],
  );
  const isAddDisabled = isLoadingOptions || yarnCatalogOptions.length === 0 || yarnColorOptions.length === 0;

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

                  {!isLoadingOptions && yarnCatalogOptions.length === 0 ? (
                    <p className="text-sm text-red-500">
                      Yarn catalogs are not available. Please configure yarn catalog entries before adding details.
                    </p>
                  ) : null}
                  {formData.yarnDetails.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No yarn details added. Use "Add Yarn Detail" to include yarn information.
                    </p>
                  ) : (
                    formData.yarnDetails.map((detail, index) => {
                      const selectedCatalog = detail.yarnCatalogId ? yarnCatalogMap[detail.yarnCatalogId] : undefined;
                      return (
                        <div
                          key={`yarn-detail-${index}`}
                          className="border border-gray-200 rounded-lg p-4 space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="form-label">
                                Yarn Name <span className="text-red-500">*</span>
                              </label>
                              <select
                                value={detail.yarnCatalogId}
                                onChange={(e) => handleYarnCatalogChange(index, e.target.value)}
                                className="form-select"
                                required
                                disabled={isLoadingOptions || yarnCatalogOptions.length === 0}
                              >
                                <option value="">Select yarn name</option>
                                {yarnCatalogOptions.map((catalog) => (
                                  <option key={catalog.id} value={catalog.id}>
                                    {catalog.yarnName || catalog.yarnType?.name || 'Unnamed yarn'}
                                  </option>
                                ))}
                              </select>
                              {detail.yarnCatalogId && !selectedCatalog && (
                                <p className="text-xs text-red-500 mt-1">
                                  Selected yarn name is unavailable. Please choose another option.
                                </p>
                              )}
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
                                disabled={isLoadingOptions || yarnColorOptions.length === 0}
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
                            <div>
                              <label className="form-label">Tear Weight</label>
                              <input
                                type="text"
                                value={detail.tearweight}
                                onChange={(e) => handleYarnDetailChange(index, 'tearweight', e.target.value)}
                                className="form-control"
                                placeholder="Enter tear weight"
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

