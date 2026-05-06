"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import supplierService, { Supplier, SupplierYarnDetail } from "@/shared/services/supplierService";
import yarnTypeService, { YarnType } from "@/shared/services/yarnTypeService";
import yarnCountSizeService, { CountSize } from "@/shared/services/yarnCountSizeService";
import yarnCatalogService, { YarnCatalog, YarnCatalogQueryParams } from "@/shared/services/yarnCatalogService";
import {
  downloadYarnItemsTemplate,
  downloadYarnItemsData,
  parseYarnItemsExcelFile,
  type ParsedYarnRow,
} from "../utils/purchaseYarnExcel";

export type PurchaseOrderStatus =
  | 'draft'
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
  /** YarnRequisition id when row came from Draft PO queue; cleared after PO submit. */
  sourceRequisitionId?: string;
  /** Set when item was imported from Excel but yarn name is not in supplier data. */
  notInSupplierData?: boolean;
  /** Raw input string for rate (allows typing "10." without losing decimal). */
  displayRate?: string;
  /** Raw input string for qty (allows typing decimals). */
  displayQty?: string;
  /** Raw input string for gst (allows typing decimals). */
  displayGst?: string;
}

export interface PurchaseOrderData {
  purchaseDate: string;
  supplierId: string;
  supplierName: string;
  creditDays: number;
  estimatedOrderDeliveryDate: string;
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
  /** When provided, shows “Save draft” (incomplete POs allowed — parent persists as status draft). */
  onSaveDraft?: (data: PurchaseOrderData) => Promise<void>;
  isSavingDraft?: boolean;
  submitButtonText?: string;
  /** When true, shows a red warning that updating PO may affect lots/packlist data. Used on edit page. */
  showEditWarning?: boolean;
}

interface SupplierYarnOption {
  id: string;
  displayName: string;
  searchableText: string;
  shadeCode?: string;
  yarnTypeName?: string;
  yarnSubtypeName?: string;
  supplierDetail: SupplierYarnDetail;
  metadataSummary?: string;
}

/**
 * Shallow-clones yarn PO lines so supplier filter / restore cannot mutate snapshots.
 * @param items - Line items to clone
 */
function cloneYarnPurchaseItems(items: YarnPurchaseItem[]): YarnPurchaseItem[] {
  return items.map((row) => ({ ...row }));
}

/**
 * Loose-safe comparison for YarnCatalog ids from different API shapes.
 * @param a - Candidate id string
 * @param b - Other id string
 */
function yarnCatalogIdsEquivalent(a?: string | null, b?: string | null): boolean {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  return x.length > 0 && y.length > 0 && x === y;
}

