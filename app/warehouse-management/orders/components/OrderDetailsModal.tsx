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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="box">
                <div className="box-body">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <i className="ri-file-list-line text-primary"></i>
                    Order Information
                  </h4>
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
                      <span className="text-gray-600">Source:</span>
                      <span className="font-medium">{order.source || order.channel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Priority:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
                        {order.priority.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="box-body">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <i className="ri-bank-card-line text-primary"></i>
                    Payment Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold text-lg text-primary">₹{order.payment?.amount.toLocaleString() || order.totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium">{order.payment?.method || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.payment?.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.payment?.status === 'failed' ? 'bg-red-100 text-red-800' :
                        order.payment?.status === 'refunded' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.payment?.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Quantity:</span>
                      <span className="font-medium">{order.totalQuantity} items</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="box">
                <div className="box-body">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <i className="ri-truck-line text-primary"></i>
                    Logistics Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Warehouse:</span>
                      <span className="font-medium">{order.logistics?.warehouse || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Logistics Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        order.logistics?.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.logistics?.status === 'shipped' || order.logistics?.status === 'in-transit' ? 'bg-blue-100 text-blue-800' :
                        order.logistics?.status === 'ready-to-ship' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.logistics?.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking ID:</span>
                      <span className="font-medium font-mono text-xs">
                        {order.logistics?.trackingId || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Assigned Picker:</span>
                      <span className="font-medium">{order.logistics?.picker || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dispatch Mode:</span>
                      <span className="font-medium capitalize">{order.dispatchMode}</span>
                    </div>
                    {order.estimatedDispatchDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Est. Dispatch:</span>
                        <span className="font-medium">
                          {new Date(order.estimatedDispatchDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {order.actualDispatchDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Actual Dispatch:</span>
                        <span className="font-medium text-green-600">
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
                <h4 className="box-title flex items-center gap-2">
                  <i className="ri-user-line text-primary"></i>
                  Customer Details
                </h4>
              </div>
              <div className="box-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Customer Name</p>
                    <p className="font-semibold text-gray-900">{order.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Email Address</p>
                    <p className="font-medium text-gray-900">{order.customer.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Number</p>
                    <p className="font-medium text-gray-900">{order.customer.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 mb-2">Shipping Address</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="font-medium text-gray-900">
                        {order.customer.address.street && (
                          <>{order.customer.address.street}<br /></>
                        )}
                        {order.customer.address.city}, {order.customer.address.state} - {order.customer.address.zipCode}<br />
                        {order.customer.address.country}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="box mb-6">
              <div className="box-header">
                <h4 className="box-title flex items-center gap-2">
                  <i className="ri-shopping-cart-line text-primary"></i>
                  Order Items
                </h4>
              </div>
              <div className="box-body">
                <div className="overflow-x-auto">
                  <table className="table table-hover">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left">SKU</th>
                        <th className="text-left">Product Name</th>
                        <th className="text-center">Quantity</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Total Price</th>
                        <th className="text-center">Stock Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index}>
                          <td className="font-medium text-gray-900">{item.sku}</td>
                          <td className="text-gray-900">{item.name}</td>
                          <td className="text-center font-medium">{item.quantity}</td>
                          <td className="text-right">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="text-right font-semibold text-gray-900">₹{item.totalPrice.toLocaleString()}</td>
                          <td className="text-center">
                            {item.stockAvailable ? (
                              <span className="text-green-600 text-sm">
                                <i className="ri-checkbox-circle-line me-1"></i>
                                Available
                                {item.stockQuantity !== undefined && ` (${item.stockQuantity})`}
                              </span>
                            ) : (
                              <span className="text-red-600 text-sm">
                                <i className="ri-error-warning-line me-1"></i>
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-primary/5 font-semibold">
                        <td colSpan={2} className="text-right">Order Total:</td>
                        <td className="text-center">{order.totalQuantity}</td>
                        <td></td>
                        <td className="text-right text-lg text-primary">₹{order.totalValue.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Packing Instructions */}
              <div className="box">
                <div className="box-header">
                  <h4 className="box-title flex items-center gap-2">
                    <i className="ri-box-line text-primary"></i>
                    Packing Instructions
                  </h4>
                </div>
                <div className="box-body">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Packaging Type:</span>
                      <span className="font-medium capitalize">{order.packingInstructions.packagingType}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Fragile:</span>
                      <span className={order.packingInstructions.fragile ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {order.packingInstructions.fragile ? (
                          <>
                            <i className="ri-alert-line me-1"></i>
                            Yes
                          </>
                        ) : (
                          'No'
                        )}
                      </span>
                    </div>
                    {order.packingInstructions.specialHandling && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Special Handling:</p>
                        <p className="font-medium bg-yellow-50 p-2 rounded text-sm">{order.packingInstructions.specialHandling}</p>
                      </div>
                    )}
                    {order.packingInstructions.notes && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Notes:</p>
                        <p className="font-medium bg-blue-50 p-2 rounded text-sm">{order.packingInstructions.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.meta?.notes && (
                <div className="box">
                  <div className="box-header">
                    <h4 className="box-title flex items-center gap-2">
                      <i className="ri-sticky-note-line text-primary"></i>
                      Special Notes
                    </h4>
                  </div>
                  <div className="box-body">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                      <p className="text-sm text-gray-900">{order.meta.notes}</p>
                    </div>
                  </div>
                </div>
              )}
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



