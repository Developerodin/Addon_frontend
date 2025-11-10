"use client";

import React, { useEffect, useState } from 'react';
import { Order } from '../types';

type WebsiteOrderAction = 'cancel' | 'complete' | 'archive';

interface OrderStatusUpdateModalProps {
  isOpen: boolean;
  order: Order | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (action: WebsiteOrderAction) => Promise<void> | void;
}

const ACTION_LABELS: Record<WebsiteOrderAction, string> = {
  cancel: 'Cancel Order',
  complete: 'Mark as Completed',
  archive: 'Archive Order',
};

const ACTION_DESCRIPTIONS: Record<WebsiteOrderAction, string> = {
  cancel: 'Cancel the order in the website. This action cannot be undone.',
  complete: 'Mark the order as completed in the website. Ensure all fulfillment steps are finished.',
  archive: 'Move the order to archived state in the website for record keeping.',
};

const OrderStatusUpdateModal: React.FC<OrderStatusUpdateModalProps> = ({
  isOpen,
  order,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [selectedAction, setSelectedAction] = useState<WebsiteOrderAction>('complete');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedAction('complete');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !order) {
    return null;
  }

  const handleSubmit = async () => {
    if (!selectedAction) {
      setError('Please select an action to continue.');
      return;
    }

    try {
      await onSubmit(selectedAction);
    } catch (err: any) {
      setError(err?.message || 'Failed to update order status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={isSubmitting ? undefined : onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Update Website Order Status</h3>
              {/* <p className="text-sm text-white/80 mt-1">{order.orderNumber}</p> */}
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              disabled={isSubmitting}
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">Medusa Website Order</p>
              <p className="mb-1">Use these actions to update the order status directly in Medusa.</p>
              <p className="text-blue-700">Ensure you have the proper authorization before proceeding.</p>
            </div> */}

            <div className="space-y-4">
              {(Object.keys(ACTION_LABELS) as WebsiteOrderAction[]).map((action) => (
                <label
                  key={action}
                  className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAction === action ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-primary/40'
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-1"
                    name="website-order-action"
                    value={action}
                    checked={selectedAction === action}
                    onChange={() => setSelectedAction(action)}
                    disabled={isSubmitting}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{ACTION_LABELS[action]}</p>
                    <p className="text-sm text-gray-600 mt-1">{ACTION_DESCRIPTIONS[action]}</p>
                  </div>
                </label>
              ))}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-md p-3">
                {error}
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
            <button
              className="ti-btn ti-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="ti-btn ti-btn-primary"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                  Updating...
                </span>
              ) : (
                'Confirm Action'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusUpdateModal;


