"use client";

import React, { useState, useMemo } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import PickListDashboard from './components/PickListDashboard';
import PackListDashboard from './components/PackListDashboard';
import {
  generateDummyPickList,
  generateDummyPackList,
  generateDummyDamageMissingReports,
} from './dummyData';
import { PickItem, PackOrder, DamageMissingReport } from './types';

const PickPackPage = () => {
  const [activeTab, setActiveTab] = useState<'pick' | 'pack'>('pick');

  // Generate dummy data
  const pickList = useMemo(() => generateDummyPickList(), []);
  const packList = useMemo(() => generateDummyPackList(), []);
  const [damageReports, setDamageReports] = useState<DamageMissingReport[]>(
    generateDummyDamageMissingReports()
  );

  // Handle pick confirmation
  const handlePickConfirm = (itemId: string, quantity: number) => {
    console.log('Pick confirmed:', { itemId, quantity });
    // TODO: Implement actual pick confirmation logic
    alert(`Pick confirmed: Item ${itemId}, Quantity: ${quantity}`);
  };

  // Handle pack confirmation
  const handlePackConfirm = (orderId: string, itemId: string, quantity: number) => {
    console.log('Pack confirmed:', { orderId, itemId, quantity });
    // TODO: Implement actual pack confirmation logic
    alert(`Pack confirmed: Order ${orderId}, Item ${itemId}, Quantity: ${quantity}`);
  };

  // Handle label printing
  const handleLabelPrint = (orderId: string) => {
    console.log('Print label for order:', orderId);
    // TODO: Implement actual label printing logic
    alert(`Printing label for order: ${orderId}`);
  };

  // Handle QR scan
  const handleQRScan = (qrData: string) => {
    console.log('QR scanned:', qrData);
    // TODO: Implement actual QR scan validation logic
    alert(`QR Code scanned: ${qrData}`);
  };

  // Handle damage/missing report submission
  const handleReportSubmit = (report: Omit<DamageMissingReport, 'id' | 'reportedAt'>) => {
    const newReport: DamageMissingReport = {
      ...report,
      id: `report-${Date.now()}`,
      reportedAt: new Date().toISOString(),
    };
    setDamageReports(prev => [...prev, newReport]);
    console.log('Report submitted:', newReport);
    alert(`Report submitted: ${report.type} - ${report.sku}`);
  };

  return (
    <div className="main-content">
      <Seo title="Pick List & Pack List Automation" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Pick List & Pack List Automation</h1>
              <p className="text-gray-600 mt-2">
                Automate picking and packing flow efficiently with optimized paths and QR scanning.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="box">
            <div className="box-body">
              <div className="border-b border-gray-200 mb-4">
                <nav className="flex space-x-2" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('pick')}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === 'pick'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <i className="ri-shopping-cart-line me-2"></i>
                    Pick List Dashboard
                  </button>
                  <button
                    onClick={() => setActiveTab('pack')}
                    className={`px-6 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                      activeTab === 'pack'
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <i className="ri-box-line me-2"></i>
                    Pack List Dashboard
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              {activeTab === 'pick' && (
                <PickListDashboard
                  items={pickList.items}
                  onPickConfirm={handlePickConfirm}
                  onQRScan={handleQRScan}
                />
              )}

              {activeTab === 'pack' && (
                <PackListDashboard
                  orders={packList.orders}
                  onPackConfirm={handlePackConfirm}
                  onLabelPrint={handleLabelPrint}
                  onQRScan={handleQRScan}
                  onReportSubmit={handleReportSubmit}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickPackPage;

