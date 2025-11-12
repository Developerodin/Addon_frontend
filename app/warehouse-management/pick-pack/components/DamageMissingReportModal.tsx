"use client";

import React, { useState } from 'react';
import { PackOrder, DamageMissingReport } from '../types';

interface DamageMissingReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PackOrder;
  itemId: string;
  onSubmit: (report: Omit<DamageMissingReport, 'id' | 'reportedAt'>) => void;
}

const DamageMissingReportModal: React.FC<DamageMissingReportModalProps> = ({
  isOpen,
  onClose,
  order,
  itemId,
  onSubmit,
}) => {
  const [reportType, setReportType] = useState<'damage' | 'missing'>('damage');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const selectedItem = order.items.find(item => item.id === itemId);

  if (!isOpen || !selectedItem) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    onSubmit({
      orderId: order.orderId,
      orderNumber: order.orderNumber,
      sku: selectedItem.sku,
      itemName: selectedItem.name,
      type: reportType,
      quantity: Math.min(quantity, selectedItem.quantity - selectedItem.packedQuantity),
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      reportedBy: 'Current User', // This should come from auth context
    });

    // Reset form
    setReportType('damage');
    setQuantity(1);
    setReason('');
    setNotes('');
  };

  const maxQuantity = selectedItem.quantity - selectedItem.packedQuantity;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Report Damage/Missing Item</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>

            {/* Order Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <p className="font-medium text-gray-900">Order: {order.orderNumber}</p>
                <p className="text-gray-600">Customer: {order.customerName}</p>
                <p className="text-gray-600">SKU: {selectedItem.sku}</p>
                <p className="text-gray-600">Item: {selectedItem.name}</p>
              </div>
            </div>

            {/* Report Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="damage"
                    checked={reportType === 'damage'}
                    onChange={(e) => setReportType(e.target.value as 'damage')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Damage</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="missing"
                    checked={reportType === 'missing'}
                    onChange={(e) => setReportType(e.target.value as 'missing')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Missing</span>
                </label>
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity ({reportType === 'damage' ? 'Damaged' : 'Missing'})
              </label>
              <input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, maxQuantity)))}
                className="ti-form-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {maxQuantity} (remaining unpicked quantity)
              </p>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason <span className="text-red-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="ti-form-input"
                required
              >
                <option value="">Select a reason</option>
                {reportType === 'damage' ? (
                  <>
                    <option value="Torn packaging">Torn packaging</option>
                    <option value="Product damaged">Product damaged</option>
                    <option value="Wrong item received">Wrong item received</option>
                    <option value="Expired item">Expired item</option>
                    <option value="Defective product">Defective product</option>
                    <option value="Other">Other</option>
                  </>
                ) : (
                  <>
                    <option value="Not found in pick list">Not found in pick list</option>
                    <option value="Location empty">Location empty</option>
                    <option value="Incorrect SKU">Incorrect SKU</option>
                    <option value="Stock discrepancy">Stock discrepancy</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="ti-form-input"
                placeholder="Add any additional details..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={onClose} className="ti-btn ti-btn-light">
                Cancel
              </button>
              <button onClick={handleSubmit} className="ti-btn ti-btn-danger">
                <i className="ri-error-warning-line me-2"></i>
                Submit Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DamageMissingReportModal;



