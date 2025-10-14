"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface PurchaseItem {
  id: string;
  yarnName: string;
  quantityPurchased: number;
  purchaseRate: number;
  invoiceNumber: string;
  batchLotNo: string;
  totalCost: number;
}

interface PurchaseData {
  purchaseDate: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  notes: string;
}

interface PurchaseFormProps {
  initialData?: Partial<PurchaseData>;
  onSubmit: (data: PurchaseData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Save"
}) => {
  const [formData, setFormData] = useState<PurchaseData>({
    purchaseDate: initialData.purchaseDate || new Date().toISOString().split('T')[0],
    supplierName: initialData.supplierName || "",
    items: initialData.items || [],
    totalCost: initialData.totalCost || 0,
    notes: initialData.notes || ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addItem = () => {
    const newItem: PurchaseItem = {
      id: Date.now().toString(),
      yarnName: "",
      quantityPurchased: 0,
      purchaseRate: 0,
      invoiceNumber: "",
      batchLotNo: "",
      totalCost: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const removeItem = (itemId: string) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const updateItem = (itemId: string, field: keyof PurchaseItem, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === itemId) {
          const updatedItem = { ...item, [field]: value };
          
          // Auto-calculate total cost for this item
          if (field === 'quantityPurchased' || field === 'purchaseRate') {
            updatedItem.totalCost = updatedItem.quantityPurchased * updatedItem.purchaseRate;
          }
          
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const calculateTotalCost = () => {
    return formData.items.reduce((sum, item) => sum + item.totalCost, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.purchaseDate.trim()) {
      toast.error("Purchase Date is required");
      return;
    }
    if (!formData.supplierName.trim()) {
      toast.error("Supplier Name is required");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("At least one yarn item is required");
      return;
    }
    
    // Validate each item
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.yarnName.trim()) {
        toast.error(`Yarn Name is required for item ${i + 1}`);
        return;
      }
      if (item.quantityPurchased <= 0) {
        toast.error(`Quantity must be greater than 0 for item ${i + 1}`);
        return;
      }
      if (item.purchaseRate <= 0) {
        toast.error(`Purchase Rate must be greater than 0 for item ${i + 1}`);
        return;
      }
      if (!item.invoiceNumber.trim()) {
        toast.error(`Invoice Number is required for item ${i + 1}`);
        return;
      }
    }

    const dataToSubmit = {
      ...formData,
      totalCost: calculateTotalCost()
    };

    try {
      await onSubmit(dataToSubmit);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

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
            name="purchaseDate"
            value={formData.purchaseDate}
            onChange={handleInputChange}
            className="form-control"
            required
          />
        </div>

        <div>
          <label className="form-label">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="supplierName"
            value={formData.supplierName}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter supplier name"
            required
          />
        </div>
      </div>

      {/* Purchase Items Section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-semibold">Purchase Items</h4>
          <button
            type="button"
            onClick={addItem}
            className="ti-btn ti-btn-primary "
          >
            <i className="ri-add-line me-1"></i>
            Add Yarn
          </button>
        </div>

        {formData.items.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <i className="ri-shopping-cart-line text-4xl"></i>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Added</h3>
            <p className="text-gray-500 mb-4">Add yarn items to create a purchase entry.</p>
            <button
              type="button"
              onClick={addItem}
              className="ti-btn ti-btn-primary"
            >
              <i className="ri-add-line me-2"></i>
              Add First Item
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.items.map((item, index) => (
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
                  <div>
                    <label className="form-label">
                      Yarn Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.yarnName}
                      onChange={(e) => updateItem(item.id, 'yarnName', e.target.value)}
                      className="form-control"
                      placeholder="Enter yarn name"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Quantity Purchased <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={item.quantityPurchased}
                      onChange={(e) => updateItem(item.id, 'quantityPurchased', parseFloat(e.target.value) || 0)}
                      className="form-control"
                      placeholder="0"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Purchase Rate (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={item.purchaseRate}
                      onChange={(e) => updateItem(item.id, 'purchaseRate', parseFloat(e.target.value) || 0)}
                      className="form-control"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.invoiceNumber}
                      onChange={(e) => updateItem(item.id, 'invoiceNumber', e.target.value)}
                      className="form-control"
                      placeholder="Enter invoice number"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Batch / Lot No.</label>
                    <input
                      type="text"
                      value={item.batchLotNo}
                      onChange={(e) => updateItem(item.id, 'batchLotNo', e.target.value)}
                      className="form-control"
                      placeholder="Enter batch/lot number"
                    />
                  </div>

                  <div>
                    <label className="form-label">Total Cost</label>
                    <div className="form-control bg-gray-100 text-gray-700 font-medium">
                      ₹{item.totalCost.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Total Cost Display */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-green-800">Total Purchase Cost:</span>
          <span className="text-xl font-bold text-green-900">
            ₹{calculateTotalCost().toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-green-600 mt-1">
          Auto-calculated from all items
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="form-label">Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          className="form-control"
          rows={4}
          placeholder="Additional notes about the purchase..."
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
              Saving...
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
