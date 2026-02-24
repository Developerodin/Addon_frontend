"use client";

import React from 'react';
import { Order, StockBlockStatus } from '../types';

interface OrderTableProps {
  orders: Order[];
  onOrderClick: (order: Order) => void;
  selectedOrders: string[];
  onSelectOrder: (orderId: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (orderId: string) => void;
  onDelete: (orderId: string) => void;
  onUpdateWebsiteStatus?: (order: Order) => void;
}

function getOrderStockBlockStatus(order: Order): StockBlockStatus {
  if (order.stockBlockStatus) return order.stockBlockStatus;
  if (order.status === 'dispatched' || order.status === 'cancelled') return 'available';
  if (order.status === 'in-progress' || order.status === 'packed') return 'pick-block';
  return 'tentative-block'; // order received (pending)
}

function getStockBlockBadgeClass(s: StockBlockStatus) {
  const classes: Record<StockBlockStatus, string> = {
    available: 'bg-green-100 text-green-800',
    'tentative-block': 'bg-yellow-100 text-yellow-800',
    'pick-block': 'bg-blue-100 text-blue-800',
  };
  return classes[s] || 'bg-gray-100 text-gray-800';
}

function getStockBlockLabel(s: StockBlockStatus) {
  const labels: Record<StockBlockStatus, string> = {
    available: 'Available',
    'tentative-block': 'Tentative Block',
    'pick-block': 'Pick Block',
  };
  return labels[s] || s;
}

const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  onOrderClick,
  selectedOrders,
  onSelectOrder,
  onSelectAll,
  onEdit,
  onDelete,
  onUpdateWebsiteStatus,
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <i className="ri-inbox-line text-xl text-gray-200"></i>
        </div>
        <h3 className="text-xs font-bold text-gray-400 mb-1">DATA EMPTY</h3>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[300px]">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50/30">
            <th className="pl-[10px] pr-1 py-3 text-left w-10 border border-gray-200">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(input) => {
                  if (input) input.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
              />
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Order Number
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Date
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Customer
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Channel
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Status
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Items
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Total Value
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Priority
            </th>
            <th className="px-1.5 py-3 text-left text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Stock Status
            </th>
            <th className="px-1.5 py-3 text-right pr-[10px] text-[11px] font-bold text-[#495057] uppercase tracking-wider border border-gray-200">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
              onClick={() => onOrderClick(order)}
            >
              <td className="pl-[10px] pr-1 py-2.5 border border-gray-200" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedOrders.includes(order.id)}
                  onChange={() => onSelectOrder(order.id)}
                  className="rounded border-gray-200 text-purple-600 focus:ring-0 h-3.5 w-3.5"
                />
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-900 border border-gray-200">
                {order.orderNumber}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200">
                {new Date(order.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-semibold text-gray-600 border border-gray-200">
                <div>{order.customer.name}</div>
                <div className="text-[10px] text-gray-500">{order.customer.email}</div>
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-400 border border-gray-200 capitalize">
                {order.channel}
              </td>
              <td className="px-1.5 py-2.5 text-left border border-gray-200">
                {order.source === 'Website' && onUpdateWebsiteStatus ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateWebsiteStatus(order);
                    }}
                    className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusBadgeClass(order.status)} transition-opacity hover:opacity-80 focus:outline-none`}
                    title="Update website order status"
                  >
                    {order.status}
                  </button>
                ) : (
                  <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStatusBadgeClass(order.status)}`}>
                    {order.status}
                  </span>
                )}
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-medium text-gray-600 border border-gray-200">
                <div>{order.totalQuantity} items</div>
                <div className="text-[10px] text-gray-500">{order.items.length} SKUs</div>
              </td>
              <td className="px-1.5 py-2.5 text-[12px] font-bold text-gray-800 border border-gray-200">
                ₹{order.totalValue.toLocaleString()}
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200">
                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getPriorityBadgeClass(order.priority)}`}>
                  {order.priority}
                </span>
              </td>
              <td className="px-1.5 py-2.5 border border-gray-200">
                <span className={`inline-flex px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-tight ${getStockBlockBadgeClass(getOrderStockBlockStatus(order))}`}>
                  {getStockBlockLabel(getOrderStockBlockStatus(order))}
                </span>
              </td>
              <td className="px-1.5 py-2.5 text-right pr-[10px] border border-gray-200" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onOrderClick(order)}
                    className="w-7 h-7 flex items-center justify-center bg-blue-50 text-blue-400 border border-blue-100 rounded hover:bg-blue-100 transition-colors"
                    title="View Details"
                  >
                    <i className="ri-eye-line text-xs"></i>
                  </button>
                  <button
                    onClick={() => onEdit(order.id)}
                    className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-400 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors"
                    title="Edit Order"
                  >
                    <i className="ri-pencil-line text-xs"></i>
                  </button>
                  <button
                    onClick={() => onDelete(order.id)}
                    className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 border border-red-100 rounded hover:bg-red-100 transition-colors"
                    title="Delete Order"
                  >
                    <i className="ri-delete-bin-line text-xs"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;



