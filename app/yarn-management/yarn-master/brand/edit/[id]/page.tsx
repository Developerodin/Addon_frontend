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
  const [yarnDetailsPage, setYarnDetailsPage] = useState(1);
  const [yarnDetailsPerPage, setYarnDetailsPerPage] = useState(10);
  const [originalSupplierData, setOriginalSupplierData] = useState<Supplier | null>(null);
  
  // Filter States
  const [filterYarnName, setFilterYarnName] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterShade, setFilterShade] = useState('');
  const [filterTearWeight, setFilterTearWeight] = useState('');
  
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
      
      // Store original supplier data for matching
      setOriginalSupplierData(data);
      
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
              } else if (detail.yarnName) {
                // Try to match by exact yarn name first (most accurate)
                const exactMatch = yarnCatalogs.find((catalog) => {
                  return catalog.yarnName === detail.yarnName;
                });
                
                if (exactMatch) {
                  matchingCatalogId = exactMatch.id;
                  matchingCatalogName = exactMatch.yarnName || '';
                }
                // If no exact match, leave matchingCatalogId empty
                // This prevents auto-selecting the wrong catalog (e.g., first one with same type/subtype)
                // The user will see the actual yarn name from backend and can manually select the correct catalog
              }

              // Use the actual yarnName from the API response if available, otherwise use the matched catalog name
              const actualYarnName = detail.yarnName || matchingCatalogName;

              return {
                yarnCatalogId: matchingCatalogId,
                yarnName: actualYarnName,
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
    (index: number, catalogId: string, selectedYarnFromModal?: YarnCatalog) => {
      const selectedCatalog = catalogId ? yarnCatalogMap[catalogId] : undefined;
      const catalogForName = selectedYarnFromModal ?? selectedCatalog;
      const catalogYarnName = catalogForName?.yarnName?.trim() || '';

      if (!catalogId) {
        updateYarnDetail(index, {
          yarnCatalogId: '',
          yarnName: '',
          yarnType: '',
          yarnsubtype: '',
        });
        console.debug('[EditBrandPage] Yarn catalog cleared for detail', { index });
        return;
      }

      if (!catalogYarnName && !selectedCatalog) {
        updateYarnDetail(index, {
          yarnCatalogId: catalogId,
          yarnName: selectedYarnFromModal?.yarnName ?? '',
          yarnType: selectedYarnFromModal?.yarnType?.id ?? selectedCatalog?.yarnType?.id ?? '',
          yarnsubtype: selectedYarnFromModal?.yarnSubtype?.id ?? selectedCatalog?.yarnSubtype?.id ?? '',
        });
        console.warn('[EditBrandPage] Selected yarn catalog not found in lookup', { index, catalogId });
        return;
      }

      const effectiveYarnName = catalogYarnName;
      
      // Try to match with existing supplier yarn details by yarn name
      let matchingSupplierDetail: SupplierYarnDetail | undefined;
      if (originalSupplierData?.yarnDetails && effectiveYarnName) {
        matchingSupplierDetail = originalSupplierData.yarnDetails.find((detail) => {
          const detailYarnName = detail.yarnName?.trim() || (detail as any)?.yarn?.trim() || '';
          return detailYarnName.toLowerCase() === effectiveYarnName.toLowerCase();
        });
      }

      console.log('[EditBrandPage] Catalog selected, matching with supplier details', {
        index,
        catalogId,
        catalogYarnName: effectiveYarnName,
        foundMatch: Boolean(matchingSupplierDetail),
      });

      // Extract color ID from matching supplier detail or keep existing
      const currentDetail = formData.yarnDetails[index];
      let colorId = currentDetail?.color || '';
      
      if (matchingSupplierDetail) {
        const detailColorId =
          typeof matchingSupplierDetail.color === 'string'
            ? matchingSupplierDetail.color
            : matchingSupplierDetail.color?.id || (matchingSupplierDetail.color as { _id?: string })?._id || '';
        if (detailColorId) {
          colorId = detailColorId;
        }
      }

      // Extract shade number from matching supplier detail or keep existing
      let shadeNumber = currentDetail?.shadeNumber || '';
      if (matchingSupplierDetail?.shadeNumber) {
        shadeNumber = matchingSupplierDetail.shadeNumber;
      }

      // Extract tear weight from matching supplier detail or keep existing
      let tearweight = currentDetail?.tearweight || '';
      if (matchingSupplierDetail?.tearweight) {
        tearweight = typeof matchingSupplierDetail.tearweight === 'string'
          ? matchingSupplierDetail.tearweight
          : String(matchingSupplierDetail.tearweight);
      }

      const yarnTypeId = catalogForName?.yarnType?.id ?? selectedCatalog?.yarnType?.id ?? '';
      const yarnSubtypeId = catalogForName?.yarnSubtype?.id ?? selectedCatalog?.yarnSubtype?.id ?? '';

      updateYarnDetail(index, {
        yarnCatalogId: catalogId,
        yarnName: effectiveYarnName,
        yarnType: yarnTypeId,
        yarnsubtype: yarnSubtypeId,
        color: colorId,
        shadeNumber: shadeNumber,
        tearweight: tearweight,
      });

      console.log('[EditBrandPage] Yarn detail updated with catalog and matched supplier data', {
        index,
        catalogYarnName: effectiveYarnName,
        colorId,
        shadeNumber,
        tearweight,
      });
    },
    [updateYarnDetail, yarnCatalogMap, originalSupplierData, formData.yarnDetails],
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
    setFormData((prev) => {
      const updatedDetails = prev.yarnDetails.filter((_, idx) => idx !== index);
      const nextTotalPages = Math.max(1, Math.ceil(updatedDetails.length / yarnDetailsPerPage));

      setYarnDetailsPage((currentPage) => Math.min(currentPage, nextTotalPages));

      return {
        ...prev,
        yarnDetails: updatedDetails,
      };
    });
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
      const hasYarnName = detail.yarnName.trim();
      const selectedCatalog = detail.yarnCatalogId?.trim() ? yarnCatalogMap[detail.yarnCatalogId] : undefined;
      const hasNameFromCatalog = selectedCatalog?.yarnName?.trim();
      if (!hasYarnName && !hasNameFromCatalog) {
        toast.error('Yarn name is required for each yarn detail');
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
    console.log('[EditBrandPage] Handle Submit clicked', { formData });
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
              const yarnName = detail.yarnName.trim() || yarnCatalogMap[detail.yarnCatalogId]?.yarnName?.trim() || '';
              const normalizedDetail: SupplierYarnDetail = {
                yarnName,
                color: detail.color,
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
          : [],
      };

      console.log('[Update Brand] Payload:', payload);

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

  // Filter yarn details with original indices
  const filteredYarnDetails = useMemo(() => {
    return formData.yarnDetails
      .map((detail, originalIndex) => ({ detail, originalIndex }))
      .filter(({ detail }) => {
        const selectedCatalog = detail.yarnCatalogId ? yarnCatalogMap[detail.yarnCatalogId] : undefined;
        const displayYarnName = selectedCatalog?.yarnName || detail.yarnName || '';
        
        // Filter by Yarn Name
        if (filterYarnName.trim()) {
          const yarnNameMatch = displayYarnName.toLowerCase().includes(filterYarnName.toLowerCase().trim());
          if (!yarnNameMatch) return false;
        }
        
        // Filter by Color
        if (filterColor.trim()) {
          const selectedColor = detail.color ? yarnColorOptions.find((color) => color.id === detail.color) : undefined;
          const colorName = selectedColor?.name || '';
          const colorMatch = colorName.toLowerCase().includes(filterColor.toLowerCase().trim());
          if (!colorMatch) return false;
        }
        
        // Filter by Shade Number
        if (filterShade.trim()) {
          const shadeMatch = detail.shadeNumber.toLowerCase().includes(filterShade.toLowerCase().trim());
          if (!shadeMatch) return false;
        }
        
        // Filter by Tear Weight
        if (filterTearWeight.trim()) {
          const tearWeightMatch = detail.tearweight.toLowerCase().includes(filterTearWeight.toLowerCase().trim());
          if (!tearWeightMatch) return false;
        }
        
        return true;
      });
  }, [formData.yarnDetails, filterYarnName, filterColor, filterShade, filterTearWeight, yarnCatalogMap, yarnColorOptions]);

  // Pagination for yarn details (using filtered results)
  const paginatedYarnDetails = useMemo(() => {
    const startIndex = (yarnDetailsPage - 1) * yarnDetailsPerPage;
    const endIndex = startIndex + yarnDetailsPerPage;
    return filteredYarnDetails.slice(startIndex, endIndex);
  }, [filteredYarnDetails, yarnDetailsPage, yarnDetailsPerPage]);

  const totalYarnDetailsPages = Math.ceil(filteredYarnDetails.length / yarnDetailsPerPage);

  const handleYarnDetailsPageChange = (newPage: number) => {
    setYarnDetailsPage(newPage);
  };

  const handleYarnDetailsPerPageChange = (newPerPage: number) => {
    setYarnDetailsPerPage(newPerPage);
    setYarnDetailsPage(1); // Reset to first page when changing items per page
  };

  // Reset pagination when filters change
  useEffect(() => {
    setYarnDetailsPage(1);
  }, [filterYarnName, filterColor, filterShade, filterTearWeight]);

  // Clear all filters
  const clearFilters = () => {
    setFilterYarnName('');
    setFilterColor('');
    setFilterShade('');
    setFilterTearWeight('');
  };

  // Check if any filter is active
  const hasActiveFilters = filterYarnName.trim() || filterColor.trim() || filterShade.trim() || filterTearWeight.trim();

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
                    <div className="flex items-center gap-4">
                      <h2 className="text-lg font-semibold">Yarn Details</h2>
                      {formData.yarnDetails.length > 0 && (
                        <span className="text-sm text-gray-500">
                          {hasActiveFilters ? (
                            <>
                              ({filteredYarnDetails.length} of {formData.yarnDetails.length} {formData.yarnDetails.length === 1 ? 'entry' : 'entries'})
                            </>
                          ) : (
                            <>
                              ({formData.yarnDetails.length} {formData.yarnDetails.length === 1 ? 'entry' : 'entries'})
                            </>
                          )}
                        </span>
                      )}
                    </div>
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
                    <>
                      {/* Filters Section */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <i className="ri-filter-line"></i>
                            Filters
                          </h3>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                            >
                              <i className="ri-close-line"></i>
                              Clear Filters
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Yarn Name Filter */}
                          <div>
                            <label className="form-label text-xs text-gray-600 mb-1">Yarn Name</label>
                            <input
                              type="text"
                              value={filterYarnName}
                              onChange={(e) => setFilterYarnName(e.target.value)}
                              className="form-control form-control-sm"
                              placeholder="Search yarn name..."
                            />
                          </div>
                          
                          {/* Color Filter */}
                          <div>
                            <label className="form-label text-xs text-gray-600 mb-1">Color</label>
                            <input
                              type="text"
                              value={filterColor}
                              onChange={(e) => setFilterColor(e.target.value)}
                              className="form-control form-control-sm"
                              placeholder="Search color..."
                            />
                          </div>
                          
                          {/* Shade Number Filter */}
                          <div>
                            <label className="form-label text-xs text-gray-600 mb-1">Shade Number</label>
                            <input
                              type="text"
                              value={filterShade}
                              onChange={(e) => setFilterShade(e.target.value)}
                              className="form-control form-control-sm"
                              placeholder="Search shade..."
                            />
                          </div>
                          
                          {/* Tear Weight Filter */}
                          <div>
                            <label className="form-label text-xs text-gray-600 mb-1">Tear Weight</label>
                            <input
                              type="text"
                              value={filterTearWeight}
                              onChange={(e) => setFilterTearWeight(e.target.value)}
                              className="form-control form-control-sm"
                              placeholder="Search tear weight..."
                            />
                          </div>
                        </div>
                        {hasActiveFilters && (
                          <div className="text-xs text-gray-600 pt-2 border-t border-gray-200">
                            Showing {filteredYarnDetails.length} of {formData.yarnDetails.length} entries
                          </div>
                        )}
                      </div>

                      {/* Pagination Controls - Top */}
                      {filteredYarnDetails.length > yarnDetailsPerPage && (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Items per page:</label>
                            <select
                              value={yarnDetailsPerPage}
                              onChange={(e) => handleYarnDetailsPerPageChange(Number(e.target.value))}
                              className="form-select form-select-sm w-20"
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              Page {yarnDetailsPage} of {totalYarnDetailsPages} 
                              (Showing {filteredYarnDetails.length === 0 ? 0 : ((yarnDetailsPage - 1) * yarnDetailsPerPage) + 1} - {Math.min(yarnDetailsPage * yarnDetailsPerPage, filteredYarnDetails.length)} of {filteredYarnDetails.length})
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleYarnDetailsPageChange(yarnDetailsPage - 1)}
                                disabled={yarnDetailsPage === 1}
                                className="ti-btn ti-btn-light"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                onClick={() => handleYarnDetailsPageChange(yarnDetailsPage + 1)}
                                disabled={yarnDetailsPage >= totalYarnDetailsPages}
                                className="ti-btn ti-btn-light"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Yarn Details Table */}
                      {filteredYarnDetails.length === 0 ? (
                        <div className="text-center py-8 border border-gray-200 rounded-lg bg-gray-50">
                          <div className="text-gray-400 mb-2">
                            <i className="ri-search-line text-3xl"></i>
                          </div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">No Results Found</h3>
                          <p className="text-xs text-gray-500">
                            {hasActiveFilters 
                              ? 'No yarn details match your filter criteria. Try adjusting your filters.'
                              : 'No yarn details available.'}
                          </p>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              onClick={clearFilters}
                              className="mt-3 text-xs text-primary hover:text-primary-dark"
                            >
                              Clear Filters
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Yarn Name
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Color
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Shade Number
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Tear Weight
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {paginatedYarnDetails.map(({ detail, originalIndex }, displayIndex) => {
                              const selectedCatalog = detail.yarnCatalogId ? yarnCatalogMap[detail.yarnCatalogId] : undefined;

                              return (
                                <tr key={`yarn-detail-${originalIndex}`}>
                                  <td className="px-4 py-3 align-top">
                                    <div className="flex flex-col gap-1">
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-light justify-between w-full"
                                        onClick={() => !isLoadingOptions && yarnCatalogOptions.length > 0 && openYarnNameModal(originalIndex)}
                                        disabled={isLoadingOptions || yarnCatalogOptions.length === 0}
                                      >
                                        <span className="truncate text-left">
                                          {selectedCatalog?.yarnName || detail.yarnName || 'Select yarn name'}
                                        </span>
                                        <i className="ri-edit-line ms-2 text-sm"></i>
                                      </button>
                                      {detail.yarnName && !detail.yarnCatalogId && (
                                        <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                                          Current: {detail.yarnName}
                                        </span>
                                      )}
                                      {detail.yarnCatalogId && !selectedCatalog && (
                                        <span className="text-xs text-red-600">
                                          Selected yarn name is unavailable. Please choose another option.
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <select
                                      value={detail.color}
                                      onChange={(e) => handleYarnDetailChange(originalIndex, 'color', e.target.value)}
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
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="text"
                                      value={detail.shadeNumber}
                                      onChange={(e) => handleYarnDetailChange(originalIndex, 'shadeNumber', e.target.value)}
                                      className="form-control"
                                      placeholder="Enter shade number"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <input
                                      type="text"
                                      value={detail.tearweight}
                                      onChange={(e) => handleYarnDetailChange(originalIndex, 'tearweight', e.target.value)}
                                      className="form-control"
                                      placeholder="Enter tear weight"
                                    />
                                  </td>
                                  <td className="px-4 py-3 align-top">
                                    <div className="flex items-center gap-2 flex-nowrap">
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-outline-primary px-2 py-2"
                                        onClick={() => !isLoadingOptions && openYarnNameModal(originalIndex)}
                                        disabled={isLoadingOptions}
                                        aria-label="Edit yarn"
                                        title="Edit yarn"
                                      >
                                        <i className="ri-edit-line"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className="ti-btn ti-btn-danger px-2 py-2"
                                        onClick={() => removeYarnDetail(originalIndex)}
                                        aria-label="Delete yarn"
                                        title="Delete yarn"
                                      >
                                        <i className="ri-delete-bin-line"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Controls - Bottom */}
                      {filteredYarnDetails.length > yarnDetailsPerPage && (
                        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600">Items per page:</label>
                            <select
                              value={yarnDetailsPerPage}
                              onChange={(e) => handleYarnDetailsPerPageChange(Number(e.target.value))}
                              className="form-select form-select-sm w-20"
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">
                              Page {yarnDetailsPage} of {totalYarnDetailsPages} 
                              (Showing {filteredYarnDetails.length === 0 ? 0 : ((yarnDetailsPage - 1) * yarnDetailsPerPage) + 1} - {Math.min(yarnDetailsPage * yarnDetailsPerPage, filteredYarnDetails.length)} of {filteredYarnDetails.length})
                            </span>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleYarnDetailsPageChange(yarnDetailsPage - 1)}
                                disabled={yarnDetailsPage === 1}
                                className="ti-btn ti-btn-light"
                              >
                                Previous
                              </button>
                              <button
                                type="button"
                                onClick={() => handleYarnDetailsPageChange(yarnDetailsPage + 1)}
                                disabled={yarnDetailsPage >= totalYarnDetailsPages}
                                className="ti-btn ti-btn-light"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
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

export default EditBrandPage;

