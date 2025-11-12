"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import supplierService, {
  BulkImportSupplierPayload,
  BulkImportSuppliersRequest,
  Supplier,
  SupplierListResponse,
  SupplierQueryParams,
  SupplierYarnDetail,
  SupplierYarnReference,
} from '@/shared/services/supplierService';
import yarnTypeService, { YarnType } from '@/shared/services/yarnTypeService';
import yarnColorService, { YarnColor } from '@/shared/services/yarnColorService';
import * as XLSX from 'xlsx';

const BrandPage = () => {
  const [brands, setBrands] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Supplier['status']>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [yarnTypeMap, setYarnTypeMap] = useState<Record<string, string>>({});
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, string>>({});
  const [yarnColorMap, setYarnColorMap] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const getYarnTypeLabel = (yarnType: SupplierYarnDetail['yarnType']) => {
    if (!yarnType) return 'Unknown type';
    if (typeof yarnType === 'string') {
      return yarnTypeMap[yarnType] || yarnType;
    }
    if (typeof yarnType === 'object') {
      if (yarnType.name) {
        return yarnType.name;
      }
      if (yarnType.id) {
        return yarnTypeMap[yarnType.id] || yarnType.id;
      }
    }
    return 'Unknown type';
  };

  const getYarnColorLabel = (color: SupplierYarnDetail['color']) => {
    if (!color) return 'Unknown color';
    if (typeof color === 'string') {
      return yarnColorMap[color] || color;
    }
    if (typeof color === 'object') {
      if (color.name) {
        return color.name;
      }
      if (color.id) {
        return yarnColorMap[color.id] || color.id;
      }
    }
    return 'Unknown color';
  };

  const getYarnSubtypeLabel = (subtype: SupplierYarnDetail['yarnsubtype']) => {
    if (!subtype) return '';
    if (typeof subtype === 'string') {
      return yarnSubtypeMap[subtype] || subtype;
    }
    if (typeof subtype === 'object') {
      if ('name' in subtype && subtype.name) return subtype.name;
      if ('id' in subtype && subtype.id) return yarnSubtypeMap[subtype.id] || subtype.id;
      return yarnSubtypeMap[(subtype as { _id?: string })._id || ''] || '';
    }
    return '';
  };

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [typesResponse, colorsResponse] = await Promise.all([
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 1000, page: 1 }),
        ]);

        const typeEntries = (typesResponse.results || []).map((type: YarnType) => [type.id, type.name]);
        const subtypeEntries = (typesResponse.results || []).flatMap((type: YarnType) => {
          if (!type.details || type.details.length === 0) {
            return [];
          }
          return type.details
            .map((detail) => {
              const subtypeId = detail.id || detail._id;
              if (!subtypeId) return null;
              return [subtypeId, detail.subtype] as const;
            })
            .filter(Boolean) as Array<readonly [string, string]>;
        });
        const colorEntries = (colorsResponse.results || []).map((color: YarnColor) => [color.id, color.name]);

        setYarnTypeMap(Object.fromEntries(typeEntries));
        setYarnSubtypeMap(Object.fromEntries(subtypeEntries));
        setYarnColorMap(Object.fromEntries(colorEntries));
      } catch (error) {
        console.error('Error loading yarn metadata:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load yarn metadata');
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    fetchBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, itemsPerPage, searchQuery, statusFilter]);

  const fetchBrands = async () => {
    setIsLoading(true);
    try {
      const params: SupplierQueryParams = {
        page: currentPage,
        limit: itemsPerPage,
      };

      if (searchQuery.trim()) {
        params.brandName = searchQuery.trim();
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const data: SupplierListResponse = await supplierService.getSuppliers(params);
      setBrands(data.results || []);
      setTotalPages(data.totalPages || 1);
      setTotalResults(data.totalResults || 0);
      setSelectedBrands([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch brands');
      setBrands([]);
      setTotalPages(1);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  type BrandImportRow = {
    ID?: string;
    Brand?: string;
    'Brand Name'?: string;
    'Contact Person'?: string;
    'Contact Number'?: string;
    Email?: string;
    Address?: string;
    City?: string;
    State?: string;
    Pincode?: string;
    Country?: string;
    'GST No'?: string;
    Status?: string;
    'Yarn Type ID'?: string;
    'Yarn Subtype ID'?: string;
    'Color ID'?: string;
    'Shade Number'?: string;
    'Tear Weight'?: string;
    'Batch Size'?: string | number;
  };

  const handleDownloadTemplate = () => {
    try {
      const workbook = XLSX.utils.book_new();

      const suppliersSheet = XLSX.utils.json_to_sheet([
        {
          ID: '',
          Brand: 'Premier Threads',
          'Contact Person': 'John Doe',
          'Contact Number': '+91-9876543210',
          Email: 'john@example.com',
          Address: '123 Textile Park',
          City: 'Coimbatore',
          State: 'Tamil Nadu',
          Pincode: '641001',
          Country: 'India',
          'GST No': '29ABCDE1234F2Z5',
          Status: 'active',
          'Yarn Type ID': '65f1a2b3c4d5e6f7g8h9i0a1',
          'Yarn Subtype ID': '65f1a2b3c4d5e6f7g8h9i0a2',
          'Color ID': '65f1a2b3c4d5e6f7g8h9i0a3',
          'Shade Number': 'Shade-21',
          'Tear Weight': '100',
          'Batch Size': '50 (optional, read from first row)',
        },
        {
          ID: '',
          Brand: 'Premier Threads',
          'Contact Person': 'John Doe',
          'Contact Number': '+91-9876543210',
          Email: 'john@example.com',
          Address: '123 Textile Park',
          City: 'Coimbatore',
          State: 'Tamil Nadu',
          Pincode: '641001',
          Country: 'India',
          'GST No': '29ABCDE1234F2Z5',
          Status: 'active',
          'Yarn Type ID': '65f1a2b3c4d5e6f7g8h9i0b1',
          'Yarn Subtype ID': '65f1a2b3c4d5e6f7g8h9i0b2',
          'Color ID': '65f1a2b3c4d5e6f7g8h9i0b3',
          'Shade Number': 'Shade-45',
          'Tear Weight': '150',
        },
      ]);

      XLSX.utils.book_append_sheet(workbook, suppliersSheet, 'Suppliers');
      workbook.SheetNames = ['Suppliers'];

      XLSX.writeFile(workbook, 'yarn-suppliers-template.xlsx');
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading brand template:', error);
      toast.error('Failed to download template');
    }
  };

  const handleImportClick = () => {
    if (isImporting) return;
    fileInputRef.current?.click();
  };

  const buildSubtypeMaps = (types: YarnType[]) => {
    const subtypeById = new Map<
      string,
      { id: string; name: string; parentTypeId: string }
    >();
    const subtypeByTypeAndName = new Map<string, { id: string; name: string }>();

    types.forEach(type => {
      (type.details || []).forEach(detail => {
        const subtypeId = detail.id || detail._id;
        if (!subtypeId || !detail.subtype) return;

        const entry = { id: subtypeId, name: detail.subtype, parentTypeId: type.id };
        subtypeById.set(subtypeId, entry);
        subtypeByTypeAndName.set(`${type.id}|${detail.subtype.trim().toLowerCase()}`, entry);
      });
    });

    return { subtypeById, subtypeByTypeAndName };
  };

  const handleExport = async () => {
    try {
      const [brandResponse, typesResponse, colorsResponse] = await Promise.all([
        supplierService.getSuppliers({ page: 1, limit: 10000 }),
        yarnTypeService.getTypes({ page: 1, limit: 10000 }),
        yarnColorService.getColors({ page: 1, limit: 10000 }),
      ]);

      const allBrands = brandResponse.results || [];
      const exportSource =
        selectedBrands.length > 0 ? allBrands.filter(brand => selectedBrands.includes(brand.id)) : allBrands;

      if (exportSource.length === 0) {
        toast.error('No brands available for export');
        return;
      }

      const types = typesResponse.results || [];
      const colors = colorsResponse.results || [];

      const typeNameToId = new Map(
        types
          .filter(type => type?.name && type?.id)
          .map(type => [type.name.trim().toLowerCase(), type.id] as const),
      );
      const colorNameToId = new Map(
        colors
          .filter(color => color?.name && color?.id)
          .map(color => [color.name.trim().toLowerCase(), color.id] as const),
      );

      const { subtypeById, subtypeByTypeAndName } = buildSubtypeMaps(types);
      const subtypeNameToId = new Map(
        Array.from(subtypeById.values()).map(entry => [entry.name.trim().toLowerCase(), entry.id] as const),
      );

      const normalizeReferenceId = (
        value: string | SupplierYarnReference | undefined,
        fallback?: Map<string, string>,
      ) => {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (value.id) return value.id;
        const candidate = (value as { _id?: string })._id;
        if (candidate) return candidate;
        const name = value.name?.trim().toLowerCase();
        if (name && fallback) {
          return fallback.get(name) || '';
        }
        return '';
      };

      const sheetData = exportSource.flatMap(brand => {
        const baseRow = {
          ID: brand.id,
          Brand: brand.brandName,
          'Contact Person': brand.contactPersonName,
          'Contact Number': brand.contactNumber,
          Email: brand.email,
          Address: brand.address,
          City: brand.city,
          State: brand.state,
          Pincode: brand.pincode,
          Country: brand.country,
          'GST No': brand.gstNo || '',
          Status: brand.status,
        };

        if (!brand.yarnDetails || brand.yarnDetails.length === 0) {
          return [
            {
              ...baseRow,
              'Yarn Type ID': '',
              'Yarn Subtype ID': '',
              'Color ID': '',
              'Shade Number': '',
              'Tear Weight': '',
              'Batch Size': '',
            },
          ];
        }

        return brand.yarnDetails.map(detail => {
          let yarnTypeId = normalizeReferenceId(detail.yarnType, typeNameToId);
          const yarnTypeName =
            typeof detail.yarnType === 'object' ? detail.yarnType?.name?.trim().toLowerCase() : '';
          if (!yarnTypeId && yarnTypeName) {
            yarnTypeId = typeNameToId.get(yarnTypeName) || '';
          }

          let yarnSubtypeId = normalizeReferenceId(detail.yarnsubtype, subtypeNameToId);
          const yarnSubtypeName =
            typeof detail.yarnsubtype === 'object' ? detail.yarnsubtype?.name?.trim().toLowerCase() : '';
          if ((!yarnSubtypeId || yarnSubtypeId === '') && yarnSubtypeName && yarnTypeId) {
            const match = subtypeByTypeAndName.get(`${yarnTypeId}|${yarnSubtypeName}`);
            if (match) {
              yarnSubtypeId = match.id;
            }
          }

          let colorId = normalizeReferenceId(detail.color, colorNameToId);
          const colorName =
            typeof detail.color === 'object' ? detail.color?.name?.trim().toLowerCase() : '';
          if (!colorId && colorName) {
            colorId = colorNameToId.get(colorName) || '';
          }

          const tearweightValue =
            typeof detail.tearweight === 'string'
              ? detail.tearweight
              : typeof detail.tearweight === 'number'
                ? String(detail.tearweight)
                : '';

          return {
            ...baseRow,
            'Yarn Type ID': yarnTypeId,
            'Yarn Subtype ID': yarnSubtypeId,
            'Color ID': colorId,
            'Shade Number': detail.shadeNumber || '',
            'Tear Weight': tearweightValue,
            'Batch Size': '',
          };
        });
      });

      const workbook = XLSX.utils.book_new();
      const suppliersSheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, suppliersSheet, 'Suppliers');
      workbook.SheetNames = ['Suppliers'];

      XLSX.writeFile(workbook, 'yarn-suppliers.xlsx');
      toast.success('Brands exported successfully');
    } catch (error) {
      console.error('Error exporting brands:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export brands');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    const reader = new FileReader();

    reader.onload = async event => {
      try {
        const data = event.target?.result;
        if (!data) {
          throw new Error('Unable to read file');
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        if (workbook.SheetNames.length === 0) {
          throw new Error('Import file is empty');
        }

        const suppliersSheetName =
          workbook.SheetNames.find(name => name.toLowerCase() === 'suppliers') || workbook.SheetNames[0];
        const suppliersSheet = workbook.Sheets[suppliersSheetName];

        const rows = XLSX.utils.sheet_to_json<BrandImportRow>(suppliersSheet, { defval: '' });

        if (rows.length === 0) {
          throw new Error('Suppliers sheet is empty');
        }

        type SupplierAccumulator = {
          supplier: BulkImportSupplierPayload;
          detailKeys: Set<string>;
        };

        const aliasMap = new Map<string, SupplierAccumulator>();
        const accumulators: SupplierAccumulator[] = [];
        const rowErrors: string[] = [];
        let resolvedBatchSize: number | undefined;

        const isRowEmpty = (row: BrandImportRow) =>
          Object.values(row).every(value => `${value ?? ''}`.trim().length === 0);

        for (let index = 0; index < rows.length; index++) {
          const row = rows[index];
          if (isRowEmpty(row)) {
            continue;
          }

          const rowNumber = index + 2;

          const batchSizeRaw = row['Batch Size'];
          if (batchSizeRaw !== undefined && batchSizeRaw !== null && `${batchSizeRaw}`.trim().length > 0) {
            const parsedBatch = Number(`${batchSizeRaw}`.trim());
            if (Number.isNaN(parsedBatch) || parsedBatch < 1 || parsedBatch > 100) {
              rowErrors.push(`Row ${rowNumber}: Batch Size must be a number between 1 and 100`);
            } else if (resolvedBatchSize === undefined) {
              resolvedBatchSize = parsedBatch;
            } else if (resolvedBatchSize !== parsedBatch) {
              rowErrors.push(
                `Row ${rowNumber}: Batch Size must match previously defined value (${resolvedBatchSize})`,
              );
            }
          }

          const rawId = row.ID?.toString().trim() ?? '';
          const rawBrandName =
            row.Brand?.toString().trim() ?? row['Brand Name']?.toString().trim() ?? '';
          if (!rawBrandName) {
            rowErrors.push(`Row ${rowNumber}: Brand name is required`);
            if (rows.length > 0) {
              setImportProgress(Math.round(((index + 1) / rows.length) * 60));
            }
            continue;
          }

          const idKey = rawId ? `id:${rawId}` : null;
          const nameKey = `name:${rawBrandName.toLowerCase()}`;

          let accumulator: SupplierAccumulator | undefined;
          if (idKey) {
            accumulator = aliasMap.get(idKey);
          }
          if (!accumulator) {
            accumulator = aliasMap.get(nameKey);
          }

          const contactPerson = row['Contact Person']?.toString().trim() ?? '';
          const contactNumber = row['Contact Number']?.toString().trim() ?? '';
          const emailRaw = row.Email?.toString().trim() ?? '';
          const address = row.Address?.toString().trim() ?? '';
          const city = row.City?.toString().trim() ?? '';
          const state = row.State?.toString().trim() ?? '';
          const pincode = row.Pincode?.toString().trim() ?? '';
          const country = row.Country?.toString().trim() ?? '';
          const gstNo = row['GST No']?.toString().trim() ?? '';
          const statusRaw = row.Status?.toString().trim().toLowerCase() ?? 'active';
          const status: Supplier['status'] =
            statusRaw === 'inactive'
              ? 'inactive'
              : statusRaw === 'suspended'
              ? 'suspended'
              : 'active';

          const brandIssues: string[] = [];

          const requireField = (value: string, label: string) => {
            if (!value) {
              brandIssues.push(`${label} is required`);
            }
          };

          if (!accumulator) {
            requireField(contactPerson, 'Contact person');
            requireField(contactNumber, 'Contact number');
            requireField(emailRaw, 'Email');
            requireField(address, 'Address');
            requireField(city, 'City');
            requireField(state, 'State');
            requireField(pincode, 'Pincode');
            requireField(country, 'Country');
          }

          if (brandIssues.length > 0) {
            rowErrors.push(`Row ${rowNumber}: ${brandIssues.join(', ')}`);
            if (rows.length > 0) {
              setImportProgress(Math.round(((index + 1) / rows.length) * 60));
            }
            continue;
          }

          if (!accumulator) {
            const supplierEntry: BulkImportSupplierPayload = {
              brandName: rawBrandName,
              contactPersonName: contactPerson,
              contactNumber,
              email: emailRaw.toLowerCase(),
              address,
              city,
              state,
              pincode,
              country,
              status,
              ...(gstNo ? { gstNo } : {}),
              ...(rawId ? { id: rawId } : {}),
              yarnDetails: [],
            };

            accumulator = {
              supplier: supplierEntry,
              detailKeys: new Set<string>(),
            };

            accumulators.push(accumulator);
            aliasMap.set(nameKey, accumulator);
            if (idKey) {
              aliasMap.set(idKey, accumulator);
            }
          } else {
            const supplier = accumulator.supplier;
            const updateFieldIfMissing = (
              key: keyof BulkImportSupplierPayload,
              value: string,
              label: string,
              transform?: (input: string) => string,
            ) => {
              if (!value) return;
              const existing = supplier[key];
              const normalizedValue = transform ? transform(value) : value;
              if (!existing) {
                (supplier as unknown as Record<string, unknown>)[key as string] = normalizedValue;
              } else if (
                typeof existing === 'string' &&
                existing.trim().toLowerCase() !== normalizedValue.trim().toLowerCase()
              ) {
                rowErrors.push(`Row ${rowNumber}: Conflicting value for ${label}`);
              }
            };

            updateFieldIfMissing('contactPersonName', contactPerson, 'Contact person');
            updateFieldIfMissing('contactNumber', contactNumber, 'Contact number');
            updateFieldIfMissing('email', emailRaw, 'Email', value => value.toLowerCase());
            updateFieldIfMissing('address', address, 'Address');
            updateFieldIfMissing('city', city, 'City');
            updateFieldIfMissing('state', state, 'State');
            updateFieldIfMissing('pincode', pincode, 'Pincode');
            updateFieldIfMissing('country', country, 'Country');
            if (gstNo) {
              updateFieldIfMissing('gstNo', gstNo, 'GST No');
            }
            if (supplier.status !== status) {
              rowErrors.push(`Row ${rowNumber}: Conflicting value for Status`);
            }
            if (rawId && !supplier.id) {
              supplier.id = rawId;
              aliasMap.set(`id:${rawId}`, accumulator);
            } else if (rawId && supplier.id && supplier.id !== rawId) {
              rowErrors.push(`Row ${rowNumber}: Conflicting supplier ID detected`);
            }
          }

          const errorsBeforeDetails = rowErrors.length;

          const yarnTypeId = row['Yarn Type ID']?.toString().trim() ?? '';
          const yarnSubtypeId = row['Yarn Subtype ID']?.toString().trim() ?? '';
          const colorId = row['Color ID']?.toString().trim() ?? '';
          const shadeNumber = row['Shade Number']?.toString().trim() ?? '';
          const tearweight = row['Tear Weight']?.toString().trim() ?? '';
          const hasDetailFields = [yarnTypeId, yarnSubtypeId, colorId, shadeNumber, tearweight].some(field => field.length > 0);

          if (hasDetailFields) {
            const detailIssues: string[] = [];
            if (!yarnTypeId) {
              detailIssues.push('Yarn Type ID is required when yarn details are provided');
            }
            if (!colorId) {
              detailIssues.push('Color ID is required when yarn details are provided');
            }

            if (detailIssues.length > 0) {
              rowErrors.push(`Row ${rowNumber}: ${detailIssues.join(', ')}`);
            } else if (rowErrors.length === errorsBeforeDetails) {
              const detailKey = `${yarnTypeId}|${yarnSubtypeId || ''}|${colorId}|${shadeNumber || ''}|${tearweight || ''}`;
              if (!accumulator.detailKeys.has(detailKey)) {
                const detailPayload: SupplierYarnDetail = {
                  yarnType: yarnTypeId,
                  color: colorId,
                };
                if (yarnSubtypeId) {
                  detailPayload.yarnsubtype = yarnSubtypeId;
                }
                if (shadeNumber) {
                  detailPayload.shadeNumber = shadeNumber;
                }
                if (tearweight) {
                  detailPayload.tearweight = tearweight;
                }

                accumulator.detailKeys.add(detailKey);
                if (!accumulator.supplier.yarnDetails) {
                  accumulator.supplier.yarnDetails = [];
                }
                accumulator.supplier.yarnDetails.push(detailPayload);
              }
            }
          }

          if (rows.length > 0) {
            setImportProgress(Math.round(((index + 1) / rows.length) * 60));
          }
        }

        if (accumulators.length === 0) {
          throw new Error('No valid suppliers found in the import file');
        }

        if (rowErrors.length > 0) {
          throw new Error(rowErrors.join(' | '));
        }

        const suppliersPayload = accumulators.map(({ supplier }) => {
          const payloadSupplier: BulkImportSupplierPayload = {
            ...supplier,
          };

          if (!payloadSupplier.yarnDetails || payloadSupplier.yarnDetails.length === 0) {
            delete (payloadSupplier as { yarnDetails?: SupplierYarnDetail[] }).yarnDetails;
          }

          return payloadSupplier;
        });

        const payload: BulkImportSuppliersRequest = {
          suppliers: suppliersPayload,
          ...(resolvedBatchSize ? { batchSize: resolvedBatchSize } : {}),
        };

        setImportProgress(85);
        await supplierService.bulkImportSuppliers(payload);

        setImportProgress(100);
        await fetchBrands();
        toast.success('Brands imported successfully');
      } catch (error) {
        console.error('Error processing brand import file:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to process import file');
      } finally {
        setImportProgress(null);
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read import file');
      setImportProgress(null);
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDelete = async (brandId: string) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;

    setIsDeleting(true);
    setDeleteId(brandId);
    try {
      await supplierService.deleteSupplier(brandId);
      toast.success('Brand deleted successfully');
      await fetchBrands();
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete brand');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(brands.map((brand) => brand.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBrandSelect = (brandId: string) => {
    if (selectedBrands.includes(brandId)) {
      setSelectedBrands(selectedBrands.filter((id) => id !== brandId));
    } else {
      setSelectedBrands([...selectedBrands, brandId]);
    }
  };

  const pagination = useMemo(() => {
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
  }, [currentPage, totalPages]);

  return (
    <div className="main-content">
      <Toaster position="top-right" />
      <Seo title="Yarn Brands" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <h1 className="box-title text-2xl font-semibold">Yarn Brands</h1>
              <div className="box-tools flex items-center space-x-2">
                <button
                  type="button"
                  className="ti-btn ti-btn-secondary"
                  onClick={handleDownloadTemplate}
                >
                  <i className="ri-download-line me-2"></i> Download Template
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="ti-btn ti-btn-success"
                  onClick={handleImportClick}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Importing...
                    </>
                  ) : (
                    <>
                      <i className="ri-file-excel-2-line me-2"></i> Import
                    </>
                  )}
                </button>
                <button type="button" className="ti-btn ti-btn-info" onClick={handleExport}>
                  <i className="ri-download-2-line me-2"></i> Export
                </button>
                <Link href="/yarn-management/yarn-master/brand/add" className="ti-btn ti-btn-primary">
                  <i className="ri-add-line me-2"></i> Add Brand
                </Link>
              </div>
            </div>
          </div>

          <div className="box">
            <div className="box-body">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Rows per page:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Status:</label>
                  <select
                    className="form-select w-auto text-sm"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value as typeof statusFilter);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>

                <div className="relative w-full max-w-xs">
                  <input
                    type="text"
                    className="form-control py-3 pr-10"
                    placeholder="Search brands..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                  <button className="absolute end-0 top-0 px-4 h-full">
                    <i className="ri-search-line text-lg"></i>
                  </button>
                </div>
              </div>

              {importProgress !== null && (
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-200"
                    style={{ width: `${importProgress}%` }}
                  ></div>
                  <div className="text-xs text-gray-600 mt-1 text-right">Importing... {importProgress}%</div>
                </div>
              )}

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-xl font-medium mb-2">No Brands Found</h3>
                  <p className="text-gray-500 mb-6">Start by adding your first brand.</p>
                  <Link href="/yarn-management/yarn-master/brand/add" className="ti-btn ti-btn-primary">
                    <i className="ri-add-line me-2"></i> Add First Brand
                  </Link>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap table-bordered min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th scope="col" className="!text-start">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectAll}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th scope="col" className="text-start">Brand</th>
                          <th scope="col" className="text-start">Contact Person</th>
                          <th scope="col" className="text-start">Contact Info</th>
                          <th scope="col" className="text-start">Yarn Details</th>
                          <th scope="col" className="text-start">Status</th>
                          <th scope="col" className="text-start">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brands.map((brand, index) => (
                          <tr
                            key={brand.id}
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-gray-50' : ''}`}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedBrands.includes(brand.id)}
                                onChange={() => handleBrandSelect(brand.id)}
                              />
                            </td>
                            <td className="align-top">
                              <div className="font-semibold">{brand.brandName}</div>
                              <div className="text-xs text-gray-500 mt-1">{brand.address}</div>
                              {(brand.city || brand.state) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {[brand.city, brand.state].filter(Boolean).join(', ')}
                                </div>
                              )}
                              {brand.pincode ? (
                                <div className="text-xs text-gray-500 mt-1">Pincode: {brand.pincode}</div>
                              ) : null}
                              {brand.country ? (
                                <div className="text-xs text-gray-500 mt-1">Country: {brand.country}</div>
                              ) : null}
                              {brand.gstNo ? (
                                <div className="text-xs text-gray-500 mt-1">GST: {brand.gstNo}</div>
                              ) : null}
                            </td>
                            <td className="align-top">
                              <div>{brand.contactPersonName}</div>
                            </td>
                            <td className="align-top">
                              <div className="text-sm">{brand.contactNumber}</div>
                              <div className="text-xs text-primary break-all">{brand.email}</div>
                            </td>
                            <td className="align-top">
                              {brand.yarnDetails && brand.yarnDetails.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {brand.yarnDetails.map((detail, detailIndex) => {
                                    const yarnTypeLabel = getYarnTypeLabel(detail.yarnType);
                                    const yarnColorLabel = getYarnColorLabel(detail.color);
                                    const yarnSubtypeLabel = getYarnSubtypeLabel(detail.yarnsubtype);
                                    const shadeLabel =
                                      typeof detail.shadeNumber === 'string' && detail.shadeNumber.trim().length > 0
                                        ? detail.shadeNumber
                                        : 'N/A';
                                    const tearweightLabel =
                                      typeof detail.tearweight === 'string' && detail.tearweight.trim().length > 0
                                        ? detail.tearweight
                                        : typeof detail.tearweight === 'number'
                                          ? String(detail.tearweight)
                                          : 'N/A';
                                    return (
                                      <div
                                        key={`${brand.id}-yarn-${detailIndex}`}
                                        className="px-2 py-1 rounded bg-primary/10 text-primary text-xs"
                                      >
                                <span className="font-semibold">{yarnTypeLabel}</span>
                                        {yarnSubtypeLabel ? (
                                  <>
                                    <span className="mx-2">•</span>
                                            <span>{yarnSubtypeLabel}</span>
                                  </>
                                ) : null}
                                <span className="mx-2">•</span>
                                <span>{yarnColorLabel}</span>
                                {shadeLabel !== 'N/A' ? (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>{shadeLabel}</span>
                                  </>
                                ) : null}
                                {tearweightLabel !== 'N/A' ? (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>TW: {tearweightLabel}</span>
                                  </>
                                ) : null}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">No yarn details provided</span>
                              )}
                            </td>
                            <td className="align-top">
                              <span
                                className={`badge ${
                                  brand.status === 'active'
                                    ? 'bg-success'
                                    : brand.status === 'inactive'
                                    ? 'bg-warning text-white'
                                    : 'bg-danger'
                                }`}
                              >
                                {brand.status}
                              </span>
                            </td>
                            <td className="align-top">
                              <div className="flex space-x-2">
                                <Link
                                  href={`/yarn-management/yarn-master/brand/edit/${brand.id}`}
                                  className="ti-btn ti-btn-primary ti-btn-sm"
                                >
                                  <i className="ri-edit-line"></i>
                                </Link>
                                <button
                                  className="ti-btn ti-btn-danger ti-btn-sm"
                                  onClick={() => handleDelete(brand.id)}
                                  disabled={isDeleting && deleteId === brand.id}
                                >
                                  {isDeleting && deleteId === brand.id ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                  ) : (
                                    <i className="ri-delete-bin-line"></i>
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <div className="text-sm text-gray-500">
                      Showing {totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, totalResults)} of {totalResults} entries
                    </div>
                    <nav aria-label="Page navigation">
                      <ul className="flex flex-wrap items-center">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {pagination.map((page, idx) =>
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
                                      currentPage === page
                                        ? 'bg-primary text-white hover:bg-primary-dark'
                                        : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                    }`}
                                    onClick={() => setCurrentPage(Number(page))}
                                  >
                                    {page}
                                  </button>
                                </li>
                              ),
                        )}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button
                            className="page-link py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandPage;

