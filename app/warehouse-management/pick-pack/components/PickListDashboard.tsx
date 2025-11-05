"use client";

import React, { useState } from 'react';
import { PickItem } from '../types';

interface PickListDashboardProps {
  items: PickItem[];
  onPickConfirm: (itemId: string, quantity: number) => void;
  onQRScan: (qrData: string) => void;
}

const PickListDashboard: React.FC<PickListDashboardProps> = ({
  items,
  onPickConfirm,
  onQRScan,
}) => {
  const [selectedItem, setSelectedItem] = useState<PickItem | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [pickingPathView, setPickingPathView] = useState(true);

  // Sort items by picking path
  const sortedItems = [...items].sort((a, b) => a.pickingPath - b.pickingPath);

  // Group items by status
  const pendingItems = sortedItems.filter(item => item.status === 'pending');
  const pickingItems = sortedItems.filter(item => item.status === 'picking');
  const pickedItems = sortedItems.filter(item => item.status === 'picked');
  const verifiedItems = sortedItems.filter(item => item.status === 'verified');

  const handlePickItem = (item: PickItem) => {
    setSelectedItem(item);
    const pickedQty = Math.min(item.pickedQuantity + 1, item.totalQuantity);
    onPickConfirm(item.id, pickedQty);
  };

  const handleQRSubmit = () => {
    if (qrInput.trim()) {
      onQRScan(qrInput.trim());
      setQrInput('');
    }
  };

  const getStatusColor = (status: PickItem['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'picking':
        return 'bg-yellow-100 text-yellow-700';
      case 'picked':
        return 'bg-blue-100 text-blue-700';
      case 'verified':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: PickItem['status']) => {
    switch (status) {
      case 'pending':
        return 'ri-time-line';
      case 'picking':
        return 'ri-loader-4-line';
      case 'picked':
        return 'ri-checkbox-circle-line';
      case 'verified':
        return 'ri-checkbox-circle-fill';
      default:
        return 'ri-time-line';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            </div>
            <i className="ri-file-list-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingItems.length}</p>
            </div>
            <i className="ri-time-line text-3xl text-yellow-400"></i>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Picked</p>
              <p className="text-2xl font-bold text-blue-600">{pickedItems.length}</p>
            </div>
            <i className="ri-checkbox-circle-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{verifiedItems.length}</p>
            </div>
            <i className="ri-checkbox-circle-fill text-3xl text-green-400"></i>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="box">
        <div className="box-body">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPickingPathView(!pickingPathView)}
                className={`ti-btn ${pickingPathView ? 'ti-btn-primary' : 'ti-btn-light'}`}
              >
                <i className="ri-route-line me-2"></i>
                {pickingPathView ? 'List View' : 'Optimized Path View'}
              </button>
              <button
                onClick={() => setScanMode(!scanMode)}
                className={`ti-btn ${scanMode ? 'ti-btn-success' : 'ti-btn-light'}`}
              >
                <i className="ri-qr-scan-line me-2"></i>
                {scanMode ? 'Exit QR Scan' : 'QR Scan Mode'}
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <i className="ri-information-line me-1"></i>
              Follow the optimized path for efficient picking
            </div>
          </div>
        </div>
      </div>

      {/* QR Scan Panel */}
      {scanMode && (
        <div className="box border-primary/20 bg-primary/5">
          <div className="box-body">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQRSubmit()}
                  placeholder="Scan QR code or enter manually..."
                  className="ti-form-input"
                  autoFocus
                />
              </div>
              <button onClick={handleQRSubmit} className="ti-btn ti-btn-primary">
                <i className="ri-check-line me-2"></i>
                Confirm Pick
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <i className="ri-information-line me-1"></i>
              Scan QR code from rack location to confirm pick
            </p>
          </div>
        </div>
      )}

      {/* Consolidated SKU List */}
      <div className="box">
        <div className="box-header">
          <h3 className="box-title">
            {pickingPathView ? 'Optimized Picking Path' : 'Consolidated SKU List'}
          </h3>
        </div>
        <div className="box-body">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {pickingPathView && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Path #</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rack Location</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-gray-50 ${
                      selectedItem?.id === item.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {pickingPathView && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-semibold">
                            {item.pickingPath}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{item.sku}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{item.name}</div>
                      {item.batchNumber && (
                        <div className="text-xs text-gray-500">Batch: {item.batchNumber}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">
                          Zone {item.rackLocation.zone}
                        </span>
                        <span className="text-xs text-gray-500">
                          Row {item.rackLocation.row} → Col {item.rackLocation.column} → Basket {item.rackLocation.basketNo}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">
                          {item.pickedQuantity} / {item.totalQuantity} {item.unit}
                        </span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${(item.pickedQuantity / item.totalQuantity) * 100}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {item.orders.slice(0, 3).map((orderId) => (
                          <span
                            key={orderId}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800"
                          >
                            {orderId}
                          </span>
                        ))}
                        {item.orders.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            +{item.orders.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          item.status
                        )}`}
                      >
                        <i className={`${getStatusIcon(item.status)} me-1`}></i>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {item.status !== 'verified' && (
                        <button
                          onClick={() => handlePickItem(item)}
                          disabled={item.pickedQuantity >= item.totalQuantity}
                          className="ti-btn ti-btn-sm ti-btn-primary"
                        >
                          <i className="ri-check-line me-1"></i>
                          Pick
                        </button>
                      )}
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

export default PickListDashboard;

