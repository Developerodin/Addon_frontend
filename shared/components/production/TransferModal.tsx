"use client";
import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { productionService } from "@/shared/services/productionService";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
  articleNumber: string;
  maxQuantity: number;
  currentFloor: string;
  nextFloor: string;
  onSuccess?: () => void;
}

interface TransferData {
  quantity: number;
  remarks: string;
  batchNumber: string;
}

const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  articleId,
  articleNumber,
  maxQuantity,
  currentFloor,
  nextFloor,
  onSuccess
}) => {
  const [transferData, setTransferData] = useState<TransferData>({
    quantity: 0,
    remarks: '',
    batchNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof TransferData, value: string | number) => {
    setTransferData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (!transferData.quantity || transferData.quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    if (transferData.quantity > maxQuantity) {
      toast.error(`Quantity cannot exceed ${maxQuantity}`);
      return;
    }

    if (!transferData.batchNumber.trim()) {
      toast.error('Batch number is required');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await productionService.transferToNextFloor(articleId, {
        quantity: transferData.quantity,
        remarks: transferData.remarks,
        batchNumber: transferData.batchNumber
      });

      if (response.success) {
        toast.success(`Successfully transferred ${transferData.quantity} pieces to ${nextFloor}`);
        onSuccess?.();
        onClose();
        // Reset form
        setTransferData({
          quantity: 0,
          remarks: '',
          batchNumber: ''
        });
      } else {
        throw new Error(response.error?.message || 'Transfer failed');
      }
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Failed to transfer article');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">Transfer Article</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        <div className="space-y-4">
          {/* Article Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">Article Details</div>
            <div className="font-medium text-gray-900">{articleNumber}</div>
            <div className="text-sm text-gray-600">
              From: {currentFloor} → To: {nextFloor}
            </div>
            <div className="text-sm text-gray-600">
              Available Quantity: {maxQuantity}
            </div>
          </div>

          {/* Transfer Quantity */}
          <div>
            <label className="form-label">Transfer Quantity *</label>
            <input
              type="number"
              className="form-control"
              value={transferData.quantity}
              onChange={(e) => handleInputChange('quantity', Number(e.target.value))}
              min="1"
              max={maxQuantity}
              disabled={isLoading}
            />
            <div className="text-xs text-gray-500 mt-1">
              Maximum: {maxQuantity} pieces
            </div>
          </div>

          {/* Batch Number */}
          <div>
            <label className="form-label">Batch Number *</label>
            <input
              type="text"
              className="form-control"
              value={transferData.batchNumber}
              onChange={(e) => handleInputChange('batchNumber', e.target.value)}
              placeholder="Enter batch number for traceability"
              disabled={isLoading}
            />
            <div className="text-xs text-gray-500 mt-1">
              Required for tracking and traceability
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="form-label">Transfer Remarks</label>
            <textarea
              className="form-control"
              rows={3}
              value={transferData.remarks}
              onChange={(e) => handleInputChange('remarks', e.target.value)}
              placeholder="Add any remarks about this transfer..."
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
          <button
            onClick={onClose}
            className="ti-btn ti-btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="ti-btn ti-btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="ri-loader-4-line animate-spin me-2"></i>
                Transferring...
              </>
            ) : (
              <>
                <i className="ri-arrow-right-line me-2"></i>
                Transfer to {nextFloor}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransferModal;
