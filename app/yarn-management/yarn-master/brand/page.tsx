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
import yarnCatalogService, { YarnCatalog } from '@/shared/services/yarnCatalogService';
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
  const [yarnColorMap, setYarnColorMap] = useState<Record<string, string>>({});
  const [yarnCatalogById, setYarnCatalogById] = useState<Record<string, YarnCatalog>>({});
  const [yarnCatalogByTypeSubtype, setYarnCatalogByTypeSubtype] = useState<Record<string, YarnCatalog[]>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<number | null>(null);
  const [importErrors, setImportErrors] = useState<Array<{
    index: number;
    brandName?: string;
    email?: string;
    error: string;
  }>>([]);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    successRate: string;
  } | null>(null);

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

  const normalizeYarnReferenceId = (
    reference: SupplierYarnDetail['yarnType'] | SupplierYarnDetail['yarnsubtype'],
  ) => {
    if (!reference) return '';
    if (typeof reference === 'string') {
      return reference;
    }
    return reference.id || (reference as { _id?: string })._id || '';
  };

  const getYarnCatalogLabel = (detail: SupplierYarnDetail) => {
    if (!detail) return '';

    if (detail.yarnCatalog && typeof detail.yarnCatalog === 'string') {
      const catalog = yarnCatalogById[detail.yarnCatalog];
      return catalog?.yarnName || detail.yarnCatalog;
    }

    if (detail.yarnCatalog && typeof detail.yarnCatalog === 'object') {
      const catalogId = detail.yarnCatalog.id || (detail.yarnCatalog as { _id?: string })._id;
      if (catalogId) {
        const catalog = yarnCatalogById[catalogId];
        if (catalog?.yarnName) {
          return catalog.yarnName;
        }
      }
      const directName =
        (detail.yarnCatalog as { yarnName?: string }).yarnName ||
        (detail.yarnCatalog as { name?: string }).name;
      if (typeof directName === 'string' && directName.trim().length > 0) {
        return directName;
      }
    }

    if (detail.yarnCatalogId) {
      const catalog = yarnCatalogById[detail.yarnCatalogId];
      if (catalog?.yarnName) {
        return catalog.yarnName;
      }
    }

    if (typeof detail.yarn === 'string' && detail.yarn.trim().length > 0) {
      return detail.yarn;
    }

    const typeId = normalizeYarnReferenceId(detail.yarnType);
    if (!typeId) {
      return '';
    }

    const subtypeId = normalizeYarnReferenceId(detail.yarnsubtype);
    const key = `${typeId}|${subtypeId || ''}`;
    const candidates = yarnCatalogByTypeSubtype[key];
    if (candidates && candidates.length > 0) {
      return candidates[0].yarnName;
    }

    return '';
  };

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [typesResponse, colorsResponse, catalogResponse] = await Promise.all([
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnColorService.getColors({ status: 'active', limit: 1000, page: 1 }),
          yarnCatalogService.getYarnCatalogs({ status: 'active', limit: 1000, page: 1 }),
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
        const catalogResults = catalogResponse.results || [];
        const normalizedCatalogs: YarnCatalog[] = [];
        catalogResults.forEach((catalog) => {
          const normalizedCatalogId = (catalog.id as string) || (catalog as { _id?: string })._id || '';
          const rawType = catalog.yarnType;

          if (!rawType) {
            console.warn('[BrandPage] Yarn catalog missing yarnType', catalog);
            return;
          }

          const normalizedTypeId = rawType.id || (rawType as { _id?: string })._id || '';
          if (!normalizedCatalogId || !normalizedTypeId) {
            console.warn('[BrandPage] Yarn catalog missing id/_id', catalog);
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

        const catalogByIdEntries = activeCatalogs.map((catalog) => [catalog.id, catalog] as const);
        const catalogByTypeSubtypeEntries = activeCatalogs.reduce<Record<string, YarnCatalog[]>>((acc, catalog) => {
          const typeId = catalog.yarnType?.id;
          if (!typeId) {
            return acc;
          }
          const subtypeId = catalog.yarnSubtype?.id ?? '';
          const key = `${typeId}|${subtypeId}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(catalog);
          return acc;
        }, {});

        setYarnTypeMap(Object.fromEntries(typeEntries));
        setYarnColorMap(Object.fromEntries(colorEntries));
        setYarnCatalogById(Object.fromEntries(catalogByIdEntries));
        setYarnCatalogByTypeSubtype(catalogByTypeSubtypeEntries);

        console.debug('[BrandPage] Loaded yarn metadata', {
          typeCount: typeEntries.length,
          subtypeCount: subtypeEntries.length,
          colorCount: colorEntries.length,
          catalogCount: activeCatalogs.length,
        });
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

  // Debug effect to track error state changes
  useEffect(() => {
    if (importErrors.length > 0) {
      console.log('[Brand Import] Errors state updated:', importErrors);
    }
  }, [importErrors]);

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
    'Yarn Name'?: string;
    'Color ID'?: string;
    'Shade Number'?: string;
    'Tear Weight'?: string;
    'Yarn Name 1'?: string;
    'Color ID 1'?: string;
    'Shade Number 1'?: string;
    'Tear Weight 1'?: string;
    'Yarn Name 2'?: string;
    'Color ID 2'?: string;
    'Shade Number 2'?: string;
    'Tear Weight 2'?: string;
    'Yarn Name 3'?: string;
    'Color ID 3'?: string;
    'Shade Number 3'?: string;
    'Tear Weight 3'?: string;
    'Yarn Name 4'?: string;
    'Color ID 4'?: string;
    'Shade Number 4'?: string;
    'Tear Weight 4'?: string;
    'Yarn Name 5'?: string;
    'Color ID 5'?: string;
    'Shade Number 5'?: string;
    'Tear Weight 5'?: string;
    'Yarn Name 6'?: string;
    'Color ID 6'?: string;
    'Shade Number 6'?: string;
    'Tear Weight 6'?: string;
    'Yarn Name 7'?: string;
    'Color ID 7'?: string;
    'Shade Number 7'?: string;
    'Tear Weight 7'?: string;
    'Yarn Name 8'?: string;
    'Color ID 8'?: string;
    'Shade Number 8'?: string;
    'Tear Weight 8'?: string;
    'Yarn Name 9'?: string;
    'Color ID 9'?: string;
    'Shade Number 9'?: string;
    'Tear Weight 9'?: string;
    'Yarn Name 10'?: string;
    'Color ID 10'?: string;
    'Shade Number 10'?: string;
    'Tear Weight 10'?: string;
    'Batch Size'?: string | number;
    [key: string]: string | number | undefined;
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
          'Yarn Name 1': 'Cotton 40s',
          'Color ID 1': '65f1a2b3c4d5e6f7g8h9i0a3',
          'Shade Number 1': 'Shade-21',
          'Tear Weight 1': '100',
          'Yarn Name 2': 'Polyester 60s',
          'Color ID 2': '65f1a2b3c4d5e6f7g8h9i0b3',
          'Shade Number 2': 'Shade-45',
          'Tear Weight 2': '150',
          'Yarn Name 3': 'Silk 80s',
          'Color ID 3': '65f1a2b3c4d5e6f7g8h9i0c3',
          'Shade Number 3': 'Shade-78',
          'Tear Weight 3': '200',
          'Batch Size': '50 (optional)',
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


  const handleExport = async () => {
    try {
      const [brandResponse, colorsResponse] = await Promise.all([
        supplierService.getSuppliers({ page: 1, limit: 10000 }),
        yarnColorService.getColors({ page: 1, limit: 10000 }),
      ]);

      const allBrands = brandResponse.results || [];
      const exportSource =
        selectedBrands.length > 0 ? allBrands.filter(brand => selectedBrands.includes(brand.id)) : allBrands;

      if (exportSource.length === 0) {
        toast.error('No brands available for export');
        return;
      }

      const colors = colorsResponse.results || [];

      const colorNameToId = new Map(
        colors
          .filter(color => color?.name && color?.id)
          .map(color => [color.name.trim().toLowerCase(), color.id] as const),
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

      const sheetData = exportSource.map(brand => {
        const baseRow: Record<string, string> = {
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

        // Add yarn details as numbered columns (unlimited)
        if (brand.yarnDetails && brand.yarnDetails.length > 0) {
          for (let i = 0; i < brand.yarnDetails.length; i++) {
            const detail = brand.yarnDetails[i];
            const index = i + 1;
            
            const yarnName = detail.yarnName || getYarnCatalogLabel(detail) || '';
            
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

            baseRow[`Yarn Name ${index}`] = yarnName;
            baseRow[`Color ID ${index}`] = colorId;
            baseRow[`Shade Number ${index}`] = detail.shadeNumber || '';
            baseRow[`Tear Weight ${index}`] = tearweightValue;
          }
        }

        return baseRow;
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
    setImportErrors([]);
    setImportSummary(null);

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

          // Process numbered yarn detail columns (Yarn Name 1, Color ID 1, etc.)
          const processYarnDetails = () => {
            const details: Array<{ yarnName: string; colorId: string; shadeNumber: string; tearweight: string; index: number }> = [];

            // Dynamically find all numbered columns by scanning row keys
            const yarnNamePattern = /^Yarn Name (\d+)$/i;
            const foundIndices = new Set<number>();

            // First, find all yarn name columns to determine which indices exist
            Object.keys(row).forEach((key) => {
              const match = key.match(yarnNamePattern);
              if (match) {
                const index = parseInt(match[1], 10);
                if (!isNaN(index) && index > 0) {
                  foundIndices.add(index);
                }
              }
            });

            // Process all found indices
            const sortedIndices = Array.from(foundIndices).sort((a, b) => a - b);
            for (const index of sortedIndices) {
              const yarnName = row[`Yarn Name ${index}` as keyof BrandImportRow]?.toString().trim() ?? '';
              const colorId = row[`Color ID ${index}` as keyof BrandImportRow]?.toString().trim() ?? '';
              const shadeNumber = row[`Shade Number ${index}` as keyof BrandImportRow]?.toString().trim() ?? '';
              const tearweight = row[`Tear Weight ${index}` as keyof BrandImportRow]?.toString().trim() ?? '';

              // If at least yarn name or color is provided, consider it a detail entry
              if (yarnName || colorId) {
                details.push({ yarnName, colorId, shadeNumber, tearweight, index });
              }
            }

            // Fallback to old format (Yarn Name, Color ID, etc.) for backward compatibility
            if (details.length === 0) {
              const yarnName = row['Yarn Name']?.toString().trim() ?? '';
              const colorId = row['Color ID']?.toString().trim() ?? '';
              const shadeNumber = row['Shade Number']?.toString().trim() ?? '';
              const tearweight = row['Tear Weight']?.toString().trim() ?? '';

              if (yarnName || colorId) {
                details.push({ yarnName, colorId, shadeNumber, tearweight, index: 1 });
              }
            }

            // Sort by index to maintain order
            return details.sort((a, b) => a.index - b.index).map(({ index, ...rest }) => rest);
          };

          const yarnDetails = processYarnDetails();

          if (yarnDetails.length > 0) {
            for (const detail of yarnDetails) {
              const detailIssues: string[] = [];
              if (!detail.yarnName) {
                detailIssues.push('Yarn Name is required when yarn details are provided');
              }
              if (!detail.colorId) {
                detailIssues.push('Color ID is required when yarn details are provided');
              }

              if (detailIssues.length > 0) {
                rowErrors.push(`Row ${rowNumber}: ${detailIssues.join(', ')}`);
              } else if (rowErrors.length === errorsBeforeDetails) {
                const detailKey = `${detail.yarnName}|${detail.colorId}|${detail.shadeNumber || ''}|${detail.tearweight || ''}`;
                if (!accumulator.detailKeys.has(detailKey)) {
                  const detailPayload: SupplierYarnDetail = {
                    yarnName: detail.yarnName,
                    color: detail.colorId,
                  };
                  if (detail.shadeNumber) {
                    detailPayload.shadeNumber = detail.shadeNumber;
                  }
                  if (detail.tearweight) {
                    detailPayload.tearweight = detail.tearweight;
                  }

                  accumulator.detailKeys.add(detailKey);
                  if (!accumulator.supplier.yarnDetails) {
                    accumulator.supplier.yarnDetails = [];
                  }
                  accumulator.supplier.yarnDetails.push(detailPayload);
                }
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
        const response = await supplierService.bulkImportSuppliers(payload);
        
        // Handle response with errors - do this BEFORE setting progress to 100
        // Extract errors from response - backend returns 200 OK with error details
        const responseData = response as any;
        
        // Log the raw response first to understand its structure
        console.log('[Brand Import] Raw Response Type:', typeof response);
        console.log('[Brand Import] Raw Response:', response);
        console.log('[Brand Import] Response Keys:', Object.keys(response || {}));
        console.log('[Brand Import] Response Data:', responseData);
        console.log('[Brand Import] Response Data Keys:', Object.keys(responseData || {}));
        
        // Try multiple ways to extract errors - be very thorough
        let errors: any[] = [];
        if (responseData?.details?.errors && Array.isArray(responseData.details.errors)) {
          errors = responseData.details.errors;
          console.log('[Brand Import] Found errors in responseData.details.errors');
        } else if (response?.details?.errors && Array.isArray(response.details.errors)) {
          errors = response.details.errors;
          console.log('[Brand Import] Found errors in response.details.errors');
        } else if (responseData?.errors && Array.isArray(responseData.errors)) {
          errors = responseData.errors;
          console.log('[Brand Import] Found errors in responseData.errors');
        } else if (response?.errors && Array.isArray(response.errors)) {
          errors = response.errors;
          console.log('[Brand Import] Found errors in response.errors');
        } else if (responseData?.data?.details?.errors && Array.isArray(responseData.data.details.errors)) {
          errors = responseData.data.details.errors;
          console.log('[Brand Import] Found errors in responseData.data.details.errors');
        } else if (responseData?.data?.errors && Array.isArray(responseData.data.errors)) {
          errors = responseData.data.errors;
          console.log('[Brand Import] Found errors in responseData.data.errors');
        } else {
          console.log('[Brand Import] No errors array found in response');
          // Try to find any error-like structures
          if (responseData?.details) {
            console.log('[Brand Import] responseData.details:', responseData.details);
          }
          if (responseData?.data) {
            console.log('[Brand Import] responseData.data:', responseData.data);
          }
        }
        
        // Extract summary
        const summary = responseData?.summary || response?.summary || responseData?.data?.summary;

        console.log('[Brand Import] Extracted errors:', errors);
        console.log('[Brand Import] Errors length:', errors.length);
        console.log('[Brand Import] Extracted summary:', summary);

        // Always set summary if available
        if (summary) {
          setImportSummary({
            total: summary.total || 0,
            created: summary.created || 0,
            updated: summary.updated || 0,
            failed: summary.failed || 0,
            successRate: summary.successRate || '0%',
          });
        } else {
          // Clear summary if not present
          setImportSummary(null);
        }

        // Process and set errors FIRST - be very thorough in mapping
        // This ensures errors are set before progress reaches 100, so the progress bar can show error state
        if (errors && Array.isArray(errors) && errors.length > 0) {
          const mappedErrors = errors.map((err: any, idx: number) => {
            // Extract error message from different possible formats
            let errorMessage = 'Unknown error';
            if (typeof err === 'string') {
              errorMessage = err;
            } else if (err?.error) {
              errorMessage = err.error;
            } else if (err?.message) {
              errorMessage = err.message;
            } else if (err?.errorMessage) {
              errorMessage = err.errorMessage;
            } else if (err?.msg) {
              errorMessage = err.msg;
            }
            
            return {
              index: err.index !== undefined ? err.index : idx,
              brandName: err.brandName || err.brand || err.name || '',
              email: err.email || err.emailAddress || '',
              error: errorMessage,
            };
          });
          
          console.log('[Brand Import] Mapped errors to display:', mappedErrors);
          console.log('[Brand Import] Setting importErrors state with', mappedErrors.length, 'errors');
          
          // Set errors state FIRST, before setting progress to 100
          setImportErrors(mappedErrors);
          
          // Now set progress to 100 - errors are already set, so progress bar will show error state
          setImportProgress(100);

          // Show appropriate toast message based on results
          if (summary) {
            const successCount = (summary.created || 0) + (summary.updated || 0);
            const failedCount = summary.failed || 0;
            if (successCount > 0) {
              toast.success(
                `Import completed: ${successCount} successful, ${failedCount} failed. See errors below.`,
                { duration: 6000, icon: '⚠️' }
              );
            } else {
              toast.error(
                `Import failed: All ${failedCount} item(s) failed. See errors below.`,
                { duration: 6000 }
              );
            }
          } else {
            toast.error(
              `Import completed with ${errors.length} error(s). See errors below.`,
              { duration: 6000 }
            );
          }
        } else {
          // No errors array found - check summary for failures
          console.log('[Brand Import] No errors array found, checking summary');
          if (summary && summary.failed > 0) {
            // If summary shows failures but no errors array, create a generic error
            console.log('[Brand Import] Summary shows failures but no errors array');
            setImportErrors([{
              index: 0,
              brandName: '',
              email: '',
              error: `${summary.failed} item(s) failed during import. Please check the backend logs for details.`,
            }]);
            // Set progress to 100 after setting errors
            setImportProgress(100);
            toast.error(
              `Import completed with ${summary.failed} failed item(s).`,
              { duration: 6000 }
            );
          } else {
            // No errors - clear error state and set progress to 100
            console.log('[Brand Import] No errors found, clearing error state');
            setImportErrors([]);
            setImportProgress(100);
            if (summary && summary.failed === 0) {
              toast.success(response.message || responseData?.message || 'Brands imported successfully');
            } else {
              toast.success(response.message || responseData?.message || 'Brands imported successfully');
            }
          }
        }

        // Refresh the list after a short delay to ensure state is updated
        // But only if there are no errors, or wait longer if there are errors
        const hasErrors = errors && Array.isArray(errors) && errors.length > 0;
        await new Promise(resolve => setTimeout(resolve, hasErrors ? 500 : 100));
        await fetchBrands();
        
        // Keep progress bar visible for a moment to show completion, then clear it
        // But keep errors visible - errors persist until user dismisses them
        setTimeout(() => {
          setImportProgress(null);
          // Double-check errors are still set after state updates
          if (hasErrors) {
            console.log('[Brand Import] Progress cleared, but errors should still be visible');
          }
        }, 2000);
      } catch (error) {
        console.error('[Brand Import] Error processing brand import file:', error);
        
        // Try to extract errors from the error object if it's a response error
        let extractedErrors: any[] = [];
        if (error && typeof error === 'object') {
          const errorObj = error as any;
          if (errorObj.response) {
            const response = errorObj.response;
            if (response.data?.details?.errors) {
              extractedErrors = response.data.details.errors;
            } else if (response.data?.errors) {
              extractedErrors = response.data.errors;
            } else if (response.details?.errors) {
              extractedErrors = response.details.errors;
            }
          } else if (errorObj.details?.errors) {
            extractedErrors = errorObj.details.errors;
          } else if (errorObj.errors) {
            extractedErrors = errorObj.errors;
          }
        }
        
        if (extractedErrors.length > 0) {
          const mappedErrors = extractedErrors.map((err: any, idx: number) => ({
            index: err.index !== undefined ? err.index : idx,
            brandName: err.brandName || err.brand || '',
            email: err.email || '',
            error: err.error || err.message || 'Unknown error',
          }));
          console.log('[Brand Import] Extracted errors from catch block:', mappedErrors);
          setImportErrors(mappedErrors);
        } else {
          setImportErrors([]);
        }
        
        setImportSummary(null);
        toast.error(error instanceof Error ? error.message : 'Failed to process import file');
        setImportProgress(null);
      } finally {
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
                    className={`h-3 rounded-full transition-all duration-200 ${
                      importProgress === 100 && importErrors.length > 0 
                        ? 'bg-danger' 
                        : 'bg-primary'
                    }`}
                    style={{ width: `${importProgress}%` }}
                  ></div>
                  <div className={`text-xs mt-1 text-right ${
                    importProgress === 100 && importErrors.length > 0 
                      ? 'text-danger font-semibold' 
                      : 'text-gray-600'
                  }`}>
                    {importProgress === 100 
                      ? (importErrors.length > 0 
                          ? `Import completed with ${importErrors.length} error(s)` 
                          : 'Import completed')
                      : `Importing... ${importProgress}%`
                    }
                  </div>
                </div>
              )}

              {(importSummary || (importErrors && importErrors.length > 0)) && (
                <div className="mb-4">
                  {importSummary && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-blue-900">Import Summary</h3>
                        <button
                          type="button"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                          onClick={() => {
                            setImportSummary(null);
                            setImportErrors([]);
                          }}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Total:</span>
                          <span className="ml-2 font-semibold">{importSummary.total}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Created:</span>
                          <span className="ml-2 font-semibold text-success">{importSummary.created}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Updated:</span>
                          <span className="ml-2 font-semibold text-info">{importSummary.updated}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Failed:</span>
                          <span className="ml-2 font-semibold text-danger">{importSummary.failed}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Success Rate:</span>
                          <span className="ml-2 font-semibold">{importSummary.successRate}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {importErrors && importErrors.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-bold text-red-900 flex items-center gap-2">
                          <i className="ri-error-warning-fill text-red-600"></i>
                          Import Errors ({importErrors.length})
                        </h3>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 text-sm"
                          onClick={() => {
                            setImportErrors([]);
                            setImportSummary(null);
                          }}
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {importErrors.map((err, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-red-200 rounded p-3 text-sm"
                            >
                              <div className="flex items-start gap-2">
                                <i className="ri-error-warning-line text-red-500 mt-0.5"></i>
                                <div className="flex-1">
                                  <div className="font-medium text-red-900 mb-1">
                                    {err.brandName ? `Brand: ${err.brandName}` : `Item #${err.index + 1}`}
                                    {err.email && (
                                      <span className="text-gray-600 ml-2">({err.email})</span>
                                    )}
                                  </div>
                                  <div className="text-red-700">
                                    {err.error.includes('Yarn catalog not found') || err.error.includes('yarnName:') ? (
                                      <span>
                                        <strong className="font-semibold">Yarn Catalog Not Found:</strong>{' '}
                                        {err.error.includes('yarnName:') 
                                          ? `The yarn "${err.error.match(/yarnName:\s*(.+?)(?:\s|$)/)?.[1] || err.error.split('yarnName:')[1]?.trim() || 'unknown'}" does not exist in the catalog. Please add this yarn to the catalog first.`
                                          : err.error
                                        }
                                      </span>
                                    ) : (
                                      <span className="whitespace-pre-wrap">{err.error}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
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

