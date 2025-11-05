"use client";

import React, { useState } from 'react';
import { DispatchSummary, CourierService } from '../types';

interface DispatchSummaryPageProps {
  dispatchSummary: DispatchSummary | null;
  onBack: () => void;
  onPrint: (summary: DispatchSummary) => void;
  onSave: (summary: DispatchSummary) => void;
}

const DispatchSummaryPage: React.FC<DispatchSummaryPageProps> = ({
  dispatchSummary,
  onBack,
  onPrint,
  onSave,
}) => {
  const [courierService, setCourierService] = useState<CourierService | ''>(
    dispatchSummary?.courierService || ''
  );
  const [trackingNumber, setTrackingNumber] = useState(
    dispatchSummary?.trackingNumber || ''
  );

  if (!dispatchSummary) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No dispatch summary available</p>
        <button onClick={onBack} className="ti-btn ti-btn-secondary mt-4">
          Go Back
        </button>
      </div>
    );
  }

  const handleSave = () => {
    const updatedSummary: DispatchSummary = {
      ...dispatchSummary,
      courierService: courierService as CourierService,
      trackingNumber: trackingNumber || dispatchSummary.trackingNumber,
    };
    onSave(updatedSummary);
  };

  const handlePrint = () => {
    onPrint(dispatchSummary);
    window.print();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Dispatch Summary</h2>
          <p className="text-sm text-gray-600 mt-1">
            Dispatch Number: {dispatchSummary.dispatchNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="ti-btn ti-btn-secondary">
            <i className="ri-printer-line me-2"></i>
            Print
          </button>
          <button onClick={onBack} className="ti-btn ti-btn-secondary">
            <i className="ri-arrow-left-line me-2"></i>
            Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dispatch Details */}
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Dispatch Details</h3>
          </div>
          <div className="box-body space-y-4">
            <div>
              <label className="form-label">Dispatch Number</label>
              <input
                type="text"
                className="form-control"
                value={dispatchSummary.dispatchNumber}
                disabled
              />
            </div>
            <div>
              <label className="form-label">Dispatch Date</label>
              <input
                type="text"
                className="form-control"
                value={new Date(dispatchSummary.date).toLocaleDateString()}
                disabled
              />
            </div>
            <div>
              <label className="form-label">Courier Service</label>
              <select
                className="form-control"
                value={courierService}
                onChange={(e) => setCourierService(e.target.value as CourierService)}
              >
                <option value="">Select Courier</option>
                <option value="FedEx">FedEx</option>
                <option value="UPS">UPS</option>
                <option value="DHL">DHL</option>
                <option value="BlueDart">BlueDart</option>
                <option value="DTDC">DTDC</option>
                <option value="Custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="form-label">Tracking Number</label>
              <input
                type="text"
                className="form-control"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Enter tracking number"
              />
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="box">
          <div className="box-header">
            <h3 className="box-title">Customer Details</h3>
          </div>
          <div className="box-body space-y-4">
            <div>
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-control"
                value={dispatchSummary.customerDetails.name}
                disabled
              />
            </div>
            <div>
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                rows={3}
                value={dispatchSummary.customerDetails.address}
                disabled
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  className="form-control"
                  value={dispatchSummary.customerDetails.phone}
                  disabled
                />
              </div>
              {dispatchSummary.customerDetails.email && (
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="text"
                    className="form-control"
                    value={dispatchSummary.customerDetails.email}
                    disabled
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="box mt-6">
        <div className="box-header">
          <h3 className="box-title">Dispatch Items</h3>
        </div>
        <div className="box-body p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Product Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Batch Number
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dispatchSummary.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.batchNumber || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Shipping Manifest */}
      <div className="box mt-6">
        <div className="box-header">
          <h3 className="box-title">Shipping Manifest</h3>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Items</p>
              <p className="text-lg font-semibold">{dispatchSummary.shippingManifest.totalItems}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Weight (kg)</p>
              <p className="text-lg font-semibold">
                {dispatchSummary.shippingManifest.totalWeight.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-lg font-semibold">
                ₹{(dispatchSummary.shippingManifest.totalValue / 1000).toFixed(1)}K
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Package Count</p>
              <p className="text-lg font-semibold">
                {dispatchSummary.shippingManifest.packageCount}
              </p>
            </div>
          </div>
          {dispatchSummary.shippingManifest.specialInstructions && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700">Special Instructions:</p>
              <p className="text-sm text-gray-600 mt-1">
                {dispatchSummary.shippingManifest.specialInstructions}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-6">
        <button onClick={handleSave} className="ti-btn ti-btn-primary flex-1">
          <i className="ri-save-line me-2"></i>
          Save Dispatch Summary
        </button>
      </div>
    </div>
  );
};

export default DispatchSummaryPage;

