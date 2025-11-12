"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";

interface YarnInventory {
  id: string;
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
  totalValue: number;
  lastUpdated: string;
  minimumStock: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  location: string;
  remarks: string;
}

interface StockAdjustmentFormProps {
  yarn: YarnInventory;
  onAdjust: (yarnId: string, quantity: number, type: 'add' | 'subtract', remarks: string) => void;
  onCancel: () => void;
}

const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({ yarn, onAdjust, onCancel }) => {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (!remarks.trim()) {
      toast.error('Please provide remarks for the adjustment');
      return;
    }

    if (adjustmentType === 'subtract' && quantity > yarn.closingBalance) {
      toast.error('Cannot adjust stock below zero');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onAdjust(yarn.id, quantity, adjustmentType, remarks);
    } catch (error) {
      console.error('Stock adjustment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNewBalance = () => {
    if (quantity <= 0) return yarn.closingBalance;
    return adjustmentType === 'add' 
      ? yarn.closingBalance + quantity 
      : yarn.closingBalance - quantity;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Adjustment Type */}
      <div>
        <label className="form-label">Adjustment Type</label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="adjustmentType"
              value="add"
              checked={adjustmentType === 'add'}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
              className="form-radio me-2"
            />
            <span className="text-green-600">Add Stock</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="adjustmentType"
              value="subtract"
              checked={adjustmentType === 'subtract'}
              onChange={(e) => setAdjustmentType(e.target.value as 'add' | 'subtract')}
              className="form-radio me-2"
            />
            <span className="text-red-600">Subtract Stock</span>
          </label>
        </div>
      </div>

      {/* Quantity */}
      <div>
        <label className="form-label">Quantity ({yarn.unitOfMeasurement})</label>
        <input
          type="number"
          min="0"
          step="0.01"
          className="form-control"
          value={quantity || ''}
          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
          placeholder="Enter quantity to adjust"
          required
        />
        {adjustmentType === 'subtract' && quantity > yarn.closingBalance && (
          <p className="text-red-500 text-sm mt-1">
            Cannot subtract more than current stock ({yarn.closingBalance} {yarn.unitOfMeasurement})
          </p>
        )}
      </div>

      {/* Remarks */}
      <div>
        <label className="form-label">Remarks</label>
        <textarea
          className="form-control"
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Enter reason for stock adjustment..."
          required
        />
      </div>

      {/* Preview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Adjustment Preview</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Current Stock:</span>
            <span className="ml-2 font-medium">{yarn.closingBalance} {yarn.unitOfMeasurement}</span>
          </div>
          <div>
            <span className="text-gray-600">Adjustment:</span>
            <span className={`ml-2 font-medium ${adjustmentType === 'add' ? 'text-green-600' : 'text-red-600'}`}>
              {adjustmentType === 'add' ? '+' : '-'}{quantity} {yarn.unitOfMeasurement}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-gray-600">New Balance:</span>
            <span className="ml-2 font-medium text-blue-600">
              {getNewBalance()} {yarn.unitOfMeasurement}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
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
          className={`ti-btn ${adjustmentType === 'add' ? 'ti-btn-success' : 'ti-btn-warning'}`}
          disabled={isSubmitting || quantity <= 0 || !remarks.trim()}
        >
          {isSubmitting ? (
            <>
              <i className="ri-loader-4-line animate-spin me-2"></i>
              Processing...
            </>
          ) : (
            <>
              <i className={`ri-${adjustmentType === 'add' ? 'add' : 'subtract'}-line me-2`}></i>
              {adjustmentType === 'add' ? 'Add Stock' : 'Subtract Stock'}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default StockAdjustmentForm;
