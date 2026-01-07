"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";
import supplierService, { Supplier, SupplierYarnDetail } from "@/shared/services/supplierService";
import yarnTypeService, { YarnType } from "@/shared/services/yarnTypeService";
import yarnCountSizeService, { CountSize } from "@/shared/services/yarnCountSizeService";
import yarnCatalogService, { YarnCatalog, YarnCatalogQueryParams } from "@/shared/services/yarnCatalogService";

export type PurchaseOrderStatus = 
  | 'submitted to supplier' 
  | 'in transit' 
  | 'delivered' 
  | 'rejected' 
  | 'QC pending' 
  | 'partially delivered' 
  | 'stocked'
  | 'goods received'
  | 'goods partially received'
  | 'PO accepted'
  | 'PO accepted partially'
  | 'po_accepted';

export interface YarnPurchaseItem {
  id: string;
  yarnName: string;
  yarnId?: string;
  yarnTypeId?: string;
  yarnSubtypeId?: string;
  sizeCount: string;
  sizeCountName?: string;
  shadeCode: string;
  rate: number;
  qty: number;
  estimatedDeliveryDate: string;
  gst: number;
  subTotal: number;
  selectedYarnDetail?: SupplierYarnDetail; // Store the full yarn detail for count sizes
  selectedCatalog?: YarnCatalog;
}

export interface PurchaseOrderData {
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  items: YarnPurchaseItem[];
  subTotal: number;
  totalGst: number;
  total: number;
  status: PurchaseOrderStatus;
  notes?: string;
}

