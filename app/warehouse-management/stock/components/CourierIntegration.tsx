"use client";

import React, { useState } from 'react';
import { CourierIntegration as CourierIntegrationType } from '../types';

interface CourierIntegrationProps {
  integrations: CourierIntegrationType[];
  onConfigure: (integrationId: string) => void;
  onToggle: (integrationId: string) => void;
}

const CourierIntegration: React.FC<CourierIntegrationProps> = ({
  integrations,
  onConfigure,
  onToggle,
}) => {
  return (
    <div>
      <div className="box mb-6">
        <div className="box-header">
          <h3 className="box-title">Courier Service Integrations</h3>
          <p className="text-sm text-gray-600 mt-1">
            Connect and manage courier service APIs for automated tracking and shipping
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={`box border-2 ${
              integration.isActive
                ? 'border-green-500 bg-green-50'
                : integration.isConfigured
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-gray-300 bg-gray-50'
            }`}
          >
            <div className="box-body">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{integration.serviceName}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    {integration.isActive ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-green-200 text-green-800">
                        Active
                      </span>
                    ) : integration.isConfigured ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-800">
                        Configured
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-800">
                        Not Configured
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-2xl">
                  {integration.serviceName === 'FedEx' && <i className="ri-truck-line"></i>}
                  {integration.serviceName === 'UPS' && <i className="ri-truck-line"></i>}
                  {integration.serviceName === 'DHL' && <i className="ri-truck-line"></i>}
                  {integration.serviceName === 'BlueDart' && <i className="ri-truck-line"></i>}
                  {integration.serviceName === 'DTDC' && <i className="ri-truck-line"></i>}
                  {integration.serviceName === 'Custom' && <i className="ri-settings-3-line"></i>}
                </div>
              </div>

              {integration.lastSync && (
                <div className="mb-4 p-2 bg-white rounded border border-gray-200">
                  <p className="text-xs text-gray-500">Last Sync</p>
                  <p className="text-sm font-medium">
                    {new Date(integration.lastSync).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {!integration.isConfigured ? (
                  <button
                    onClick={() => onConfigure(integration.id)}
                    className="ti-btn ti-btn-primary w-full"
                  >
                    <i className="ri-settings-3-line me-2"></i>
                    Configure Integration
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => onToggle(integration.id)}
                      className={`ti-btn w-full ${
                        integration.isActive
                          ? 'ti-btn-danger'
                          : 'ti-btn-success'
                      }`}
                    >
                      <i
                        className={`me-2 ${
                          integration.isActive
                            ? 'ri-pause-line'
                            : 'ri-play-line'
                        }`}
                      ></i>
                      {integration.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => onConfigure(integration.id)}
                      className="ti-btn ti-btn-secondary w-full"
                    >
                      <i className="ri-settings-3-line me-2"></i>
                      Update Settings
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Info */}
      <div className="box mt-6 bg-blue-50 border-blue-200">
        <div className="box-body">
          <div className="flex items-start gap-3">
            <i className="ri-information-line text-2xl text-blue-600"></i>
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Courier Integration Features</h4>
              <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                <li>Automatic tracking number generation</li>
                <li>Real-time shipment status updates</li>
                <li>Automated shipping label printing</li>
                <li>Rate calculation and comparison</li>
                <li>Delivery confirmation and notifications</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierIntegration;


