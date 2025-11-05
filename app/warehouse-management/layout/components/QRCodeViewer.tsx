"use client";

import React, { useState } from 'react';
import { Basket } from '../types';

interface QRCodeViewerProps {
  baskets: Basket[];
  onScan: (qrCode: string) => void;
}

const QRCodeViewer: React.FC<QRCodeViewerProps> = ({ baskets, onScan }) => {
  const [scannedCode, setScannedCode] = useState('');
  const [selectedBasket, setSelectedBasket] = useState<Basket | null>(null);

  const handleScan = (qrCode: string) => {
    setScannedCode(qrCode);
    const basket = baskets.find(b => b.qrCode === qrCode);
    if (basket) {
      setSelectedBasket(basket);
      onScan(qrCode);
    } else {
      setSelectedBasket(null);
      alert('QR Code not found in system');
    }
  };

  const handleManualInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    if (code.length > 0) {
      handleScan(code);
    }
  };

  // Simulate QR scanner
  const simulateScan = () => {
    const randomBasket = baskets[Math.floor(Math.random() * baskets.length)];
    handleScan(randomBasket.qrCode);
  };

  return (
    <div className="box">
      <div className="box-header">
        <div>
          <h3 className="box-title">QR Code Viewer</h3>
          <p className="text-sm text-gray-600 mt-1">
            Scan QR codes to view items in specific baskets. You can also manually enter QR codes.
          </p>
        </div>
      </div>

      <div className="box-body">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Scanner
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedCode}
                  onChange={handleManualInput}
                  placeholder="Enter or scan QR code"
                  className="ti-form-input flex-1"
                />
                <button
                  onClick={simulateScan}
                  className="ti-btn ti-btn-primary"
                  title="Simulate Scanner (Demo)"
                >
                  <i className="ri-qr-scan-line me-1"></i>
                  Scan
                </button>
              </div>
            </div>

            {/* Scanner Preview */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  <i className="ri-qr-code-line text-gray-400"></i>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Position QR code within frame
                </p>
                <p className="text-xs text-gray-500">
                  Or enter QR code manually above
                </p>
              </div>
            </div>

            {/* Recent Scans */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">Quick Access</h4>
              <div className="grid grid-cols-2 gap-2">
                {baskets.slice(0, 6).map(basket => (
                  <button
                    key={basket.id}
                    onClick={() => handleScan(basket.qrCode)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-left transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {basket.qrCode}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {basket.items.length} items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basket Details Section */}
          <div>
            {selectedBasket ? (
              <div className="border-2 border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">Basket Details</h4>
                    <p className="text-sm text-gray-600">{selectedBasket.qrCode}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Utilization</div>
                    <div className="text-lg font-semibold">{selectedBasket.utilization}%</div>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Location</span>
                    <span className="font-medium">Rack: {selectedBasket.rackId}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Shelf</span>
                    <span className="font-medium">{selectedBasket.shelfId}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Position</span>
                    <span className="font-medium">#{selectedBasket.position}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        selectedBasket.utilization >= 80 ? 'bg-green-600' :
                        selectedBasket.utilization >= 50 ? 'bg-blue-500' :
                        selectedBasket.utilization >= 25 ? 'bg-blue-300' : 'bg-gray-300'
                      }`}
                      style={{ width: `${selectedBasket.utilization}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{selectedBasket.items.length} / {selectedBasket.capacity} items</span>
                    <span>{selectedBasket.utilization}% full</span>
                  </div>
                </div>

                <div>
                  <h5 className="text-sm font-semibold mb-3">Items in Basket</h5>
                  {selectedBasket.items.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {selectedBasket.items.map((item, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">
                              {item.name}
                            </span>
                            <span className="text-sm font-semibold text-blue-600">
                              Qty: {item.quantity}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            SKU: {item.sku}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last Moved: {new Date(item.lastMoved).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <i className="ri-inbox-line text-4xl mb-2"></i>
                      <p>This basket is empty</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    <i className="ri-inbox-line text-gray-400"></i>
                  </div>
                  <p className="text-sm text-gray-600">
                    Scan a QR code to view basket details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeViewer;

