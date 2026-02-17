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
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';
import ColorPickerDrawer from '@/shared/components/ColorPickerDrawer';

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

const AddBrandPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [yarnCatalogs, setYarnCatalogs] = useState<YarnCatalog[]>([]);
  const [yarnColors, setYarnColors] = useState<YarnColor[]>([]);
  
  // Yarn Name Modal States
  const [isYarnNameModalOpen, setIsYarnNameModalOpen] = useState(false);
  const [modalYarnDetailIndex, setModalYarnDetailIndex] = useState<number | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(10);
  const [modalYarns, setModalYarns] = useState<YarnCatalog[]>([]);
  const [modalTotalPages, setModalTotalPages] = useState(1);
  const [modalTotalResults, setModalTotalResults] = useState(0);
  const [isModalLoading, setIsModalLoading] = useState(false);

  /** Which yarn-detail row has the color picker drawer open (index in yarnDetails). */
  const [colorDrawerDetailIndex, setColorDrawerDetailIndex] = useState<number | null>(null);

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
            console.warn('[AddBrandPage] Yarn catalog missing yarnType', catalog);
            return;
          }

          const normalizedTypeId = rawType.id || (rawType as { _id?: string })._id || '';
          if (!normalizedCatalogId || !normalizedTypeId) {
            console.warn('[AddBrandPage] Yarn catalog missing id/_id', catalog);
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

  const handleYarnCatalogChange = useCallback(
    (index: number, catalogId: string, selectedYarnFromModal?: YarnCatalog) => {
      const selectedCatalog = catalogId ? yarnCatalogMap[catalogId] : undefined;
      const catalogForName = selectedYarnFromModal ?? selectedCatalog;
      const yarnName = catalogForName?.yarnName?.trim() ?? '';
      const yarnTypeId = catalogForName?.yarnType?.id ?? '';
      const yarnSubtypeId = catalogForName?.yarnSubtype?.id ?? '';

      updateYarnDetail(index, {
        yarnCatalogId: catalogId,
        yarnName,
        yarnType: yarnTypeId,
        yarnsubtype: yarnSubtypeId,
      });

      if (!catalogId) {
        console.debug('[AddBrandPage] Yarn catalog cleared for detail', { index });
      } else if (!selectedCatalog && !yarnName) {
        console.warn('[AddBrandPage] Selected yarn catalog not found in lookup', { index, catalogId });
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
    console.debug('[AddBrandPage] Add Yarn Detail clicked', {
      isLoadingOptions,
      yarnCatalogCount: yarnCatalogOptions.length,
      yarnColorCount: yarnColorOptions.length,
      existingDetails: formData.yarnDetails.length,
    });

    if (!isLoadingOptions && (yarnCatalogOptions.length === 0 || yarnColorOptions.length === 0)) {
      console.warn('[AddBrandPage] Yarn detail options missing when adding detail', {
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
      if (!detail.yarnCatalogId.trim()) {
        toast.error('Yarn name is required for each yarn detail');
        return false;
      }
      const selectedCatalog = yarnCatalogMap[detail.yarnCatalogId];
      const hasYarnName = detail.yarnName.trim() || selectedCatalog?.yarnName?.trim();
      if (!hasYarnName) {
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
              const yarnName = detail.yarnName.trim() || yarnCatalogMap[detail.yarnCatalogId]?.yarnName?.trim() || '';
              const selectedColor = detail.color ? yarnColorOptions.find((c) => c.id === detail.color) : undefined;
              const normalizedDetail: SupplierYarnDetail = {
                yarnName,
                color: detail.color,
                ...(selectedColor?.name && { colorName: selectedColor.name }),
                ...(selectedColor?.pantoneName && { pantoneName: selectedColor.pantoneName }),
              };
              if (detail.yarnCatalogId?.trim()) {
                normalizedDetail.yarnCatalogId = detail.yarnCatalogId.trim();
              }
              if (detail.shadeNumber.trim()) {
                normalizedDetail.shadeNumber = detail.shadeNumber.trim();
              }
              if (detail.tearweight.trim()) {
                normalizedDetail.tearweight = detail.tearweight.trim();
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

  // Yarn Name Modal Functions
  const openYarnNameModal = (yarnDetailIndex: number) => {
    setModalYarnDetailIndex(yarnDetailIndex);
    setModalSearchTerm('');
    setModalCurrentPage(1);
    setIsYarnNameModalOpen(true);
  };

  const closeYarnNameModal = () => {
    setIsYarnNameModalOpen(false);
    setModalYarnDetailIndex(null);
    setModalSearchTerm('');
    setModalCurrentPage(1);
  };

  const fetchModalYarnCatalogs = useCallback(async () => {
    setIsModalLoading(true);
    try {
      const response = await yarnCatalogService.getYarnCatalogs({
        page: modalCurrentPage,
        limit: modalItemsPerPage,
        yarnName: modalSearchTerm.trim() || undefined,
        status: 'active',
      });
      setModalYarns(response.results || []);
      setModalTotalPages(response.totalPages || 1);
      setModalTotalResults(response.totalResults || 0);
    } catch (error) {
      console.error('Error fetching yarn catalogs for modal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch yarn catalogs');
      setModalYarns([]);
    } finally {
      setIsModalLoading(false);
    }
  }, [modalCurrentPage, modalItemsPerPage, modalSearchTerm]);

  useEffect(() => {
    if (isYarnNameModalOpen) {
      const timeoutId = setTimeout(() => {
        fetchModalYarnCatalogs();
      }, 500); // 500ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [isYarnNameModalOpen, fetchModalYarnCatalogs]);

  const handleSelectYarnFromModal = (yarn: YarnCatalog) => {
    if (modalYarnDetailIndex !== null) {
      const catalogId = yarn.id || (yarn as { _id?: string })._id || '';
      handleYarnCatalogChange(modalYarnDetailIndex, catalogId, yarn);
      closeYarnNameModal();
    }
  };

  const getPagination = (currentPage: number, totalPages: number) => {
    const pages: Array<number | '...'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 4) pages.push('...');
      for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

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
                              <div className="relative">
                                <input
                                  type="text"
                                  value={selectedCatalog?.yarnName || detail.yarnName || ''}
                                  readOnly
                                  onClick={() => !isLoadingOptions && yarnCatalogOptions.length > 0 && openYarnNameModal(index)}
                                  className="form-control cursor-pointer pr-10"
                                  placeholder="Click to select yarn name"
                                  required
                                  disabled={isLoadingOptions || yarnCatalogOptions.length === 0}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  <i className="ri-arrow-down-s-line text-gray-400"></i>
                                </div>
                              </div>
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
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => !isLoadingOptions && yarnColorOptions.length > 0 && setColorDrawerDetailIndex(index)}
                                  disabled={isLoadingOptions || yarnColorOptions.length === 0}
                                  className="ti-btn ti-btn-light flex items-center gap-2 w-full justify-start text-left"
                                >
                                  {detail.color ? (() => {
                                    const selectedColor = yarnColorOptions.find((c) => c.id === detail.color);
                                    const bg = selectedColor?.colorCode
                                      ? (/^#/.test(selectedColor.colorCode) ? selectedColor.colorCode : `#${selectedColor.colorCode}`)
                                      : '#e5e7eb';
                                    return (
                                      <>
                                        <span
                                          className="shrink-0 w-5 h-5 rounded border border-gray-300"
                                          style={{ backgroundColor: bg }}
                                        />
                                        <span className="truncate">{selectedColor?.name || 'Select color'}</span>
                                        {selectedColor?.pantoneName && (
                                          <span className="text-xs text-gray-500 truncate">({selectedColor.pantoneName})</span>
                                        )}
                                      </>
                                    );
                                  })() : (
                                    <span className="text-gray-500">Select color</span>
                                  )}
                                  <i className="ri-arrow-right-s-line ms-auto text-gray-400" />
                                </button>
                                {detail.color && (() => {
                                  const selectedColor = yarnColorOptions.find((c) => c.id === detail.color);
                                  return selectedColor?.pantoneName ? (
                                    <span className="text-xs text-gray-500">
                                      Pantone: {selectedColor.pantoneName}
                                    </span>
                                  ) : null;
                                })()}
                              </div>
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

      {/* Color selection side drawer */}
      <ColorPickerDrawer
        isOpen={colorDrawerDetailIndex !== null}
        onClose={() => setColorDrawerDetailIndex(null)}
        colors={yarnColorOptions}
        selectedColorId={colorDrawerDetailIndex !== null ? (formData.yarnDetails[colorDrawerDetailIndex]?.color ?? '') : ''}
        onSelect={(colorId) => {
          if (colorDrawerDetailIndex !== null) {
            handleYarnDetailChange(colorDrawerDetailIndex, 'color', colorId);
            setColorDrawerDetailIndex(null);
          }
        }}
        title="Select Color"
      />

      {/* Yarn Name Selection Modal */}
      {isYarnNameModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={closeYarnNameModal}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <i className="ri-file-list-3-line text-xl text-blue-600"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Select Yarn Name
                    </h2>
                    <p className="text-xs text-gray-600">Choose a yarn from the catalog</p>
                  </div>
                </div>
                <button
                  onClick={closeYarnNameModal}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200 group"
                  aria-label="Close modal"
                >
                  <i className="ri-close-line text-xl text-gray-500 group-hover:text-gray-900 transition-colors"></i>
                </button>
              </div>

              {/* Search and Filters */}
              <div className="p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Rows per page:</label>
                    <select
                      className="form-select w-auto text-sm"
                      value={modalItemsPerPage}
                      onChange={(e) => {
                        setModalItemsPerPage(Number(e.target.value));
                        setModalCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                  <div className="relative flex-1 max-w-md mx-auto">
                    <input
                      type="text"
                      className="form-control py-2 pr-10"
                      placeholder="Search by yarn name..."
                      value={modalSearchTerm}
                      onChange={(e) => {
                        setModalSearchTerm(e.target.value);
                        setModalCurrentPage(1);
                      }}
                    />
                    <button className="absolute end-0 top-0 px-4 h-full">
                      <i className="ri-search-line text-lg"></i>
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-4 min-h-0">
                {isModalLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : modalYarns.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <i className="ri-book-open-line text-4xl"></i>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Yarn Catalogs Found</h3>
                    <p className="text-gray-500">Try adjusting your search criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {modalYarns.map((yarn) => (
                      <div
                        key={yarn.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{yarn.yarnName || 'Unnamed Yarn'}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {yarn.yarnType?.name || ''}
                            {yarn.yarnSubtype && 'subtype' in yarn.yarnSubtype && yarn.yarnSubtype.subtype ? ` / ${String(yarn.yarnSubtype.subtype)}` : ''}
                          </div>
                        </div>
                        <button
                          onClick={() => handleSelectYarnFromModal(yarn)}
                          className="ti-btn ti-btn-primary"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination Footer */}
              {modalYarns.length > 0 && (
                <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                  <div className="text-sm text-gray-500">
                    Showing {modalTotalResults === 0 ? 0 : (modalCurrentPage - 1) * modalItemsPerPage + 1} to{' '}
                    {Math.min(modalCurrentPage * modalItemsPerPage, modalTotalResults)} of {modalTotalResults} entries
                  </div>
                  <nav aria-label="Page navigation">
                    <ul className="flex flex-wrap items-center">
                      <li className={`page-item ${modalCurrentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setModalCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={modalCurrentPage === 1}
                        >
                          Previous
                        </button>
                      </li>
                      {getPagination(modalCurrentPage, modalTotalPages).map((page, idx) =>
                        page === '...'
                          ? (
                              <li key={`ellipsis-${idx}`} className="page-item">
                                <span className="px-3">...</span>
                              </li>
                            )
                          : (
                              <li key={page} className="page-item">
                                <button
                                  className={`page-link py-2 px-3 leading-tight border border-gray-300 ${
                                    modalCurrentPage === page
                                      ? 'bg-primary text-white hover:bg-primary-dark'
                                      : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                  }`}
                                  onClick={() => setModalCurrentPage(Number(page))}
                                >
                                  {page}
                                </button>
                              </li>
                            ),
                      )}
                      <li className={`page-item ${modalCurrentPage === modalTotalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          onClick={() => setModalCurrentPage((prev) => Math.min(prev + 1, modalTotalPages))}
                          disabled={modalCurrentPage === modalTotalPages}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AddBrandPage;

