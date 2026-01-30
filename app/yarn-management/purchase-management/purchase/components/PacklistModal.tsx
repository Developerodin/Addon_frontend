"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { FileUploadService, formatFileSize, getFileIcon } from "@/shared/services/fileUploadService";

export interface PacklistFile {
  url: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface PacklistDetails {
  packingNumber: string;
  courierName: string;
  courierNumber?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  dispatchDate: string;
  estimatedDeliveryDate: string;
  numberOfBoxes: number;
  totalWeight: number;
  notes?: string;
  packlistFile?: File;
  packlistFileName?: string;
  poItems?: string[]; // Array of PO item IDs
  files?: PacklistFile[]; // Array of uploaded files
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  items: Array<{
    id: string;
    yarnName: string;
    sizeCount: string;
    shadeCode: string;
    quantity: number;
    rate: number;
  }>;
}

/** Optional existing packlist (single or array) for pre-fill e.g. when order is goods partially received */
export interface ExistingPacklistDataInput {
  packingNumber?: string;
  trackingNumber?: string;
  courierName?: string;
  courierNumber?: string;
  vehicleNumber?: string;
  challanNumber?: string;
  dispatchDate?: string;
  estimatedDeliveryDate?: string;
  expectedArrivalDate?: string; // legacy API field
  numberOfBoxes?: number;
  totalWeight?: number;
  notes?: string;
  poItems?: string[];
  files?: PacklistFile[];
}

interface PacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PacklistDetails[]) => Promise<void>;
  order: PurchaseOrder | null;
  /** When provided (e.g. order status is goods partially received), form opens with this data pre-filled */
  existingPacklistData?: ExistingPacklistDataInput | ExistingPacklistDataInput[];
  isSubmitting?: boolean;
}

const defaultEntry = (order: PurchaseOrder | null): PacklistDetails => ({
  packingNumber: "",
  courierName: "",
  courierNumber: "",
  vehicleNumber: "",
  challanNumber: "",
  dispatchDate: new Date().toISOString().split('T')[0],
  estimatedDeliveryDate: order?.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : "",
  numberOfBoxes: 0,
  totalWeight: 0,
  notes: "",
  poItems: [],
  files: []
});

function normalizeExistingPacklist(
  data: ExistingPacklistDataInput | ExistingPacklistDataInput[] | undefined,
  order: PurchaseOrder | null
): PacklistDetails[] {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  const formatDate = (s?: string) => (s ? new Date(s).toISOString().split('T')[0] : "");
  return arr.map((item) => ({
    packingNumber: item.packingNumber || item.trackingNumber || "",
    courierName: item.courierName || "",
    courierNumber: item.courierNumber || "",
    vehicleNumber: item.vehicleNumber || "",
    challanNumber: item.challanNumber || "",
    dispatchDate: formatDate(item.dispatchDate) || new Date().toISOString().split('T')[0],
    estimatedDeliveryDate: formatDate(item.estimatedDeliveryDate) || formatDate(item.expectedArrivalDate) || (order?.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : ""),
    numberOfBoxes: item.numberOfBoxes ?? 0,
    totalWeight: item.totalWeight ?? 0,
    notes: item.notes || "",
    poItems: Array.isArray(item.poItems) ? item.poItems : [],
    files: item.files || []
  }));
}

