"use client";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import supplierService, { Supplier, SupplierYarnDetail } from "@/shared/services/supplierService";
import yarnTypeService, { YarnType } from "@/shared/services/yarnTypeService";
import yarnCountSizeService, { CountSize } from "@/shared/services/yarnCountSizeService";

export type PurchaseOrderStatus = 
  | 'submitted to supplier' 
  | 'in transit' 
  | 'delivered' 
  | 'rejected' 
  | 'QC pending' 
  | 'partially delivered' 
  | 'stocked';

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
    suggestions: SupplierYarnDetail[];
    showSuggestions: boolean;
  }>>({});

  const autocompleteRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
  }, [initialData.supplierId]);

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
    const supplier = suppliers.find(s => s.id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setSupplierYarnDetails(supplier.yarnDetails || []);
      setFormData(prev => ({
        ...prev,
        supplierId: supplier.id,
        supplierName: supplier.brandName
      }));
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

  const handleYarnNameInput = (itemId: string, value: string) => {
    setAutocompleteStates(prev => {
      const current = prev[itemId] || { query: "", suggestions: [], showSuggestions: false };
      const query = value.toLowerCase();
      
      if (!selectedSupplier || !query) {
        return {
          ...prev,
          [itemId]: { ...current, query: value, suggestions: [], showSuggestions: false }
        };
      }

      const suggestions = supplierYarnDetails.filter(detail => {
        const typeName = typeof detail.yarnType === 'object' ? detail.yarnType?.name : '';
        const subtypeName = typeof detail.yarnsubtype === 'object' 
          ? (detail.yarnsubtype as any)?.subtype || (detail.yarnsubtype as any)?.name || ''
          : '';
        const colorName = typeof detail.color === 'object' ? detail.color?.name : '';
        const searchText = `${typeName} ${subtypeName} ${colorName} ${detail.shadeNumber || ''}`.toLowerCase();
        return searchText.includes(query);
      });

      return {
        ...prev,
        [itemId]: {
          query: value,
          suggestions: suggestions.slice(0, 10),
          showSuggestions: suggestions.length > 0
        }
      };
    });
  };

  const selectYarnSuggestion = (itemId: string, detail: SupplierYarnDetail) => {
    // Extract names from the detail structure
    const typeName = typeof detail.yarnType === 'object' ? detail.yarnType?.name : '';
    const subtypeName = typeof detail.yarnsubtype === 'object' 
      ? (detail.yarnsubtype as any)?.subtype || (detail.yarnsubtype as any)?.name || ''
      : '';
    const colorName = typeof detail.color === 'object' ? detail.color?.name : '';
    const displayName = `${typeName} ${subtypeName} ${colorName} ${detail.shadeNumber || ''}`.trim();

    // Extract IDs - handle both _id and id
    const yarnTypeId = typeof detail.yarnType === 'object' 
      ? (detail.yarnType as any)?._id || (detail.yarnType as any)?.id || detail.yarnType
      : detail.yarnType;
    const yarnSubtypeId = typeof detail.yarnsubtype === 'object' 
      ? (detail.yarnsubtype as any)?._id || (detail.yarnsubtype as any)?.id || detail.yarnsubtype
      : detail.yarnsubtype;

    const extractYarnId = (yarnDetail: SupplierYarnDetail): string | undefined => {
      const valueToId = (value: unknown): string | undefined => {
        if (!value) return undefined;
        if (typeof value === 'string') {
          return value;
        }
        if (typeof value === 'number') {
          return String(value);
        }
        if (typeof value === 'object') {
          const obj = value as Record<string, unknown>;
          if (typeof obj._id === 'string') return obj._id;
          if (typeof obj.id === 'string') return obj.id;
          if (typeof obj._id === 'number') return String(obj._id);
          if (typeof obj.id === 'number') return String(obj.id);
        }
        return undefined;
      };

      const priorityKeys = [
        'yarnId',
        'yarnCatalogId',
        'catalogId',
        'yarn',
        'yarnCatalog',
        'catalog',
        'yarncatalog',
        'yarn_catalog',
        'yarn_catalog_id',
        'yarncatalogid',
        'catalogYarn',
        'catalogYarnId',
        'id',
        '_id',
      ];

      const visited = new Set<unknown>();

      const traverse = (value: unknown, depth = 0): string | undefined => {
        if (!value || depth > 4 || visited.has(value)) {
          return undefined;
        }

        visited.add(value);

        const direct = valueToId(value);
        if (direct) {
          return direct;
        }

        if (Array.isArray(value)) {
          for (const item of value) {
            const result = traverse(item, depth + 1);
            if (result) return result;
          }
          return undefined;
        }

        if (typeof value === 'object') {
          const obj = value as Record<string, unknown>;

          for (const key of priorityKeys) {
            if (key in obj) {
              const result = valueToId(obj[key]);
              if (result) return result;

              const nested = traverse(obj[key], depth + 1);
              if (nested) return nested;
            }
          }

          for (const [key, nestedValue] of Object.entries(obj)) {
            if (typeof nestedValue === 'object') {
              if (/(yarn|catalog|id)$/i.test(key)) {
                const nestedId = valueToId(nestedValue);
                if (nestedId) return nestedId;
              }
              const result = traverse(nestedValue, depth + 1);
              if (result) return result;
            } else if (typeof nestedValue === 'string' && /(yarn|catalog|id)$/i.test(key)) {
              return nestedValue;
            } else if (typeof nestedValue === 'number' && /(yarn|catalog|id)$/i.test(key)) {
              return String(nestedValue);
            }
          }
        }

        return undefined;
      };

      return traverse(yarnDetail);
    };

    const yarnId = extractYarnId(detail);

    console.log('[PurchaseForm] Selected yarn detail', { yarnId, detail });

    updateItem(itemId, {
      yarnName: displayName,
      yarnId: yarnId ? String(yarnId) : '',
      yarnTypeId: yarnTypeId || '',
      yarnSubtypeId: yarnSubtypeId || '',
      shadeCode: detail.shadeNumber || '',
      selectedYarnDetail: detail // Store the full detail for count sizes
    });

    setAutocompleteStates(prev => ({
      ...prev,
      [itemId]: {
        query: displayName,
        suggestions: [],
        showSuggestions: false
      }
    }));
  };

  const updateItem = (itemId: string, updates: Partial<YarnPurchaseItem>) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, ...updates };
          
          // Calculate sub-total
          const baseAmount = updatedItem.rate * updatedItem.qty;
          const gstAmount = (baseAmount * updatedItem.gst) / 100;
          updatedItem.subTotal = baseAmount + gstAmount;
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

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
    // If we have the selected yarn detail, use its countSize array directly
    if (item.selectedYarnDetail) {
      const yarnSubtype = item.selectedYarnDetail.yarnsubtype;
      if (typeof yarnSubtype === 'object' && yarnSubtype !== null) {
        const countSizeArray = (yarnSubtype as any)?.countSize || [];
        if (Array.isArray(countSizeArray) && countSizeArray.length > 0) {
          return countSizeArray.map((cs: any) => ({
            id: cs._id || cs.id || '',
            name: cs.name || ''
          })).filter((cs: { id: string; name: string }) => cs.id && cs.name);
        }
      }
    }
    
    // Fallback to old method if no selected yarn detail
    if (!item.yarnSubtypeId || !item.yarnTypeId) return [];
    
    const subtypes = yarnSubtypeMap[item.yarnTypeId] || [];
    const subtype = subtypes.find(s => s.id === item.yarnSubtypeId);
    if (!subtype) return [];

    return countSizes.filter(cs => subtype.countSizes.includes(cs.id));
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
                              sizeCount: '', // Clear size count when yarn changes
                            sizeCountName: '',
                              yarnTypeId: undefined,
                              yarnSubtypeId: undefined
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
                            {autocompleteState.suggestions.map((detail, idx) => {
                              const typeName = typeof detail.yarnType === 'object' ? detail.yarnType?.name : '';
                              const subtypeName = typeof detail.yarnsubtype === 'object' 
                                ? (detail.yarnsubtype as any)?.subtype || (detail.yarnsubtype as any)?.name || ''
                                : '';
                              const colorName = typeof detail.color === 'object' ? detail.color?.name : '';
                              const displayName = `${typeName} ${subtypeName} ${colorName} ${detail.shadeNumber || ''}`.trim();
                              
                              return (
                                <div
                                  key={idx}
                                  onClick={() => selectYarnSuggestion(item.id, detail)}
                                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium text-gray-900">{displayName}</div>
                                  <div className="text-xs text-gray-500">
                                    {subtypeName && <span>Subtype: {subtypeName}</span>}
                                    {detail.shadeNumber && <span className="ml-2">Shade: {detail.shadeNumber}</span>}
                                  </div>
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
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
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
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                        className="form-control"
                        placeholder="0"
                        step="0.01"
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
                        value={item.gst}
                        onChange={(e) => updateItem(item.id, { gst: parseFloat(e.target.value) || 0 })}
                        className="form-control"
                        placeholder="0"
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
