"use client";

import React from 'react';
import { StockInDocument } from '../types';

interface StockInDashboardProps {
  documents: StockInDocument[];
  onDocumentClick: (document: StockInDocument) => void;
  onAddStock: () => void;
}

const StockInDashboard: React.FC<StockInDashboardProps> = ({
  documents,
  onDocumentClick,
  onAddStock,
}) => {
  const stats = {
    total: documents.length,
    pending: documents.filter(d => d.status === 'pending').length,
    received: documents.filter(d => d.status === 'received').length,
    completed: documents.filter(d => d.status === 'completed').length,
  };

  const totalValue = documents.reduce((sum, doc) => sum + doc.totalValue, 0);

  return (
    <div>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Documents</p>
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
              <p className="text-sm text-gray-600">Received</p>
              <p className="text-2xl font-bold text-purple-600">{stats.received}</p>
            </div>
            <i className="ri-inbox-line text-3xl text-purple-400"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-green-400"></i>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-indigo-600">
                ₹{(totalValue / 100000).toFixed(1)}L
              </p>
            </div>
            <i className="ri-money-rupee-circle-line text-3xl text-indigo-400"></i>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={onAddStock}
          className="ti-btn ti-btn-primary"
        >
          <i className="ri-add-line me-2"></i>
          Add New Stock
        </button>
      </div>

      {/* Recent Documents */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">Recent Stock In Documents</h3>
        </div>
        <div className="box-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Value
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
                {documents.slice(0, 10).map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {doc.documentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {doc.documentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.supplierName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.items.length}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ₹{(doc.totalValue / 1000).toFixed(1)}K
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          doc.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : doc.status === 'received'
                            ? 'bg-purple-100 text-purple-800'
                            : doc.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => onDocumentClick(doc)}
                        className="text-primary hover:text-primary-dark"
                      >
                        View Details
                      </button>
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

export default StockInDashboard;


