"use client";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

/** Spreadsheet-style cells — dark grid lines for readability */
const excelTh =
  "border border-gray-600 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider bg-gray-50/30 whitespace-nowrap";
const excelTd = "border border-gray-600 p-0 align-middle bg-white";
const excelInput =
  "w-full min-h-[30px] px-1.5 py-1 text-xs text-gray-900 border-0 bg-transparent focus:outline-none focus:ring-0 focus:bg-purple-50/60 placeholder:text-gray-400 disabled:opacity-50";
const excelTextarea =
  "w-full min-h-[52px] px-1.5 py-1.5 text-xs text-gray-900 border-0 bg-transparent focus:outline-none focus:ring-0 focus:bg-purple-50/60 placeholder:text-gray-400 resize-y disabled:opacity-50";
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
  const [poDropdown, setPoDropdown] = useState<{
    entryIndex: number;
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const prevOpenRef = React.useRef(false);

  useEffect(() => {
    if (!poDropdown) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-packlist-po-floating]") || t.closest("[data-packlist-po-trigger]")) return;
      setPoDropdown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPoDropdown(null);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [poDropdown]);

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
      setPoDropdown(null);
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

  const togglePoItem = (index: number, itemId: string, checked: boolean) => {
    const idStr = String(itemId);
    setPacklistEntries((prev) =>
      prev.map((entry, idx) => {
        if (idx !== index) return entry;
        const cur = entry.poItems || [];
        if (checked) {
          if (cur.some((x) => String(x) === idStr)) return entry;
          return { ...entry, poItems: [...cur, idStr] };
        }
        return { ...entry, poItems: cur.filter((x) => String(x) !== idStr) };
      })
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
    <>
    <div className={`fixed inset-0 z-50 overflow-hidden ${isOpen ? '' : 'pointer-events-none'}`}>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[51] bg-gray-500 bg-opacity-75 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      ></div>

      {/* Side panel: wide enough to align with main content (matches purchase order Excel-style tables) */}
      <div
        className={`fixed right-0 top-0 z-[52] h-full w-full max-w-[min(78rem,calc(100vw-16rem))] bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col ${
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
                      <table className="min-w-full border border-gray-600 bg-white">
                        <thead className="bg-gray-50/30">
                          <tr>
                            <th className="border border-gray-600 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[180px]">
                              Yarn Name
                            </th>
                            <th className="border border-gray-600 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                              Size
                            </th>
                            <th className="border border-gray-600 px-2 py-1.5 text-left text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[100px]">
                              Shade Code
                            </th>
                            <th className="border border-gray-600 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[90px]">
                              Qty (kg)
                            </th>
                            <th className="border border-gray-600 px-2 py-1.5 text-right text-[10px] font-bold text-gray-700 uppercase tracking-wider min-w-[90px]">
                              Rate (₹)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="bg-white hover:bg-gray-50">
                              <td className="border border-gray-600 px-2 py-1.5 text-xs text-gray-900">{item.yarnName}</td>
                              <td className="border border-gray-600 px-2 py-1.5 text-xs text-gray-900">{item.sizeCount}</td>
                              <td className="border border-gray-600 px-2 py-1.5 text-xs text-gray-900">{item.shadeCode}</td>
                              <td className="border border-gray-600 px-2 py-1.5 text-right text-xs text-gray-900">
                                {item.quantity.toLocaleString()}
                              </td>
                              <td className="border border-gray-600 px-2 py-1.5 text-right text-xs text-gray-900">
                                ₹{item.rate.toLocaleString()}
                              </td>
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
              Each packlist entry is one Excel row: use the first cell to select PO lines (Ctrl+click or ⌘+click for multiple), then fill packing, courier, dates, boxes, weight, and notes in the same row.
            </p>

            <div className="space-y-4">
              {packlistEntries.map((entry, entryIndex) => (
                <div
                  key={entryIndex}
                  className="border border-gray-600 rounded-sm bg-white overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 bg-gray-50/80 border-b border-gray-600">
                    <h4 className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
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

                  <div className="overflow-x-auto">
                    <table className="min-w-[960px] w-full border-collapse border border-gray-600 bg-white">
                      <thead>
                        <tr>
                          <th className={`${excelTh} min-w-[11rem] align-top`}>
                            PO Items <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[120px]`}>
                            Packing # <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[120px]`}>
                            Courier <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[100px]`}>Courier #</th>
                          <th className={`${excelTh} min-w-[100px]`}>Vehicle #</th>
                          <th className={`${excelTh} min-w-[100px]`}>Challan #</th>
                          <th className={`${excelTh} min-w-[118px]`}>
                            Dispatch <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[118px]`}>
                            Est. Delivery <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[72px] text-right`}>
                            Boxes <span className="text-red-500">*</span>
                          </th>
                          <th className={`${excelTh} min-w-[88px] text-right`}>
                            Wt (kg) <span className="text-red-500">*</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className={`${excelTd} align-top p-0`}>
                            {order?.items && order.items.length > 0 ? (
                              <div className="min-h-[30px] min-w-[10.5rem] max-w-[18rem]">
                                <button
                                  type="button"
                                  data-packlist-po-trigger
                                  disabled={isSubmitting}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setPoDropdown((prev) => {
                                      if (prev?.entryIndex === entryIndex) return null;
                                      return {
                                        entryIndex,
                                        top: rect.bottom + 4,
                                        left: rect.left,
                                        width: Math.max(rect.width, 260),
                                      };
                                    });
                                  }}
                                  className={`${excelInput} flex w-full min-h-[30px] items-center justify-between gap-1 px-1.5 text-left`}
                                  aria-expanded={poDropdown?.entryIndex === entryIndex}
                                  aria-haspopup="listbox"
                                >
                                  <span className="truncate">
                                    {(entry.poItems || []).length === 0 ? (
                                      <span className="text-gray-400">Select PO lines…</span>
                                    ) : (entry.poItems || []).length === 1 ? (
                                      (() => {
                                        const id = (entry.poItems || [])[0];
                                        const line = order.items.find(
                                          (it) => String(it.id) === String(id)
                                        );
                                        return line
                                          ? `${line.yarnName} · ${line.sizeCount}`
                                          : "1 line";
                                      })()
                                    ) : (
                                      `${(entry.poItems || []).length} lines selected`
                                    )}
                                  </span>
                                  <i
                                    className={`ri-arrow-down-s-line shrink-0 text-gray-500 transition-transform ${
                                      poDropdown?.entryIndex === entryIndex ? "rotate-180" : ""
                                    }`}
                                    aria-hidden
                                  />
                                </button>
                              </div>
                            ) : (
                              <p className="px-1.5 py-2 text-[10px] text-gray-500">
                                No PO lines on this order.
                              </p>
                            )}
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="packingNumber"
                              value={entry.packingNumber}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelInput}
                              placeholder="—"
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="courierName"
                              value={entry.courierName}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelInput}
                              placeholder="—"
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="courierNumber"
                              value={entry.courierNumber || ""}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelInput}
                              placeholder="—"
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="vehicleNumber"
                              value={entry.vehicleNumber || ""}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelInput}
                              placeholder="—"
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="challanNumber"
                              value={entry.challanNumber || ""}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelInput}
                              placeholder="—"
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="date"
                              name="dispatchDate"
                              value={entry.dispatchDate}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={`${excelInput} min-w-[7.5rem]`}
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="date"
                              name="estimatedDeliveryDate"
                              value={entry.estimatedDeliveryDate}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={`${excelInput} min-w-[7.5rem]`}
                              min={entry.dispatchDate}
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="text"
                              name="numberOfBoxes"
                              value={entry.numberOfBoxes || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "") {
                                  handleInputChange(entryIndex, e);
                                } else if (/^[1-9]\d*$/.test(value) || /^[1-9]$/.test(value)) {
                                  handleInputChange(entryIndex, e);
                                } else if (/^0$/.test(value)) {
                                  return;
                                }
                              }}
                              onBlur={(e) => {
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
                                if (
                                  !/[0-9]/.test(e.key) &&
                                  !["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key) &&
                                  !(e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
                                ) {
                                  e.preventDefault();
                                }
                              }}
                              className={`${excelInput} text-right tabular-nums`}
                              placeholder="0"
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                          <td className={excelTd}>
                            <input
                              type="number"
                              name="totalWeight"
                              step="0.01"
                              min="0"
                              value={entry.totalWeight || ""}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={`${excelInput} text-right tabular-nums`}
                              placeholder="0.00"
                              required
                              disabled={isSubmitting}
                            />
                          </td>
                        </tr>
                        <tr>
                          <th colSpan={10} className={`${excelTh} border-t-2 border-gray-600`}>
                            Notes
                          </th>
                        </tr>
                        <tr>
                          <td colSpan={10} className={excelTd}>
                            <textarea
                              name="notes"
                              value={entry.notes || ""}
                              onChange={(e) => handleInputChange(entryIndex, e)}
                              className={excelTextarea}
                              rows={2}
                              placeholder="Optional remarks…"
                              disabled={isSubmitting}
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {(!entry.poItems || entry.poItems.length === 0) &&
                    order?.items &&
                    order.items.length > 0 && (
                      <p className="text-[10px] text-red-600 px-2 py-1.5 bg-amber-50/60 border-t border-amber-100">
                        Select at least one PO line in the first column (multi-select list).
                      </p>
                    )}

                  <div className="p-2 space-y-3 border-t border-gray-200 bg-gray-50/30">
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
                            className={`flex items-center justify-center gap-2 px-3 py-2 text-xs border border-dashed border-gray-600 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
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
    {poDropdown &&
      order &&
      typeof document !== "undefined" &&
      createPortal(
        <div
          data-packlist-po-floating
          className="fixed max-h-[min(20rem,55vh)] overflow-y-auto overscroll-contain rounded border border-gray-600 bg-white pt-1 pb-4 shadow-xl"
          style={{
            top: poDropdown.top,
            left: poDropdown.left,
            width: poDropdown.width,
            zIndex: 10000,
          }}
          role="listbox"
          aria-multiselectable
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {(() => {
            const entry = packlistEntries[poDropdown.entryIndex];
            if (!entry) return null;
            const idx = poDropdown.entryIndex;
            return order.items.map((item) => {
              const selected = (entry.poItems || []).some(
                (id) => String(id) === String(item.id)
              );
              const label = `${item.yarnName} · ${item.sizeCount} · ${item.shadeCode}`;
              return (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-2 px-2 py-1.5 text-[11px] hover:bg-purple-50/80"
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={isSubmitting}
                    onChange={(e) => togglePoItem(idx, String(item.id), e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-gray-600 text-purple-600 focus:ring-0"
                  />
                  <span className="leading-snug text-gray-800">{label}</span>
                </label>
              );
            });
          })()}
        </div>,
        document.body
      )}
    </>
  );
};

export default PacklistModal;

