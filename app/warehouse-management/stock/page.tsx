"use client";

import React, { useState, useMemo } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import {
  StockInDocument,
  PickPackList,
  DispatchSummary,
  CourierIntegration as CourierIntegrationType,
} from './types';
import {
  generateDummyStockIn,
  generateDummyPickPackLists,
  generateDummyDispatchSummaries,
  generateDummyCourierIntegrations,
} from './dummyData';
import StockInDashboard from './components/StockInDashboard';
import AddStockPage from './components/AddStockPage';
import StockOutDashboard from './components/StockOutDashboard';
import QualityCheckPage from './components/QualityCheckPage';
import DispatchSummaryPage from './components/DispatchSummaryPage';
import CourierIntegration from './components/CourierIntegration';

type StockInView = 'dashboard' | 'add-stock';
type StockOutView = 'dashboard' | 'quality-check' | 'dispatch' | 'courier';

const StockPage = () => {
  // Main tab state
  const [activeTab, setActiveTab] = useState<'stock-in' | 'stock-out'>('stock-in');

  // Stock In states
  const [stockInView, setStockInView] = useState<StockInView>('dashboard');
  const [selectedStockInDoc, setSelectedStockInDoc] = useState<StockInDocument | null>(null);

  // Stock Out states
  const [stockOutView, setStockOutView] = useState<StockOutView>('dashboard');
  const [selectedPickPackList, setSelectedPickPackList] = useState<PickPackList | null>(null);
  const [selectedDispatchSummary, setSelectedDispatchSummary] = useState<DispatchSummary | null>(null);

  // Generate dummy data
  const stockInDocuments = useMemo(() => generateDummyStockIn(), []);
  const pickPackLists = useMemo(() => generateDummyPickPackLists(), []);
  const dispatchSummaries = useMemo(() => generateDummyDispatchSummaries(), []);
  const courierIntegrations = useMemo(() => generateDummyCourierIntegrations(), []);

  // Stock In handlers
  const handleStockInDocClick = (doc: StockInDocument) => {
    setSelectedStockInDoc(doc);
    // Could open a modal here for document details
    alert(`Viewing document: ${doc.documentNumber}`);
  };

  const handleAddStock = () => {
    setStockInView('add-stock');
  };

  const handleSaveStockIn = (doc: StockInDocument) => {
    alert(`Stock In document saved: ${doc.documentNumber}`);
    setStockInView('dashboard');
  };

  // Stock Out handlers
  const handlePickPackListClick = (list: PickPackList) => {
    setSelectedPickPackList(list);
    setStockOutView('quality-check');
  };

  const handleQualityCheck = (listId: string) => {
    const list = pickPackLists.find(l => l.id === listId);
    if (list) {
      setSelectedPickPackList(list);
      setStockOutView('quality-check');
    }
  };

  const handleApproveQuality = (listId: string, checks: any[]) => {
    alert(`Quality check approved for list: ${listId}`);
    setStockOutView('dashboard');
    setSelectedPickPackList(null);
  };

  const handleRejectQuality = (listId: string, checks: any[]) => {
    alert(`Quality check rejected for list: ${listId}`);
    setStockOutView('dashboard');
    setSelectedPickPackList(null);
  };

  const handleDispatch = (listId: string) => {
    // Create or find dispatch summary for this list
    const summary = dispatchSummaries.find(s => s.id.includes(listId)) || dispatchSummaries[0];
    setSelectedDispatchSummary(summary);
    setStockOutView('dispatch');
  };

  const handleSaveDispatch = (summary: DispatchSummary) => {
    alert(`Dispatch summary saved: ${summary.dispatchNumber}`);
    setStockOutView('dashboard');
    setSelectedDispatchSummary(null);
  };

  const handlePrintDispatch = (summary: DispatchSummary) => {
    alert(`Printing dispatch summary: ${summary.dispatchNumber}`);
  };

  const handleCourierConfigure = (integrationId: string) => {
    alert(`Configuring courier integration: ${integrationId}`);
  };

  const handleCourierToggle = (integrationId: string) => {
    alert(`Toggling courier integration: ${integrationId}`);
  };

  return (
    <div className="main-content">
      <Seo title="Stock In & Stock Out Operations" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Stock In & Stock Out Operations</h1>
              <p className="text-gray-600 mt-2">
                Handle all inbound and outbound stock movement in the warehouse.
              </p>
            </div>
          </div>

          {/* Main Tabs */}
          <div className="box">
            <div className="box-body p-0">
              <div className="border-b border-gray-200">
                <nav className="flex" aria-label="Tabs">
                  <button
                    onClick={() => {
                      setActiveTab('stock-in');
                      setStockInView('dashboard');
                    }}
                    className={`flex-1 px-6 py-4 text-center border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'stock-in'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-inbox-line text-xl"></i>
                      <div>
                        <div className="font-semibold">Stock In</div>
                        <div className="text-xs text-gray-500">Inbound Operations</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('stock-out');
                      setStockOutView('dashboard');
                    }}
                    className={`flex-1 px-6 py-4 text-center border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'stock-out'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <i className="ri-outbox-line text-xl"></i>
                      <div>
                        <div className="font-semibold">Stock Out</div>
                        <div className="text-xs text-gray-500">Outbound Operations</div>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* Stock In Content */}
            {activeTab === 'stock-in' && (
              <>
                {stockInView === 'dashboard' && (
                  <StockInDashboard
                    documents={stockInDocuments}
                    onDocumentClick={handleStockInDocClick}
                    onAddStock={handleAddStock}
                  />
                )}
                {stockInView === 'add-stock' && (
                  <AddStockPage
                    onBack={() => setStockInView('dashboard')}
                    onSave={handleSaveStockIn}
                  />
                )}
              </>
            )}

            {/* Stock Out Content */}
            {activeTab === 'stock-out' && (
              <>
                {stockOutView === 'dashboard' && (
                  <StockOutDashboard
                    pickPackLists={pickPackLists}
                    onListClick={handlePickPackListClick}
                    onQualityCheck={handleQualityCheck}
                    onDispatch={handleDispatch}
                  />
                )}
                {stockOutView === 'quality-check' && (
                  <QualityCheckPage
                    pickPackList={selectedPickPackList}
                    onBack={() => {
                      setStockOutView('dashboard');
                      setSelectedPickPackList(null);
                    }}
                    onApprove={handleApproveQuality}
                    onReject={handleRejectQuality}
                  />
                )}
                {stockOutView === 'dispatch' && (
                  <DispatchSummaryPage
                    dispatchSummary={selectedDispatchSummary}
                    onBack={() => {
                      setStockOutView('dashboard');
                      setSelectedDispatchSummary(null);
                    }}
                    onPrint={handlePrintDispatch}
                    onSave={handleSaveDispatch}
                  />
                )}
                {stockOutView === 'courier' && (
                  <CourierIntegration
                    integrations={courierIntegrations}
                    onConfigure={handleCourierConfigure}
                    onToggle={handleCourierToggle}
                  />
                )}
              </>
            )}
          </div>

          {/* Courier Integration Access Button (when on stock-out dashboard) */}
          {activeTab === 'stock-out' && stockOutView === 'dashboard' && (
            <div className="box mt-6">
              <div className="box-body">
                <button
                  onClick={() => setStockOutView('courier')}
                  className="ti-btn ti-btn-primary"
                >
                  <i className="ri-truck-line me-2"></i>
                  Manage Courier Integrations
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockPage;
