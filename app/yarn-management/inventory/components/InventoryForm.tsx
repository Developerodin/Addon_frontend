"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface InventoryData {
  yarnName: string;
  yarnType: string;
  countDenier: string;
  color: string;
  lotNo: string;
  supplier: string;
  openingBalance: number;
  purchasedQuantity: number;
  issuedQuantity: number;
  closingBalance: number;
  unitOfMeasurement: string;
  ratePerUnit: number;
  minimumStock: number;
  location: string;
  remarks: string;
}

interface InventoryFormProps {
  initialData?: Partial<InventoryData>;
  onSubmit: (data: InventoryData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitButtonText = "Save"
}) => {
  const [formData, setFormData] = useState<InventoryData>({
    yarnName: initialData.yarnName || "",
    yarnType: initialData.yarnType || "",
    countDenier: initialData.countDenier || "",
    color: initialData.color || "#000000",
    lotNo: initialData.lotNo || "",
    supplier: initialData.supplier || "",
    openingBalance: initialData.openingBalance || 0,
    purchasedQuantity: initialData.purchasedQuantity || 0,
    issuedQuantity: initialData.issuedQuantity || 0,
    closingBalance: initialData.closingBalance || 0,
    unitOfMeasurement: initialData.unitOfMeasurement || "",
    ratePerUnit: initialData.ratePerUnit || 0,
    minimumStock: initialData.minimumStock || 0,
    location: initialData.location || "",
    remarks: initialData.remarks || ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['openingBalance', 'purchasedQuantity', 'issuedQuantity', 'closingBalance', 'ratePerUnit', 'minimumStock'].includes(name) 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const calculateTotalValue = () => {
    return formData.closingBalance * formData.ratePerUnit;
  };

  const calculateClosingBalance = () => {
    return formData.openingBalance + formData.purchasedQuantity - formData.issuedQuantity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.yarnName.trim()) {
      toast.error("Yarn Name is required");
      return;
    }
    if (!formData.yarnType.trim()) {
      toast.error("Yarn Type is required");
      return;
    }
    if (!formData.countDenier.trim()) {
      toast.error("Count/Denier is required");
      return;
    }
    if (!formData.supplier.trim()) {
      toast.error("Supplier is required");
      return;
    }
    if (!formData.unitOfMeasurement.trim()) {
      toast.error("Unit of Measurement is required");
      return;
    }
    if (formData.openingBalance < 0) {
      toast.error("Opening Balance cannot be negative");
      return;
    }
    if (formData.purchasedQuantity < 0) {
      toast.error("Purchased Quantity cannot be negative");
      return;
    }
    if (formData.issuedQuantity < 0) {
      toast.error("Issued Quantity cannot be negative");
      return;
    }
    if (formData.closingBalance < 0) {
      toast.error("Closing Balance cannot be negative");
      return;
    }
    if (formData.ratePerUnit <= 0) {
      toast.error("Rate per Unit must be greater than 0");
      return;
    }
    if (formData.minimumStock < 0) {
      toast.error("Minimum Stock cannot be negative");
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Yarn Name */}
        <div>
          <label className="form-label">
            Yarn Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="yarnName"
            value={formData.yarnName}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter yarn name"
            required
          />
        </div>

        {/* Yarn Type */}
        <div>
          <label className="form-label">
            Yarn Type <span className="text-red-500">*</span>
          </label>
          <select
            name="yarnType"
            value={formData.yarnType}
            onChange={handleInputChange}
            className="form-control"
            required
          >
            <option value="">Select yarn type</option>
            <option value="Cotton">Cotton</option>
            <option value="Polyester">Polyester</option>
            <option value="Viscose">Viscose</option>
            <option value="Nylon">Nylon</option>
            <option value="Wool">Wool</option>
            <option value="Silk">Silk</option>
            <option value="Linen">Linen</option>
            <option value="Blend">Blend</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Count/Denier */}
        <div>
          <label className="form-label">
            Count / Denier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="countDenier"
            value={formData.countDenier}
            onChange={handleInputChange}
            className="form-control"
            placeholder="e.g., 30s, 40s, 150D"
            required
          />
        </div>

        {/* Color */}
        <div>
          <label className="form-label">
            Color <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-3">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleInputChange}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
              required
            />
            <input
              type="text"
              value={formData.color}
              onChange={handleInputChange}
              className="form-control flex-1"
              placeholder="Color name or code"
            />
          </div>
        </div>

        {/* Lot No */}
        <div>
          <label className="form-label">Lot No.</label>
          <input
            type="text"
            name="lotNo"
            value={formData.lotNo}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter lot number"
          />
        </div>

        {/* Supplier */}
        <div>
          <label className="form-label">
            Supplier <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="supplier"
            value={formData.supplier}
            onChange={handleInputChange}
            className="form-control"
            placeholder="Enter supplier name"
            required
          />
        </div>

        {/* Current Stock */}
        <div>
          <label className="form-label">
            Opening Balance <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="openingBalance"
            value={formData.openingBalance}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Unit of Measurement */}
        <div>
          <label className="form-label">
            Unit of Measurement <span className="text-red-500">*</span>
          </label>
          <select
            name="unitOfMeasurement"
            value={formData.unitOfMeasurement}
            onChange={handleInputChange}
            className="form-control"
            required
          >
            <option value="">Select unit</option>
            <option value="kg">Kilogram (kg)</option>
            <option value="cones">Cones</option>
            <option value="meters">Meters</option>
            <option value="yards">Yards</option>
            <option value="pounds">Pounds</option>
            <option value="grams">Grams</option>
            <option value="bales">Bales</option>
            <option value="spools">Spools</option>
          </select>
        </div>

        {/* Purchased Quantity */}
        <div>
          <label className="form-label">
            Purchased Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="purchasedQuantity"
            value={formData.purchasedQuantity}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Issued Quantity */}
        <div>
          <label className="form-label">
            Issued Quantity <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="issuedQuantity"
            value={formData.issuedQuantity}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Closing Balance */}
        <div>
          <label className="form-label">
            Closing Balance <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="closingBalance"
            value={formData.closingBalance}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
          <div className="text-xs text-gray-500 mt-1">
            Calculated: {calculateClosingBalance()} {formData.unitOfMeasurement}
          </div>
        </div>

        {/* Rate per Unit */}
        <div>
          <label className="form-label">
            Rate per Unit (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="ratePerUnit"
            value={formData.ratePerUnit}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0.00"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Minimum Stock */}
        <div>
          <label className="form-label">
            Minimum Stock Level <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            name="minimumStock"
            value={formData.minimumStock}
            onChange={handleInputChange}
            className="form-control"
            placeholder="0"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Location */}
        <div>
          <label className="form-label">Storage Location</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="form-control"
            placeholder="e.g., Warehouse A, Rack 1"
          />
        </div>
      </div>

      {/* Total Value Display */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-blue-800">Total Inventory Value:</span>
          <span className="text-lg font-bold text-blue-900">
            ₹{calculateTotalValue().toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-blue-600 mt-1">
          Calculated as: {formData.closingBalance} {formData.unitOfMeasurement} × ₹{formData.ratePerUnit}
        </div>
        <div className="text-xs text-gray-600 mt-2">
          Stock Summary: Opening({formData.openingBalance}) + Purchased({formData.purchasedQuantity}) - Issued({formData.issuedQuantity}) = Closing({formData.closingBalance})
        </div>
      </div>

      {/* Remarks/Notes */}
      <div>
        <label className="form-label">Remarks / Notes</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleInputChange}
          className="form-control"
          rows={4}
          placeholder="Additional notes about the inventory..."
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

export default InventoryForm;
