"use client";

import React, { useState, useMemo } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import DailyStockFlowReport from './components/DailyStockFlowReport';
import OrderFulfilmentReport from './components/OrderFulfilmentReport';
import RackUtilizationReport from './components/RackUtilizationReport';
import ShrinkageAuditLogs from './components/ShrinkageAuditLogs';
import {
  generateDummyStockFlow,
  generateDummyOrderFulfilment,
  generateDummyRackUtilization,
  generateDummyShrinkage,
  generateDummyAuditLogs
} from './dummyData';

type ReportTab = 'stock-flow' | 'order-fulfilment' | 'rack-utilization' | 'shrinkage-audit';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('stock-flow');

  // Generate dummy data
  const stockFlowData = useMemo(() => generateDummyStockFlow(30), []);
  const orderFulfilmentData = useMemo(() => generateDummyOrderFulfilment(30), []);
  const rackUtilizationData = useMemo(() => generateDummyRackUtilization(), []);
  const shrinkageData = useMemo(() => generateDummyShrinkage(30), []);
  const auditLogsData = useMemo(() => generateDummyAuditLogs(30), []);

  const tabs: Array<{ key: ReportTab; label: string; icon: string; description: string }> = [
    {
      key: 'stock-flow',
      label: 'Daily Stock Flow',
      icon: 'ri-exchange-line',
      description: 'Track stock movements in and out'
    },
    {
      key: 'order-fulfilment',
      label: 'Order Fulfilment',
      icon: 'ri-checkbox-circle-line',
      description: 'Monitor order fulfillment metrics'
    },
    {
      key: 'rack-utilization',
      label: 'Rack Utilization',
      icon: 'ri-stack-line',
      description: 'Analyze rack space usage'
    },
    {
      key: 'shrinkage-audit',
      label: 'Shrinkage & Audit',
      icon: 'ri-file-list-3-line',
      description: 'View shrinkage records and audit logs'
    }
  ];

  return (
    <div className="main-content">
      <Seo title="Warehouse Reports & Analytics" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Reports & Analytics</h1>
              <p className="text-gray-600 mt-2">
                Track performance and operations with comprehensive warehouse reports.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="box">
            <div className="box-body p-0">
              <div className="border-b border-gray-200">
                <nav className="flex flex-wrap" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 min-w-[200px] px-6 py-4 text-center border-b-2 font-medium text-sm transition-colors ${
                        activeTab === tab.key
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <i className={`${tab.icon} text-xl`}></i>
                        <div>
                          <div className="font-semibold">{tab.label}</div>
                          <div className="text-xs text-gray-500">{tab.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === 'stock-flow' && (
              <DailyStockFlowReport records={stockFlowData} />
            )}
            {activeTab === 'order-fulfilment' && (
              <OrderFulfilmentReport metrics={orderFulfilmentData} />
            )}
            {activeTab === 'rack-utilization' && (
              <RackUtilizationReport data={rackUtilizationData} />
            )}
            {activeTab === 'shrinkage-audit' && (
              <ShrinkageAuditLogs
                shrinkageRecords={shrinkageData}
                auditLogs={auditLogsData}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