const PacklistModal: React.FC<PacklistModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  existingPacklistData,
  isSubmitting = false
}) => {
  const [packlistEntries, setPacklistEntries] = useState<PacklistDetails[]>([defaultEntry(null)]);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({});
  const prevOpenRef = React.useRef(false);

  // When modal opens: pre-fill from existingPacklistData (e.g. goods partially received) or default one entry
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      const normalized = normalizeExistingPacklist(existingPacklistData, order);
      const initial = normalized.length > 0 ? normalized : [defaultEntry(order)];
      setPacklistEntries(initial.map((e) => ({ ...e, poItems: e.poItems || [], files: e.files || [] })));
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, existingPacklistData, order]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPacklistEntries([defaultEntry(order)]);
      setUploadingFiles({});
    }
  }, [isOpen, order]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all entries
    for (let i = 0; i < packlistEntries.length; i++) {
      const entry = packlistEntries[i];
      if (!entry.packingNumber.trim()) {
        toast.error(`Packing Number is required for entry ${i + 1}`);
        return;
      }
      if (!entry.courierName.trim()) {
        toast.error(`Courier Name is required for entry ${i + 1}`);
        return;
      }
      if (!entry.dispatchDate) {
        toast.error(`Dispatch Date is required for entry ${i + 1}`);
        return;
      }
      if (!entry.estimatedDeliveryDate) {
        toast.error(`Estimated Delivery Date is required for entry ${i + 1}`);
        return;
      }
      if (!entry.numberOfBoxes || entry.numberOfBoxes <= 0) {
        toast.error(`Number of Boxes must be greater than 0 for entry ${i + 1}`);
        return;
      }
      if (!entry.totalWeight || entry.totalWeight <= 0) {
        toast.error(`Total Weight must be greater than 0 for entry ${i + 1}`);
        return;
      }
      if (!entry.poItems || entry.poItems.length === 0) {
        toast.error(`At least one PO Item must be selected for entry ${i + 1}`);
        return;
      }
    }

    try {
      await onSubmit(packlistEntries);
      setPacklistEntries([defaultEntry(order)]);
      setUploadingFiles({});
    } catch (error) {
      console.error("Packlist submission error:", error);
    }
  };

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPacklistEntries(prev => 
      prev.map((entry, idx) => 
        idx === index 
          ? {
              ...entry,
              [name]: name === 'totalWeight' 
                ? (() => {
                    if (value === '') return 0; // Allow empty for clearing
                    const parsed = parseFloat(value);
                    if (isNaN(parsed)) return entry.totalWeight || 0;
                    // Prevent setting to exactly 0
                    if (parsed === 0) return entry.totalWeight || 0;
                    return parsed;
                  })()
                : name === 'numberOfBoxes'
                ? (value === '' ? 0 : (isNaN(Number(value)) ? 0 : Number(value)))
                : value
            }
          : entry
      )
    );
  };

  const handlePoItemsChange = (index: number, selectedItemIds: string[]) => {
    setPacklistEntries(prev => 
      prev.map((entry, idx) => 
        idx === index 
          ? { ...entry, poItems: selectedItemIds }
          : entry
      )
    );
  };

  const addNewEntry = () => {
    setPacklistEntries(prev => [
      ...prev,
      {
        packingNumber: "",
        courierName: "",
        courierNumber: "",
        vehicleNumber: "",
        challanNumber: "",
        dispatchDate: new Date().toISOString().split('T')[0],
        estimatedDeliveryDate: order?.expectedDelivery ? new Date(order.expectedDelivery).toISOString().split('T')[0] : "",
        numberOfBoxes: 0,
        totalWeight: 0,
        notes: "",
        poItems: [],
        files: []
      }
    ]);
  };

  const removeEntry = (index: number) => {
    if (packlistEntries.length > 1) {
      setPacklistEntries(prev => prev.filter((_, idx) => idx !== index));
    } else {
      toast.error("At least one packlist entry is required");
    }
  };

  const handleWeightKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentValue: number | string) => {
    // Prevent typing "0" when field is empty (would result in just "0")
    if (e.key === '0') {
      const input = e.currentTarget;
      const currentInputValue = input.value;
      const selectionStart = input.selectionStart || 0;
      const selectionEnd = input.selectionEnd || 0;
      
      // If field is empty and user types "0", prevent it
      if (currentInputValue === '' && selectionStart === 0 && selectionEnd === 0) {
        e.preventDefault();
        return;
      }
      
      // If field only contains "0" and user is trying to type another "0" at the start, prevent it
      if (currentInputValue === '0' && selectionStart === 0 && selectionEnd === currentInputValue.length) {
        e.preventDefault();
        return;
      }
    }
  };

  const handleFileUpload = async (entryIndex: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileKey = `${entryIndex}-${Date.now()}`;
    setUploadingFiles(prev => ({ ...prev, [fileKey]: true }));

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const uploadedFile = await FileUploadService.uploadFile(file);
        return {
          url: uploadedFile.url,
          key: uploadedFile.key,
          originalName: uploadedFile.originalName,
          mimeType: uploadedFile.mimeType,
          size: uploadedFile.size
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      setPacklistEntries(prev => 
        prev.map((entry, idx) => 
          idx === entryIndex 
            ? { 
                ...entry, 
                files: [...(entry.files || []), ...uploadedFiles] 
              }
            : entry
        )
      );

      toast.success(`${uploadedFiles.length} file(s) uploaded successfully`);
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file(s)');
    } finally {
      setUploadingFiles(prev => {
        const newState = { ...prev };
        delete newState[fileKey];
        return newState;
      });
      // Reset input
      event.target.value = '';
    }
  };

  const handleFileRemove = (entryIndex: number, fileKey: string) => {
    setPacklistEntries(prev => 
      prev.map((entry, idx) => 
        idx === entryIndex 
          ? { 
              ...entry, 
              files: (entry.files || []).filter(f => f.key !== fileKey) 
            }
          : entry
      )
    );
  };

  const handleFileView = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      ></div>

      {/* Side Modal */}
      <div
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="bg-primary text-white px-4 py-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Mark Order as In Transit</h3>
                {order?.orderNumber && (
                  <p className="text-xs text-white/80 mt-0.5">{order.orderNumber}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
                disabled={isSubmitting}
              >
                <i className="ri-close-line text-lg"></i>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {/* Order Details Section */}
            {order && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Order Details</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-medium text-gray-600">PO Number</label>
                    <div className="mt-0.5 text-xs text-gray-900 font-medium">{order.orderNumber}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-600">Supplier</label>
                    <div className="mt-0.5 text-xs text-gray-900">{order.supplier}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-600">Order Date</label>
                    <div className="mt-0.5 text-xs text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-600">Total Amount</label>
                    <div className="mt-0.5 text-xs text-gray-900 font-medium">₹{order.totalAmount.toLocaleString()}</div>
                  </div>
                </div>
                {order.items && order.items.length > 0 && (
                  <div className="mt-3">
                    <label className="text-[10px] font-medium text-gray-600 mb-1 block">Order Items</label>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-gray-200">
                        <thead className="bg-gray-50/30">
                          <tr>
                            <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200">Yarn Name</th>
                            <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200">Size/Count</th>
                            <th className="px-2 py-1 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200">Shade Code</th>
                            <th className="px-2 py-1 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200">Quantity</th>
                            <th className="px-2 py-1 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider border border-gray-200">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="bg-white">
                              <td className="px-2 py-1 border border-gray-200 text-xs text-gray-900">{item.yarnName}</td>
                              <td className="px-2 py-1 border border-gray-200 text-xs text-gray-900">{item.sizeCount}</td>
                              <td className="px-2 py-1 border border-gray-200 text-xs text-gray-900">{item.shadeCode}</td>
                              <td className="px-2 py-1 text-right border border-gray-200 text-xs text-gray-900">{item.quantity.toLocaleString()}</td>
                              <td className="px-2 py-1 text-right border border-gray-200 text-xs text-gray-900">₹{item.rate.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-600 mb-3">
              Please provide packlist details to update the order status to "In Transit". You can add multiple packlist entries.
            </p>

            <div className="space-y-4">
              {packlistEntries.map((entry, entryIndex) => (
                <div key={entryIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-gray-800">
                      Packlist Entry {entryIndex + 1}
                    </h4>
                    {packlistEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEntry(entryIndex)}
                        className="text-red-600 hover:text-red-800 text-[10px] font-medium"
                        disabled={isSubmitting}
                      >
                        <i className="ri-delete-bin-line me-1"></i>
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Packing Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="packingNumber"
                          value={entry.packingNumber}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter packing number"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Courier Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="courierName"
                          value={entry.courierName}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter courier name"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Courier Number
                        </label>
                        <input
                          type="text"
                          name="courierNumber"
                          value={entry.courierNumber || ''}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter courier number"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Vehicle Number
                        </label>
                        <input
                          type="text"
                          name="vehicleNumber"
                          value={entry.vehicleNumber || ''}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter vehicle number"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Challan Number
                        </label>
                        <input
                          type="text"
                          name="challanNumber"
                          value={entry.challanNumber || ''}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter challan number"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Dispatch Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="dispatchDate"
                          value={entry.dispatchDate}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Estimated Delivery Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="estimatedDeliveryDate"
                          value={entry.estimatedDeliveryDate}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          min={entry.dispatchDate}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Number of Boxes <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="numberOfBoxes"
                          value={entry.numberOfBoxes || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string or valid positive integer (no leading zeros except single digit)
                            if (value === "") {
                              handleInputChange(entryIndex, e);
                            } else if (/^[1-9]\d*$/.test(value) || /^[1-9]$/.test(value)) {
                              // Allow positive integers starting with 1-9, or single digit 1-9
                              handleInputChange(entryIndex, e);
                            } else if (/^0$/.test(value)) {
                              // Prevent just "0"
                              return;
                            }
                          }}
                          onBlur={(e) => {
                            // Ensure valid number on blur
                            const value = e.target.value;
                            const numValue = parseInt(value, 10);
                            if (!value || isNaN(numValue) || numValue < 1) {
                              const currentValue = entry.numberOfBoxes || 0;
                              e.target.value = currentValue > 0 ? currentValue.toString() : "";
                              if (currentValue > 0) {
                                handleInputChange(entryIndex, e);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            // Prevent non-numeric keys except backspace, delete, tab, arrow keys
                            if (!/[0-9]/.test(e.key) && 
                                !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
                                !(e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter number of boxes"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">
                          Total Weight (kg) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="totalWeight"
                          value={entry.totalWeight || ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string
                            if (value === "") {
                              handleInputChange(entryIndex, e);
                              return;
                            }
                            // Allow valid decimal numbers: digits, single decimal point, no leading zeros except for decimals
                            // Pattern: allows numbers like 1, 12, 1.5, 0.5, 12.34, etc.
                            if (/^[1-9]\d*(\.\d*)?$/.test(value) || /^0\.\d*$/.test(value) || /^\d+\.$/.test(value)) {
                              handleInputChange(entryIndex, e);
                            }
                          }}
                          onBlur={(e) => {
                            // Ensure valid number on blur
                            const value = e.target.value;
                            const numValue = parseFloat(value);
                            if (!value || isNaN(numValue) || numValue <= 0) {
                              const currentValue = entry.totalWeight || 0;
                              e.target.value = currentValue > 0 ? currentValue.toString() : "";
                              if (currentValue > 0) {
                                handleInputChange(entryIndex, e);
                              }
                            } else {
                              // Format to remove trailing decimal point if no decimals
                              if (value.endsWith('.')) {
                                e.target.value = numValue.toString();
                                handleInputChange(entryIndex, e);
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            const input = e.currentTarget;
                            const value = input.value;
                            // Allow decimal point only if not already present
                            if (e.key === '.' && value.includes('.')) {
                              e.preventDefault();
                              return;
                            }
                            // Prevent non-numeric keys except backspace, delete, tab, arrow keys, and decimal point
                            if (!/[0-9.]/.test(e.key) && 
                                !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) &&
                                !(e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                              e.preventDefault();
                            }
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                          placeholder="Enter weight in kg"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        PO Items <span className="text-red-500">*</span>
                        {entry.poItems && entry.poItems.length > 0 && (
                          <span className="text-[10px] text-gray-600 ml-2">
                            ({entry.poItems.length} selected)
                          </span>
                        )}
                      </label>
                      <div className="border border-gray-200 rounded-lg p-2 max-h-48 overflow-y-auto bg-white">
                        {order?.items && order.items.length > 0 ? (
                          <div className="space-y-1.5">
                            {order.items.map((item) => {
                              const currentPoItems = entry.poItems || [];
                              const isSelected = currentPoItems.some(id => String(id) === String(item.id));
                              return (
                                <label
                                  key={item.id}
                                  className={`flex items-start p-1.5 rounded cursor-pointer hover:bg-gray-50 ${
                                    isSelected ? 'bg-blue-50 border border-blue-200' : ''
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const currentItems = entry.poItems || [];
                                      if (e.target.checked) {
                                        handlePoItemsChange(entryIndex, [...currentItems, item.id]);
                                      } else {
                                        handlePoItemsChange(entryIndex, currentItems.filter(id => id !== item.id));
                                      }
                                    }}
                                    className="mt-0.5 me-2 h-3.5 w-3.5 text-blue-600 focus:ring-0 border-gray-300 rounded"
                                  />
                                  <div className="flex-1">
                                    <div className="text-xs font-medium text-gray-900">
                                      {item.yarnName}
                                    </div>
                                    <div className="text-[10px] text-gray-600 mt-0.5">
                                      <span className="me-2">Size/Count: {item.sizeCount}</span>
                                      <span className="me-2">Shade: {item.shadeCode}</span>
                                      <span>Qty: {item.quantity}</span>
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center py-3">
                            No PO items available
                          </p>
                        )}
                      </div>
                      {entry.poItems && entry.poItems.length === 0 && (
                        <p className="text-[10px] text-red-500 mt-1">
                          Please select at least one PO item
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
                      <textarea
                        name="notes"
                        value={entry.notes || ''}
                        onChange={(e) => handleInputChange(entryIndex, e)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-0 focus:border-purple-300"
                        rows={2}
                        placeholder="Additional notes about the shipment..."
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">
                        Files
                        {entry.files && entry.files.length > 0 && (
                          <span className="text-[10px] text-gray-500 ml-2">
                            ({entry.files.length} uploaded)
                          </span>
                        )}
                      </label>
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileUpload(entryIndex, e)}
                            className="hidden"
                            id={`file-upload-${entryIndex}`}
                            disabled={isSubmitting || Object.values(uploadingFiles).some(v => v)}
                          />
                          <label
                            htmlFor={`file-upload-${entryIndex}`}
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-gray-300 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                              isSubmitting || Object.values(uploadingFiles).some(v => v) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <i className="ri-upload-cloud-2-line text-sm"></i>
                            <span className="font-medium">
                              {Object.values(uploadingFiles).some(v => v) ? 'Uploading...' : 'Upload Files'}
                            </span>
                          </label>
                        </div>
                        {entry.files && entry.files.length > 0 && (
                          <div className="space-y-1.5">
                            {entry.files.map((file, fileIndex) => (
                              <div
                                key={file.key}
                                className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <span className="text-base">{getFileIcon(file.mimeType)}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-medium text-gray-900 truncate">
                                      {file.originalName}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {formatFileSize(file.size)} • {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleFileView(file.url)}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="View/Preview"
                                  >
                                    <i className="ri-eye-line text-sm"></i>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleFileRemove(entryIndex, file.key)}
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Remove"
                                    disabled={isSubmitting}
                                  >
                                    <i className="ri-delete-bin-line text-sm"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addNewEntry}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-purple-600 text-[11px] font-bold rounded border border-purple-200 hover:bg-purple-50 transition-colors shadow-sm"
                  disabled={isSubmitting}
                >
                  <i className="ri-add-line text-xs"></i>
                  Add Another Entry
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 flex justify-end gap-2 flex-shrink-0 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 text-[11px] font-bold rounded border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-[11px] font-bold rounded hover:bg-purple-700 transition-colors shadow-sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="ri-loader-4-line animate-spin text-xs"></i>
                  Updating...
                </>
              ) : (
                <>
                  <i className="ri-check-line text-xs"></i>
                  Update to In Transit
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PacklistModal;

