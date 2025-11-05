"use client";
import React, { useState, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import WarehouseMap from "./components/WarehouseMap";
import RackManagement from "./components/RackManagement";
import QRCodeViewer from "./components/QRCodeViewer";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { Rack } from "./types";
import {
  generateDummyRacks,
  generateDummySKUMovements,
  generateDummyMaintenanceNotifications,
  generateDummyRackUtilization
} from "./dummyData";

type TabType = "map" | "racks" | "qr" | "analytics";

const LayoutPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("map");
  const [racks, setRacks] = useState<Rack[]>(() => generateDummyRacks());
  const [selectedRack, setSelectedRack] = useState<Rack | null>(null);

  // Generate derived data
  const skuMovements = useMemo(() => generateDummySKUMovements(racks), [racks]);
  const maintenanceNotifications = useMemo(() => generateDummyMaintenanceNotifications(racks), [racks]);
  const rackUtilization = useMemo(() => generateDummyRackUtilization(racks), [racks]);
  
  // Get all baskets for QR viewer
  const allBaskets = useMemo(() => {
    return racks.flatMap(rack => 
      rack.shelves.flatMap(shelf => shelf.baskets)
    );
  }, [racks]);

  const handleRackClick = (rack: Rack) => {
    setSelectedRack(rack);
    setActiveTab("racks");
  };

  const handleRackUpdate = (updatedRack: Rack) => {
    setRacks(prev => prev.map(r => r.id === updatedRack.id ? updatedRack : r));
  };

  const handleRackDelete = (rackId: string) => {
    setRacks(prev => prev.filter(r => r.id !== rackId));
  };

  const handleRackCreate = (newRack: Omit<Rack, "id" | "createdAt" | "updatedAt">) => {
    const rack: Rack = {
      ...newRack,
      id: `RACK-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setRacks(prev => [...prev, rack]);
  };

  const handleQRScan = (qrCode: string) => {
    // Handle QR scan - could navigate to basket details
    console.log("Scanned QR Code:", qrCode);
  };

  const tabs = [
    {
      id: "map" as TabType,
      label: "Warehouse Map",
      icon: "ri-map-2-line",
      description: "2D Visual View"
    },
    {
      id: "racks" as TabType,
      label: "Rack Management",
      icon: "ri-stack-line",
      description: "Create, Edit, Remove"
    },
    {
      id: "qr" as TabType,
      label: "QR Code Viewer",
      icon: "ri-qr-code-line",
      description: "Scan & View Items"
    },
    {
      id: "analytics" as TabType,
      label: "Analytics Dashboard",
      icon: "ri-bar-chart-box-line",
      description: "Insights & Reports"
    }
  ];

  return (
    <div className="main-content">
      <Seo title="Warehouse Layout" />
      
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header">
              <h1 className="box-title text-2xl font-semibold">Warehouse Layout Management</h1>
              <p className="text-gray-600 mt-2">
                Visual digital mapping of racks and shelves. Manage layout, track inventory, and analyze utilization.
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="box">
            <div className="box-body p-0">
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px" aria-label="Tabs">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex-1 px-4 py-4 text-center border-b-2 font-medium text-sm transition-colors
                        ${activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }
                      `}
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
            {activeTab === "map" && (
              <WarehouseMap
                racks={racks}
                onRackClick={handleRackClick}
                selectedRackId={selectedRack?.id}
              />
            )}

            {activeTab === "racks" && (
              <RackManagement
                racks={racks}
                onRackUpdate={handleRackUpdate}
                onRackDelete={handleRackDelete}
                onRackCreate={handleRackCreate}
              />
            )}

            {activeTab === "qr" && (
              <QRCodeViewer
                baskets={allBaskets}
                onScan={handleQRScan}
              />
            )}

            {activeTab === "analytics" && (
              <AnalyticsDashboard
                racks={racks}
                skuMovements={skuMovements}
                maintenanceNotifications={maintenanceNotifications}
                rackUtilization={rackUtilization}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LayoutPage;