interface PurchaseFormProps {
  initialData?: Partial<PurchaseOrderData>;
  onSubmit: (data: PurchaseOrderData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

interface SupplierCatalogOption {
  id: string;
  displayName: string;
  searchableText: string;
  shadeCode?: string;
  catalog: YarnCatalog;
  supplierDetail: SupplierYarnDetail;
  metadataSummary?: string;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Submit to Supplier"
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierYarnDetails, setSupplierYarnDetails] = useState<SupplierYarnDetail[]>([]);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, { id: string; name: string; countSizes: string[] }[]>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [supplierCatalogOptions, setSupplierCatalogOptions] = useState<SupplierCatalogOption[]>([]);
  const [isLoadingCatalogOptions, setIsLoadingCatalogOptions] = useState(false);
  const supplierYarnDetailsRef = useRef<SupplierYarnDetail[]>([]);
  const supplierCatalogOptionsRef = useRef<SupplierCatalogOption[]>([]);
  const lastCatalogSupplierIdRef = useRef<string | null>(null);
  
  const [formData, setFormData] = useState<PurchaseOrderData>({
    purchaseDate: initialData.purchaseDate || new Date().toISOString().split('T')[0],
    supplierId: initialData.supplierId || "",
    supplierName: initialData.supplierName || "",
    items: initialData.items || [],
    subTotal: initialData.subTotal || 0,
    totalGst: initialData.totalGst || 0,
    total: initialData.total || 0,
    status: initialData.status || 'submitted to supplier',
    notes: initialData.notes || ""
  });

  // Autocomplete state
  const [autocompleteStates, setAutocompleteStates] = useState<Record<string, {
    query: string;
    suggestions: SupplierCatalogOption[];
    showSuggestions: boolean;
  }>>({});

  const autocompleteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    supplierYarnDetailsRef.current = supplierYarnDetails;
  }, [supplierYarnDetails]);

  useEffect(() => {
    supplierCatalogOptionsRef.current = supplierCatalogOptions;
  }, [supplierCatalogOptions]);

  const extractIdFromValue = useCallback((value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value;
    if (typeof value === "number") return String(value);
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      if (typeof obj._id === "string") return obj._id;
      if (typeof obj.id === "string") return obj.id;
      if (typeof obj._id === "number") return String(obj._id);
      if (typeof obj.id === "number") return String(obj.id);
    }
    return undefined;
  }, []);

  const extractCountSizeOptionsFromDetail = useCallback((detail: SupplierYarnDetail): Array<{ id: string; name: string }> => {
    const subtype = detail?.yarnsubtype;
    if (typeof subtype === "object" && subtype !== null) {
      const countSizeArray = (subtype as any)?.countSize;
      if (Array.isArray(countSizeArray)) {
        return countSizeArray
          .map((entry: unknown) => {
            if (!entry) return null;
            const id = extractIdFromValue(entry);
            if (!id) return null;
            if (typeof entry === "string") {
              return { id, name: entry };
            }
            if (typeof entry === "object") {
              const entryObj = entry as Record<string, unknown>;
              const name =
                typeof entryObj.name === "string" ? entryObj.name :
                typeof entryObj.label === "string" ? entryObj.label :
                undefined;
              return { id, name: name || id };
            }
            return null;
          })
          .filter((value): value is { id: string; name: string } => Boolean(value));
      }
    }
    return [];
  }, [extractIdFromValue]);

  const normalizeText = (value: unknown): string | undefined => {
    if (!value) return undefined;
    if (typeof value === "string") return value.trim().toLowerCase();
    if (typeof value === "number") return String(value).trim().toLowerCase();
    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const possibleKeys = ["name", "subtype", "label", "title"];
      for (const key of possibleKeys) {
        const text = obj[key];
        if (typeof text === "string" && text.trim()) {
          return text.trim().toLowerCase();
        }
      }
    }
    return undefined;
  };

  const doesCatalogFieldMatchDetail = useCallback((
    catalogField: unknown,
    detailField: unknown,
    additionalCatalogKeys: string[] = [],
    context?: { field: string; detailId?: string; catalogId?: string }
  ): boolean => {
    if (!catalogField || !detailField) {
      console.log("[PurchaseForm] Field comparison skipped (missing data)", {
        field: context?.field,
        catalogValue: catalogField,
        detailValue: detailField,
      });
      return false;
    }

    const catalogId = extractIdFromValue(catalogField);
    const detailId = extractIdFromValue(detailField);
    if (catalogId && detailId && catalogId === detailId) {
      console.log("[PurchaseForm] Field match by id", {
        field: context?.field,
        catalogId,
        detailId,
      });
      return true;
    }

    const catalogName = normalizeText(catalogField);
    const detailName = normalizeText(detailField);
    if (catalogName && detailName && catalogName === detailName) {
      console.log("[PurchaseForm] Field match by name", {
        field: context?.field,
        catalogName,
        detailName,
      });
      return true;
    }

    if (typeof catalogField === "object" && additionalCatalogKeys.length > 0) {
      const catalogObj = catalogField as Record<string, unknown>;
      for (const key of additionalCatalogKeys) {
        const catalogValue = catalogObj[key];
        const catalogValueNormalized = normalizeText(catalogValue);
        if (catalogValueNormalized && detailName && catalogValueNormalized === detailName) {
          console.log("[PurchaseForm] Field match via additional key", {
            field: context?.field,
            catalogKey: key,
            catalogValue: catalogValueNormalized,
            detailName,
          });
          return true;
        }
      }
    }

    console.log("[PurchaseForm] Field mismatch", {
      field: context?.field,
      catalogValue: catalogField,
      detailValue: detailField,
      catalogId,
      detailId,
    });

    return false;
  }, [extractIdFromValue]);

  const findSupplierDetailForCatalog = useCallback((
    catalog: YarnCatalog,
    detailsOverride?: SupplierYarnDetail[]
  ): SupplierYarnDetail | undefined => {
    const detailsPool = detailsOverride ?? supplierYarnDetailsRef.current;
    if (!catalog || !detailsPool || detailsPool.length === 0) {
      return undefined;
    }

    const catalogNameNormalized = normalizeText(catalog?.yarnName);

    const selectWithColorPreference = (candidates: SupplierYarnDetail[]) => {
      if (!candidates || candidates.length === 0) return undefined;

      if (catalog?.colorFamily) {
        const colorMatched = candidates.find((detail) =>
          doesCatalogFieldMatchDetail(
            catalog?.colorFamily,
            detail?.color,
            [],
            { field: "colorFamily" }
          )
        );
        if (colorMatched) {
          return colorMatched;
        }
      }

      return candidates[0];
    };

    const catalogLinkedDetail = detailsPool.find((detail) => {
      const detailCatalogId =
        extractIdFromValue((detail as any)?.yarnCatalog) ||
        extractIdFromValue(detail?.yarnCatalogId);
      return detailCatalogId && String(detailCatalogId) === String(catalog.id);
    });

    if (catalogLinkedDetail) {
      console.log("[PurchaseForm] Supplier detail matched by catalog id link", {
        catalogId: catalog.id,
        catalogName: catalog.yarnName,
        matchedDetail: {
          yarnType: catalogLinkedDetail?.yarnType,
          yarnsubtype: catalogLinkedDetail?.yarnsubtype,
          color: catalogLinkedDetail?.color,
          shadeNumber: catalogLinkedDetail?.shadeNumber,
        },
      });
      return catalogLinkedDetail;
    }

    const nameMatchedDetails = detailsPool.filter((detail) => {
      const detailName = normalizeText(
        (detail as any)?.yarnName ||
        (detail as any)?.yarn ||
        (detail as any)?.name
      );

      if (!catalogNameNormalized || !detailName || detailName !== catalogNameNormalized) {
        return false;
      }

      const typeMatches = doesCatalogFieldMatchDetail(
        catalog?.yarnType,
        detail?.yarnType,
        [],
        { field: "yarnType" }
      );
      if (!typeMatches) {
        return false;
      }

      if (catalog?.yarnSubtype && detail?.yarnsubtype) {
        const subtypeMatches = doesCatalogFieldMatchDetail(
          catalog?.yarnSubtype,
          detail?.yarnsubtype,
          ["subtype"],
          { field: "yarnSubtype" }
        );
        if (!subtypeMatches) {
          return false;
        }
      }

      return true;
    });

    if (nameMatchedDetails.length > 0) {
      const chosenByName = selectWithColorPreference(nameMatchedDetails);
      if (chosenByName) {
        console.log("[PurchaseForm] Supplier detail matched by yarn name", {
          catalogId: catalog.id,
          catalogName: catalog.yarnName,
          matchedDetail: {
            yarnType: chosenByName?.yarnType,
            yarnsubtype: chosenByName?.yarnsubtype,
            color: chosenByName?.color,
            shadeNumber: chosenByName?.shadeNumber,
          },
          candidates: nameMatchedDetails.length,
        });
        return chosenByName;
      }
    }

    const matchingDetails = detailsPool.filter((detail, detailIndex) => {
      console.log("[PurchaseForm] Evaluating supplier detail", {
        catalogId: catalog.id,
        catalogName: catalog.yarnName,
        detailIndex,
        detailType: detail?.yarnType,
        detailSubtype: detail?.yarnsubtype,
        detailColor: detail?.color,
      });

      const typeMatches = doesCatalogFieldMatchDetail(
        catalog?.yarnType,
        detail?.yarnType,
        [],
        { field: "yarnType" }
      );
      if (!typeMatches) {
        return false;
      }

      if (catalog?.yarnSubtype && detail?.yarnsubtype) {
        const subtypeMatches = doesCatalogFieldMatchDetail(
          catalog?.yarnSubtype,
          detail?.yarnsubtype,
          ["subtype"],
          { field: "yarnSubtype" }
        );
        if (!subtypeMatches) {
          return false;
        }
      }

      return true;
    });

    if (matchingDetails.length === 0) {
      return undefined;
    }

    const chosenDetail = selectWithColorPreference(matchingDetails);

    console.log("[PurchaseForm] Supplier detail matched with catalog", {
      catalogId: catalog.id,
      catalogName: catalog.yarnName,
      matchedDetail: {
        yarnType: chosenDetail?.yarnType,
        yarnsubtype: chosenDetail?.yarnsubtype,
        color: chosenDetail?.color,
        shadeNumber: chosenDetail?.shadeNumber,
      },
      matchType: catalog?.colorFamily ? "type/subtype/color" : "type/subtype",
      totalCandidates: matchingDetails.length,
    });

    return chosenDetail;
  }, [doesCatalogFieldMatchDetail]);

  const buildSupplierCatalogOptions = useCallback(async (supplier: Supplier, force = false) => {
    if (!supplier || !supplier.id) {
      console.warn("[PurchaseForm] buildSupplierCatalogOptions: missing supplier id", { supplier });
      lastCatalogSupplierIdRef.current = null;
      setSupplierCatalogOptions([]);
      setIsLoadingCatalogOptions(false);
      return;
    }

    const supplierId = supplier.id;

    if (
      !force &&
      lastCatalogSupplierIdRef.current === supplierId &&
      supplierCatalogOptionsRef.current.length > 0
    ) {
      console.log("[PurchaseForm] buildSupplierCatalogOptions:using cached data", {
        supplierId,
        optionsCount: supplierCatalogOptionsRef.current.length,
      });
      return;
    }

    const yarnDetails = supplier?.yarnDetails || [];
    console.log("[PurchaseForm] buildSupplierCatalogOptions:start", {
      supplierId,
      supplierName: supplier.brandName,
      yarnDetailsCount: yarnDetails.length,
    });

    if (yarnDetails.length === 0) {
      console.warn("[PurchaseForm] buildSupplierCatalogOptions: supplier has no yarn details", {
        supplierId,
      });
      setSupplierCatalogOptions([]);
      setIsLoadingCatalogOptions(false);
      lastCatalogSupplierIdRef.current = supplierId;
      return;
    }

    setIsLoadingCatalogOptions(true);

    try {
      const catalogResponse = await yarnCatalogService.getYarnCatalogs({
        status: "active",
        limit: 1000,
        page: 1,
      });

      const allCatalogs = catalogResponse.results || [];
      console.log("[PurchaseForm] buildSupplierCatalogOptions:catalogFetch", {
        totalCatalogsReceived: allCatalogs.length,
        sampleCatalogs: allCatalogs.slice(0, 5).map(catalog => ({
          id: catalog.id,
          yarnName: catalog.yarnName,
          yarnType: catalog.yarnType?.name,
          yarnSubtype: catalog.yarnSubtype?.name,
          color: catalog.colorFamily?.name,
        })),
      });

      const seenPairKeys = new Set<string>();
      const aggregatedOptions: SupplierCatalogOption[] = [];

      allCatalogs.forEach((catalog, catalogIndex) => {
        if (!catalog?.id) {
          console.warn("[PurchaseForm] Catalog skipped due to missing id", { catalogIndex, catalog });
          return;
        }

        const catalogYarnName = typeof catalog?.yarnName === "string" ? catalog.yarnName.trim() : "";
        if (!catalogYarnName) {
          console.warn("[PurchaseForm] Catalog skipped due to missing yarn name", {
            catalogIndex,
            catalogId: catalog.id,
          });
          return;
        }

        const matchedDetail = findSupplierDetailForCatalog(catalog, yarnDetails);
        if (!matchedDetail) {
          console.log("[PurchaseForm] Catalog skipped (no matching supplier detail)", {
            catalogId: catalog.id,
            catalogName: catalog.yarnName,
            yarnType: catalog.yarnType?.name,
            yarnSubtype: catalog.yarnSubtype?.name,
            color: catalog.colorFamily?.name,
          });
          return;
        }

        const pairKey = [
          catalog.id,
          extractIdFromValue(matchedDetail?.yarnType) || "",
          extractIdFromValue(matchedDetail?.yarnsubtype) || "",
          extractIdFromValue(matchedDetail?.color) || "",
          matchedDetail?.shadeNumber || "",
        ].join("|");

        if (seenPairKeys.has(pairKey)) {
          return;
        }
        seenPairKeys.add(pairKey);

        const displayName = catalogYarnName;
        const metadataSummary = [
          typeof catalog?.countSize?.name === "string" ? catalog.countSize.name : undefined,
          typeof catalog?.colorFamily?.name === "string" ? catalog.colorFamily.name : undefined,
          typeof catalog?.yarnType?.name === "string" ? catalog.yarnType.name : undefined,
          typeof (catalog?.yarnSubtype as any)?.name === "string"
            ? (catalog?.yarnSubtype as any).name
            : typeof (catalog?.yarnSubtype as any)?.subtype === "string"
              ? (catalog?.yarnSubtype as any).subtype
              : undefined,
        ]
          .filter(Boolean)
          .join(" • ") || undefined;
        // Use only the supplier detail's shade number; no catalog fallback
        const shadeCode = matchedDetail.shadeNumber;

        const searchableText = [
          displayName,
          typeof catalog?.yarnType?.name === "string" ? catalog.yarnType.name : undefined,
          typeof (catalog?.yarnSubtype as any)?.name === "string"
            ? (catalog?.yarnSubtype as any).name
            : typeof (catalog?.yarnSubtype as any)?.subtype === "string"
              ? (catalog?.yarnSubtype as any).subtype
              : undefined,
          typeof catalog?.countSize?.name === "string" ? catalog.countSize.name : undefined,
          typeof catalog?.colorFamily?.name === "string" ? catalog.colorFamily.name : undefined,
          shadeCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        aggregatedOptions.push({
          id: pairKey,
          catalog,
          supplierDetail: matchedDetail,
          displayName,
          shadeCode: shadeCode || undefined,
          searchableText,
          metadataSummary,
        });
      });

      console.log("[PurchaseForm] buildSupplierCatalogOptions:result", {
        supplierId: supplier.id,
        supplierName: supplier.brandName,
        aggregatedOptionsCount: aggregatedOptions.length,
        optionSamples: aggregatedOptions.slice(0, 5).map(option => ({
          id: option.catalog.id,
          yarnName: option.displayName,
          yarnType: option.catalog?.yarnType?.name,
          yarnSubtype: option.catalog?.yarnSubtype?.name,
          color: option.catalog?.colorFamily?.name,
          shadeCode: option.shadeCode,
        })),
      });

      setSupplierCatalogOptions(aggregatedOptions);
      lastCatalogSupplierIdRef.current = supplierId;
    } catch (error) {
      console.error("[PurchaseForm] Failed to fetch yarn catalog data", error);
      toast.error("Failed to load yarn catalog data");
      setSupplierCatalogOptions([]);
      lastCatalogSupplierIdRef.current = null;
    } finally {
      setIsLoadingCatalogOptions(false);
    }
  }, [extractIdFromValue, findSupplierDetailForCatalog, toast]);

  const filterSupplierCatalogOptions = useCallback((query: string): SupplierCatalogOption[] => {
    if (!query || !query.trim() || supplierCatalogOptions.length === 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const enforceStartsWithOnly = normalizedQuery.length <= 1;

    const rankedMatches = supplierCatalogOptions
      .map((option) => {
        const yarnName = (option.catalog?.yarnName || option.displayName || "").trim().toLowerCase();
        const typeNameRaw = option.catalog?.yarnType?.name;
        const typeName = typeof typeNameRaw === "string" ? typeNameRaw.trim().toLowerCase() : undefined;
        const subtypeNameRaw = option.catalog?.yarnSubtype?.name;
        const subtypeName = typeof subtypeNameRaw === "string" ? subtypeNameRaw.trim().toLowerCase() : undefined;
        const searchable = option.searchableText || "";

        const startsWithYarn = yarnName.startsWith(normalizedQuery);
        const startsWithType = typeName?.startsWith(normalizedQuery) ?? false;
        const startsWithSubtype = subtypeName?.startsWith(normalizedQuery) ?? false;
        const includesYarn = yarnName.includes(normalizedQuery);
        const includesSearchable = searchable.includes(normalizedQuery);

        if (enforceStartsWithOnly) {
          if (!startsWithYarn && !startsWithType && !startsWithSubtype) {
            return null;
          }
        } else if (!startsWithYarn && !startsWithType && !startsWithSubtype && !includesYarn && !includesSearchable) {
          return null;
        }

        let score = 4;
        if (startsWithYarn) {
          score = 0;
        } else if (startsWithType || startsWithSubtype) {
          score = 1;
        } else if (includesYarn) {
          score = 2;
        } else if (includesSearchable) {
          score = 3;
        }

        return { option, score };
      })
      .filter((entry): entry is { option: SupplierCatalogOption; score: number } => Boolean(entry))
      .sort((a, b) => a.score - b.score);

    const seen = new Set<string>();
    const uniqueOrdered: SupplierCatalogOption[] = [];
    rankedMatches.forEach(({ option }) => {
      if (!seen.has(option.id)) {
        seen.add(option.id);
        uniqueOrdered.push(option);
      }
    });

    return uniqueOrdered.slice(0, 10);
  }, [supplierCatalogOptions]);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [suppliersResponse, typesResponse, countSizesResponse] = await Promise.all([
          supplierService.getSuppliers({ status: 'active', limit: 1000, page: 1 }),
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnCountSizeService.getCountSizes({ status: 'active', limit: 1000, page: 1 })
        ]);

        setSuppliers(suppliersResponse.results || []);
        setCountSizes(countSizesResponse.results || []);

        const types = typesResponse.results || [];
        setYarnTypes(types);

        // Build subtype map with count sizes
        const subtypeEntries = types.reduce<Record<string, { id: string; name: string; countSizes: string[] }[]>>((acc, type) => {
          if (type.id && Array.isArray(type.details) && type.details.length > 0) {
            const options = type.details
              .map((detail) => {
                const subtypeId = detail.id || detail._id;
                if (!subtypeId || !detail.subtype) return null;
                
                const countSizeIds: string[] = [];
                if (detail.countSize && Array.isArray(detail.countSize)) {
                  detail.countSize.forEach((cs) => {
                    if (typeof cs === 'string') {
                      countSizeIds.push(cs);
                    } else if (typeof cs === 'object' && cs !== null) {
                      const id = cs.id || cs._id;
                      if (id) countSizeIds.push(id);
                    }
                  });
                }
                
                return { id: subtypeId, name: detail.subtype, countSizes: countSizeIds };
              })
              .filter(Boolean) as { id: string; name: string; countSizes: string[] }[];
            if (options.length > 0) {
              acc[type.id] = options;
            }
          }
          return acc;
        }, {});
        setYarnSubtypeMap(subtypeEntries);

        // Load initial supplier if provided
        if (initialData.supplierId) {
          const supplier = suppliersResponse.results?.find(s => s.id === initialData.supplierId);
          if (supplier) {
            setSelectedSupplier(supplier);
            setSupplierYarnDetails(supplier.yarnDetails || []);
            supplierYarnDetailsRef.current = supplier.yarnDetails || [];
            supplierCatalogOptionsRef.current = [];
            lastCatalogSupplierIdRef.current = null;
            void buildSupplierCatalogOptions(supplier, true);
          }
        }
      } catch (error) {
        console.error('Error loading options:', error);
        toast.error('Failed to load form options');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [buildSupplierCatalogOptions, initialData.supplierId]);

  useEffect(() => {
    if (!selectedSupplier || supplierCatalogOptions.length === 0) {
      return;
    }

    setAutocompleteStates(prevStates => {
      let hasChanges = false;
      const nextStates: typeof prevStates = {};

      Object.entries(prevStates).forEach(([itemId, state]) => {
        if (!state?.query?.trim()) {
          nextStates[itemId] = state;
          return;
        }

        const suggestions = filterSupplierCatalogOptions(state.query);
        const showSuggestions = suggestions.length > 0;

        const prevSuggestions = state.suggestions || [];
        const suggestionsChanged =
          prevSuggestions.length !== suggestions.length ||
          prevSuggestions.some((prevOption, index) => prevOption.id !== suggestions[index]?.id);

        if (suggestionsChanged || state.showSuggestions !== showSuggestions) {
          hasChanges = true;
          nextStates[itemId] = {
            ...state,
            suggestions,
            showSuggestions,
          };
        } else {
          nextStates[itemId] = state;
        }
      });

      return hasChanges ? nextStates : prevStates;
    });
  }, [selectedSupplier, supplierCatalogOptions, filterSupplierCatalogOptions]);

  useEffect(() => {
    // Click outside handler for autocomplete
    const handleClickOutside = (event: MouseEvent) => {
      Object.entries(autocompleteRefs.current).forEach(([itemId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          setAutocompleteStates(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], showSuggestions: false }
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSupplierChange = (supplierId: string) => {
    if (!supplierId) {
      setSelectedSupplier(null);
      setSupplierYarnDetails([]);
      setSupplierCatalogOptions([]);
      supplierYarnDetailsRef.current = [];
      supplierCatalogOptionsRef.current = [];
      lastCatalogSupplierIdRef.current = null;
      setAutocompleteStates({});
      setIsLoadingCatalogOptions(false);
      setFormData(prev => ({
        ...prev,
        supplierId: "",
        supplierName: "",
        items: [],
      }));
      return;
    }

    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setSupplierYarnDetails(supplier.yarnDetails || []);
      setSupplierCatalogOptions([]);
      supplierYarnDetailsRef.current = supplier.yarnDetails || [];
      supplierCatalogOptionsRef.current = [];
      lastCatalogSupplierIdRef.current = null;
      setIsLoadingCatalogOptions(false);
      setFormData(prev => ({
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.brandName,
        items: prev.supplierId && prev.supplierId !== supplier.id ? [] : prev.items,
      }));
      if (!formData.supplierId || formData.supplierId !== supplier.id) {
        setAutocompleteStates({});
      }
      void buildSupplierCatalogOptions(supplier, true);
    }
  };

  const addItem = () => {
    const newItem: YarnPurchaseItem = {
      id: Date.now().toString(),
      yarnName: "",
      yarnId: "",
      sizeCount: "",
      sizeCountName: "",
      shadeCode: "",
      rate: 0,
      qty: 0,
      estimatedDeliveryDate: "",
      gst: 0,
      subTotal: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));

    setAutocompleteStates(prev => ({
      ...prev,
      [newItem.id]: {
        query: "",
        suggestions: [],
        showSuggestions: false
      }
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
    
    const newStates = { ...autocompleteStates };
    delete newStates[itemId];
    setAutocompleteStates(newStates);
  };

  const updateItem = useCallback((itemId: string, updates: Partial<YarnPurchaseItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };

          const baseAmount = updatedItem.rate * updatedItem.qty;
          const gstAmount = (baseAmount * updatedItem.gst) / 100;
          updatedItem.subTotal = baseAmount + gstAmount;

          return updatedItem;
        }
        return item;
      })
    }));
  }, []);

  const handleYarnNameInput = (itemId: string, value: string) => {
    const queryLower = value.toLowerCase().trim();
    const suggestions =
      selectedSupplier && queryLower
        ? filterSupplierCatalogOptions(value)
        : [];

    console.log("[PurchaseForm] handleYarnNameInput", {
      itemId,
      rawValue: value,
      queryLower,
      hasSupplier: Boolean(selectedSupplier),
      supplierName: selectedSupplier?.brandName,
      catalogOptionsCount: supplierCatalogOptions.length,
      suggestionsCount: suggestions.length,
      suggestionSamples: suggestions.map(s => s.displayName).slice(0, 5),
      supplierDetailSamples: supplierCatalogOptions.slice(0, 5).map(option => ({
        displayName: option.displayName,
        yarnType: option.catalog?.yarnType?.name,
        yarnSubtype: option.catalog?.yarnSubtype?.name,
        color: option.catalog?.colorFamily?.name,
        shadeCode: option.shadeCode,
      })),
    });

    setAutocompleteStates(prev => ({
      ...prev,
      [itemId]: {
        query: value,
        suggestions,
        showSuggestions: suggestions.length > 0,
      },
    }));

    updateItem(itemId, {
      yarnName: value,
      yarnId: "",
      selectedYarnDetail: undefined,
      selectedCatalog: undefined,
      sizeCount: '',
      sizeCountName: '',
      yarnTypeId: undefined,
      yarnSubtypeId: undefined,
      shadeCode: "",
    });
  };

  const selectYarnSuggestion = useCallback((itemId: string, option: SupplierCatalogOption) => {
    const { catalog, supplierDetail, displayName } = option;

    console.log("[PurchaseForm] selectYarnSuggestion", {
      itemId,
      catalogId: catalog?.id,
      catalogName: catalog?.yarnName,
      catalogType: catalog?.yarnType?.name,
      catalogSubtype: catalog?.yarnSubtype?.name,
      catalogColor: catalog?.colorFamily?.name,
      supplierDetail,
    });

    const yarnTypeId = catalog?.yarnType?.id || extractIdFromValue(supplierDetail?.yarnType) || "";
    const yarnSubtypeId = catalog?.yarnSubtype?.id || extractIdFromValue(supplierDetail?.yarnsubtype) || "";

    const catalogCountSizeId = extractIdFromValue(catalog?.countSize);
    const catalogCountSizeName =
      (catalog?.countSize && (catalog.countSize as any)?.name) ||
      (catalog?.countSize && (catalog.countSize as any)?.label) ||
      undefined;

    const detailCountSizeOptions = extractCountSizeOptionsFromDetail(supplierDetail);

    const fallbackCountSizeFromDetail = detailCountSizeOptions.length === 1 ? detailCountSizeOptions[0] : undefined;

    const resolvedCountSizeId = catalogCountSizeId || fallbackCountSizeFromDetail?.id;
    const resolvedCountSizeName =
      catalogCountSizeName ||
      detailCountSizeOptions.find(option => option.id === catalogCountSizeId)?.name ||
      fallbackCountSizeFromDetail?.name;

    const finalDisplayName = catalog?.yarnName?.trim() || displayName;

    const updates: Partial<YarnPurchaseItem> = {
      yarnName: finalDisplayName,
      yarnId: catalog.id,
      yarnTypeId,
      yarnSubtypeId,
      shadeCode: option.shadeCode || "",
      selectedYarnDetail: supplierDetail,
      selectedCatalog: catalog,
    };

    console.log("[PurchaseForm] selectYarnSuggestion resolved fields", {
      itemId,
      finalDisplayName,
      yarnTypeId,
      yarnSubtypeId,
      shadeCode: option.shadeCode,
      resolvedCountSizeId,
      resolvedCountSizeName,
    });

    if (resolvedCountSizeId) {
      updates.sizeCount = resolvedCountSizeId;
      updates.sizeCountName = resolvedCountSizeName || resolvedCountSizeId;
    }

    updateItem(itemId, updates);

    setAutocompleteStates(prev => ({
      ...prev,
      [itemId]: {
        query: finalDisplayName,
        suggestions: [],
        showSuggestions: false,
      },
    }));
  }, [extractCountSizeOptionsFromDetail, extractIdFromValue, updateItem]);

  useEffect(() => {
    if (!selectedSupplier || supplierCatalogOptions.length === 0) {
      return;
    }

    formData.items.forEach((item) => {
      if (!item) return;
      if (item.selectedCatalog) return;
      if (!item.yarnId && !item.yarnName) return;

      const match = supplierCatalogOptions.find((option) => {
        const optionId = option.catalog?.id ? String(option.catalog.id) : undefined;
        const itemId = item.yarnId ? String(item.yarnId) : undefined;

        if (itemId && optionId && itemId === optionId) {
          return true;
        }

        if (item.yarnName && option.catalog?.yarnName) {
          return option.catalog.yarnName.trim().toLowerCase() === item.yarnName.trim().toLowerCase();
        }

        return false;
      });

      if (match) {
        setAutocompleteStates(prev => ({
          ...prev,
          [item.id]: {
            query: item.yarnName,
            suggestions: [],
            showSuggestions: false,
          },
        }));
        selectYarnSuggestion(item.id, match);
      }
    });
  }, [formData.items, selectedSupplier, supplierCatalogOptions, selectYarnSuggestion]);

  const calculateTotals = () => {
    const subTotal = formData.items.reduce((sum, item) => {
      const baseAmount = item.rate * item.qty;
      return sum + baseAmount;
    }, 0);

    const totalGst = formData.items.reduce((sum, item) => {
      const baseAmount = item.rate * item.qty;
      const gstAmount = (baseAmount * item.gst) / 100;
      return sum + gstAmount;
    }, 0);

    const total = subTotal + totalGst;

    return { subTotal, totalGst, total };
  };

  useEffect(() => {
    const totals = calculateTotals();
    setFormData(prev => ({
      ...prev,
      ...totals
    }));
  }, [formData.items]);

  const getAvailableCountSizes = (item: YarnPurchaseItem): Array<{ id: string; name: string }> => {
    const uniqueOptions = new Map<string, string>();

    if (item.selectedCatalog) {
      const catalogCountSizeId = extractIdFromValue(item.selectedCatalog.countSize);
      const catalogCountSizeName =
        (item.selectedCatalog.countSize && (item.selectedCatalog.countSize as any)?.name) ||
        (item.selectedCatalog.countSize && (item.selectedCatalog.countSize as any)?.label);
      if (catalogCountSizeId) {
        uniqueOptions.set(catalogCountSizeId, catalogCountSizeName || catalogCountSizeId);
      }
    }

    if (item.selectedYarnDetail) {
      extractCountSizeOptionsFromDetail(item.selectedYarnDetail).forEach(option => {
        if (option.id) {
          uniqueOptions.set(option.id, option.name || option.id);
        }
      });
    }

    if (uniqueOptions.size > 0) {
      return Array.from(uniqueOptions.entries()).map(([id, name]) => ({ id, name }));
    }
    
    if (item.yarnSubtypeId && item.yarnTypeId) {
      const subtypes = yarnSubtypeMap[item.yarnTypeId] || [];
      const subtype = subtypes.find(s => s.id === item.yarnSubtypeId);

      if (subtype) {
        const subtypeOptions = countSizes
          .filter(cs => subtype.countSizes.includes(cs.id))
          .map(cs => ({ id: cs.id, name: cs.name }));

        if (subtypeOptions.length > 0) {
          return subtypeOptions;
        }
      }
    }

    if (item.sizeCount) {
      return [{
        id: item.sizeCount,
        name: item.sizeCountName || item.sizeCount,
      }];
    }

    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[PurchaseForm] Submit triggered', {
      purchaseDate: formData.purchaseDate,
      supplierId: formData.supplierId,
      itemsCount: formData.items.length,
      items: formData.items,
      totals: {
        subTotal: formData.subTotal,
        totalGst: formData.totalGst,
        total: formData.total,
      },
    });
    
    if (!formData.purchaseDate.trim()) {
      console.warn('[PurchaseForm] Validation failed: purchase date missing');
      toast.error("Purchase Date is required");
      return;
    }
    if (!formData.supplierId) {
      console.warn('[PurchaseForm] Validation failed: supplier missing');
      toast.error("Supplier is required");
      return;
    }
    if (formData.items.length === 0) {
      console.warn('[PurchaseForm] Validation failed: no items added');
      toast.error("At least one yarn item is required");
      return;
    }
    
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      console.log(`[PurchaseForm] Validating item ${i + 1}`, item);
      if (!item.yarnName.trim()) {
        console.warn(`[PurchaseForm] Validation failed: yarn name missing for item ${i + 1}`);
        toast.error(`Yarn Name is required for item ${i + 1}`);
        return;
      }
      if (!item.sizeCount) {
        console.warn(`[PurchaseForm] Validation failed: size/count missing for item ${i + 1}`);
        toast.error(`Size/Count is required for item ${i + 1}`);
        return;
      }
      if (item.rate <= 0) {
        console.warn(`[PurchaseForm] Validation failed: rate invalid for item ${i + 1}`, item.rate);
        toast.error(`Rate must be greater than 0 for item ${i + 1}`);
        return;
      }
      if (item.qty <= 0) {
        console.warn(`[PurchaseForm] Validation failed: quantity invalid for item ${i + 1}`, item.qty);
        toast.error(`Quantity must be greater than 0 for item ${i + 1}`);
        return;
      }
      if (!item.estimatedDeliveryDate) {
        console.warn(`[PurchaseForm] Validation failed: estimated delivery missing for item ${i + 1}`);
        toast.error(`Estimated Delivery Date is required for item ${i + 1}`);
        return;
      }
    }

    const totals = calculateTotals();
    const dataToSubmit = {
      ...formData,
      ...totals
    };

    console.log('[PurchaseForm] Passing data to onSubmit', dataToSubmit);

    try {
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading form options...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Purchase Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="form-label">
            Purchase Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            className="form-control"
            required
          />
        </div>

        <div>
          <label className="form-label">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.supplierId}
            onChange={(e) => handleSupplierChange(e.target.value)}
            className="form-select"
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.brandName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Purchase Items Section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Yarn Items</h4>
          <button
            type="button"
            onClick={addItem}
            className="ti-btn ti-btn-primary"
            disabled={!formData.supplierId}
          >
            <i className="ri-add-line me-1"></i>
            Add Yarn Item
          </button>
        </div>

        {!formData.supplierId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <i className="ri-information-line me-2"></i>
              Please select a supplier first to add yarn items
            </p>
          </div>
        )}
        {formData.supplierId && isLoadingCatalogOptions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center">
            <i className="ri-loader-4-line animate-spin me-3 text-blue-500"></i>
            <p className="text-sm text-blue-800">
              Fetching yarn catalog options for the selected supplier...
            </p>
          </div>
        )}

        {formData.items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <i className="ri-shopping-cart-line text-4xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Added</h3>
            <p className="text-gray-500 mb-4">Add yarn items to create a purchase order.</p>
            <button
              type="button"
              onClick={addItem}
              className="ti-btn ti-btn-primary"
              disabled={!formData.supplierId}
            >
              <i className="ri-add-line me-2"></i>
              Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.items.map((item, index) => {
              const autocompleteState = autocompleteStates[item.id] || { query: "", suggestions: [], showSuggestions: false };
              const availableCountSizes = getAvailableCountSizes(item);

              return (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-medium text-gray-900">Item {index + 1}</h5>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove Item"
                    >
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Yarn Name with Autocomplete */}
                    <div className="md:col-span-2 lg:col-span-3 relative">
                      <label className="form-label">
                        Yarn Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative" ref={el => { autocompleteRefs.current[item.id] = el; }}>
                        <input
                          type="text"
                          value={autocompleteState.query || item.yarnName}
                          onChange={(e) => {
                            handleYarnNameInput(item.id, e.target.value);
                            // Clear selected yarn detail if user is typing manually
                            updateItem(item.id, { 
                              yarnName: e.target.value,
                            yarnId: "",
                              selectedYarnDetail: undefined,
                              selectedCatalog: undefined,
                              sizeCount: '', // Clear size count when yarn changes
                              sizeCountName: '',
                              yarnTypeId: undefined,
                              yarnSubtypeId: undefined,
                              shadeCode: "",
                            });
                          }}
                          onFocus={() => {
                            if (autocompleteState.suggestions.length > 0) {
                              setAutocompleteStates(prev => ({
                                ...prev,
                                [item.id]: { ...prev[item.id], showSuggestions: true }
                              }));
                            }
                          }}
                          className="form-control"
                          placeholder="Type to search yarn from supplier's master data..."
                          required
                        />
                        {autocompleteState.showSuggestions && autocompleteState.suggestions.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {autocompleteState.suggestions.map((option, idx) => {
                              const { catalog } = option;
                              const displayName = option.displayName;
                              const typeName = catalog?.yarnType?.name;
                              const subtypeName = catalog?.yarnSubtype?.name;
                              const colorName = catalog?.colorFamily?.name;
                              const countSizeName = catalog?.countSize?.name;
                              const shadeCode = option.shadeCode;
                              const metadata = option.metadataSummary;

                              return (
                                <div
                                  key={idx}
                                  onClick={() => selectYarnSuggestion(item.id, option)}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">{displayName}</div>
                                  {(metadata || shadeCode) && (
                                    <div className="text-xs text-gray-500">
                                      {metadata && <span>{metadata}</span>}
                                      {shadeCode && <span className={metadata ? "ml-2" : ""}>Shade: {shadeCode}</span>}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Size/Count */}
                    <div>
                      <label className="form-label">
                        Size/Count <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.sizeCount}
                        onChange={(e) => {
                          const value = e.target.value;
                          const selectedOption = availableCountSizes.find(cs => cs.id === value);
                          updateItem(item.id, { 
                            sizeCount: value, 
                            sizeCountName: selectedOption?.name || value 
                          });
                        }}
                        className="form-select"
                        required
                        disabled={availableCountSizes.length === 0}
                      >
                        <option value="">Select Size/Count</option>
                        {availableCountSizes.map(cs => (
                          <option key={cs.id} value={cs.id}>
                            {cs.name}
                          </option>
                        ))}
                      </select>
                      {availableCountSizes.length === 0 && item.selectedYarnDetail && (
                        <p className="text-xs text-gray-500 mt-1">No count sizes available for selected yarn</p>
                      )}
                      {availableCountSizes.length === 0 && !item.selectedYarnDetail && item.yarnName && (
                        <p className="text-xs text-yellow-600 mt-1">Please select a yarn from the suggestions to see available count sizes</p>
                      )}
                    </div>

                    {/* Shade Code */}
                    <div>
                      <label className="form-label">Shade Code</label>
                      <input
                        type="text"
                        value={item.shadeCode}
                        onChange={(e) => updateItem(item.id, { shadeCode: e.target.value })}
                        className="form-control"
                        placeholder="Enter shade code"
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="form-label">
                        Rate (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === "" ? "" : parseFloat(value);
                          updateItem(item.id, { rate: numValue === "" ? 0 : (isNaN(numValue) ? 0 : numValue) });
                        }}
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="form-label">
                        Quantity (kg) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.qty || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === "" ? "" : parseFloat(value);
                          updateItem(item.id, { qty: numValue === "" ? 0 : (isNaN(numValue) ? 0 : numValue) });
                        }}
                        className="form-control"
                        placeholder="0.00"
                        step="0.001"
                        min="0"
                        required
                      />
                    </div>

                    {/* Estimated Delivery Date */}
                    <div>
                      <label className="form-label">
                        Estimated Delivery Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={item.estimatedDeliveryDate}
                        onChange={(e) => updateItem(item.id, { estimatedDeliveryDate: e.target.value })}
                        className="form-control"
                        required
                      />
                    </div>

                    {/* GST */}
                    <div>
                      <label className="form-label">
                        GST (%) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.gst || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === "" ? "" : parseFloat(value);
                          updateItem(item.id, { gst: numValue === "" ? 0 : (isNaN(numValue) ? 0 : numValue) });
                        }}
                        className="form-control"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                      />
                    </div>

                    {/* Sub-total */}
                    <div>
                      <label className="form-label">Sub-total (₹)</label>
                      <div className="form-control bg-gray-100 text-gray-700 font-medium">
                        ₹{item.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Totals Section */}
      {formData.items.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Sub-total:</span>
              <span className="text-lg font-semibold text-gray-900">
                ₹{formData.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">GST:</span>
              <span className="text-lg font-semibold text-gray-900">
                ₹{formData.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="border-t border-blue-300 pt-3 flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">Total:</span>
              <span className="text-xl font-bold text-blue-900">
                ₹{formData.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="form-label">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="form-control"
          rows={4}
          placeholder="Additional notes about the purchase order..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="ti-btn ti-btn-light"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ti-btn ti-btn-primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin me-2"></i>
              Submitting...
            </>
          ) : (
            <>
              <i className="ri-save-line me-2"></i>
              {submitButtonText}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PurchaseForm;
