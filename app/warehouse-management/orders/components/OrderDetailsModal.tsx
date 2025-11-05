"use client";

import React from 'react';
import { Order } from '../types';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  if (!isOpen || !order) return null;

  const getStatusBadgeClass = (status: string) => {
    const classes = {
      pending: 'bg-yellow-100 text-yellow-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      packed: 'bg-purple-100 text-purple-800',
      dispatched: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadgeClass = (priority: string) => {
    const classes = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return classes[priority as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-primary text-white px-6 py-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Order Details</h3>
              <p className="text-sm text-white/80 mt-1">{order.orderNumber}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <i className="ri-close-line text-xl"></i>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Order Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="box">
                <div className="box-body">
                  <h4 className="font-semibold mb-3">Order Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Number:</span>
                      <span className="font-medium">{order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span className="font-medium">{new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Channel:</span>
                      <span className="font-medium capitalize">{order.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-medium">${order.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Quantity:</span>
                      <span className="font-medium">{order.totalQuantity}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="box-body">
                  <h4 className="font-semibold mb-3">Dispatch Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispatch Mode:</span>
                      <span className="font-medium capitalize">{order.dispatchMode}</span>
                    </div>
                    {order.estimatedDispatchDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Estimated Dispatch:</span>
                        <span className="font-medium">
                          {new Date(order.estimatedDispatchDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {order.actualDispatchDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Dispatch:</span>
                        <span className="font-medium">
                          {new Date(order.actualDispatchDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details */}
            <div className="box mb-6">
              <div className="box-header">
                <h4 className="box-title">Customer Details</h4>
              </div>
              <div className="box-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{order.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{order.customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">
                      {order.customer.address.street}<br />
                      {order.customer.address.city}, {order.customer.address.state} {order.customer.address.zipCode}<br />
                      {order.customer.address.country}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SKU Breakdown */}
            <div className="box mb-6">
              <div className="box-header">
                <h4 className="box-title">SKU Breakdown</h4>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Product Name</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total Price</th>
                        <th>Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="font-medium">{item.sku}</td>
                          <td>{item.name}</td>
                          <td>{item.quantity}</td>
                          <td>${item.unitPrice.toLocaleString()}</td>
                          <td className="font-semibold">${item.totalPrice.toLocaleString()}</td>
                          <td>
                            {item.stockAvailable ? (
                              <span className="text-green-600">
                                <i className="ri-checkbox-circle-line me-1"></i>
                                Available
                                {item.stockQuantity !== undefined && ` (${item.stockQuantity})`}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                <i className="ri-error-warning-line me-1"></i>
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Packing Instructions */}
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Packing Instructions</h4>
              </div>
              <div className="box-body">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Packaging Type:</span>
                    <span className="font-medium capitalize">{order.packingInstructions.packagingType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Fragile:</span>
                    <span className={order.packingInstructions.fragile ? 'text-red-600 font-medium' : 'text-gray-600'}>
                      {order.packingInstructions.fragile ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {order.packingInstructions.specialHandling && (
                    <div>
                      <span className="text-sm text-gray-600">Special Handling:</span>
                      <p className="font-medium">{order.packingInstructions.specialHandling}</p>
                    </div>
                  )}
                  {order.packingInstructions.notes && (
                    <div>
                      <span className="text-sm text-gray-600">Notes:</span>
                      <p className="font-medium">{order.packingInstructions.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              onClick={onClose}
              className="ti-btn ti-btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;

