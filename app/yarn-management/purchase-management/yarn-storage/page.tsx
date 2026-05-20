"use client";
import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { useNavigation } from "@/shared/contextapi/navigationContext";
import { toast } from "react-hot-toast";
import LongTermStorageLayout from "./components/LongTermStorageLayout";
import ShortTermStorage from "./components/ShortTermStorage";
import StoragePreferences from "./components/StoragePreferences";
import UnallocatedBoxes from "./components/UnallocatedBoxes";
import AllocatedBoxes from "./components/AllocatedBoxes";
import BoxConesTracker from "./components/BoxConesTracker";
import {
  RackLocation,
  PackedBox,
  ShortTermInventory,
  StoragePreferences as StoragePreferencesType,
  InternalTransferData,
  Cone,
} from "./types";

// System default preferences (4x4 grid)
const DEFAULT_PREFERENCES: StoragePreferencesType = {
  layoutView: "grid",
  showEmptySlots: true,
  gridColumns: 4,
  gridRows: 4,
  autoRefresh: false,
  refreshInterval: 30,
  theme: "light",
  compactMode: false,
};

// Helper function to get preferences storage key for user
const getPreferencesStorageKey = (userId?: string): string => {
  if (userId) {
    return `yarnStoragePreferences_${userId}`;
  }
  return "yarnStoragePreferences"; // Fallback for non-authenticated users
};

/** Inner content that uses useSearchParams - must be under Suspense for static export */
const YarnStorageContent = () => {
  const { hasSubPermission } = useNavigation();
  const user = useSelector((state: any) => state.auth?.user);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<
    "unallocated" | "allocated" | "long-term" | "short-term" | "tracker"
  >("unallocated");
  const [showPreferences, setShowPreferences] = useState(false);

  // When returning from process page (?tab=short-term), show Short-Term Storage tab
  useEffect(() => {
    const tab = searchParams?.get("tab");
    if (tab === "short-term") {
      setActiveTab("short-term");
    }
  }, [searchParams]);

  // Load preferences from localStorage (user-specific or system default)
  const loadPreferences = useCallback((): StoragePreferencesType => {
    if (typeof window === "undefined") {
      return DEFAULT_PREFERENCES;
    }

    const storageKey = getPreferencesStorageKey(user?.id);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all required fields are present
        return { ...DEFAULT_PREFERENCES, ...parsed };
      } catch {
        // Return default if parse fails
        return DEFAULT_PREFERENCES;
      }
    }

    // If no user-specific preferences, try to load from old global key for migration
    if (user?.id) {
      const oldSaved = localStorage.getItem("yarnStoragePreferences");
      if (oldSaved) {
        try {
          const parsed = JSON.parse(oldSaved);
          // Migrate old preferences to user-specific key
          const migratedPrefs = { ...DEFAULT_PREFERENCES, ...parsed };
          localStorage.setItem(storageKey, JSON.stringify(migratedPrefs));
          return migratedPrefs;
        } catch {
          // Fall through to default
        }
      }
    }

    return DEFAULT_PREFERENCES;
  }, [user?.id]);

  const [preferences, setPreferences] =
    useState<StoragePreferencesType>(DEFAULT_PREFERENCES);

  // Load preferences when component mounts or user changes
  useEffect(() => {
    setPreferences(loadPreferences());
  }, [loadPreferences]);

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

  // Refresh function to reload data after transfers or new box additions
  const handleRefresh = useCallback(async () => {
    try {
      // Refresh racks
      setRacks(generateRacks());

      // TODO: If boxes are fetched from API, refresh them here
      // Example:
      // const boxesResponse = await yarnBoxService.getYarnBoxes({});
      // setBoxes(/* map response to PackedBox format */);

      toast.success("Data refreshed", { duration: 2000 });
    } catch (error) {
      console.error("Failed to refresh data:", error);
      toast.error("Failed to refresh data");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Save to user-specific localStorage key
    if (typeof window !== "undefined") {
      const storageKey = getPreferencesStorageKey(user?.id);
      localStorage.setItem(storageKey, JSON.stringify(newPreferences));
    }
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
    <div className="main-content !p-[10px] relative">
      <Seo title="Yarn Storage" />

      <div className="bg-white shadow-sm border border-gray-100 overflow-hidden mx-0">
        <div className="p-[10px]">
          {/* Header Section */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-[3px] h-5 bg-purple-600 rounded-full"></div>
              <h1 className="text-sm font-bold text-gray-800">Yarn Storage Management</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("unallocated")}
              className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${activeTab === "unallocated"
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <i className="ri-box-3-line me-1.5 text-xs"></i>
              Unallocated Boxes
              {activeTab === "unallocated" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("allocated")}
              className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${activeTab === "allocated"
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <i className="ri-checkbox-circle-line me-1.5 text-xs"></i>
              Allocated Boxes
              {activeTab === "allocated" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("long-term")}
              className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${activeTab === "long-term"
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <i className="ri-archive-line me-1.5 text-xs"></i>
              Long-Term Storage
              {activeTab === "long-term" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("short-term")}
              className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${activeTab === "short-term"
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <i className="ri-inbox-line me-1.5 text-xs"></i>
              Short-Term Storage
              {activeTab === "short-term" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("tracker")}
              className={`px-3 py-2 text-[11px] font-bold transition-colors relative ${activeTab === "tracker"
                ? "text-purple-600"
                : "text-gray-600 hover:text-gray-900"
                }`}
            >
              <i className="ri-search-eye-line me-1.5 text-xs" aria-hidden />
              Box &amp; Cones Tracker
              {activeTab === "tracker" && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-[10px]">
          {activeTab === "unallocated" ? (
            <UnallocatedBoxes
              onBoxAllocate={(orderId) => {
                toast.success(`Allocating boxes for order ${orderId}`);
                // TODO: Implement box allocation logic
              }}
            />
          ) : activeTab === "allocated" ? (
            <AllocatedBoxes />
          ) : activeTab === "long-term" ? (
            <LongTermStorageLayout
              racks={racks}
              boxes={boxes}
              onBoxStore={handleBoxStore}
              onRackUpdate={handleRackUpdate}
              onRefresh={handleRefresh}
              preferences={{
                gridColumns: preferences.gridColumns,
                gridRows: preferences.gridRows,
                showEmptySlots: preferences.showEmptySlots,
              }}
            />
          ) : activeTab === "short-term" ? (
            <ShortTermStorage
              inventory={shortTermInventory}
              boxes={boxes}
              onInternalTransfer={handleInternalTransfer}
              onRefresh={handleRefresh}
              preferences={{
                gridColumns: preferences.gridColumns,
                gridRows: preferences.gridRows,
                showEmptySlots: preferences.showEmptySlots,
              }}
            />
          ) : (
            <BoxConesTracker />
          )}
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

const YarnStoragePage = () => (
  <Suspense fallback={<div className="main-content !p-[10px] min-h-[200px]" />}>
    <YarnStorageContent />
  </Suspense>
);

export default YarnStoragePage;
