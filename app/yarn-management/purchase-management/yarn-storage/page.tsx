"use client";
import React, { useState, useEffect, useMemo } from "react";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import LongTermStorageLayout from "./components/LongTermStorageLayout";
import ShortTermStorage from "./components/ShortTermStorage";
import StoragePreferences from "./components/StoragePreferences";
import {
  RackLocation,
  PackedBox,
  ShortTermInventory,
  StoragePreferences as StoragePreferencesType,
  InternalTransferData,
  Cone,
} from "./types";

const YarnStoragePage = () => {
  const { hasSubPermission } = useNavigation();
  const [activeTab, setActiveTab] = useState<"long-term" | "short-term">(
    "long-term"
  );
  const [showPreferences, setShowPreferences] = useState(false);

  // Load preferences from localStorage
  const loadPreferences = (): StoragePreferencesType => {
    if (typeof window === "undefined") {
      return {
        layoutView: "grid",
        showEmptySlots: true,
        gridColumns: 8,
        gridRows: 6,
        autoRefresh: false,
        refreshInterval: 30,
        theme: "light",
        compactMode: false,
      };
    }

    const saved = localStorage.getItem("yarnStoragePreferences");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Return default if parse fails
      }
    }

    return {
      layoutView: "grid",
      showEmptySlots: true,
      gridColumns: 8,
      gridRows: 6,
      autoRefresh: false,
      refreshInterval: 30,
      theme: "light",
      compactMode: false,
    };
  };

  const [preferences, setPreferences] =
    useState<StoragePreferencesType>(loadPreferences);

  // Generate dummy racks
  const generateRacks = (): RackLocation[] => {
    const racks: RackLocation[] = [];
    for (let row = 1; row <= preferences.gridRows; row++) {
      for (let col = 1; col <= preferences.gridColumns; col++) {
        racks.push({
          id: `rack-${row}-${col}`,
          rackCode: `R${String(row).padStart(2, "0")}-C${String(col).padStart(2, "0")}`,
          row,
          column: col,
          shelf: Math.floor((row + col) % 3) + 1,
          barcode: `RACK-${row}-${col}-${Date.now()}`,
          capacity: 10,
          currentBoxes: Math.random() > 0.7 ? 1 : 0,
          status:
            Math.random() > 0.7
              ? "Occupied"
              : Math.random() > 0.9
              ? "Reserved"
              : "Available",
        });
      }
    }
    return racks;
  };

  const [racks, setRacks] = useState<RackLocation[]>(() => generateRacks());

  // Generate dummy QC-approved boxes
  const [boxes, setBoxes] = useState<PackedBox[]>([
    {
      id: "box-1",
      boxBarcode: "BOX-001",
      yarnId: "yarn-1",
      yarnName: "Cotton Count 40",
      batchNumber: "BATCH-001",
      weight: 50,
      numberOfCones: 25,
      qcApproved: true,
      qcApprovedDate: new Date().toISOString(),
      status: "QC_Approved",
    },
    {
      id: "box-2",
      boxBarcode: "BOX-002",
      yarnId: "yarn-2",
      yarnName: "Polyester DTY 150",
      batchNumber: "BATCH-002",
      weight: 75,
      numberOfCones: 30,
      qcApproved: true,
      qcApprovedDate: new Date().toISOString(),
      status: "QC_Approved",
    },
    {
      id: "box-3",
      boxBarcode: "BOX-003",
      yarnId: "yarn-3",
      yarnName: "Viscose Rayon 30",
      batchNumber: "BATCH-003",
      weight: 60,
      numberOfCones: 20,
      qcApproved: true,
      qcApprovedDate: new Date().toISOString(),
      status: "Stored",
      rackLocation: racks[0],
      storedDate: new Date().toISOString(),
    },
  ]);

  const [shortTermInventory, setShortTermInventory] =
    useState<ShortTermInventory[]>([
      {
        id: "st-1",
        yarnId: "yarn-1",
        yarnName: "Cotton Count 40",
        batchNumber: "BATCH-001",
        totalCones: 15,
        totalWeight: 30,
        cones: [],
        lastUpdated: new Date().toISOString(),
      },
    ]);

  // Auto refresh
  useEffect(() => {
    if (!preferences.autoRefresh) return;

    const interval = setInterval(() => {
      // Refresh data
      setRacks((prev) => [...prev]);
      toast.success("Data refreshed", { duration: 2000 });
    }, preferences.refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [preferences.autoRefresh, preferences.refreshInterval]);

  // Update racks when preferences change
  useEffect(() => {
    setRacks(generateRacks());
  }, [preferences.gridRows, preferences.gridColumns]);

  const handleBoxStore = (boxId: string, rackId: string) => {
    const box = boxes.find((b) => b.id === boxId);
    const rack = racks.find((r) => r.id === rackId);

    if (!box || !rack) return;

    // Update box with rack location
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === boxId
          ? {
              ...b,
              status: "Stored",
              rackLocation: rack,
              storedDate: new Date().toISOString(),
            }
          : b
      )
    );

    // Update live inventory (this would typically call an API)
    toast.success(
      `Box ${box.boxBarcode} stored. Weight: ${box.weight}kg, Cones: ${box.numberOfCones} added to inventory.`
    );
  };

  const handleRackUpdate = (updatedRack: RackLocation) => {
    setRacks((prev) =>
      prev.map((r) => (r.id === updatedRack.id ? updatedRack : r))
    );
  };

  const handleInternalTransfer = (transferData: InternalTransferData) => {
    // Update short-term inventory
    const existingInventory = shortTermInventory.find(
      (inv) => inv.yarnId === transferData.yarnId
    );

    if (existingInventory) {
      setShortTermInventory((prev) =>
        prev.map((inv) =>
          inv.id === existingInventory.id
            ? {
                ...inv,
                totalCones: inv.totalCones + transferData.numberOfCones,
                totalWeight: inv.totalWeight + transferData.totalWeight,
                cones: [...inv.cones, ...transferData.cones],
                lastUpdated: new Date().toISOString(),
              }
            : inv
        )
      );
    } else {
      setShortTermInventory((prev) => [
        ...prev,
        {
          id: `st-${Date.now()}`,
          yarnId: transferData.yarnId,
          yarnName: transferData.yarnName,
          batchNumber: boxes.find((b) => b.id === transferData.boxId)
            ?.batchNumber || "",
          totalCones: transferData.numberOfCones,
          totalWeight: transferData.totalWeight,
          cones: transferData.cones,
          lastUpdated: new Date().toISOString(),
        },
      ]);
    }

    // Update box status
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === transferData.boxId
          ? { ...b, status: "Issued" }
          : b
      )
    );
  };

  const handlePreferencesSave = (newPreferences: StoragePreferencesType) => {
    setPreferences(newPreferences);
    setRacks(generateRacks());
  };

  // Check permission
  const hasPermission = hasSubPermission(
    "/yarn-management/purchase-management",
    "Yarn Storage"
  );

  if (!hasPermission) {
    return (
      <div className="main-content">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <i className="ri-lock-line text-6xl"></i>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Access Restricted
          </h3>
          <p className="text-gray-500 mb-4">
            You don't have permission to access Yarn Storage.
          </p>
          <Link
            href="/yarn-management/purchase-management"
            className="ti-btn ti-btn-primary"
          >
            <i className="ri-arrow-left-line me-2"></i>
            Back to Purchase Management
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <Seo title="Yarn Storage" />

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          {/* Page Header */}
          <div className="box !bg-transparent border-0 shadow-none">
            <div className="box-header flex justify-between items-center">
              <div>
                <h1 className="box-title text-2xl font-semibold">
                  Yarn Storage Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage long-term and short-term yarn storage with 2D layout
                  and barcode tracking
                </p>
              </div>
              <div className="box-tools flex gap-2">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="ti-btn ti-btn-light"
                  title="Preferences"
                >
                  <i className="ri-settings-3-line me-1"></i>
                  Preferences
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="box">
            <div className="box-body p-0">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("long-term")}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${
                    activeTab === "long-term"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <i className="ri-archive-line me-2"></i>
                  Long-Term Storage
                </button>
                <button
                  onClick={() => setActiveTab("short-term")}
                  className={`px-6 py-3 font-medium text-sm transition-colors ${
                    activeTab === "short-term"
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <i className="ri-inbox-line me-2"></i>
                  Short-Term Storage
                </button>
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {activeTab === "long-term" ? (
              <LongTermStorageLayout
                racks={racks}
                boxes={boxes}
                onBoxStore={handleBoxStore}
                onRackUpdate={handleRackUpdate}
                preferences={{
                  gridColumns: preferences.gridColumns,
                  gridRows: preferences.gridRows,
                  showEmptySlots: preferences.showEmptySlots,
                }}
              />
            ) : (
              <ShortTermStorage
                inventory={shortTermInventory}
                boxes={boxes}
                onInternalTransfer={handleInternalTransfer}
              />
            )}
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <StoragePreferences
          preferences={preferences}
          onSave={handlePreferencesSave}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </div>
  );
};

export default YarnStoragePage;
