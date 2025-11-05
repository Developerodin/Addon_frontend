"use client";

import React from 'react';
import { PickPackList } from '../types';

interface StockOutDashboardProps {
  pickPackLists: PickPackList[];
  onListClick: (list: PickPackList) => void;
  onQualityCheck: (listId: string) => void;
  onDispatch: (listId: string) => void;
}

const StockOutDashboard: React.FC<StockOutDashboardProps> = ({
  pickPackLists,
  onListClick,
  onQualityCheck,
  onDispatch,
}) => {
  const stats = {
    total: pickPackLists.length,
    pending: pickPackLists.filter(l => l.status === 'pending').length,
    picked: pickPackLists.filter(l => l.status === 'picked').length,
    qualityChecked: pickPackLists.filter(l => l.status === 'quality-checked').length,
    dispatched: pickPackLists.filter(l => l.status === 'dispatched').length,
  };

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Lists</p>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <i className="ri-file-list-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <i className="ri-time-line text-3xl text-yellow-400"></i>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Picked</p>
              <p className="text-2xl font-bold text-purple-600">{stats.picked}</p>
            </div>
            <i className="ri-shopping-cart-line text-3xl text-purple-400"></i>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Quality Checked</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.qualityChecked}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-indigo-400"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dispatched</p>
              <p className="text-2xl font-bold text-green-600">{stats.dispatched}</p>
            </div>
            <i className="ri-truck-line text-3xl text-green-400"></i>
          </div>
        </div>
      </div>

      {/* Pick & Pack Lists */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Pick & Pack Lists</h3>
        </div>
        <div className="box-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    List ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pickPackLists.map((list) => (
                  <tr key={list.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {list.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {list.orderNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(list.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {list.items.length} items
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          list.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : list.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {list.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {list.assignedTo || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          list.status === 'dispatched'
                            ? 'bg-green-100 text-green-800'
                            : list.status === 'quality-checked'
                            ? 'bg-indigo-100 text-indigo-800'
                            : list.status === 'picked'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {list.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => onListClick(list)}
                          className="text-primary hover:text-primary-dark"
                        >
                          View
                        </button>
                        {list.status === 'picked' && (
                          <button
                            onClick={() => onQualityCheck(list.id)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            QC
                          </button>
                        )}
                        {list.status === 'quality-checked' && (
                          <button
                            onClick={() => onDispatch(list.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            Dispatch
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockOutDashboard;

