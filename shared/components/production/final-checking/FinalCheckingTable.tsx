import React from 'react';
import { ProductionOrder } from './FinalCheckingTypes';
import { getPriorityBadge, getStatusBadge } from './FinalCheckingUtils';

interface Props {
  orders: ProductionOrder[];
  selectedOrders: string[];
  selectAll: boolean;
  onToggleSelectAll: () => void;
  onToggleSelect: (id: string) => void;
  onOpenUpdate: (order: ProductionOrder) => void;
}

const FinalCheckingTable: React.FC<Props> = ({ orders, selectedOrders, selectAll, onToggleSelectAll, onToggleSelect, onOpenUpdate }) => {
  return (
    <div className="table-responsive">
      <table className="table whitespace-nowrap min-w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">
              <input type="checkbox" className="form-check-input" checked={selectAll} onChange={onToggleSelectAll} />
            </th>
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Order Info</th>
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Articles</th>
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Checked Quantities</th>
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Status</th>
            <th scope="col" className="px-4 py-3 text-start font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50 transition-colors duration-150">
              <td className="px-4 py-4">
                <input type="checkbox" className="form-check-input" checked={selectedOrders.includes(order.id)} onChange={() => onToggleSelect(order.id)} />
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">{order.id}</div>
                  <div className="text-sm text-gray-500">Created: {order.createdAt}</div>
                  <div className="text-xs text-gray-400">Updated: {order.updatedAt}</div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-1">
                  <div className="font-medium text-gray-900">{order.articles.length} Article{order.articles.length > 1 ? 's' : ''}</div>
                  <div className="text-sm text-gray-600">Total Qty: {order.articles.reduce((sum, a) => sum + a.plannedQuantity, 0).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Completed: {order.articles.reduce((sum, a) => sum + a.completedQuantity, 0).toLocaleString()}</div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="space-y-2">
                  {order.articles.map((a) => (
                    <div key={a.id} className="text-xs">
                      <div className="font-medium text-gray-700 mb-1">{a.articleNumber}</div>
                      <div className="grid grid-cols-2 gap-1">
                        <div className="text-green-600">M1: {a.m1Quantity}</div>
                        <div className="text-yellow-600">M2: {a.m2Quantity}</div>
                        <div className="text-orange-600">M3: {a.m3Quantity}</div>
                        <div className="text-red-600">M4: {a.m4Quantity}</div>
                      </div>
                      {a.repairStatus !== 'Not Required' && (
                        <div className="mt-1">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                            a.repairStatus === 'Repaired' ? 'bg-green-100 text-green-800' :
                            a.repairStatus === 'In Review' ? 'bg-yellow-100 text-yellow-800' :
                            a.repairStatus === 'Rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {a.repairStatus}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </td>
              
              <td className="px-4 py-4">
                <div className="space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>{order.status}</span>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(order.priority)}`}>{order.priority}</span>
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center space-x-2">
                  <button className="ti-btn ti-btn-success ti-btn-sm" onClick={() => onOpenUpdate(order)} title="Update Order">
                    <i className="ri-edit-line"></i>
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

export default FinalCheckingTable;


