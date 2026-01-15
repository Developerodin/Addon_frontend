"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

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

interface PacklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (details: PacklistDetails[]) => Promise<void>;
  order: PurchaseOrder | null;
  isSubmitting?: boolean;
}

const PacklistModal: React.FC<PacklistModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  order,
  isSubmitting = false
}) => {
  const [packlistEntries, setPacklistEntries] = useState<PacklistDetails[]>([
    {
      packingNumber: "",
      courierName: "",
      courierNumber: "",
      vehicleNumber: "",
      challanNumber: "",
      dispatchDate: new Date().toISOString().split('T')[0],
      estimatedDeliveryDate: "",
      numberOfBoxes: 0,
      totalWeight: 0,
      notes: "",
      poItems: []
    }
  ]);

  // Pre-fill estimated delivery date from order when modal opens
  useEffect(() => {
    if (isOpen && order?.expectedDelivery) {
      const expectedDate = new Date(order.expectedDelivery).toISOString().split('T')[0];
      setPacklistEntries(prev => 
        prev.map((entry, idx) => 
          idx === 0 
            ? { ...entry, estimatedDeliveryDate: expectedDate }
            : entry
        )
      );
    }
  }, [isOpen, order]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPacklistEntries([
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
          poItems: []
        }
      ]);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

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
      // Reset form on success
      setPacklistEntries([
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
          poItems: []
        }
      ]);
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
        poItems: []
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Mark Order as In Transit - {order?.orderNumber}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                  disabled={isSubmitting}
                >
                  <i className="ri-close-line text-2xl"></i>
                </button>
              </div>
              
              {/* Order Details Section */}
              {order && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Order Details</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600">PO Number</label>
                      <div className="mt-1 text-gray-900 font-medium">{order.orderNumber}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Supplier</label>
                      <div className="mt-1 text-gray-900">{order.supplier}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Order Date</label>
                      <div className="mt-1 text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Total Amount</label>
                      <div className="mt-1 text-gray-900 font-medium">₹{order.totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4">
                      <label className="text-xs font-medium text-gray-600 mb-2 block">Order Items</label>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border border-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-2 py-1 text-left border border-gray-200">Yarn Name</th>
                              <th className="px-2 py-1 text-left border border-gray-200">Size/Count</th>
                              <th className="px-2 py-1 text-left border border-gray-200">Shade Code</th>
                              <th className="px-2 py-1 text-right border border-gray-200">Quantity</th>
                              <th className="px-2 py-1 text-right border border-gray-200">Rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={idx} className="bg-white">
                                <td className="px-2 py-1 border border-gray-200">{item.yarnName}</td>
                                <td className="px-2 py-1 border border-gray-200">{item.sizeCount}</td>
                                <td className="px-2 py-1 border border-gray-200">{item.shadeCode}</td>
                                <td className="px-2 py-1 text-right border border-gray-200">{item.quantity.toLocaleString()}</td>
                                <td className="px-2 py-1 text-right border border-gray-200">₹{item.rate.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4">
                Please provide packlist details to update the order status to "In Transit". You can add multiple packlist entries.
              </p>

              <div className="space-y-6">
                {packlistEntries.map((entry, entryIndex) => (
                  <div key={entryIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-semibold text-gray-800">
                        Packlist Entry {entryIndex + 1}
                      </h4>
                      {packlistEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeEntry(entryIndex)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={isSubmitting}
                        >
                          <i className="ri-delete-bin-line me-1"></i>
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">
                            Packing Number <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="packingNumber"
                            value={entry.packingNumber}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            placeholder="Enter packing number"
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label">
                            Courier Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="courierName"
                            value={entry.courierName}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            placeholder="Enter courier name"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="form-label">
                            Courier Number
                          </label>
                          <input
                            type="text"
                            name="courierNumber"
                            value={entry.courierNumber || ''}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            placeholder="Enter courier number"
                          />
                        </div>

                        <div>
                          <label className="form-label">
                            Vehicle Number
                          </label>
                          <input
                            type="text"
                            name="vehicleNumber"
                            value={entry.vehicleNumber || ''}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            placeholder="Enter vehicle number"
                          />
                        </div>

                        <div>
                          <label className="form-label">
                            Challan Number
                          </label>
                          <input
                            type="text"
                            name="challanNumber"
                            value={entry.challanNumber || ''}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            placeholder="Enter challan number"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">
                            Dispatch Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="dispatchDate"
                            value={entry.dispatchDate}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label">
                            Estimated Delivery Date <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            name="estimatedDeliveryDate"
                            value={entry.estimatedDeliveryDate}
                            onChange={(e) => handleInputChange(entryIndex, e)}
                            className="form-control"
                            min={entry.dispatchDate}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label">
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
                            className="form-control"
                            placeholder="Enter number of boxes"
                            required
                          />
                        </div>

                        <div>
                          <label className="form-label">
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
                            className="form-control"
                            placeholder="Enter weight in kg"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="form-label mb-2 block">
                          PO Items <span className="text-red-500">*</span>
                          {entry.poItems && entry.poItems.length > 0 && (
                            <span className="text-xs text-gray-600 ml-2">
                              ({entry.poItems.length} selected)
                            </span>
                          )}
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-white">
                          {order?.items && order.items.length > 0 ? (
                            <div className="space-y-2">
                              {order.items.map((item) => {
                                const currentPoItems = entry.poItems || [];
                                const isSelected = currentPoItems.some(id => String(id) === String(item.id));
                                return (
                                  <label
                                    key={item.id}
                                    className={`flex items-start p-2 rounded cursor-pointer hover:bg-gray-50 ${
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
                                      className="mt-1 me-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900">
                                        {item.yarnName}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-1">
                                        <span className="me-3">Size/Count: {item.sizeCount}</span>
                                        <span className="me-3">Shade: {item.shadeCode}</span>
                                        <span>Qty: {item.quantity}</span>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No PO items available
                            </p>
                          )}
                        </div>
                        {entry.poItems && entry.poItems.length === 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Please select at least one PO item
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="form-label">Notes</label>
                        <textarea
                          name="notes"
                          value={entry.notes || ''}
                          onChange={(e) => handleInputChange(entryIndex, e)}
                          className="form-control"
                          rows={3}
                          placeholder="Additional notes about the shipment..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={addNewEntry}
                    className="ti-btn ti-btn-outline-primary"
                    disabled={isSubmitting}
                  >
                    <i className="ri-add-line me-2"></i>
                    Add Another Packlist Entry
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                className="ti-btn ti-btn-primary w-full sm:ml-3 sm:w-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <i className="ri-loader-4-line animate-spin me-2"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="ri-check-line me-2"></i>
                    Update to In Transit
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ti-btn ti-btn-light mt-3 sm:mt-0 w-full sm:w-auto"
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PacklistModal;

