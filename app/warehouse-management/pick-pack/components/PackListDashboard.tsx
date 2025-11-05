"use client";

import React, { useState } from 'react';
import { PackOrder, DamageMissingReport } from '../types';
import DamageMissingReportModal from './DamageMissingReportModal';

interface PackListDashboardProps {
  orders: PackOrder[];
  onPackConfirm: (orderId: string, itemId: string, quantity: number) => void;
  onLabelPrint: (orderId: string) => void;
  onQRScan: (qrData: string) => void;
  onReportSubmit: (report: Omit<DamageMissingReport, 'id' | 'reportedAt'>) => void;
}

const PackListDashboard: React.FC<PackListDashboardProps> = ({
  orders,
  onPackConfirm,
  onLabelPrint,
  onQRScan,
  onReportSubmit,
}) => {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportOrder, setReportOrder] = useState<PackOrder | null>(null);
  const [reportItem, setReportItem] = useState<string>('');

  // Group orders by status
  const pendingOrders = orders.filter(order => order.status === 'pending');
  const packingOrders = orders.filter(order => order.status === 'packing');
  const packedOrders = orders.filter(order => order.status === 'packed');
  const verifiedOrders = orders.filter(order => order.status === 'verified');

  const handlePackItem = (orderId: string, itemId: string, currentQty: number, requiredQty: number) => {
    const packedQty = Math.min(currentQty + 1, requiredQty);
    onPackConfirm(orderId, itemId, packedQty);
  };

  const handleQRSubmit = () => {
    if (qrInput.trim()) {
      onQRScan(qrInput.trim());
      setQrInput('');
    }
  };

  const handleOpenReportModal = (order: PackOrder, itemId: string) => {
    setReportOrder(order);
    setReportItem(itemId);
    setShowReportModal(true);
  };

  const handleReportSubmit = (reportData: Omit<DamageMissingReport, 'id' | 'reportedAt'>) => {
    onReportSubmit(reportData);
    setShowReportModal(false);
    setReportOrder(null);
    setReportItem('');
  };

  const getStatusColor = (status: PackOrder['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'packing':
        return 'bg-yellow-100 text-yellow-700';
      case 'packed':
        return 'bg-blue-100 text-blue-700';
      case 'verified':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: PackOrder['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
            </div>
            <i className="ri-file-list-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOrders.length}</p>
            </div>
            <i className="ri-time-line text-3xl text-yellow-400"></i>
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Packed</p>
              <p className="text-2xl font-bold text-blue-600">{packedOrders.length}</p>
            </div>
            <i className="ri-box-line text-3xl text-blue-400"></i>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified</p>
              <p className="text-2xl font-bold text-green-600">{verifiedOrders.length}</p>
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
                onClick={() => setScanMode(!scanMode)}
                className={`ti-btn ${scanMode ? 'ti-btn-success' : 'ti-btn-light'}`}
              >
                <i className="ri-qr-scan-line me-2"></i>
                {scanMode ? 'Exit QR Scan' : 'QR Scan Mode'}
              </button>
            </div>
            <div className="text-sm text-gray-600">
              <i className="ri-information-line me-1"></i>
              Scan QR codes to validate items during packing
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
                Validate
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              <i className="ri-information-line me-1"></i>
              Scan QR code from item to validate packing
            </p>
          </div>
        </div>
      )}

      {/* Order-wise Item Breakup */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div
            key={order.orderId}
            className={`box ${selectedOrder === order.orderId ? 'border-primary' : ''}`}
          >
            <div className="box-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="box-title">{order.orderNumber}</h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                      order.priority
                    )}`}
                  >
                    <i className="ri-flag-line me-1"></i>
                    {order.priority.toUpperCase()} Priority
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.labelPrinted && (
                    <span className="text-xs text-green-600">
                      <i className="ri-printer-line me-1"></i>
                      Label Printed
                    </span>
                  )}
                  <button
                    onClick={() => onLabelPrint(order.orderId)}
                    className="ti-btn ti-btn-sm ti-btn-light"
                  >
                    <i className="ri-printer-line me-1"></i>
                    Print Label
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Customer: {order.customerName} | Items: {order.packedItems}/{order.totalItems}
              </p>
            </div>
            <div className="box-body">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{item.sku}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{item.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">
                              {item.packedQuantity} / {item.quantity}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{
                                  width: `${(item.packedQuantity / item.quantity) * 100}%`,
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              item.status === 'packed'
                                ? 'bg-blue-100 text-blue-700'
                                : item.status === 'verified'
                                ? 'bg-green-100 text-green-700'
                                : item.status === 'damaged'
                                ? 'bg-red-100 text-red-700'
                                : item.status === 'missing'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            {item.packedQuantity < item.quantity && (
                              <button
                                onClick={() => handlePackItem(order.orderId, item.id, item.packedQuantity, item.quantity)}
                                className="ti-btn ti-btn-sm ti-btn-primary"
                              >
                                <i className="ri-check-line me-1"></i>
                                Pack
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenReportModal(order, item.id)}
                              className="ti-btn ti-btn-sm ti-btn-danger"
                            >
                              <i className="ri-error-warning-line me-1"></i>
                              Report
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Damage/Missing Report Modal */}
      {showReportModal && reportOrder && (
        <DamageMissingReportModal
          isOpen={showReportModal}
          onClose={() => {
            setShowReportModal(false);
            setReportOrder(null);
            setReportItem('');
          }}
          order={reportOrder}
          itemId={reportItem}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
};

export default PackListDashboard;

