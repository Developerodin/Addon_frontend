"use client";

import React, { useState } from 'react';
import Seo from '@/shared/layout-components/seo/seo';
import { useReplenishment } from '@/shared/hooks/useReplenishment';
import { ReplenishmentErrorBoundary } from '@/shared/components/replenishment';
import { AgentChat, ReplenishmentDashboard } from './components';
import HelpIcon from '@/shared/components/HelpIcon';

export default function ReplenishmentPage() {
  const [activeTab, setActiveTab] = useState('replenishment');
  const { healthStatus } = useReplenishment();

  // Tab content component
  const TabContent = () => {
    if (activeTab === 'replenishment') {
      return <ReplenishmentDashboard />;
    }

    if (activeTab === 'agent') {
      return <AgentChat />;
    }

    return null;
  };

  // Handle tab change and theme restoration
  const handleTabChange = (newTab: string) => {
    // If switching away from Agent tab, restore original theme
    if (activeTab === 'agent' && newTab !== 'agent') {
      const originalTheme = (window as any).__originalTheme || 'light';
      document.documentElement.setAttribute('data-bs-theme', originalTheme);
      document.body.classList.remove('dark-mode-active');
      console.log('Restored theme to:', originalTheme);
    }
    
    setActiveTab(newTab);
  };

  return (
    <ReplenishmentErrorBoundary>
      <Seo title="Replenishment Dashboard" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          {/* <div className="!bg-transparent border-0 shadow-none mt-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div>
                  <h1 className="box-title text-2xl font-semibold">Replenishment Dashboard</h1>
                  <p className="text-gray-500 mt-1">
                    AI-powered demand forecasting and inventory replenishment management
                  </p>
                </div>
                <HelpIcon
                  title="Replenishment Dashboard"
                  content={
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What is this page?</h4>
                        <p className="text-gray-700">
                          This is the Replenishment Dashboard that provides AI-powered demand forecasting and inventory replenishment management to optimize your supply chain operations.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">What can you do here?</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Demand Forecasting:</strong> Generate AI-powered demand predictions for products</li>
                          <li><strong>Replenishment Planning:</strong> Calculate optimal replenishment quantities</li>
                          <li><strong>Forecast Management:</strong> View, update, and manage demand forecasts</li>
                          <li><strong>Accuracy Tracking:</strong> Monitor forecast accuracy and deviation metrics</li>
                          <li><strong>Trend Analysis:</strong> Analyze demand trends and patterns</li>
                          <li><strong>Health Monitoring:</strong> Track inventory health status</li>
                          <li><strong>Model Performance:</strong> View AI model information and performance metrics</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Key Features:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>AI-Powered Forecasting:</strong> Advanced algorithms for demand prediction</li>
                          <li><strong>Interactive Charts:</strong> Visual representation of forecasts and trends</li>
                          <li><strong>Real-time Updates:</strong> Live updates of forecast accuracy and metrics</li>
                          <li><strong>Bulk Operations:</strong> Generate forecasts for multiple products at once</li>
                          <li><strong>Filtering & Search:</strong> Find specific forecasts and replenishment data</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Dashboard Components:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li><strong>Forecast Table:</strong> Detailed view of all forecasts with accuracy metrics</li>
                          <li><strong>Charts & Analytics:</strong> Visual trends and performance indicators</li>
                          <li><strong>Action Panel:</strong> Quick actions for forecast generation and management</li>
                          <li><strong>Summary Metrics:</strong> Key performance indicators and statistics</li>
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-lg mb-2">Tips:</h4>
                        <ul className="list-disc list-inside space-y-1 text-gray-700">
                          <li>Regularly update forecasts with actual sales data for better accuracy</li>
                          <li>Monitor forecast accuracy to improve AI model performance</li>
                          <li>Use the filtering options to focus on specific products or stores</li>
                          <li>Check the health status to identify potential inventory issues</li>
                        </ul>
                      </div>
                    </div>
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                {healthStatus && (
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    healthStatus.status === 'healthy' 
                      ? 'bg-success/10 text-success' 
                      : 'bg-danger/10 text-danger'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      healthStatus.status === 'healthy' ? 'bg-success' : 'bg-danger'
                    }`}></div>
                    {healthStatus.status === 'healthy' ? 'Service Online' : 'Service Offline'}
                  </div>
                )}
              </div>
            </div>
          </div> */}

          {/* Tabs */}
          <div className="mb-6 !bg-transparent border-0 shadow-none mt-6">
            <div className="flex bg-gray-100/50 rounded-xl p-2 gap-2">
              <button
                onClick={() => handleTabChange('replenishment')}
                className={`px-8 py-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center ${
                  activeTab === 'replenishment'
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
                }`}
              >
                <i className="ri-refresh-line me-2"></i>
                Replenishment
              </button>
              <button
                onClick={() => handleTabChange('agent')}
                className={`px-8 py-3 text-sm font-medium rounded-lg transition-all duration-300 flex items-center ${
                  activeTab === 'agent'
                    ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/25'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white/60'
                }`}
              >
                <i className="ri-robot-line me-2"></i>
                Agent
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <TabContent />
        </div>
      </div>
    </ReplenishmentErrorBoundary>
  );
} 