/** Collapses whitespace for fuzzy yarn-name comparison. */
function normalizeYarnLabel(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  onSaveDraft,
  isSavingDraft = false,
  submitButtonText = "Submit to Supplier",
  showEditWarning = false,
}) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierYarnDetails, setSupplierYarnDetails] = useState<SupplierYarnDetail[]>([]);
  const [yarnTypes, setYarnTypes] = useState<YarnType[]>([]);
  const [countSizes, setCountSizes] = useState<CountSize[]>([]);
  const [yarnSubtypeMap, setYarnSubtypeMap] = useState<Record<string, { id: string; name: string; countSizes: string[] }[]>>({});
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const supplierYarnDetailsRef = useRef<SupplierYarnDetail[]>([]);
  const isTypingRef = useRef<Record<string, boolean>>({});
  /** Full yarn table while no supplier is selected; restored when supplier field is cleared. */
  const itemsSnapshotWithoutSupplierRef = useRef<YarnPurchaseItem[]>(
    cloneYarnPurchaseItems(initialData.items || [])
  );
  /** Suppliers overlapping draft yarns — used to rank matches, but search scans the full supplier list. */
  const draftPreferredSupplierIdsRef = useRef<Set<string>>(new Set());

  const [formData, setFormData] = useState<PurchaseOrderData>({
    purchaseDate: initialData.purchaseDate || new Date().toISOString().split('T')[0],
    supplierId: initialData.supplierId || "",
    supplierName: initialData.supplierName || "",
    creditDays: initialData.creditDays ?? 0,
    estimatedOrderDeliveryDate: initialData.estimatedOrderDeliveryDate || "",
    items: initialData.items || [],
    subTotal: initialData.subTotal || 0,
    totalGst: initialData.totalGst || 0,
    total: initialData.total || 0,
    status: initialData.status || 'submitted to supplier',
    notes: initialData.notes || ""
  });

  /** Latest line items for handlers that must not depend on stale render closures. */
  const formDataItemsRef = useRef(formData.items);
  useEffect(() => {
    formDataItemsRef.current = formData.items;
  }, [formData.items]);

  // Autocomplete state for yarn names - initialize with existing items to prevent auto-showing suggestions
  const [autocompleteStates, setAutocompleteStates] = useState<Record<string, {
    query: string;
    suggestions: SupplierYarnOption[];
    showSuggestions: boolean;
  }>>(() => {
    // Initialize autocomplete states for items that come from initialData
    const initialStates: Record<string, {
      query: string;
      suggestions: SupplierYarnOption[];
      showSuggestions: boolean;
    }> = {};

    if (initialData.items && initialData.items.length > 0) {
      initialData.items.forEach((item) => {
        if (item.id && item.yarnName) {
          initialStates[item.id] = {
            query: item.yarnName,
            suggestions: [],
            showSuggestions: false, // Don't show suggestions for pre-filled items
          };
        }
      });
    }

    return initialStates;
  });

  const autocompleteRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Autocomplete state for supplier
  const [supplierAutocomplete, setSupplierAutocomplete] = useState<{
    query: string;
    suggestions: Supplier[];
    showSuggestions: boolean;
  }>({
    query: "",
    suggestions: [],
    showSuggestions: false,
  });

  const supplierAutocompleteRef = useRef<HTMLDivElement | null>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  /** Invalidates in-flight async catalog→supplier matching when supplier or line keys change. */
  const yarnCatalogHydrateRunIdRef = useRef(0);
  /** Cancels stale line→supplier binds when supplier changes mid-flight. */
  const supplierBindGenerationRef = useRef(0);
  /** Latest binder for initial supplier hydrate (runs after suppliers load API response). */
  const bindUnresolvedYarnLinesRef = useRef<
    (generation: number, rows: YarnPurchaseItem[]) => Promise<void>
  >(async () => {});
  const [isImportingExcel, setIsImportingExcel] = useState(false);

  useEffect(() => {
    supplierYarnDetailsRef.current = supplierYarnDetails;
  }, [supplierYarnDetails]);

  /**
   * Keeps an unfiltered copy of yarn lines whenever supplier is not chosen (add rows, draft preload, after clear).
   */
  useEffect(() => {
    if (!formData.supplierId) {
      itemsSnapshotWithoutSupplierRef.current = cloneYarnPurchaseItems(formData.items);
    }
  }, [formData.items, formData.supplierId]);

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

  /** Normalize a single countSize array (from yarnsubtype.countSize or detail.countSize) to { id, name }[]. */
  const normalizeCountSizeArray = useCallback(
    (countSizeArray: unknown[]): Array<{ id: string; name: string }> => {
      if (!Array.isArray(countSizeArray)) return [];
      return countSizeArray
        .map((entry: unknown) => {
          if (!entry) return null;
          const id = extractIdFromValue(entry);
          if (!id) return null;
          if (typeof entry === "string") return { id, name: entry };
          if (typeof entry === "object") {
            const entryObj = entry as Record<string, unknown>;
            const name =
              typeof entryObj.name === "string"
                ? entryObj.name
                : typeof entryObj.label === "string"
                  ? entryObj.label
                  : undefined;
            return { id, name: name || id };
          }
          return null;
        })
        .filter((value): value is { id: string; name: string } => Boolean(value));
    },
    [extractIdFromValue]
  );

  const extractCountSizeOptionsFromDetail = useCallback(
    (detail: SupplierYarnDetail): Array<{ id: string; name: string }> => {
      const subtype = detail?.yarnsubtype;
      // Prefer yarnsubtype.countSize (standard location)
      if (typeof subtype === "object" && subtype !== null) {
        const fromSubtype = (subtype as any)?.countSize;
        if (Array.isArray(fromSubtype) && fromSubtype.length > 0) {
          return normalizeCountSizeArray(fromSubtype);
        }
      }
      // Fallback: some APIs send countSize at detail root
      const fromRoot = (detail as any)?.countSize;
      if (Array.isArray(fromRoot) && fromRoot.length > 0) {
        return normalizeCountSizeArray(fromRoot);
      }
      // Some APIs send single countSize as string/object instead of array
      if (typeof fromRoot === "string" && fromRoot.trim()) {
        return [{ id: fromRoot.trim(), name: fromRoot.trim() }];
      }
      if (typeof fromRoot === "object" && fromRoot !== null) {
        const id = extractIdFromValue(fromRoot);
        const name =
          ((fromRoot as any)?.name as string | undefined) ||
          ((fromRoot as any)?.label as string | undefined) ||
          id;
        if (id) {
          return [{ id, name: name || id }];
        }
      }
      return [];
    },
    [extractIdFromValue, normalizeCountSizeArray]
  );

  const extractShadeCodeFromDetail = useCallback((detail: SupplierYarnDetail): string => {
    const direct = (detail as any)?.shadeNumber;
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const altShadeCode = (detail as any)?.shadeCode;
    if (typeof altShadeCode === "string" && altShadeCode.trim()) return altShadeCode.trim();
    const altShade = (detail as any)?.shade;
    if (typeof altShade === "string" && altShade.trim()) return altShade.trim();
    const colorObj = (detail as any)?.color;
    if (typeof colorObj === "object" && colorObj !== null) {
      const colorShade =
        (typeof colorObj.shadeCode === "string" && colorObj.shadeCode.trim())
          ? colorObj.shadeCode.trim()
          : (typeof colorObj.shadeNumber === "string" && colorObj.shadeNumber.trim())
            ? colorObj.shadeNumber.trim()
            : "";
      if (colorShade) return colorShade;
    }
    return "";
  }, []);

  /**
   * Yarn catalog ObjectId carried on supplier.yarnDetails entries (when populated).
   * @param d - Supplier yarn detail payload
   * @returns Normalized YarnCatalog id or undefined
   */
  const catalogIdFromSupplierDetail = useCallback(
    (d: SupplierYarnDetail): string | undefined => {
      if (d.yarnCatalogId) return String(d.yarnCatalogId).trim();
      const yc = d.yarnCatalog;
      if (typeof yc === "string" && yc.trim()) return yc.trim();
      if (yc && typeof yc === "object") {
        const cid = extractIdFromValue(yc);
        if (cid) return cid;
      }
      const rawYarn = (d as { yarn?: unknown }).yarn;
      const fromYarn = extractIdFromValue(rawYarn);
      if (fromYarn) return fromYarn;
      return undefined;
    },
    [extractIdFromValue]
  );

  /**
   * Whether a line item matches a supplier yarn row (catalog id first, then exact yarn name).
   * @param detail - Supplier yarn detail
   * @param item - PO line
   * @returns True if the supplier lists this yarn for the line
   */
  const supplierDetailMatchesDraftItem = useCallback(
    (detail: SupplierYarnDetail, item: YarnPurchaseItem): boolean => {
      const cid = catalogIdFromSupplierDetail(detail);
      if (item.yarnId && cid && String(item.yarnId) === String(cid)) {
        return true;
      }
      const supplierName = (detail.yarnName || "").trim().toLowerCase();
      const itemName = (item.yarnName || "").trim().toLowerCase();
      return Boolean(itemName && supplierName === itemName);
    },
    [catalogIdFromSupplierDetail]
  );

  /**
   * Keeps only yarn rows the supplier actually lists.
   * @param items - Current line items
   * @param yarnDetails - Supplier yarnDetails from API
   * @returns Filtered items
   */
  const filterItemsForSupplierYarns = useCallback(
    (items: YarnPurchaseItem[], yarnDetails: SupplierYarnDetail[]): YarnPurchaseItem[] => {
      if (!yarnDetails.length) return [];
      return items.filter((item) =>
        yarnDetails.some((detail) => supplierDetailMatchesDraftItem(detail, item))
      );
    },
    [supplierDetailMatchesDraftItem]
  );

  /**
   * Maps supplier.yarnDetails rows to selectable yarn options for this form.
   * @param explicitDetails - When passed, builds from this snapshot instead of supplierYarnDetailsRef.
   */
  const buildSupplierYarnOptions = useCallback((explicitDetails?: SupplierYarnDetail[]): SupplierYarnOption[] => {
    const yarnDetails =
      explicitDetails !== undefined ? explicitDetails : supplierYarnDetailsRef.current;
    if (!yarnDetails || yarnDetails.length === 0) {
      return [];
    }

    const options: SupplierYarnOption[] = yarnDetails.map((detail, index) => {
      const yarnName = detail.yarnName || (detail as any)?.yarn || (detail as any)?.name || '';
      const displayName = yarnName.trim() || `Yarn ${index + 1}`;

      // Extract type name
      const typeName = typeof detail.yarnType === 'string'
        ? detail.yarnType
        : (detail.yarnType as any)?.name || '';

      // Extract subtype name
      const subtypeName = typeof detail.yarnsubtype === 'string'
        ? detail.yarnsubtype
        : (detail.yarnsubtype as any)?.subtype || (detail.yarnsubtype as any)?.name || '';

      // Extract color name
      const colorName = typeof detail.color === 'string'
        ? detail.color
        : (detail.color as any)?.name || '';

      const shadeCode = extractShadeCodeFromDetail(detail);

      const metadataSummary = [
        typeName,
        subtypeName,
        colorName,
      ]
        .filter(Boolean)
        .join(" • ") || undefined;

      const searchableText = [
        displayName,
        typeName,
        subtypeName,
        colorName,
        shadeCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      // Create unique ID from detail properties
      const detailId = detail.id || detail._id || `${index}`;
      const uniqueId = [
        detailId,
        extractIdFromValue(detail.yarnType) || "",
        extractIdFromValue(detail.yarnsubtype) || "",
        extractIdFromValue(detail.color) || "",
        shadeCode,
      ].join("|");

      return {
        id: uniqueId,
        displayName,
        searchableText,
        shadeCode: shadeCode || undefined,
        yarnTypeName: typeName || undefined,
        yarnSubtypeName: subtypeName || undefined,
        supplierDetail: detail,
        metadataSummary,
      };
    });

    return options;
  }, [extractIdFromValue, extractShadeCodeFromDetail]);

  /**
   * Resolves the supplier yarn option for a line using catalog id, normalized name, then prefix match.
   * @param item - PO line
   * @param yarnDetailsSnapshot - Optional supplier yarnDetails snapshot (e.g. right after hydrate)
   * @returns Best matching supplier yarn option, if any
   */
  const resolveSupplierYarnOptionForItem = useCallback(
    (
      item: YarnPurchaseItem,
      yarnDetailsSnapshot?: SupplierYarnDetail[],
    ): SupplierYarnOption | undefined => {
      if (!item.yarnName?.trim() && !String(item.yarnId || "").trim()) {
        return undefined;
      }
      const options =
        yarnDetailsSnapshot !== undefined
          ? buildSupplierYarnOptions(yarnDetailsSnapshot)
          : buildSupplierYarnOptions();
      if (options.length === 0) {
        return undefined;
      }

      const itemShadeNorm = item.shadeCode?.trim().toLowerCase() || "";

      const matchByCatalog =
        item.yarnId &&
        (options.find((option) => {
          const cid = catalogIdFromSupplierDetail(option.supplierDetail);
          if (!cid || !yarnCatalogIdsEquivalent(item.yarnId, cid)) {
            return false;
          }
          if (itemShadeNorm && option.shadeCode?.trim().toLowerCase() !== itemShadeNorm) {
            return false;
          }
          return true;
        }) ||
          options.find((option) => {
            const cid = catalogIdFromSupplierDetail(option.supplierDetail);
            return Boolean(cid && yarnCatalogIdsEquivalent(item.yarnId, cid));
          }));

      return (
        matchByCatalog ??
        (item.yarnName
          ? options.find((option) => {
              const optionYarnName = normalizeYarnLabel(option.displayName);
              const itemYarnName = normalizeYarnLabel(item.yarnName);
              if (!itemYarnName || optionYarnName !== itemYarnName) {
                return false;
              }
              if (itemShadeNorm && option.shadeCode?.trim().toLowerCase() !== itemShadeNorm) {
                return false;
              }
              return true;
            }) ??
            options.find((option) => {
              const optionYarnName = option.displayName.trim().toLowerCase();
              const itemYarnName = item.yarnName.trim().toLowerCase();
              return itemYarnName && optionYarnName === itemYarnName;
            }) ??
            options.find((option) => {
              const dn = normalizeYarnLabel(option.displayName);
              const inm = normalizeYarnLabel(item.yarnName);
              if (dn.length < 8 || inm.length < 8) {
                return false;
              }
              const maxPrefix = Math.min(60, dn.length, inm.length);
              return dn.startsWith(inm.slice(0, maxPrefix)) || inm.startsWith(dn.slice(0, maxPrefix));
            })
          : undefined)
      );
    },
    [buildSupplierYarnOptions, catalogIdFromSupplierDetail],
  );

  /** True if the given yarn name exactly matches one of the current supplier's yarn details (case-insensitive). */
  const isYarnInSupplierData = useCallback(
    (yarnName: string): boolean => {
      if (!yarnName || !yarnName.trim()) return false;
      const options = buildSupplierYarnOptions();
      const search = yarnName.trim().toLowerCase();
      return options.some(
        (o) => o.displayName.trim().toLowerCase() === search
      );
    },
    [buildSupplierYarnOptions]
  );

  // Filter supplier yarn options based on query
  const filterSupplierYarnOptions = useCallback((query: string): SupplierYarnOption[] => {
    if (!query || !query.trim()) {
      return [];
    }

    const options = buildSupplierYarnOptions();
    if (options.length === 0) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const enforceStartsWithOnly = normalizedQuery.length <= 1;

    // Check if any option has an exact shade code match with the query
    const hasExactShadeCodeMatch = options.some((option) => {
      const shadeCode = option.shadeCode?.trim().toLowerCase() || "";
      return shadeCode === normalizedQuery;
    });

    const rankedMatches = options
      .map((option) => {
        const yarnName = option.displayName.trim().toLowerCase();
        const searchable = option.searchableText || "";
        const shadeCode = option.shadeCode?.trim().toLowerCase() || "";

        // Check for exact shade code match (highest priority)
        const exactShadeCodeMatch = shadeCode === normalizedQuery;

        // If there's an exact shade code match in the dataset, only show items with exact shade code match
        if (hasExactShadeCodeMatch && !exactShadeCodeMatch) {
          return null;
        }

        const startsWithYarn = yarnName.startsWith(normalizedQuery);
        const includesYarn = yarnName.includes(normalizedQuery);
        const includesSearchable = searchable.includes(normalizedQuery);

        if (enforceStartsWithOnly) {
          if (!startsWithYarn && !exactShadeCodeMatch) {
            return null;
          }
        } else if (!startsWithYarn && !includesYarn && !includesSearchable && !exactShadeCodeMatch) {
          return null;
        }

        let score = 5;
        // Prioritize exact shade code matches
        if (exactShadeCodeMatch) {
          score = -1; // Highest priority (lowest score)
        } else if (startsWithYarn) {
          score = 0;
        } else if (includesYarn) {
          score = 2;
        } else if (includesSearchable) {
          score = 3;
        }

        return { option, score };
      })
      .filter((entry): entry is { option: SupplierYarnOption; score: number } => Boolean(entry))
      .sort((a, b) => a.score - b.score);

    const seen = new Set<string>();
    const uniqueOrdered: SupplierYarnOption[] = [];
    rankedMatches.forEach(({ option }) => {
      if (!seen.has(option.id)) {
        seen.add(option.id);
        uniqueOrdered.push(option);
      }
    });

    return uniqueOrdered.slice(0, 10);
  }, [buildSupplierYarnOptions]);

  useEffect(() => {
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [suppliersResponse, typesResponse, countSizesResponse] = await Promise.all([
          supplierService.getSuppliers({ status: 'active', limit: 1000, page: 1 }),
          yarnTypeService.getTypes({ status: 'active', limit: 1000, page: 1 }),
          yarnCountSizeService.getCountSizes({ status: 'active', limit: 1000, page: 1 })
        ]);

        const allSuppliers = suppliersResponse.results || [];

        /**
         * Resolves YarnCatalog ObjectId string from supplier `yarnDetails` row.
         */
        const catalogIdFromSupplierDetailRow = (d: SupplierYarnDetail): string | undefined => {
          if (d.yarnCatalogId) return String(d.yarnCatalogId).trim();
          const yc = d.yarnCatalog;
          if (typeof yc === 'string' && yc.trim()) return yc.trim();
          if (yc && typeof yc === 'object') {
            const obj = yc as Record<string, unknown>;
            const nid = obj._id ?? obj.id;
            if (nid != null) return String(nid);
          }
          const rawYarn = (d as { yarn?: unknown }).yarn;
          if (typeof rawYarn === 'string' && rawYarn.trim()) return rawYarn.trim();
          if (rawYarn && typeof rawYarn === 'object') {
            const obj = rawYarn as Record<string, unknown>;
            const nid = obj._id ?? obj.id;
            if (nid != null) return String(nid);
          }
          return undefined;
        };

        let supplierResults = allSuppliers;
        const draftCatalogIds = new Set(
          (initialData.items || [])
            .map((row) => row.yarnId)
            .filter((x): x is string => Boolean(x))
            .map((x) => String(x))
        );
        const draftYarnNames = new Set(
          (initialData.items || [])
            .map((row) => row.yarnName?.trim().toLowerCase())
            .filter(Boolean) as string[]
        );
        draftPreferredSupplierIdsRef.current = new Set();
        if (draftCatalogIds.size > 0 || draftYarnNames.size > 0) {
          supplierResults.forEach((supplier) => {
            const details = supplier.yarnDetails || [];
            const hit = details.some((d) => {
              const cid = catalogIdFromSupplierDetailRow(d);
              if (cid && draftCatalogIds.has(String(cid))) return true;
              const dn = (d.yarnName || "").trim().toLowerCase();
              return Boolean(dn && draftYarnNames.has(dn));
            });
            if (hit) draftPreferredSupplierIdsRef.current.add(supplier.id);
          });
        }

        setSuppliers(supplierResults);
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
          const supplier = allSuppliers.find(s => s.id === initialData.supplierId);
          if (supplier) {
            setSelectedSupplier(supplier);
            // Set initial state from supplier object (in case yarnDetails are already populated)
            const initialYarnDetails = supplier.yarnDetails || [];
            setSupplierYarnDetails(initialYarnDetails);
            supplierYarnDetailsRef.current = initialYarnDetails;
            setSupplierAutocomplete({
              query: supplier.brandName,
              suggestions: [],
              showSuggestions: false,
            });

            // Fetch full supplier details to ensure yarnDetails are loaded
            supplierService.getSupplierById(supplier.id)
              .then((fullSupplier) => {
                const yarnDetails = fullSupplier.yarnDetails || [];

                supplierBindGenerationRef.current += 1;
                const bindGen = supplierBindGenerationRef.current;

                setSupplierYarnDetails(yarnDetails);
                supplierYarnDetailsRef.current = yarnDetails;

                queueMicrotask(() => {
                  void bindUnresolvedYarnLinesRef.current(bindGen, [
                    ...formDataItemsRef.current,
                  ]);
                });

                console.log("[PurchaseForm] Initial supplier loaded with yarn details", {
                  supplierId: supplier.id,
                  supplierName: supplier.brandName,
                  yarnDetailsCount: yarnDetails.length,
                });
              })
              .catch((error) => {
                console.error("[PurchaseForm] Failed to fetch full initial supplier details", error);
                // Keep using initial yarnDetails if fetch fails
                console.log("[PurchaseForm] Initial supplier loaded (using initial yarn details)", {
                  supplierId: supplier.id,
                  supplierName: supplier.brandName,
                  yarnDetailsCount: initialYarnDetails.length,
                });
              });
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
  }, [initialData.supplierId, initialData.items]);

  useEffect(() => {
    if (!selectedSupplier || supplierYarnDetails.length === 0) {
      return;
    }

    // Update suggestions for all items that have a query
    // This refreshes suggestions when supplier or yarn details change
    // NOTE: Don't include formData.items in dependencies - it causes re-renders when typing
    setAutocompleteStates(prevStates => {
      let hasChanges = false;
      const nextStates: typeof prevStates = {};

      Object.entries(prevStates).forEach(([itemId, state]) => {
        if (!state?.query?.trim()) {
          nextStates[itemId] = state;
          return;
        }

        // Get updated suggestions for the current query
        const suggestions = filterSupplierYarnOptions(state.query);

        const prevSuggestions = state.suggestions || [];
        const suggestionsChanged =
          prevSuggestions.length !== suggestions.length ||
          prevSuggestions.some((prevOption, index) => prevOption.id !== suggestions[index]?.id);

        // Only update if suggestions changed
        // Preserve showSuggestions state - don't interfere with user typing
        if (suggestionsChanged) {
          hasChanges = true;
          nextStates[itemId] = {
            ...state,
            suggestions,
            // Preserve showSuggestions - let handleYarnNameInput and onFocus control it
            showSuggestions: state.showSuggestions,
          };
        } else {
          nextStates[itemId] = state;
        }
      });

      return hasChanges ? nextStates : prevStates;
    });
  }, [selectedSupplier, supplierYarnDetails, filterSupplierYarnOptions]);

  // Filter suppliers based on query (always search full supplier list; boost draft-compatible vendors).
  const filterSuppliers = useCallback((query: string): Supplier[] => {
    if (!query || !query.trim()) {
      return [];
    }

    const normalizedQuery = query.trim().toLowerCase();
    const preferred = draftPreferredSupplierIdsRef.current;
    const filtered = suppliers.filter((supplier) => {
      const brandName = supplier.brandName?.toLowerCase() || "";
      const contactPerson = supplier.contactPersonName?.toLowerCase() || "";
      const email = supplier.email?.toLowerCase() || "";
      const city = supplier.city?.toLowerCase() || "";

      return (
        brandName.includes(normalizedQuery) ||
        contactPerson.includes(normalizedQuery) ||
        email.includes(normalizedQuery) ||
        city.includes(normalizedQuery)
      );
    });

    return filtered
      .sort((a, b) => {
        const pa = preferred.has(a.id) ? 1 : 0;
        const pb = preferred.has(b.id) ? 1 : 0;
        if (pb !== pa) return pb - pa;

        const aBrand = a.brandName?.toLowerCase() || "";
        const bBrand = b.brandName?.toLowerCase() || "";

        const aStartsWith = aBrand.startsWith(normalizedQuery);
        const bStartsWith = bBrand.startsWith(normalizedQuery);

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return aBrand.localeCompare(bBrand);
      })
      .slice(0, 12);
  }, [suppliers]);

  // Handle supplier input
  const handleSupplierInput = (value: string) => {
    const suggestions = value.trim() ? filterSuppliers(value) : [];

    setSupplierAutocomplete({
      query: value,
      suggestions,
      showSuggestions: suggestions.length > 0,
    });

    // If no supplier is selected or the value doesn't match selected supplier, clear selection
    if (!selectedSupplier || selectedSupplier.brandName !== value) {
      setSelectedSupplier(null);
      setSupplierYarnDetails([]);
      supplierYarnDetailsRef.current = [];
      const restored = cloneYarnPurchaseItems(itemsSnapshotWithoutSupplierRef.current);
      setFormData((prev) => ({
        ...prev,
        supplierId: "",
        supplierName: "",
        items: restored,
      }));
      setAutocompleteStates(() => {
        const next: Record<
          string,
          { query: string; suggestions: SupplierYarnOption[]; showSuggestions: boolean }
        > = {};
        restored.forEach((row) => {
          next[row.id] = {
            query: row.yarnName,
            suggestions: [],
            showSuggestions: false,
          };
        });
        return next;
      });
    }
  };

  // Select supplier suggestion
  const selectSupplierSuggestion = async (supplier: Supplier) => {
    supplierBindGenerationRef.current += 1;
    const bindGen = supplierBindGenerationRef.current;

    setSelectedSupplier(supplier);

    const initialYarnDetails = supplier.yarnDetails || [];
    setSupplierYarnDetails(initialYarnDetails);
    supplierYarnDetailsRef.current = initialYarnDetails;

    setSupplierAutocomplete({
      query: supplier.brandName,
      suggestions: [],
      showSuggestions: false,
    });

    let yarnDetails: SupplierYarnDetail[] = initialYarnDetails;

    try {
      const fullSupplier = await supplierService.getSupplierById(supplier.id);
      yarnDetails = fullSupplier.yarnDetails || [];

      setSupplierYarnDetails(yarnDetails);
      supplierYarnDetailsRef.current = yarnDetails;

      console.log("[PurchaseForm] Supplier selected and yarn details loaded", {
        supplierId: supplier.id,
        supplierName: supplier.brandName,
        yarnDetailsCount: yarnDetails.length,
      });
    } catch (error) {
      console.error("[PurchaseForm] Failed to fetch full supplier details", error);
      yarnDetails = initialYarnDetails;
      console.log("[PurchaseForm] Supplier selected (using initial yarn details)", {
        supplierId: supplier.id,
        supplierName: supplier.brandName,
        yarnDetailsCount: initialYarnDetails.length,
      });
    }

    let filteredSnapshot: YarnPurchaseItem[] = [];
    setFormData((prev) => {
      const sourceItems =
        itemsSnapshotWithoutSupplierRef.current.length > 0
          ? cloneYarnPurchaseItems(itemsSnapshotWithoutSupplierRef.current)
          : cloneYarnPurchaseItems(prev.items);

      filteredSnapshot = filterItemsForSupplierYarns(sourceItems, yarnDetails);

      const removedLines = sourceItems.filter(
        (item) => !filteredSnapshot.some((kept) => kept.id === item.id)
      );
      const removedNames = removedLines
        .map((i) => i.yarnName.trim() || "Unnamed yarn")
        .filter(Boolean);

      if (!yarnDetails.length && sourceItems.length > 0) {
        toast.error(
          `${supplier.brandName} has no yarn lineup on record. Add yarns to this supplier or pick another vendor.`,
          { duration: 8500 }
        );
      } else if (removedNames.length > 0) {
        toast.error(
          `${supplier.brandName} does not list: ${removedNames.join(", ")}`,
          { duration: 8500 }
        );
      }

      return {
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.brandName,
        items: filteredSnapshot,
      };
    });

    setAutocompleteStates((prev) => {
      const next: typeof prev = {};
      filteredSnapshot.forEach((it) => {
        const prevRow = prev[it.id];
        next[it.id] = {
          ...(prevRow ?? {}),
          query: it.yarnName,
          suggestions: [],
          showSuggestions: false,
        };
      });
      return next;
    });

    isTypingRef.current = {};
    void bindUnresolvedYarnLinesRef.current(bindGen, filteredSnapshot);
  };

  useEffect(() => {
    // Click outside handler for autocomplete
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Don't close if clicking on input or within autocomplete container
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Check if click is within any autocomplete dropdown
      const isWithinDropdown = target.closest('.autocomplete-dropdown');
      if (isWithinDropdown) {
        return;
      }

      // Handle yarn name autocomplete
      Object.entries(autocompleteRefs.current).forEach(([itemId, ref]) => {
        if (ref && !ref.contains(event.target as Node)) {
          // Only close if not currently typing and not clicking on the input itself
          if (!isTypingRef.current[itemId] && target.tagName !== 'INPUT') {
            setAutocompleteStates(prev => {
              const currentState = prev[itemId];
              if (currentState?.showSuggestions) {
                return {
                  ...prev,
                  [itemId]: { ...currentState, showSuggestions: false }
                };
              }
              return prev;
            });
          }
        }
      });

      // Handle supplier autocomplete
      if (supplierAutocompleteRef.current && !supplierAutocompleteRef.current.contains(event.target as Node)) {
        setSupplierAutocomplete(prev => ({
          ...prev,
          showSuggestions: false
        }));
      }
    };

    // Use a slight delay to ensure focus events fire first
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize supplier autocomplete query when supplier name is provided in initialData
  // This is a fallback for cases where the supplier might not be found by ID
  useEffect(() => {
    if (initialData.supplierName && !supplierAutocomplete.query && !isLoadingOptions) {
      setSupplierAutocomplete(prev => ({
        ...prev,
        query: initialData.supplierName || "",
      }));
    }
  }, [initialData.supplierName, isLoadingOptions]);

  // Ensure autocomplete states are initialized for all items
  // Only initialize missing states - don't interfere with user typing
  useEffect(() => {
    if (formData.items.length === 0) return;

    setAutocompleteStates(prevStates => {
      let hasChanges = false;
      const nextStates = { ...prevStates };

      formData.items.forEach((item) => {
        if (!item.id) return;

        const currentState = prevStates[item.id];

        // Only initialize if state doesn't exist - don't modify existing states
        // This prevents interference with user typing
        if (!currentState) {
          hasChanges = true;
          nextStates[item.id] = {
            query: item.yarnName || "",
            suggestions: [],
            showSuggestions: false,
          };
        }
      });

      return hasChanges ? nextStates : prevStates;
    });
  }, [formData.items.map(i => i.id).join(',')]); // Run when items change (by tracking their IDs)

  const addItem = () => {
    // Prefill est. delivery: first day of next month (from today)
    const today = new Date();
    const firstDayNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const defaultEstDelivery = firstDayNextMonth.toISOString().split("T")[0];

    const newItem: YarnPurchaseItem = {
      id: Date.now().toString(),
      yarnName: "",
      yarnId: "",
      sizeCount: "",
      sizeCountName: "",
      shadeCode: "",
      rate: 0,
      qty: 0,
      estimatedDeliveryDate: defaultEstDelivery,
      gst: 5,
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

  const handleDownloadYarnTemplate = () => {
    try {
      downloadYarnItemsTemplate();
      toast.success("Template downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Failed to download template");
    }
  };

  const handleExportYarnItems = () => {
    try {
      const rows: ParsedYarnRow[] = formData.items.map((item) => {
        const yarnTypeName =
          (typeof item.selectedYarnDetail?.yarnType === "string"
            ? item.selectedYarnDetail?.yarnType
            : (item.selectedYarnDetail?.yarnType as any)?.name) || "";
        const yarnSubtypeName =
          (typeof item.selectedYarnDetail?.yarnsubtype === "string"
            ? item.selectedYarnDetail?.yarnsubtype
            : (item.selectedYarnDetail?.yarnsubtype as any)?.subtype ||
              (item.selectedYarnDetail?.yarnsubtype as any)?.name) || "";
        return {
          shadeCode: item.shadeCode || "",
          countSize: item.sizeCountName || item.sizeCount || "",
          yarnType: yarnTypeName,
          yarnSubtype: yarnSubtypeName,
          rate: item.rate || 0,
          quantity: item.qty || 0,
          gst: item.gst || 0,
          estimatedDeliveryDate: item.estimatedDeliveryDate || "",
        };
      });
      downloadYarnItemsData(rows);
      toast.success("Yarn items exported");
    } catch (e) {
      console.error(e);
      toast.error("Failed to export yarn items");
    }
  };

  const addItemsFromParsedRows = useCallback(
    async (rows: ParsedYarnRow[]) => {
      const options = buildSupplierYarnOptions();
      const newItems: YarnPurchaseItem[] = [];
      const normalizeText = (value: string) =>
        value.trim().toLowerCase().replace(/\s+/g, " ");
      const normalizeShadeToken = (value: string) =>
        normalizeText(value).replace(/\s*\/\s*/g, "/");
      const normalizeCountToken = (value: string) =>
        normalizeText(value)
          .replace(/\s*\/\s*/g, "/")
          .replace(/['’`]/g, "");
      const extractLeadingCountFromYarnName = (value: string): string => {
        const firstPart = (value || "").split("-")[0]?.trim() || "";
        return firstPart;
      };
      const getCountCandidatesForOption = (option: SupplierYarnOption): string[] => {
        const candidates = new Set<string>();
        const detailCountSizes = extractCountSizeOptionsFromDetail(option.supplierDetail);
        detailCountSizes.forEach((cs) => {
          if (cs.name) candidates.add(normalizeCountToken(cs.name));
          if (cs.id) candidates.add(normalizeCountToken(cs.id));
        });
        const fromYarnName = extractLeadingCountFromYarnName(option.displayName);
        if (fromYarnName) candidates.add(normalizeCountToken(fromYarnName));
        return Array.from(candidates).filter(Boolean);
      };

      for (const r of rows) {
        const baseAmount = r.rate * r.quantity;
        const gstAmount = (baseAmount * r.gst) / 100;
        const excelShadeCode = r.shadeCode?.trim() || "";
        const excelCountSize = r.countSize?.trim() || "";
        const excelYarnType = r.yarnType?.trim() || "";
        const excelYarnSubtype = r.yarnSubtype?.trim() || "";
        const normalizedShadeCode = normalizeShadeToken(excelShadeCode);
        const normalizedCountSize = normalizeCountToken(excelCountSize);
        const normalizedYarnType = normalizeText(excelYarnType);
        const normalizedYarnSubtype = normalizeText(excelYarnSubtype);

        // Find strict match based on shade code, count size, yarn type, and yarn subtype.
        const strictMatch = options.find((o) => {
          const optionShadeCode = normalizeShadeToken(o.shadeCode || "");
          const shadeMatch =
            !normalizedShadeCode || optionShadeCode === normalizedShadeCode;
          if (!shadeMatch) return false;
          if (normalizedYarnType) {
            const optionYarnType = normalizeText(o.yarnTypeName || "");
            if (!optionYarnType || optionYarnType !== normalizedYarnType) {
              return false;
            }
          }
          if (normalizedYarnSubtype) {
            const optionYarnSubtype = normalizeText(o.yarnSubtypeName || "");
            if (!optionYarnSubtype || optionYarnSubtype !== normalizedYarnSubtype) {
              return false;
            }
          }

          if (!normalizedCountSize) return true; // Match by shade code if count size not provided

          const countCandidates = getCountCandidatesForOption(o);
          return countCandidates.some((count) => count === normalizedCountSize);
        });

        // Fallback: if strict match fails but shade code uniquely identifies a yarn, use it.
        const shadeMatchedOptions = options.filter((o) => {
          const optionShadeCode = normalizeShadeToken(o.shadeCode || "");
          if (!Boolean(normalizedShadeCode) || optionShadeCode !== normalizedShadeCode) {
            return false;
          }
          if (normalizedYarnType) {
            const optionYarnType = normalizeText(o.yarnTypeName || "");
            if (optionYarnType !== normalizedYarnType) return false;
          }
          if (!normalizedYarnSubtype) return true;
          const optionYarnSubtype = normalizeText(o.yarnSubtypeName || "");
          return optionYarnSubtype === normalizedYarnSubtype;
        });
        const match =
          strictMatch ||
          (shadeMatchedOptions.length === 1 ? shadeMatchedOptions[0] : undefined);

        // Preserve raw Excel values so import fills Shade Code / Count Size fields.
        let shadeCode = excelShadeCode;
        let sizeCount = excelCountSize;
        let sizeCountName = excelCountSize;
        let yarnId = "";
        let selectedYarnDetail: SupplierYarnDetail | undefined;
        let selectedCatalog: YarnCatalog | undefined;
        let notInSupplierData = true;
        let yarnName = match?.displayName || "";

        if (match) {
          notInSupplierData = false;
          shadeCode =
            match.shadeCode ??
            extractShadeCodeFromDetail(match.supplierDetail) ??
            "";
          selectedYarnDetail = match.supplierDetail;
          yarnId =
            match.supplierDetail?.yarnCatalogId ||
            extractIdFromValue(match.supplierDetail?.yarnCatalog) ||
            "";

          const countSizes = extractCountSizeOptionsFromDetail(
            match.supplierDetail
          );
          const countFromYarnName = extractLeadingCountFromYarnName(
            match.displayName
          );

          // Try to find the exact count size matched from Excel
          const matchedSize = r.countSize
            ? countSizes.find(cs => cs.name.trim().toLowerCase() === r.countSize.trim().toLowerCase())
            : null;

          if (matchedSize) {
            sizeCount = matchedSize.id;
            sizeCountName = matchedSize.name || matchedSize.id;
          } else if (countSizes.length > 0) {
            sizeCount = countSizes[0].id;
            sizeCountName = countSizes[0].name || countSizes[0].id;
          } else if (countFromYarnName) {
            // Many suppliers don't store countSize metadata; derive from yarnName prefix (e.g. "20/40-...")
            sizeCount = countFromYarnName;
            sizeCountName = countFromYarnName;
          } else {
            // Same as selectYarnSuggestion: get count size from catalog when supplier detail has none
            try {
              const catalogResponse =
                await yarnCatalogService.getYarnCatalogs({
                  yarnName: yarnName.trim(),
                  status: "active",
                  limit: 20,
                  page: 1,
                });
              const exactMatch = catalogResponse.results?.find(
                (c) =>
                  c.yarnName?.trim().toLowerCase() === yarnName.trim().toLowerCase()
              );
              if (exactMatch) {
                selectedCatalog = exactMatch;
                const catalogSizeId = extractIdFromValue(exactMatch.countSize);
                if (catalogSizeId) {
                  sizeCount = catalogSizeId;
                  sizeCountName =
                    (exactMatch.countSize as any)?.name ||
                    (exactMatch.countSize as any)?.label ||
                    catalogSizeId;
                }
              }
            } catch {
              // ignore catalog fetch errors
            }
          }
        }

        newItems.push({
          id: `excel-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          yarnName: yarnName,
          yarnId,
          sizeCount,
          sizeCountName,
          shadeCode,
          rate: r.rate,
          qty: r.quantity,
          estimatedDeliveryDate: r.estimatedDeliveryDate,
          gst: r.gst,
          subTotal: baseAmount + gstAmount,
          selectedYarnDetail,
          selectedCatalog,
          notInSupplierData,
        });
      }

      setFormData((prev) => ({
        ...prev,
        items: [...prev.items, ...newItems],
      }));
      setAutocompleteStates((prev) => {
        const next = { ...prev };
        newItems.forEach((item) => {
          next[item.id] = {
            query: item.yarnName,
            suggestions: [],
            showSuggestions: false,
          };
        });
        return next;
      });
    },
    [
      buildSupplierYarnOptions,
      extractCountSizeOptionsFromDetail,
      extractIdFromValue,
    ]
  );

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!formData.supplierId) {
      toast.error("Please select a supplier first");
      return;
    }
    setIsImportingExcel(true);
    try {
      const { rows, errors } = await parseYarnItemsExcelFile(file);
      if (errors.length) {
        errors.forEach((msg) => toast.error(msg));
      }
      if (rows.length) {
        await addItemsFromParsedRows(rows);
        toast.success(`${rows.length} item(s) added from Excel`);
      } else if (errors.length === 0) {
        toast.error("No valid rows found in the file");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to import Excel");
    } finally {
      setIsImportingExcel(false);
    }
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

  const selectYarnSuggestion = useCallback(async (itemId: string, option: SupplierYarnOption) => {
    const { supplierDetail, displayName } = option;

    console.log("[PurchaseForm] selectYarnSuggestion", {
      itemId,
      displayName,
      supplierDetail,
    });

    const yarnTypeId = extractIdFromValue(supplierDetail?.yarnType) || "";
    const yarnSubtypeId = extractIdFromValue(supplierDetail?.yarnsubtype) || "";

    const finalDisplayName = displayName.trim();

    // Try to match supplier yarn name with catalog yarn name to get countSize
    let catalogCountSizeId: string | undefined;
    let catalogCountSizeName: string | undefined;
    let matchedCatalog: YarnCatalog | undefined;

    try {
      const catalogResponse = await yarnCatalogService.getYarnCatalogs({
        yarnName: finalDisplayName,
        status: "active",
        limit: 20,
        page: 1,
      });

      // Find exact match by yarn name
      const exactMatch = catalogResponse.results?.find(
        (catalog) => catalog.yarnName?.trim().toLowerCase() === finalDisplayName.toLowerCase()
      );

      if (exactMatch) {
        matchedCatalog = exactMatch;
        catalogCountSizeId = extractIdFromValue(exactMatch.countSize);
        catalogCountSizeName =
          (exactMatch.countSize && (exactMatch.countSize as any)?.name) ||
          (exactMatch.countSize && (exactMatch.countSize as any)?.label) ||
          undefined;

        console.log("[PurchaseForm] Found matching catalog for yarn name", {
          yarnName: finalDisplayName,
          catalogId: exactMatch.id,
          catalogCountSizeId,
          catalogCountSizeName,
        });
      }
    } catch (error) {
      console.error("[PurchaseForm] Failed to fetch catalog for yarn name matching", error);
    }

    // Fallback to supplier detail count sizes if catalog match not found
    const detailCountSizeOptions = extractCountSizeOptionsFromDetail(supplierDetail);
    const fallbackCountSizeFromDetail = detailCountSizeOptions.length === 1 ? detailCountSizeOptions[0] : undefined;

    // Prioritize catalog countSize, then fallback to supplier detail
    const resolvedCountSizeId = catalogCountSizeId || fallbackCountSizeFromDetail?.id;
    const resolvedCountSizeName = catalogCountSizeName || fallbackCountSizeFromDetail?.name;

    const updates: Partial<YarnPurchaseItem> = {
      yarnName: finalDisplayName,
      yarnId: supplierDetail.yarnCatalogId || extractIdFromValue(supplierDetail.yarnCatalog) || matchedCatalog?.id || "",
      yarnTypeId,
      yarnSubtypeId,
      shadeCode: option.shadeCode || "",
      selectedYarnDetail: supplierDetail,
      selectedCatalog: matchedCatalog, // Store matched catalog for reference
      notInSupplierData: false,
    };

    console.log("[PurchaseForm] selectYarnSuggestion resolved fields", {
      itemId,
      finalDisplayName,
      yarnTypeId,
      yarnSubtypeId,
      shadeCode: option.shadeCode,
      resolvedCountSizeId,
      resolvedCountSizeName,
      catalogMatched: Boolean(matchedCatalog),
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

  /**
   * After supplier.yarnDetails hydrate: binds count size + shade for lines matching the lineup.
   * @param generation - Must match supplierBindGenerationRef or the run aborts (supplier changed).
   * @param rows - Items to reconcile (supplier selection uses vendor-filtered lines; initial hydrate uses full form lines).
   */
  const bindUnresolvedYarnLines = useCallback(
    async (generation: number, rows: YarnPurchaseItem[]) => {
      const yarnSnapshot = supplierYarnDetailsRef.current;
      if (!yarnSnapshot.length) {
        return;
      }

      for (const row of rows) {
        if (generation !== supplierBindGenerationRef.current) {
          return;
        }
        if (row.selectedYarnDetail) {
          continue;
        }
        if (!row.yarnName?.trim() && !String(row.yarnId || "").trim()) {
          continue;
        }
        const match = resolveSupplierYarnOptionForItem(row, yarnSnapshot);
        if (match) {
          await selectYarnSuggestion(row.id, match);
          if (generation !== supplierBindGenerationRef.current) {
            return;
          }
        }
      }
    },
    [resolveSupplierYarnOptionForItem, selectYarnSuggestion],
  );

  bindUnresolvedYarnLinesRef.current = bindUnresolvedYarnLines;

  /**
   * Yarn name field: on real edits, clears resolved supplier binding; on same-value refresh (focus), keeps it and tries to bind.
   * @param itemId - Line item id
   * @param value - Input value
   */
  const handleYarnNameInput = useCallback(
    (itemId: string, value: string) => {
      isTypingRef.current[itemId] = true;

      const prevItem = formDataItemsRef.current.find((i) => i.id === itemId);
      const nameUnchanged = Boolean(prevItem && value.trim() === (prevItem.yarnName || "").trim());

      const hasYarnDetails =
        supplierYarnDetailsRef.current.length > 0 || supplierYarnDetails.length > 0;
      const suggestions =
        selectedSupplier && value.trim() && hasYarnDetails ? filterSupplierYarnOptions(value) : [];

      console.log("[PurchaseForm] handleYarnNameInput", {
        itemId,
        rawValue: value,
        nameUnchanged,
        hasSupplier: Boolean(selectedSupplier),
        supplierName: selectedSupplier?.brandName,
        supplierId: selectedSupplier?.id,
        yarnDetailsCount: supplierYarnDetails.length,
        supplierYarnDetailsRefCount: supplierYarnDetailsRef.current.length,
        hasYarnDetails,
        suggestionsCount: suggestions.length,
        suggestionSamples: suggestions.map((s) => s.displayName).slice(0, 5),
      });

      setAutocompleteStates((prev) => ({
        ...prev,
        [itemId]: {
          query: value,
          suggestions,
          showSuggestions: suggestions.length > 0,
        },
      }));

      if (nameUnchanged) {
        if (prevItem && !prevItem.selectedYarnDetail && value.trim()) {
          const match = resolveSupplierYarnOptionForItem(prevItem);
          if (match) {
            void selectYarnSuggestion(itemId, match);
          }
        }
        setTimeout(() => {
          isTypingRef.current[itemId] = false;
        }, 500);
        return;
      }

      updateItem(itemId, {
        yarnName: value,
        yarnId: "",
        selectedYarnDetail: undefined,
        selectedCatalog: undefined,
        sizeCount: "",
        sizeCountName: "",
        yarnTypeId: undefined,
        yarnSubtypeId: undefined,
        shadeCode: "",
        notInSupplierData: undefined,
      });

      setTimeout(() => {
        isTypingRef.current[itemId] = false;
      }, 500);
    },
    [
      selectedSupplier,
      supplierYarnDetails,
      filterSupplierYarnOptions,
      updateItem,
      resolveSupplierYarnOptionForItem,
      selectYarnSuggestion,
    ],
  );

  /**
   * Recompute when line catalog link or supplier-yarn binding changes (draft preload often lacks selectedYarnDetail).
   */
  const yarnLineHydrationKey = useMemo(
    () =>
      formData.items
        .map(
          (i) =>
            `${i.id}:${String(i.yarnId ?? "")}:${i.selectedYarnDetail ? "1" : "0"}:${normalizeYarnLabel(i.yarnName || "").slice(0, 80)}`,
        )
        .join("|"),
    [formData.items],
  );

  useEffect(() => {
    if (!selectedSupplier || supplierYarnDetails.length === 0) {
      return;
    }

    formData.items.forEach((item) => {
      if (!item) return;
      if (item.selectedYarnDetail) return;
      if (!item.yarnName && !item.yarnId) return;

      // Skip if user is currently typing in this input
      if (isTypingRef.current[item.id]) {
        return;
      }

      const match = resolveSupplierYarnOptionForItem(item);

      if (match) {
        // Update autocomplete state without showing suggestions
        // Only update if not currently showing suggestions (user might be typing)
        setAutocompleteStates(prev => {
          const currentState = prev[item.id];
          // Don't interfere if user is actively interacting with this input
          if (currentState?.showSuggestions) {
            return prev;
          }
          return {
            ...prev,
            [item.id]: {
              query: item.yarnName,
              suggestions: [],
              showSuggestions: false, // Explicitly set to false to prevent dropdown from showing
            },
          };
        });
        // Only select the suggestion if we don't already have a selectedYarnDetail
        // This prevents re-triggering for items that are already properly configured
        if (!item.selectedYarnDetail) {
          selectYarnSuggestion(item.id, match);
        }
      }
      // Removed the else block that was closing suggestions - let user typing control it
    });
  }, [formData.items, selectedSupplier, supplierYarnDetails, resolveSupplierYarnOptionForItem, selectYarnSuggestion]);

  /**
   * Fetches canonical catalog yarnName for rows with yarnId but no supplier detail match (truncated UI labels).
   * Then binds the correct supplier line so SIZE options populate.
   */
  useEffect(() => {
    if (!selectedSupplier || supplierYarnDetails.length === 0) {
      return undefined;
    }

    const needsHydration = formData.items.filter(
      (i) =>
        String(i.yarnId || "").trim().length > 0 &&
        !i.selectedYarnDetail &&
        (i.yarnName || "").trim().length > 0,
    );

    if (needsHydration.length === 0) {
      return undefined;
    }

    const runId = ++yarnCatalogHydrateRunIdRef.current;

    void (async () => {
      for (const item of needsHydration) {
        if (yarnCatalogHydrateRunIdRef.current !== runId) {
          return;
        }
        try {
          const catalog = await yarnCatalogService.getYarnCatalogById(String(item.yarnId));
          if (yarnCatalogHydrateRunIdRef.current !== runId || !catalog?.yarnName) {
            continue;
          }

          const options = buildSupplierYarnOptions();
          if (options.length === 0) {
            continue;
          }

          const canon = normalizeYarnLabel(catalog.yarnName);
          const shadeNorm = item.shadeCode?.trim().toLowerCase() || "";

          const byCatalogId = options.find((o) => {
            const cid = catalogIdFromSupplierDetail(o.supplierDetail);
            return Boolean(cid && yarnCatalogIdsEquivalent(cid, catalog.id));
          });

          const byNameExact = options.find((o) => {
            if (normalizeYarnLabel(o.displayName) !== canon) {
              return false;
            }
            if (shadeNorm && o.shadeCode?.trim().toLowerCase() !== shadeNorm) {
              return false;
            }
            return true;
          });

          const byNameFuzzy = options.find((o) => {
            const dn = normalizeYarnLabel(o.displayName);
            if (dn.length < 8 || canon.length < 8) {
              return false;
            }
            const prefix = Math.min(60, dn.length, canon.length);
            const prefixMatch =
              dn.startsWith(canon.slice(0, prefix)) || canon.startsWith(dn.slice(0, prefix));
            if (!prefixMatch) {
              return false;
            }
            if (shadeNorm && o.shadeCode?.trim().toLowerCase() !== shadeNorm) {
              return false;
            }
            return true;
          });

          const winner = byCatalogId ?? byNameExact ?? byNameFuzzy;

          if (winner && yarnCatalogHydrateRunIdRef.current === runId) {
            await selectYarnSuggestion(item.id, winner);
          }
        } catch (err) {
          console.warn("[PurchaseForm] Yarn catalog hydrate for SIZE failed", item.yarnId, err);
        }
      }
    })();

    return undefined;
  }, [
    selectedSupplier?.id,
    supplierYarnDetails.length,
    yarnLineHydrationKey,
    buildSupplierYarnOptions,
    catalogIdFromSupplierDetail,
    selectYarnSuggestion,
  ]);

  const calculateTotals = () => {
    const subTotal = formData.items.reduce((sum, item) => {
      const rate = Number(item.rate);
      const qty = Number(item.qty);
      const r = Number.isFinite(rate) ? rate : 0;
      const q = Number.isFinite(qty) ? qty : 0;
      return sum + r * q;
    }, 0);

    const totalGst = formData.items.reduce((sum, item) => {
      const rate = Number(item.rate);
      const qty = Number(item.qty);
      const gstPct = Number(item.gst);
      const r = Number.isFinite(rate) ? rate : 0;
      const q = Number.isFinite(qty) ? qty : 0;
      const g = Number.isFinite(gstPct) ? gstPct : 0;
      const baseAmount = r * q;
      return sum + (baseAmount * g) / 100;
    }, 0);

    const safeSub = Number.isFinite(subTotal) ? subTotal : 0;
    const safeGst = Number.isFinite(totalGst) ? totalGst : 0;
    const total = safeSub + safeGst;
    const safeTotal = Number.isFinite(total) ? total : 0;

    return { subTotal: safeSub, totalGst: safeGst, total: safeTotal };
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

    // Prioritize catalog countSize if available (from matched catalog)
    if (item.selectedCatalog?.countSize) {
      const catalogCountSizeId = extractIdFromValue(item.selectedCatalog.countSize);
      const catalogCountSizeName =
        (item.selectedCatalog.countSize && (item.selectedCatalog.countSize as any)?.name) ||
        (item.selectedCatalog.countSize && (item.selectedCatalog.countSize as any)?.label) ||
        undefined;
      if (catalogCountSizeId) {
        uniqueOptions.set(catalogCountSizeId, catalogCountSizeName || catalogCountSizeId);
      }
    }

    // Add count sizes from supplier yarn detail
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
    if (formData.creditDays == null || formData.creditDays < 0) {
      console.warn('[PurchaseForm] Validation failed: credit days invalid');
      toast.error("Credit Days is required (min 0)");
      return;
    }
    if (!formData.estimatedOrderDeliveryDate?.trim()) {
      console.warn('[PurchaseForm] Validation failed: estimated order delivery date missing');
      toast.error("Estimated Order Delivery Date is required");
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
      const hasYarnName = Boolean((item.yarnName || "").trim());
      const isUnmatchedItem = hasYarnName
        ? !isYarnInSupplierData(item.yarnName || "")
        : item.notInSupplierData === true;

      if (isUnmatchedItem) {
        console.warn(
          `[PurchaseForm] Validation failed: yarn not matched for item ${i + 1}`,
          { yarnName: item.yarnName, shadeCode: item.shadeCode, sizeCount: item.sizeCount }
        );
        toast.error(
          `Item ${i + 1} is not matched with supplier yarn data. Please fix before submit.`
        );
        return;
      }

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

  /**
   * Persists the current form as a draft (minimal validation; incomplete lines allowed).
   */
  const handleSaveDraft = async () => {
    if (!onSaveDraft) {
      return;
    }

    const totals = calculateTotals();
    const purchaseDate =
      formData.purchaseDate?.trim() ||
      new Date().toISOString().split("T")[0];
    const dataToSubmit: PurchaseOrderData = {
      ...formData,
      purchaseDate,
      ...totals,
      status: "draft",
    };

    try {
      await onSaveDraft(dataToSubmit);
    } catch (error) {
      console.error("Draft save error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save draft");
    }
  };

  if (isLoadingOptions) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3 opacity-50"></div>
          <p className="text-xs text-gray-400 font-bold tracking-[0.2em] uppercase">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showEditWarning && (
        <div
          role="alert"
          className="rounded border border-red-300 bg-red-50 px-3 py-2.5 text-xs text-red-800"
        >
          <strong className="font-semibold">Warning:</strong> Updating this PO may affect lots data and packlist data.
          After updating, verify and fix packlist and lots, and confirm all details.
        </div>
      )}
      {/* Purchase Header Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Purchase Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.purchaseDate}
            onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={supplierAutocompleteRef}>
            <input
              type="text"
              value={supplierAutocomplete.query || formData.supplierName}
              onChange={(e) => handleSupplierInput(e.target.value)}
              onFocus={(e) => {
                const value = e.target.value;
                if (value.trim()) {
                  const suggestions = filterSuppliers(value);
                  setSupplierAutocomplete((prev) => ({
                    ...prev,
                    query: value,
                    suggestions,
                    showSuggestions: suggestions.length > 0,
                  }));
                } else if (supplierAutocomplete.suggestions.length > 0) {
                  setSupplierAutocomplete((prev) => ({
                    ...prev,
                    showSuggestions: true,
                  }));
                }
              }}
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
              placeholder="Type to search supplier..."
              required
            />
            {supplierAutocomplete.showSuggestions && supplierAutocomplete.suggestions.length > 0 && (
              <div
                role="listbox"
                aria-label="Supplier suggestions"
                className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
              >
                {supplierAutocomplete.suggestions.map((supplier) => (
                  <div
                    key={supplier.id}
                    onClick={() => selectSupplierSuggestion(supplier)}
                    className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-xs font-medium text-gray-900">{supplier.brandName}</div>
                    {(supplier.contactPersonName || supplier.city) && (
                      <div className="text-[10px] text-gray-500">
                        {supplier.contactPersonName && <span>{supplier.contactPersonName}</span>}
                        {supplier.city && (
                          <span className={supplier.contactPersonName ? "ml-2" : ""}>
                            {supplier.city}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Credit Days <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min={0}
            value={formData.creditDays}
            onChange={(e) => setFormData(prev => ({ ...prev, creditDays: Math.max(0, Number(e.target.value) || 0) }))}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 mb-1 block">
            Estimated Order Delivery Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.estimatedOrderDeliveryDate}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedOrderDeliveryDate: e.target.value }))}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
            required
          />
        </div>
      </div>

      {/* Purchase Items Table Section */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h4 className="text-xs font-bold text-gray-800">Yarn Items</h4>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadYarnTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <i className="ri-file-excel-2-line text-xs text-green-600"></i>
              Download Template
            </button>
            <button
              type="button"
              onClick={handleExportYarnItems}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              disabled={formData.items.length === 0}
            >
              <i className="ri-download-2-line text-xs"></i>
              Export Excel
            </button>
            <button
              type="button"
              onClick={() => excelFileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
              disabled={!formData.supplierId || isImportingExcel}
            >
              {isImportingExcel ? (
                <>
                  <span className="animate-spin inline-block h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></span>
                  Importing...
                </>
              ) : (
                <>
                  <i className="ri-file-upload-line text-xs"></i>
                  Import Excel
                </>
              )}
            </button>
            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleExcelImport}
            />
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              disabled={!formData.supplierId}
            >
              <i className="ri-add-line text-xs"></i>
              Add Item
            </button>
          </div>
        </div>

        {!formData.supplierId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3">
            <p className="text-xs text-yellow-800">
              <i className="ri-information-line me-1.5"></i>
              Please select a supplier first to add yarn items
            </p>
          </div>
        )}

        {formData.items.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-3">
              <i className="ri-shopping-cart-line text-3xl"></i>
            </div>
            <h3 className="text-xs font-medium text-gray-900 mb-1">No Items Added</h3>
            <p className="text-[10px] text-gray-500 mb-3">Add yarn items to create a purchase order.</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleDownloadYarnTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50"
              >
                <i className="ri-file-excel-2-line text-green-600"></i>
                Download Template
              </button>
              <button
                type="button"
                onClick={handleExportYarnItems}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                disabled={formData.items.length === 0}
              >
                <i className="ri-download-2-line"></i>
                Export Excel
              </button>
              <button
                type="button"
                onClick={() => excelFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                disabled={!formData.supplierId || isImportingExcel}
              >
                {isImportingExcel ? (
                  <><span className="animate-spin inline-block h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full"></span> Importing...</>
                ) : (
                  <><i className="ri-file-upload-line"></i> Import Excel</>
                )}
              </button>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700"
                disabled={!formData.supplierId}
              >
                <i className="ri-add-line text-xs"></i>
                Add First Item
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ position: 'relative', overflow: 'visible' }}>
            <div style={{ position: 'relative', overflow: 'visible' }}>
              <table className="min-w-full border border-gray-300 bg-white" style={{ position: 'relative' }}>
                <thead className="bg-gray-50/30">
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[200px]">
                      Yarn Name <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                      Size <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                      Shade Code
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                      Rate (₹) <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[120px]">
                      Quantity (kg) <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[180px]">
                      Est. Delivery <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                      GST (%) <span className="text-red-500">*</span>
                    </th>
                    <th className="border border-gray-300 px-2 py-1.5 text-center text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[80px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    // Get autocomplete state, defaulting to item's yarnName if state doesn't exist
                    // This ensures existing values are displayed without triggering suggestions
                    const autocompleteState = autocompleteStates[item.id] || {
                      query: item.yarnName || "",
                      suggestions: [],
                      showSuggestions: false
                    };
                    const availableCountSizes = getAvailableCountSizes(item);
                    // Highlight unmatched imported rows and manual invalid yarn names.
                    const hasYarnName = Boolean((item.yarnName || "").trim());
                    const showNotMatchedError =
                      Boolean(formData.supplierId) &&
                      (hasYarnName
                        ? !isYarnInSupplierData(item.yarnName || "")
                        : item.notInSupplierData === true);

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-gray-50 ${showNotMatchedError ? "border-2 border-red-400 bg-red-50/50" : ""}`}
                      >
                        {/* Yarn Name with Autocomplete - td z-index when dropdown open so list stacks above following rows */}
                        <td
                          className="border border-gray-300 px-2 py-1.5"
                          style={{
                            position: 'relative',
                            overflow: 'visible',
                            zIndex: autocompleteState.showSuggestions && autocompleteState.suggestions.length > 0 ? 50 : undefined,
                          }}
                        >
                          <div className="relative" ref={el => { autocompleteRefs.current[item.id] = el; }}>
                            {showNotMatchedError && (
                              <p className="text-[10px] text-red-600 font-medium mb-1">Not matched</p>
                            )}
                            <input
                              type="text"
                              value={autocompleteState.query !== undefined ? autocompleteState.query : (item.yarnName || "")}
                              onChange={(e) => {
                                handleYarnNameInput(item.id, e.target.value);
                              }}
                              onFocus={() => {
                                // Mark as typing to prevent click outside from closing
                                isTypingRef.current[item.id] = true;

                                // Similar to supplier autocomplete - show suggestions if they exist
                                // Trigger input handler if there's a value to refresh suggestions
                                const currentValue = autocompleteState.query !== undefined ? autocompleteState.query : item.yarnName;
                                if (currentValue && selectedSupplier) {
                                  handleYarnNameInput(item.id, currentValue);
                                } else if (autocompleteState.suggestions.length > 0) {
                                  setAutocompleteStates(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], showSuggestions: true }
                                  }));
                                } else if (selectedSupplier && supplierYarnDetails.length > 0) {
                                  // If input is empty but supplier is selected, show all suggestions on focus
                                  // This helps user discover available yarns
                                  const allOptions = buildSupplierYarnOptions();
                                  if (allOptions.length > 0) {
                                    setAutocompleteStates(prev => ({
                                      ...prev,
                                      [item.id]: {
                                        query: currentValue || "",
                                        suggestions: allOptions.slice(0, 20), // Show first 20 options
                                        showSuggestions: true
                                      }
                                    }));
                                  }
                                }

                                // Clear typing flag after a delay
                                setTimeout(() => {
                                  isTypingRef.current[item.id] = false;
                                }, 100);
                              }}
                              onMouseDown={(e) => {
                                // Prevent click outside handler from closing dropdown when clicking on input
                                e.stopPropagation();
                              }}
                              className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                              placeholder="Type to search..."
                              required
                            />
                            {autocompleteState.showSuggestions && autocompleteState.suggestions.length > 0 && (
                              <div
                                className="autocomplete-dropdown absolute z-[100] w-full mt-1 rounded-lg shadow-xl max-h-60 overflow-auto border border-gray-200 bg-white"
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  left: 0,
                                  right: 0,
                                  marginTop: 4,
                                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                                }}
                                onMouseDown={(e) => {
                                  // Prevent click outside handler from closing when clicking on dropdown
                                  e.stopPropagation();
                                }}
                              >
                                {autocompleteState.suggestions.map((option, idx) => {
                                  const displayName = option.displayName;
                                  const shadeCode = option.shadeCode;
                                  const metadata = option.metadataSummary;

                                  return (
                                    <div
                                      key={idx}
                                      onClick={() => selectYarnSuggestion(item.id, option)}
                                      className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="text-xs font-medium text-gray-900">{displayName}</div>
                                      {(metadata || shadeCode) && (
                                        <div className="text-[10px] text-gray-500">
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
                        </td>

                        {/* Size/Count */}
                        <td className="border border-gray-300 px-2 py-1.5">
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
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            required
                            disabled={availableCountSizes.length === 0}
                          >
                            <option value="">Select</option>
                            {availableCountSizes.map(cs => (
                              <option key={cs.id} value={cs.id}>
                                {cs.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Shade Code */}
                        <td className="border border-gray-300 px-2 py-1.5">
                          <input
                            type="text"
                            value={item.shadeCode}
                            onChange={(e) => updateItem(item.id, { shadeCode: e.target.value })}
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            placeholder="Shade code"
                          />
                        </td>

                        {/* Rate - decimal allowed */}
                        <td className="border border-gray-300 px-2 py-1.5">
                          <input
                            type="text"
                            value={item.displayRate !== undefined ? item.displayRate : (item.rate === 0 ? "" : String(item.rate))}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                const keepRate = value === "" || value === "." || value.endsWith(".");
                                updateItem(item.id, {
                                  displayRate: value,
                                  rate: keepRate ? item.rate : (parseFloat(value) || 0),
                                });
                              }
                            }}
                            onBlur={() => {
                              const raw = item.displayRate ?? String(item.rate);
                              const num = parseFloat(raw);
                              updateItem(item.id, { rate: isNaN(num) ? 0 : num, displayRate: undefined });
                            }}
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            placeholder="0.00"
                            required
                          />
                        </td>

                        {/* Quantity - decimal allowed */}
                        <td className="border border-gray-300 px-2 py-1.5">
                          <input
                            type="text"
                            value={item.displayQty !== undefined ? item.displayQty : (item.qty === 0 ? "" : String(item.qty))}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                const keepQty = value === "" || value === "." || value.endsWith(".");
                                updateItem(item.id, {
                                  displayQty: value,
                                  qty: keepQty ? item.qty : (parseFloat(value) || 0),
                                });
                              }
                            }}
                            onBlur={() => {
                              const raw = item.displayQty ?? String(item.qty);
                              const num = parseFloat(raw);
                              updateItem(item.id, { qty: isNaN(num) ? 0 : num, displayQty: undefined });
                            }}
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            placeholder="0.00"
                            required
                          />
                        </td>

                        {/* Estimated Delivery Date */}
                        <td className="border border-gray-300 px-2 py-1.5">
                          <input
                            type="date"
                            value={item.estimatedDeliveryDate}
                            onChange={(e) => updateItem(item.id, { estimatedDeliveryDate: e.target.value })}
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            required
                          />
                        </td>

                        {/* GST - decimal allowed (0–100) */}
                        <td className="border border-gray-300 px-2 py-1.5">
                          <input
                            type="text"
                            value={item.displayGst !== undefined ? item.displayGst : (item.gst === 0 ? "" : String(item.gst))}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || /^\d*\.?\d*$/.test(value)) {
                                const numValue = parseFloat(value);
                                const inRange = value === "" || value === "." || value.endsWith(".") || (!isNaN(numValue) && numValue >= 0 && numValue <= 100);
                                if (inRange) {
                                  const keepGst = value === "" || value === "." || value.endsWith(".");
                                  updateItem(item.id, {
                                    displayGst: value,
                                    gst: keepGst ? item.gst : (isNaN(numValue) ? 0 : numValue),
                                  });
                                }
                              }
                            }}
                            onBlur={() => {
                              const raw = item.displayGst ?? String(item.gst);
                              const num = parseFloat(raw);
                              let gst = isNaN(num) ? 0 : num;
                              if (gst > 100) gst = 100;
                              if (gst < 0) gst = 0;
                              updateItem(item.id, { gst, displayGst: undefined });
                            }}
                            className="w-full px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-0 focus:border-purple-300"
                            placeholder="0.00"
                            required
                          />
                        </td>

                        {/* Action - Delete */}
                        <td className="border border-gray-300 px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-0.5 rounded transition-colors"
                            title="Remove Item"
                          >
                            <i className="ri-delete-bin-line text-xs"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Totals Section - Between Table and Notes */}
      {formData.items.length > 0 && (
        <div className="border-t pt-4">
          <div className="max-w-lg ml-auto">
            <table className="min-w-full border border-gray-200 bg-white">
              <thead>
                <tr>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-center uppercase tracking-wider">Total Qty</th>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-center uppercase tracking-wider">SubTotal</th>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-center uppercase tracking-wider">GST</th>
                  <th className="border border-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 bg-gray-50/30 text-center uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right">
                    {formData.items.reduce((sum, item) => sum + (item.qty || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right">
                    ₹{formData.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs text-gray-900 text-right">
                    ₹{formData.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="border border-gray-200 px-2 py-1.5 text-xs font-bold text-gray-900 text-right">
                    ₹{formData.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Notes - Below Table */}
      <div className="border-t pt-4">
        <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
          rows={2}
          placeholder="Additional notes about the purchase order..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end flex-wrap gap-2 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
          disabled={isSubmitting || isSavingDraft}
          aria-label="Cancel and go back"
        >
          Cancel
        </button>
        {onSaveDraft && (
          <button
            type="button"
            onClick={() => {
              void handleSaveDraft();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 text-[11px] font-bold rounded border border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
            disabled={isSubmitting || isSavingDraft}
            aria-label="Save purchase order as draft without sending to supplier"
          >
            {isSavingDraft ? (
              <>
                <i className="ri-loader-4-line animate-spin text-xs"></i>
                Saving draft…
              </>
            ) : (
              <>
                <i className="ri-draft-line text-xs"></i>
                Save draft
              </>
            )}
          </button>
        )}
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
          disabled={isSubmitting || isSavingDraft}
          aria-label={submitButtonText}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin text-xs"></i>
              Submitting...
            </>
          ) : (
            <>
              <i className="ri-send-plane-line text-xs"></i>
              {submitButtonText}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default PurchaseForm;
