"use client";

import React from 'react';
import { Order } from '../types';

interface OrderTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  selectedOrders: string[];
  onSelectOrder: (orderId: string) => void;
  onSelectAll: (checked: boolean) => void;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onOrderClick,
  selectedOrders,
  onSelectOrder,
  onSelectAll,
}) => {
  const allSelected = orders.length > 0 && selectedOrders.length === orders.length;
  const someSelected = selectedOrders.length > 0 && selectedOrders.length < orders.length;

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

  const hasLowStock = (order: Order) => {
    return order.items.some(item => 
      item.stockQuantity !== undefined && 
      item.stockQuantity < item.quantity && 
      item.stockQuantity > 0
    );
  };

  const hasUnavailable = (order: Order) => {
    return order.items.some(item => !item.stockAvailable);
  };

  if (orders.length === 0) {
    return (
      <div className="box">
        <div className="box-body text-center py-12">
          <i className="ri-inbox-line text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">No orders found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="box">
      <div className="box-body">
        <div className="overflow-x-auto">
          <table className="table table-hover">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                  />
                </th>
                <th>Order Number</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Priority</th>
                <th>Stock Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => onOrderClick(order)}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => onSelectOrder(order.id)}
                    />
                  </td>
                  <td>
                    <div className="font-medium">{order.orderNumber}</div>
                  </td>
                  <td>{new Date(order.date).toLocaleDateString()}</td>
                  <td>
                    <div>{order.customer.name}</div>
                    <div className="text-sm text-gray-500">{order.customer.email}</div>
                  </td>
                  <td>
                    <span className="capitalize">{order.channel}</span>
                  </td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeClass(order.status)}`}>
                      {order.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div>{order.totalQuantity} items</div>
                    <div className="text-sm text-gray-500">{order.items.length} SKUs</div>
                  </td>
                  <td className="font-semibold">${order.totalValue.toLocaleString()}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadgeClass(order.priority)}`}>
                      {order.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    {hasUnavailable(order) ? (
                      <span className="text-red-600 text-sm">
                        <i className="ri-error-warning-line me-1"></i>
                        Unavailable
                      </span>
                    ) : hasLowStock(order) ? (
                      <span className="text-yellow-600 text-sm">
                        <i className="ri-alert-line me-1"></i>
                        Low Stock
                      </span>
                    ) : (
                      <span className="text-green-600 text-sm">
                        <i className="ri-checkbox-circle-line me-1"></i>
                        Available
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOrderClick(order)}
                      className="ti-btn ti-btn-sm ti-btn-primary"
                      title="View Details"
                    >
                      <i className="ri-eye-line"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderTable;

